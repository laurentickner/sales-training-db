# V2 — Auto-scan Google Drive for new call transcripts

Status: **planned, not built**. v1 (paste-transcript MVP) ships in this commit.

## Problem

V1 needs Lauren to manually open the app, paste the transcript, and click
Generate. That's friction that compounds at 5+ calls/week. V2 makes it
automatic: a Meet ends, a transcript hits Drive, the review generates itself
and lands in GoHighLevel before Lauren even gets back to her laptop.

## The pipeline

```
Google Meet ends
   ↓
Drive auto-creates "Recordings/<title>.transcript.txt" in lauren@scalesystems.io's Drive
   ↓
[Cloudflare Worker cron] polls every 5 min via Google Drive API
   ↓
new file detected → fetch transcript → fetch matching metadata (date, attendees)
   ↓
POST to /review (same Worker) → Anthropic API w/ buildReviewSystemPrompt
   ↓
markdown review generated
   ↓
GHL push: upsert Contact (match by attendee email from Meet metadata) → POST Note → tag with outcome=pending
   ↓
write review URL back to a "Reviews" sheet in Drive for audit
```

## Shared with the live-coach project

The CF Worker for this lives in the SAME `live-coach/` worktree (spawned by the
parallel task). Reasons:

- Same Cloudflare account, same Workers project, same wrangler.toml — no extra
  infra to provision.
- The review-writing engine (port of app/app.js's review system prompt) is
  identical for live calls and post-call scans — write it once, use both paths.
- The GHL push (`ghl-client.ts`) is identical.

Live-coach session should expose:

- `POST /webhook/transcript-ready` — called by this cron with `{ driveFileId,
  meetingTitle, attendees, durationSec }`
- `POST /review` — given a transcript + prospect facts, returns the markdown
  review
- `POST /ghl/contact-note` — upsert + note + tag

## Pieces to build

### 1. Google OAuth flow (one-time)

Lauren authorises a Google Cloud project to read her Drive. Refresh token gets
stored as a Cloudflare Worker secret. No re-auth needed after that.

Steps:
1. Create Google Cloud project `ss-call-copilot`.
2. Enable Drive API + Meet API + Calendar API (Calendar = attendee lookup).
3. Create an OAuth client (Web application).
4. One-time auth flow on Lauren's laptop:
   `python3 scripts/auth-google.py` → opens browser → she signs in → token
   file lands in `.secrets/google-token.json` (gitignored).
5. `wrangler secret put GOOGLE_REFRESH_TOKEN < .secrets/google-token.json`

### 2. CF Worker cron

```toml
# wrangler.toml addition
[triggers]
crons = ["*/5 * * * *"]    # every 5 minutes

[[d1_databases]]
binding = "DB"
database_name = "ss-call-copilot"
# tracks: { drive_file_id, prospect_name, review_md, ghl_contact_id, processed_at }
```

```ts
// live-coach/scan-drive.ts
export async function scheduled(event: ScheduledEvent, env: Env) {
  const newFiles = await listNewTranscripts(env);    // Drive API call
  for (const file of newFiles) {
    if (await alreadyProcessed(file.id, env)) continue;
    const transcript = await fetchTranscriptText(file.id, env);
    const attendees = await fetchMeetAttendees(file.meetingCode, env);
    const review = await generateReview(transcript, attendees, env);
    const ghl = await pushToGHL(review, attendees, env);
    await markProcessed(file.id, attendees.primary, review, ghl.contactId, env);
  }
}
```

### 3. Match transcript → prospect

The Meet recording filename is usually `Meeting <date>.transcript.txt`. We
need to know which prospect it belongs to. Options:

- **Best:** Calendar metadata — the Meet has attendees, one is Lauren, the
  other is the prospect. Match prospect by email. (Requires Calendar scope.)
- **Fallback:** Filename pattern. Train Lauren to title meetings
  `Strategy call — Jordan Reyes` → regex `Strategy call — (.+)`.
- **Safety net:** if no match, write review to a Drive "Unmatched Reviews"
  folder + Slack Lauren so she can pick the prospect manually.

### 4. The app shell (UI changes)

- Topbar gets a `🔄 Auto-scan: on` chip next to the keyword-mode chip.
- New "Auto-imported reviews" section in the Calls modal — reviews that came
  in from the cron, with a "Was this the right prospect?" yes/no.
- Reviews from the cron land in localStorage the same way as paste-generated
  ones — same shape, same render path, same GHL state. The cron just pre-fills
  what Lauren would have pasted.

## Cost + complexity

| Piece | Build time | Run cost |
|---|---|---|
| Google OAuth one-time | 1 day | $0 |
| CF Worker + cron + D1 | 1 day | $0 (free tier) |
| Drive API polling | 0.5 day | $0 (Drive API has generous free quota) |
| Attendee match + ambiguity handling | 1 day | $0 |
| App-shell UI (auto-scan chip, unmatched UI) | 0.5 day | $0 |
| **Total** | **~4 days** | **$0/mo extra** |

Anthropic API for the review itself: ~$0.03/call at Sonnet 4.5 prices. At 20
calls/week = $2.40/mo.

## When to build

**Don't build until v1 has been used on 5+ real calls.** Reasons:

- The review system prompt will need tuning based on actual transcripts —
  faster to iterate when Lauren is the one running it manually.
- The GHL push shape (which field gets the outcome, which tag goes where) is
  easier to refine when Lauren sees each push land in GHL before the next one.
- Auto-scan is high-trust automation; v1 lets Lauren build trust in the review
  quality before letting it loose.

## Open questions for Lauren (decide before v2 build)

1. **One Drive folder or all of Drive?** Recommend a dedicated
   `lauren@scalesystems.io/Sales Calls/` folder — Lauren / Meet drops
   recordings there, the scanner only watches that folder. Avoids accidentally
   reviewing internal team Meets.
2. **What about Zoom calls?** If you ever use Zoom for sales calls,
   we'd need a parallel scanner (Zoom Cloud Recordings API). Probably skip
   until you have one.
3. **Daniel + Mariana running calls** — when reps other than you run a call,
   does their review still land in your GHL? Or do they get their own?
   (Suggests a `rep_email` field on the review + filter in the UI.)
