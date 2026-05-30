# Deploying the Sales Call Copilot with Netlify Identity gate

The app ships with an invite-only login gate via Netlify Identity. Local dev (localhost / 127.0.0.1) bypasses the gate automatically.

## One-time Netlify setup (after pushing this commit)

1. Open your Netlify dashboard → the site that serves `/app/` (or the whole repo) → **Identity** tab.
2. Click **Enable Identity**.
3. **Registration preferences** → switch to **Invite only**. Save.
4. (Optional, Pro plan only) **Emails** → set sending address to `lauren@scalesystems.io` and customise the invite template.

## Inviting a client

1. Netlify dashboard → Site → **Identity** → **Invite users** → enter their email → send.
2. They get an email from Netlify with a confirmation link → they set a password → they can sign in at the Copilot URL.

## Revoking access (when a client churns or finishes)

1. Netlify dashboard → Site → **Identity** → click the user → **Delete user**.
2. They are signed out and locked out immediately. Existing sessions are invalidated on next request.

To re-add: invite them again from the same screen. Their saved offer template + prospect notes live in their own browser's localStorage, so re-invites restore them.

## Local development

`python3 -m http.server 8770` in the `app/` folder, open `http://localhost:8770`. The gate is bypassed automatically — no Identity sign-in needed.

If you want to force-test the gate locally, set `localStorage.setItem('copilot_force_gate','1')` and reload. (Not yet wired — add if needed.)

## Pending: ClickUp ↔ Netlify Identity automation

See `/Users/laurentickner/Desktop/memory/project_pending_copilot_clickup_revoke_automation.md` for the planned automation that auto-invites on ClickUp client-card creation and auto-revokes on status-change-to-churned.
