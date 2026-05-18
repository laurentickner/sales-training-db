# Audit — Financial-bucket objections (price-too-expensive, payment-plan, move-money-around, discount-request)

Auditor slice: `objection-responses.json` objections with `"bucket": "financial"`.
Canonical sources cross-checked: `_mining/batch-1.md`, `batch-4.md`, `batch-5.md`, `batch-6.md`, `batch-7.md`, `batch-8.md` and `OBJECTION-PLAYBOOK.md`.

Overall: the financial bucket is the strongest-built slice in the KB — sequence is correct (diffuse → isolate value-vs-budget → "money aside 100% in" → permission to break it up → open wallet → "and you really want this" → "I don't think… I also don't think… so what I'd be willing to do" → trade for a decision). The issues below are mostly verbatim-precision and one missing step, not structural. None are fatal, but several would cost punch mid-call.

---

## WRONG / RISKY

### 1. `price-too-expensive` — OPEN WALLET step omits the "credit" sub-question framing and waters down step 1's two-bucket language

**App currently (response_steps[3]):**
> "OPEN WALLET: In the next 30 days, how much cash flow do you have coming in total — after expenses, what's left over? ... And what's your cash on hand right now exactly? ... And in terms of credit, what's available?"

The credit line is fine in spirit but Cole always frames it with the disarming pre-qualifier so the prospect doesn't feel cornered into financing. Verbatim (batch-1, "Handling Objections… That's Too Expensive"):
> "and in terms of credit **not saying we have to use it but just so we know what's available**"

**Change:** restore the disarmer — "And in terms of credit — not saying we have to use it, just so we know what's available — what do you have access to?" Without "not saying we have to use it" the question reads as pushing the prospect toward debt, which is the exact thing Cole's price-drop later says he won't do.

**Also in step 1 — the isolate question is slightly off-corpus.** App says:
> "do you mean you really want to do it and physically don't have the budget, or do you mean you don't think the investment is worth the value?"

That is acceptable, but Cole's tightest verbatim (batch-1, "I Reacted…") is sharper and ties the back half to the close: *"do you mean… you don't see the value… **Or do you think… you really do want to do it, it's just finances standing in the way — so if you could make it work financially, then you'd 100% move forward.**"* The app drops the "so if you could make it work financially, you'd 100% move forward" tie-down clause. That clause is load-bearing — it pre-closes the logistic before the open wallet. **Change:** append it.

### 2. `move-money-around` — step 3 invents a generic split; Cole's verbatim is a specific, more confident number

**App currently (response_steps[2]):**
> "Why don't you do half now and half when you're done moving money around — that way we can still get onboarding, the assessment and the forms out of the way, and take care of the rest in a week."

Cole's verbatim (batch-6, "85 Minutes…") does NOT say "half" — he names a concrete partial that signals he's not negotiating against himself:
> "**Let's do seven and a half now.** That way we can still get you onboarding, get the assessment, get the forms, get the onboarding call out of the way, and then we'll just take care of that **in a week** when you're done moving money around."

"Half" is a weaker, more concessive frame than naming a near-full number ($7.5k of $10k). The whole point of move-money-around is the prospect is *already 100% in and the money is real* — so the rep takes most of it now, not half. **Change:** reframe step 3 so the rep names a high partial ("do the bulk of it now — say seven-and-a-half — and the rest in a week"), not a 50/50 split. 50/50 belongs in `price-too-expensive`/`payment-plan` where affordability is the constraint; it's the wrong instrument here.

### 3. `discount-request` — step 1 is correct but step 2 quietly contradicts the playbook's own concession rule

**App currently (response_steps[1]):**
> "If pressed, redirect to value/the process, never to price: keep the investment simple and fixed; use payment terms (not discounts) as the only lever, and only after isolating a true financial objection."

This is fine as written, but it's the only place in the financial bucket where a step is pure paraphrase with zero verbatim. Cole has a usable verbatim line for the "redirect to value" move (batch-1, "I Reacted…"):
> "So, are you looking for the cheapest option, or are you looking for a premium quality option?"

and the pricing-anchor verbatim (batch-6, "Discounts & Incentive Based Pricing"):
> "The investment to get your business to 20k a month, ultimately 240k a year, is just 10k."

**Change:** keep "No." as step 1 (correct), but rewrite step 2 to give the rep an actual word-track: re-anchor the price to the outcome ("the investment to get you to [outcome] is just [price]") and offer the binary ("cheapest option, or a premium-quality option?"). As written it's a coaching note, not something a rep can say mid-call — the brief's test ("would a real closer trust these word-for-word") fails here.

---

## SHOULD IMPROVE

### 4. `price-too-expensive` / `payment-plan` — the price-drop is missing the "two clients to break even" ROI bridge

Cole's fullest price-drop verbatim (batch-1, "Handling Objections… That's Too Expensive") includes a mid-sentence ROI reframe the app drops:
> "I also don't think the best thing for you is to do nothing **and besides, for you it's what, two clients at 6k to break even, right?** … what I'd be willing to do for you is let you in for a third down…"

The "X clients to break even" bridge is what makes the partial feel safe — it reframes the remaining payments as self-funding ("bankroll the rest of the payments"). The app's step 6 has the "build momentum… afterthought" half but not the break-even math. **Change:** add an optional clause to the price-drop step: "(and based on what you told me, that's only [N] clients / [N] sales to break even)". This is the difference between a soft close and a logical one.

### 5. `payment-plan` — step 4's "go lower again" line should carry the full verbatim trade, including "take the bet on yourself"

**App currently (response_steps[3]):**
> "If you have to go lower again, ask for more back: 'If I'm willing to do that for you, will you move forward right now AND give me a case study when you get amazing results?'"

Correct, and matches batch-7 verbatim. But Cole's deeper-concession verbatim (batch-8, "Sales Objection Masterclass") adds an identity hook the app omits:
> "if I'm willing to go down, let you in for a third down… if I'm willing to do that for you, will you move forward right now, **take the bet on yourself**, and when you do get results give me a case study?"

**Change:** insert "take the bet on yourself" — it converts the concession from a transaction into a commitment-to-self frame, which is the whole reason the trade works. Minor, but it's free punch.

### 6. `price-too-expensive` — step 5 ("And you really want to do this, right?") is correct but isolated; flag it as a hard gate

The app has step 5 as a standalone line. In every Cole verbatim (batch-4, batch-5, batch-6, batch-7) "And you really want to do this, right?" is the *gate immediately before* the price-drop — it must get a "yes" or the rep does not proceed to step 6. The app lists it as just another step with no instruction that a non-yes here means STOP and route back to uncertainty. **Change:** annotate step 5: "(This must get a clear 'yes.' If they hesitate here, it was never a financial objection — go back to the uncertainty handle.)"

### 7. `move-money-around` — step 2 should keep Cole's exact double-question; "that day" tie-down is good, don't lose it

App step 2 is faithful ("And when is that going to be finished? … And once it's done, you're 100% moving forward that day?"). Matches batch-6 verbatim ("And when is that going to be finished by? … And then when that's finished, you're 100% moving forward."). No change needed — noting it as correct so it isn't "improved" into something weaker. The phrase "that day" is a stronger tie-down than the source's bare "moving forward" — keep it.

---

## GAPS / MISSING

### 8. `price-too-expensive` — the cash-on-hand step is missing Cole's exact disarming clarifier

The app's open-wallet step has a parenthetical: *"(I'm not asking what you can spend right this second — I'm asking what you actually have access to, what's in checking.)"* — good, that's on-corpus. But Cole's fullest version (batch-1, "The Ultimate Sales Training For 2026") adds a reason that keeps the prospect honest even if they can't buy today:
> "I don't even know if you could do this right now… but what I am asking is what's actually available, **because even if we can't do something now, I want to make sure you have a game plan to work towards this in the future.**"

This "even if not now, a game plan for the future" framing is also Cole's stated purpose for the whole open wallet (it appears verbatim in the permission step too). **Gap:** the app's open-wallet step never states *why* the rep is asking. Add the game-plan rationale so the prospect doesn't feel interrogated. This also makes the open wallet consistent with the permission line (step 3) which already promises "or at the very least create a game plan for the future."

### 9. No "pay-more-up-front gets better results" belief-line anywhere in the financial bucket

Cole repeatedly arms the rep with a belief-justification for pushing PIF before conceding to a plan (batch-5, "I Closed 4,126 Clients… Part 3"):
> "people who pay more upfront, they get better results and they just believe in themselves more, they burn the boats — it's like night and day."

This is missing from `price-too-expensive`, `payment-plan`, and the universal `concession_rule`. **Gap:** add it as an alt_reframe on `payment-plan` (or to the `concession_rule`). Without it, a rep facing "can we just do a payment plan?" has no principled reason to hold the line on PIF first — they'll capitulate to the plan immediately, which is the exact failure mode batch-3 calls out ("did they just capitulate?").

### 10. `discount-request` — missing the "no fast-action discount / keep the price simple" verbatim and the silence instruction

App step 1 says "No." and parenthetically "Don't do fast-action discounts." Good. But Cole pairs the price quote with a hard *silence* instruction the app omits (batch-1, "Handling Objections… That's Too Expensive"):
> "the investment is just 12k." (then silence — no fast-action discounts, no payment plans offered up front)

**Gap:** the discount entry never tells the rep to *quote the price and stop talking*. The single most common discount-handling error is the rep filling the silence with a softener or a plan. Add a step: "Quote the price as a flat statement — 'the investment is just [price]' — then go silent. Do not fill the pause."

### 11. No cross-reference from `payment-plan` to the "pitch painful price, use plans as closing leverage" principle

batch-5 verbatim: *"I pitch the painful price and then I use the payment plans as essentially negotiating leverage at the close… I don't just offer the payment plan, I ask for a trade."* The app's `do_not` on `payment-plan` and the universal `concession_rule` cover the "trade it" half, but neither states the *sequencing* principle: the painful (full) price is pitched first, on purpose, so the plan has somewhere to drop from. A rep who quotes a plan-friendly price up front has destroyed their own leverage. **Gap:** add one line to `payment-plan` `do_not` or `concession_rule`: "Pitch the full price first — the painful number is the anchor; payment terms are closing leverage that only work if you dropped from somewhere."

---

## Verified-correct (no change — flagged so they aren't "improved" into weaker versions)

- `price-too-expensive` step 6 — the "I don't think the best thing… I also don't think… so what I'd be willing to do… afterthought… if I'm willing to do that, are you willing to move forward right now?" is faithful to batch-1/4/5/6/7/8. Strong.
- `payment-plan` step 1 — confirming "money aside, 100% in" before giving any plan: correct, matches the iron rule.
- `payment-plan` `do_not` ("Never blurt 'what about a two-pay?'") — verbatim-faithful to batch-4 ("do not for the love of God say 'but what about a two-pay'").
- `discount-request` step 1 "No." — verbatim-exact (batch-1: "when you ask for discounts, I just said no. There's nothing more you need to say than that.").
- `alt_reframes` on `price-too-expensive` ("expensive compared to what" + "has 10K always been a lot to you") — both verbatim-faithful to batch-1 and batch-8.
