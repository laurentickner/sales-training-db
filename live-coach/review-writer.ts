/**
 * End-of-call markdown review.
 *
 * Mirrors `buildReviewSystemPrompt` + `runReview` in app/app.js so a live call
 * produces a review in the same shape Lauren already reads at
 * `app-data/_review/call-jason-rosado-2026-05-19.md`. The transcript here is
 * assembled from the DO's utterance log instead of being pasted by hand, but
 * the system prompt and Claude model are the same.
 */

const REVIEW_SYSTEM_PROMPT = [
  "You are a senior sales coach reviewing a finished sales call against a strict methodology. Be specific, surgical, and honest — your job is to make the rep better, not to flatter them. No fluff, no generic advice.",
  "",
  "METHODOLOGY YOU SCORE AGAINST",
  "",
  "1) Funnel order — 7 stages, must run in this order:",
  "   Introduction → Discovery → Transition → Pitch → Committing → Objections → Close Confirmation.",
  "   - Introduction: take frame control, set the agenda, get the prospect to say YES to the call structure. The sale is won or lost at hello.",
  "   - Discovery: extract the 9 DISCOVERY beliefs + exact numbers. 80% questions, 20% statements.",
  "   - Transition: bridge from discovery to pitch. Recap the gap, get permission to walk through the solution.",
  "   - Pitch: 3 pillars (paradigm shift / proof / payoff), tie-down after each pillar.",
  "   - Committing: temp-check → 1–10 scale → 'what would make it a 10?' → onboarding-before-price → price on a downward inflection → silence.",
  "   - Objections: every objection handled through the universal handle (diffuse → isolate → temp-check → scale → double tie-down). Uncertainty before logistics.",
  "   - Close confirmation: lock the sale, set the buyer's-remorse pre-frame, set the next concrete step.",
  "",
  "2) DISCOVERY beliefs — 9-letter mnemonic that the rep MUST cover:",
  "   D — Desire: the real why behind the number, not the surface number.",
  "   I — Issue: the specific personal cost, not the surface complaint.",
  "   S — Sum: exact numbers (revenue last month, leads/week, close rate, LTV). Without this you cannot run upside math.",
  "   C — Cost: cost of inaction. 'what if the next 5 years = the last 5?'",
  "   O — Own: why they cannot solve this alone / why their past attempts failed.",
  "   V — Verify: trust — why YOU, why this company.",
  "   E — Everyone: who else is involved in the decision (spouse, partner, CFO, board).",
  "   R — Resources: money belief — can they comfortably invest? Install this BEFORE pitch.",
  "   Y — Why: the catalyst — why NOW. People don't book for no reason.",
  "",
  "3) Universal objection handle — every objection should run through:",
  "   diffuse (lower the temperature, acknowledge) → isolate (is that the only thing?) → temp-check (on a scale of 1-10 how strong is that concern?) → scale (what would make it lower?) → double tie-down (if I solved X, are you willing to move forward right now?).",
  "   Trade every concession: payment plan request → 'if I can make that work, are you ready to move forward right now?'",
  "   Uncertainty objections ('what if this doesn't work') must be handled as uncertainty, not as logistics.",
  "",
  "4) Voice-level moves — surface where each landed or got missed:",
  "   - Loop-back rule: when the prospect surfaces a feeling/concern, loop back into it 5–7 layers ('why though?' / 'how do you mean?' / 'what's underneath that?'). Do not move on at layer 1.",
  "   - Identity-shift reframes: convert past behaviour into a 'type of person who…' frame. ('You tried 3 things before — sounds like the type of person who never gives up. Were you born that way or did you have to learn it?')",
  "   - FOR them, not TO them: the rep is on the prospect's side of the table. Tone should be concerned-operator, never pushy.",
  "   - Mask-off: discovery succeeds when the prospect says something they'd only say to a close friend, not a stranger. Surface the moments where the mask came off, and the moments it stayed on.",
  "   - NEPQ pacing: slow and lower the tone at the end of each discovery question. Did the rep audibly pace the prospect, or push?",
  "   - Catalyst / Why anchoring: did the rep find the catalyst event that triggered NOW? Without it, the gap isn't built.",
  "",
  "OUTPUT FORMAT — strict markdown, no preamble:",
  "",
  "# Call Review — {PROSPECT NAME}, {DATE}",
  "",
  "**Outcome: {OUTCOME}.** {one-line outcome summary using the outcome notes if given}",
  "",
  "## Adherence scores (/10)",
  "",
  "| Dimension | Score |",
  "|---|---|",
  "| Funnel order | N |",
  "| Discovery / DISCOVERY beliefs | N |",
  "| Exact numbers extracted | N |",
  "| Pitch (3 pillars + tie-downs) | N |",
  "| Committing phase | N |",
  "| Objection handling | N |",
  "| Voice-level moves (loop-back, identity, mask-off, pacing) | N |",
  "| Outcome | N |",
  "",
  "## What was run well",
  "",
  "- 3–5 specific things, each citing the exact moment in the transcript (quote a line). What the rep did, why it worked.",
  "",
  "## What got skipped or went wrong",
  "",
  "- 3–6 specific gaps, each citing the exact moment. Be honest about which belief got skipped, which objection got conceded, which loop-back was missed at layer 1. Name the cost of each gap.",
  "",
  "## Beliefs covered (DISCOVERY)",
  "",
  "For each of the 9 letters, mark ✅ covered / ⚠ partial / ❌ missed. One line of evidence per letter.",
  "",
  "## Objections that surfaced",
  "",
  "List every objection raised. For each: how the prospect framed it, how the rep handled it, what step of the universal handle was missed, and what the rep should have said instead.",
  "",
  "## Voice-level moments",
  "",
  "Best loop-back. Best identity-shift moment. Best mask-off moment. Worst missed loop-back. (One line each. Quote the moment.)",
  "",
  "## Top 3 fixes for the next call",
  "",
  "1. Most leveraged behaviour change. Specific. Word-track if helpful.",
  "2. Second-most. Specific.",
  "3. Third. Specific.",
  "",
  "## Next step",
  "",
  "Given the outcome + transcript, the SINGLE next-best action the rep should take in the next 24h. Concrete (e.g. 'send Jordan the Loom on supplier match by Monday, ask her to confirm spouse buy-in before our Wed call').",
  "",
  "Be tight. Total review under 700 words. Quote real lines from the transcript wherever possible — the rep should not be able to argue with the evidence.",
].join("\n");

export interface ReviewInput {
  prospectName: string;
  date: string; // YYYY-MM-DD
  outcome?: string; // "closed-pif" | "closed-plan" | "followup" | "not-closed" | "no-show" | "other"
  outcomeNotes?: string;
  transcript: string;
}

export interface ReviewResult {
  ok: boolean;
  markdown: string;
  error?: string;
}

const OUTCOME_LABEL: Record<string, string> = {
  "closed-pif": "Closed (PIF)",
  "closed-plan": "Closed (plan)",
  followup: "Follow-up",
  "not-closed": "Not closed",
  "no-show": "No-show",
  other: "Other",
};

export async function writeReview(apiKey: string, input: ReviewInput, timeoutMs = 90000): Promise<ReviewResult> {
  if (!apiKey) return { ok: false, markdown: "", error: "No ANTHROPIC_API_KEY configured" };
  if (!input.transcript || input.transcript.trim().length < 200) {
    return { ok: false, markdown: "", error: "Transcript too short to score" };
  }

  const userMsg = [
    `PROSPECT: ${input.prospectName}`,
    `DATE: ${input.date}`,
    `OUTCOME: ${OUTCOME_LABEL[input.outcome || ""] || input.outcome || "pending"}`,
    input.outcomeNotes ? `OUTCOME NOTES: ${input.outcomeNotes}` : "",
    "",
    "TRANSCRIPT (verbatim — speaker labels may or may not be present):",
    input.transcript.slice(0, 180000),
  ]
    .filter(Boolean)
    .join("\n");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 2500,
        temperature: 0.3,
        system: REVIEW_SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMsg }],
      }),
    });
    if (!r.ok) {
      const body = await r.text();
      console.error(`review HTTP ${r.status}: ${body.slice(0, 400)}`);
      return { ok: false, markdown: "", error: `Claude HTTP ${r.status}` };
    }
    const j = (await r.json()) as {
      type?: string;
      error?: { message?: string };
      content?: { text?: string }[];
      stop_reason?: string;
    };
    if (j.type === "error") return { ok: false, markdown: "", error: j.error?.message || "Claude error" };
    let md = j.content?.[0]?.text || "";
    if (!md) return { ok: false, markdown: "", error: "Empty review" };
    if (j.stop_reason === "max_tokens") md += "\n\n⚠ Output was truncated — re-run with a shorter transcript or split the call.";
    return { ok: true, markdown: md };
  } catch (e: unknown) {
    const err = e as { name?: string; message?: string };
    if (err.name === "AbortError") return { ok: false, markdown: "", error: "Review timed out (90s)" };
    console.error("review threw:", err.message);
    return { ok: false, markdown: "", error: err.message || "Review failed" };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Assemble a clean transcript from the DO's stored utterances. Utterances are
 * tagged with speaker (`prospect` vs `host`) and a relative timestamp so the
 * reviewer has speaker labels even if the model can't infer them.
 */
export interface Utterance {
  speaker: string; // "prospect" | "host" | participant name
  text: string;
  timestamp: number; // seconds since call start
}

export function assembleTranscript(utterances: Utterance[]): string {
  if (!utterances.length) return "";
  const lines: string[] = [];
  for (const u of utterances) {
    const mm = Math.floor(u.timestamp / 60).toString().padStart(2, "0");
    const ss = Math.floor(u.timestamp % 60).toString().padStart(2, "0");
    lines.push(`[${mm}:${ss}] ${u.speaker}: ${u.text}`);
  }
  return lines.join("\n");
}
