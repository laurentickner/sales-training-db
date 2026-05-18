# Trigger-Phrase Audit — objection-responses.json + discovery-flags.json

Auditor: high-ticket closer. Scope: `triggers` arrays only. Matching is substring/fuzzy against
what the rep types (the prospect's last line). Goal: phrases must reflect how prospects ACTUALLY
talk — casual, hedged, indirect — without false-firing on unrelated speech.

Source of truth for real phrasings: `_mining/batch-1.md`–`batch-8.md` "How prospects phrase it" lines.

---

## TOO LOOSE (false positives)

These triggers are short enough to substring-match unrelated, common call speech.

### price-too-expensive
- **`"that's a lot"`** — fires on "that's a lot of work," "that's a lot of leads," "that's a lot of clients." On a discovery call the prospect describes their *business* with "that's a lot" constantly. TIGHTEN to `"that's a lot of money"` / `"that's a lot for"` (already have "that's a lot of money").
- **`"expensive"`** — bare adjective. Fires on "my last agency was expensive," "expensive lesson" (which is a *been-burned* signal, not a live price objection). Keep `"too expensive"` / `"pretty expensive"`; REMOVE bare `"expensive"`.
- **`"pricey"`** — borderline; usually fine, but can fire on prospect describing a competitor ("their stuff is pricey"). Acceptable to keep — low risk.
- **`"no money"`** — fires on "there's no money in that niche," "no money down," "they had no money to spend on ads." TIGHTEN to `"I have no money"` / `"got no money"`.
- **`"got to find the money"`** — fine. But note overlap risk with move-money-around (see Overlaps).

### think-about-it
- **`"in an email"`** — fires on any logistics talk: "you sent that in an email," "we do everything in an email," "I got your invite in an email." TIGHTEN to `"send it in an email"` / `"send me an email"` / `"all this in an email"`.
- **`"need some time"`** — fires on "the build needs some time," "my team needs some time to ramp." Acceptable-ish but consider TIGHTEN to `"I need some time"` / `"give me some time"`.
- **`"need some space"`** — fires on "we need some space in the calendar," "I need some space to grow." TIGHTEN to `"I need some space"` (and even that is weak — low-value trigger, consider REMOVE).
- **`"circle back"`** — usually a real stall signal; keep. But "let's circle back to that point" mid-discovery is a false fire. Acceptable risk.

### need-to-do-research
- **`"check you out"`** — fires on casual banter ("I'll check you out on LinkedIn" said warmly is still this objection — actually fine) but also "check out my website." Low risk; keep.
- **`"look into it"`** — fires on "I'll look into it on my end," "let me look into that number." Mild. Keep but aware.

### been-burned
- **`"didn't work"`** — VERY loose. Fires on the prospect describing literally any past tactic: "Facebook ads didn't work," "that hire didn't work out," "cold email didn't work for us." Many of those ARE the been-burned objection — but many are neutral discovery context. Combined with `"it didn't work last time"` and `"tried before"` you have enough specific anchors. TIGHTEN bare `"didn't work"` to `"it didn't work"` at minimum (drops "didn't work out for them").
- **`"skeptical"`** — fine, keep.
- **`"tried before"`** — fires on "I tried before to hire," generic. Keep — usually correct context.
- **`"overpromised"`** — fine, keep.

### competitor-cheaper
- **`"competitor"`** — prospects rarely say the word "competitor" about *your* competitor; the REP says it. False-fire risk is actually low because it's the prospect's words being typed — but if the rep paraphrases, it misfires. Keep, low risk.
- **`"cheaper"`** — fires on "I found a cheaper way to do X" unrelated to your offer. Mostly correct. Keep.
- **`"someone else"`** — fires on "someone else handles that," "I'd delegate it to someone else." TIGHTEN to `"talking to someone else"` / `"go with someone else"`.
- **`"another guy"`** / **`"talked to a guy"`** — fine, distinctive.
- **`"way more than I thought"`** — appears in BOTH competitor-cheaper AND price-too-expensive (see Overlaps).

### timing-start-later
- **`"next month"`** — fires on "we close four homes next month," "revenue next month should be up." TIGHTEN to `"start next month"` / `"do it next month"` / `"wait till next month"`.
- **`"next quarter"`** — same problem ("next quarter we're hiring"). TIGHTEN to `"next quarter initiative"` / `"start next quarter"` / `"wait till next quarter"` (you already have `"wait till next quarter"`).
- **`"not right now"`** — fires on "not right now but soon," generic. Mild. Keep.
- **`"in january"`** — fires on "we launched in January." TIGHTEN to `"start in january"` (already present) — REMOVE bare `"in january"`.

### no-time-to-implement
- **`"swamped"`** — fine.
- **`"too busy"`** — fires on "my team is too busy," neutral. Mostly correct context. Keep.
- **`"no bandwidth"`** — overlaps with discuss-with-team `"team bandwidth"` (see Overlaps).

### nerves-fear
- **`"I don't know"`** — EXTREMELY loose. The single most common filler phrase on any call. Fires constantly in discovery ("I don't know my exact numbers," "I don't know, maybe 20 leads"). Also duplicated verbatim in waffling-smokescreen. REMOVE from nerves-fear; keep only in waffling-smokescreen, and even there it is risky (see below).
- **`"big decision"`** — fine, distinctive.
- **`"scary"`** / **`"scared"`** — fine.
- **`"hesitant"`** — fine.

### what-if-it-doesnt-work
- All triggers here are full-phrase and specific. Fine. No loose entries.

### too-risky
- **`"risky"`** — bare; fires on "Facebook is risky," "that's a risky channel" (neutral discovery). TIGHTEN to `"too risky"` / `"feels risky"` / `"it's risky"` (you already have `"too risky"` and `"it's a risk"`). REMOVE bare `"risky"`.
- **`"big leap"`** — fine; but also lives in fear-risk-word flag (acceptable — flag vs objection are different surfaces).

### do-it-myself
- **`"I can do this"`** — loose. Fires on confidence statements unrelated to DIY-vs-buy ("I can do this part already," "I can do this if you show me once"). TIGHTEN to `"I can do this myself"` / `"I can do this on my own"`.
- **`"figure it out myself"`** — fine.

### want-to-see-it
- **`"show me"`** — loose. Fires on "show me the numbers," "show me an example," "show me how the temp check works" — much of which is healthy engagement, not an objection. TIGHTEN to `"show me the inside"` / `"show me how it works"` / `"can you show me it"`.
- **`"see how it works"`** — overlaps heavily with logistics-question flag `"how does it work"` (see Overlaps).

### same-day-decisions
- **`"personal rule"`** / **`"I have a rule"`** — fine, distinctive.
- **`"need 24 hours"`** — fine.

### trust-why-you
- **`"how do I know"`** — loose-ish; fires on "how do I know which package," "how do I know it's the right channel." But usually correct context. Keep, low risk.
- **`"why you"`** — VERY loose. Two-word fragment, substring-matches inside "why you think," "why you'd recommend," "that's why you should," "why you guys do it that way." REMOVE `"why you"` — you already have the specific `"why is it you I should trust"` and `"why should I trust you"`.
- **`"trust you"`** — fine.

### payment-plan
- **`"break it up"`** — fires on "let's break it up into phases" (project scoping), "break it up over the year." Mostly correct in a price context. Keep, low risk.
- **`"split it up"`** — same, low risk. Keep.
- **`"finance it"`** — fine.

### move-money-around
- **`"move some money"`** / **`"move money around"`** — fine, distinctive.
- **`"give me two days"`** — loose-ish; fires on "give me two days to get my team briefed." But in a closing context usually correct. Keep.
- **`"give me till friday"`** — fine.

### make-money-first
- All specific. Fine.

### prospect-taking-control
- **`"what's the price"`** — DUPLICATED verbatim in discovery-flags `asks-price-early` (see Overlaps). Both should fire — different surfaces — but be aware the same input lights two systems.
- **`"how much is it"`** — same duplication with asks-price-early.
- **`"let me ask my questions"`** — fine.
- **`"I get sold all the time"`** — fine, distinctive.

### waffling-smokescreen
- **`"I don't know"`** — see nerves-fear note. Loose; the most common filler on a call. KEEP here (this objection is *about* waffling) but accept it will over-fire in discovery. Best mitigation: this is a close-phase objection — if the app has phase context, gate it. Otherwise leave with awareness.
- **`"maybe"`** — bare word. Fires nonstop ("maybe 30 leads," "maybe last Tuesday"). REMOVE bare `"maybe"`; rely on `"I'm not sure"`, `"I think so"`, `"I guess so"`.
- **`"kind of"`** — bare; DUPLICATED in vague-answer flag, and fires constantly ("kind of busy," "kind of new"). REMOVE from this objection (vague-answer flag already covers it as a discovery signal).
- **`"I think so"`** — distinctive enough in a post-pitch context. Keep. (Also in uncertain-tonality flag — intended.)

### discount-request
- **`"deal"`** — bare word. Fires on "that's a big deal," "no big deal," "deal with that later," "a great deal of revenue." REMOVE bare `"deal"`; keep `"any deals"`.
- **`"any discounts"`** / **`"discount"`** — `"discount"` alone is acceptable (rarely used neutrally). Keep.
- **`"best price"`** — fine.

---

## MISSING (false negatives — app stays silent when it shouldn't)

Real prospect phrasings from the mining batches that NO current trigger will match.

### price-too-expensive
- `"that's pretty expensive, man"` — have `"that's pretty steep"` but not `"pretty expensive"`. ADD `"pretty expensive"`.
- `"that's just a lot of money for this"` — ADD `"a lot of money for this"`.
- `"do you guys have anything cheaper"` — ADD `"anything cheaper"` / `"something cheaper"` (also relevant to discount-request).
- `"I can't make this work"` — ADD `"can't make this work"`.
- `"I don't know how I can afford that"` / `"don't know if I can afford that right now"` — ADD `"don't know if I can afford"` / `"how I can afford"`.
- `"it's just a matter of how I'm going to come up with the money"` / `"how I'm going to come up with the money"` — ADD `"come up with the money"`.
- `"7.5K is a lot"` / `"2500 that's pretty steep"` — current `"10k is a lot"` is too literal a price. ADD generic `"is a lot"` is too loose — instead ADD `"that's a lot for this"`. Better: the existing `"that's just a lot for me right now"` covers the spirit; also ADD `"it's just a lot for me right now"`.
- `"I'm really struggling"` — ADD `"really struggling"` (financial-stress signal).

### think-about-it
- `"I'm gonna think on this"` / `"think on this"` — have `"think on this"`. OK.
- `"I just want to think about it and do my research"` — covered by `"think about it"`. OK.
- `"I just really need to gather myself on this one"` / `"gather myself"` — ADD `"gather myself"`.
- `"let me know"` is not present standalone — have `"I'll let you know"`. OK.
- `"is there a chance I can do the whole process again tomorrow"` — niche; SKIP or ADD `"do the whole process again"`.
- `"I'll get back to you with the decision"` / `"get back to you with a decision"` — have `"get back to you"`. OK.
- `"I have all the information now"` / `"I have all the information I need"` — ADD `"have all the information"` (stalled-followup phrasing — distinct from "send me the info").

### need-to-do-research
- `"I need a written agreement"` / `"written agreement"` — ADD `"written agreement"`.
- `"I need to see a proposal"` — overlaps with think-about-it `"send me a proposal"`. The research entry should also catch it. ADD `"see a proposal"` here (or accept think-about-it match).
- `"I need to get some info"` / `"need to gather some info"` — ADD `"get some info"` / `"gather some info"`.

### talk-to-your-clients
- `"do you have any clients I can speak to"` — have `"do you have clients I can speak to"`. Add the `"any"` variant: ADD `"clients I can speak to"` (substring catches both).
- `"talk to some clients"` — have `"talk to some of your clients"`. ADD `"talk to some clients"`.
- `"I have a rule where I speak to a client first"` — this blends same-day-decisions + clients. ADD `"speak to a client first"`.

### spouse-partner
- `"talk to somebody else"` — have `"need to talk to somebody else"`. OK.
- `"I have to let my wife know"` / `"let my wife know"` — have `"let her know"` / `"let him know"`. Borderline — `"let her know"` substring-matches "let her know how I feel." ADD explicit `"let my wife know"` / `"let my husband know"` / `"let my spouse know"`.
- `"I just want to pass her first"` / `"pass it by her"` — ADD `"pass it by"` / `"pass her first"`.
- `"I need to talk to my financial advisor"` — NOT covered anywhere. ADD `"financial advisor"` to spouse-partner (or discuss-with-team). Real and recurring.
- `"check with somebody else"` / `"check with someone else"` — have `"check with my partner"`. ADD `"check with somebody"` / `"check with someone else"`.
- `"stick with my partner"` (a transcription of "sit with my partner") — niche, SKIP.
- `"need to run this by my spouse"` — have `"run it by my wife/husband"` but NOT `"run this by"`. ADD `"run this by my"` (catches "run this by my spouse/wife/partner").

### multiple-partners
- `"discuss with the partners"` — have it. OK.
- `"run it by one of the other partners"` / `"talk to one of the other partners"` — have `"talk to the other partners"`. ADD `"one of the other partners"`.
- `"we need to discuss with the partners and get back to you"` — covered. OK.

### discuss-with-team
- `"I need to get it approved"` / `"get it approved"` / `"needs approval"` — ADD `"get it approved"` / `"needs approval"`.
- `"run it by procurement"` / `"procurement"` — mining mentions procurement. ADD `"procurement"`.
- `"my team is going to implement this"` — have `"my team has to implement"`. ADD `"team is going to implement"`.
- `"I don't think this should be a priority right now"` — this is really a priorities/accountability objection, but it surfaces under discuss-with-team in the mining. SKIP here (too sentence-like; routes better via no-time-to-implement).

### been-burned
- `"I don't see how this is different"` / `"how is this going to be different"` / `"how is this different"` — NOT covered. ADD `"how is this different"` / `"how is this going to be different"` / `"don't see how this is different"`. Recurring in mining as the been-burned/trust-in-method phrasing.
- `"I've seen this before"` — have it. OK.
- `"this sounds like what we did before"` — ADD `"what we did before"`.
- `"the last company didn't fulfill"` — have `"last company didn't fulfill"`. OK.
- `"Facebook doesn't work for me"` / `"that doesn't work for me"` — channel-specific been-burned. ADD `"doesn't work for me"` (carefully — somewhat loose, but distinctive enough vs neutral speech).
- `"I've tried like four different clubs"` / `"hired six or seven closers"` — covered by `"tried before"`. OK.

### competitor-cheaper
- `"we want to get a couple other quotes first"` — have `"get a couple quotes"`. OK.
- `"I have a call set up with another program"` — have `"another program"`. OK.
- `"I'm looking into a couple other things"` / `"looking into other"` — ADD `"looking into other"` / `"looking into a couple"`.
- `"I've talked to a lot of other coaching companies"` — have `"other companies"`. OK.
- `"usually this runs about 10k yours was 15"` / `"usually runs about"` — niche price-anchoring. SKIP or ADD `"usually runs"`.

### timing-start-later
- `"I want to start January 1st"` / `"January 3rd"` — have `"start january"`. OK.
- `"this is a next quarter initiative"` — ADD `"next quarter initiative"`.
- `"let's circle back in three months"` — currently only in think-about-it (`"circle back next quarter"`). ADD `"circle back in three months"` and consider `"in three months"`.
- `"after I close four homes"` / `"when I close four homes"` — niche industry phrasing. SKIP.

### no-time-to-implement
- `"stretched thin"` — covered in busy-no-time flag but NOT this objection. ADD `"stretched thin"`.
- `"wearing all the hats"` — same. ADD `"wearing all the hats"`.
- `"can't dedicate any time"` — have `"can't dedicate the time"`. ADD `"can't dedicate any time"`.
- `"wouldn't be able to dedicate"` — ADD `"able to dedicate"`.

### nerves-fear
- `"it's a little scary"` / `"a little scary"` — have `"scary"`. OK (substring).
- `"it's just hard for me to make a decision"` / `"hard for me to make a decision"` — have `"it's just hard to decide"`. ADD `"hard for me to make a decision"` / `"hard to make a decision"`.
- `"I guess I'm a little bit nervous"` / `"a little bit nervous"` — have `"nervous"`. OK.
- `"it's a big decision isn't it"` — have `"big decision"`. OK.
- `"it's just a lot"` — overlaps with price `"that's a lot"`. ADD `"it's just a lot"` to nerves-fear (the "it's a lot to take in" sense) — but note it's ambiguous (could be price). Acceptable; the diffuse/isolate step disambiguates.

### what-if-it-doesnt-work
- `"I want to be sure it's going to work"` / `"want to be sure it works"` — ADD `"want to be sure it"` / `"sure it's going to work"`.
- `"I'm going to be the lucky one it's not going to work out"` — have `"I'll be the one it doesn't work for"`. OK (close enough).
- `"I'd have to find the most similar person to me"` — niche; SKIP.

### is-there-a-guarantee
- `"can I get a guarantee"` — have `"can you guarantee"`. ADD `"get a guarantee"`.
- `"any kind of guarantee"` — ADD `"any guarantee"`.
- Otherwise well covered.

### too-risky
- `"feels too good to be true"` — have `"too good to be true"`. OK.
- `"too big of a risk"` / `"taking on too big a risk"` — have `"big risk"`. ADD `"too big of a risk"`.
- `"you got to really feel it out because it's risky"` — covered by an `"it's a risk"` substring? No — ADD `"because it's risky"` is too sentence-y; rely on tightened `"it's risky"` (see Too Loose). ADD `"it's risky"`.

### do-it-myself
- `"I'm gonna try it on my own then get back to you"` — have `"try it on my own first"`. The `"then get back to you"` variant still matches `"try it on my own"`. OK.
- `"I think I'm really gonna be good on the acquisition"` (DIY in disguise) — too contextual; SKIP.
- `"this call has been really helpful"` (used as a DIY brush-off) — too generic to trigger safely; SKIP.
- `"I'll do my own version"` / `"run my own version"` — ADD `"my own version"`.

### want-to-see-it
- `"I just want to know how it's all going to work"` — overlaps logistics-question. ADD `"how it's all going to work"` here.
- `"I don't know until I see it"` — have `"don't know until I see it"`. OK.

### same-day-decisions
- `"I always sleep on major decisions"` / `"I always sleep on big decisions"` — have `"always sleep on"`. OK.
- `"I never made decisions same day"` — have `"I never decide same day"`. ADD `"decisions same day"` (catches "never made decisions same day").
- `"I'm just doing a gut check"` / `"gut check"` — ADD `"gut check"`.
- `"my decision-making process"` — ADD `"decision-making process"` / `"decision making process"`.

### trust-why-you
- `"feels too good to be true"` — currently only in too-risky. Mining shows it surfacing under trust too. Acceptable to leave in too-risky only — but it IS a trust signal. Consider ADD `"too good to be true"` to trust-why-you, OR accept overlap.
- Otherwise covered.

### payment-plan
- `"can we break it into two"` — have `"break it into two"`. OK.
- `"it'd be easier if we broke it into two"` / `"more comfortable if we broke it into two"` — have `"break it into two"`. OK.
- `"cash flow wise it'd be easier"` / `"cash flow wise"` — ADD `"cash flow wise"`.
- `"can I do like a 10 pay"` — have `"can I do a 10 pay"`. OK.
- `"longer terms"` / `"can I get longer terms"` — ADD `"longer terms"`.

### move-money-around
- `"I'm in the process of buying a house"` / `"buying a house"` — recurring real reason ("can't make any big investments"). ADD `"buying a house"`.
- `"I just got to wait for this client payment"` — have `"wait for a client payment"`. OK.
- `"my money's tied up"` — have `"money's tied up"`. OK.
- `"organize my funds"` — have `"move funds"` but not organize. ADD `"organize my funds"` / `"organize funds"`.
- `"need to transfer funds"` — have `"transfer funds"`. OK.

### make-money-first
- `"I have this thing I'm gonna go do first and then I'll come do this"` — have `"do this other thing first then come back"`. OK-ish.
- `"once I start getting results"` — have `"after I get some results"`. OK.

### not-allowed-coaching
- `"I'm happy to have an informal call"` — have `"just an informal call"`. ADD `"informal call"` (broader).
- `"I'm not interested in any coaching program"` — have `"not interested in coaching"`. OK.

### prospect-taking-control
- `"who are you"` / `"what is this about"` — cold-call/outbound gatekeeping. Mining batch-8 has a whole "what is this about" brush-off. NOT covered anywhere. ADD `"what is this about"` / `"what's this about"` / `"make it quick"`. (Consider whether a separate outbound-brushoff objection is warranted — flag for the funnel/framework auditors.)
- `"I'd like to ask my questions"` — have `"let me ask my questions"`. OK.
- `"I get sold all the time just tell me what you got"` — covered. OK.

### waffling-smokescreen
- `"I wouldn't say 100"` — have it. OK.
- `"yeah dude I'm still not doing that"` — flat refusal; too contextual. SKIP.
- `"I just need to gather myself"` — overlaps think-about-it suggestion above. ADD `"gather myself"` here too, or rely on think-about-it.
- `"that doesn't count"` / `"I think so, that doesn't count"` — niche transcript artifact. SKIP.

### discount-request
- `"can you do anything on the price"` — have `"can you do better on price"`. ADD `"do anything on the price"`.
- `"is that the best you can do"` — ADD `"best you can do"`.
- `"anything cheaper"` — see price-too-expensive; ADD here too: `"anything cheaper"`.

### NEW OBJECTION GAPS (no entry exists at all)
- **Cold-call / outbound brush-off** — "No thank you," "I'm fully booked," "make it quick," "I'm super busy what is this about," "who are you." Mining batch-1 and batch-8 both surface this. There is NO objection entry for it. The closest is prospect-taking-control, which is about an *engaged* prospect rushing to price — different beast. RECOMMEND a new `outbound-brushoff` entry, or confirm with the funnel auditor that funnel-stages.json handles it.
- **"I'm not comfortable sharing my cash on hand"** — comes up in the open-wallet step (batch-7). No trigger anywhere. Minor; the open-wallet script lives inside price/payment response_steps. SKIP unless app surfaces mid-step.

---

## OVERLAPS / OTHER

### Cross-objection overlaps (same input lights 2+ entries — confusing double-match)
- **`"way more than I thought"`** — appears in BOTH `price-too-expensive` AND `competitor-cheaper`. Genuinely ambiguous (could be sticker shock or comparison). RECOMMEND: keep in `price-too-expensive` only (the more common read); competitor-cheaper already has `"5k cheaper"`, `"yours is more"`, `"we're talking to three other guys"` to catch the comparison case. REMOVE `"way more than I thought"` from `competitor-cheaper`.
- **`"think about it"` / `"do my research"` family** — `need-to-do-research` and `think-about-it` will both fire on "think about it and do my research." Acceptable — they're sister objections with near-identical handling (both route to temp-check). But if the app shows only one card, ensure deterministic priority (think-about-it is broader; let it win, or merge research as a sub-case).
- **`"send me a proposal"`** — in `think-about-it`; research phrasing `"see a proposal"` / `"need a proposal"` belongs to `need-to-do-research`. Decide which owns "proposal." RECOMMEND: proposal = think-about-it (it's a stall-the-decision move).
- **`"too good to be true"`** — in `too-risky`; also a trust signal. Leave in too-risky; do NOT also add to trust-why-you (avoid the double-match). Noted above.
- **`"no bandwidth"` / `"team bandwidth"`** — `no-time-to-implement` has `"no bandwidth"`; `discuss-with-team` has `"team bandwidth"`. "I don't have the bandwidth" vs "my team doesn't have bandwidth" are different objections (self vs downward-authority). Current split is fine — just confirm `"no bandwidth"` (self) doesn't substring-match inside `discuss-with-team`. It won't (different strings). OK.
- **`"big leap"`** — `too-risky` objection AND `fear-risk-word` flag. Different surfaces (objection card vs discovery flag) — intended, not a conflict.

### Objection ↔ discovery-flag duplications (intended but worth confirming app behavior)
These pairs share trigger strings. If both systems run simultaneously the rep sees an objection card AND a discovery probe for one utterance — usually fine (discovery flags fire earlier in the call), but confirm the app gates flags to the discovery phase:
- `"what's the price"` / `"how much is it"` / `"how much does it cost"` — `prospect-taking-control` objection ↔ `asks-price-early` flag.
- `"I think so"` / `"I guess so"` / `"I'm not sure"` / `"maybe"` — `waffling-smokescreen` objection ↔ `uncertain-tonality` flag (and `vague-answer` flag).
- `"kind of"` / `"sort of"` — `waffling-smokescreen` (recommended REMOVE) ↔ `vague-answer` flag.
- spouse phrases (`"talk to my wife"` etc.) — `spouse-partner` objection ↔ `mentions-spouse` flag.
- `"we"` / partner phrases — `multiple-partners` objection ↔ `says-we` flag.
- been-burned phrases — `been-burned` objection ↔ `past-attempt` flag and `fear-risk-word` flag.
- nerves phrases (`"nervous"`, `"scared"`) — `nerves-fear` objection ↔ `fear-risk-word` flag.
- busy phrases — `no-time-to-implement` objection ↔ `busy-no-time` flag.
RECOMMENDATION: this is by design (flags = discovery phase, objections = close phase). The single most important structural fix is to **gate discovery flags to the discovery phase and objections to the close phase**, so one utterance doesn't surface both. If the app has no phase state, expect noisy double-surfacing on every shared string above.

---

## DISCOVERY-FLAG TRIGGER NOTES

### TOO LOOSE (false positives) — flags
- **vague-answer `"you know"`** — verbal tic present in nearly every spoken sentence. Will fire on almost every input. REMOVE `"you know"` — it makes the flag fire constantly and trains the rep to ignore it.
- **vague-answer `"a few things"`** — fires on "a few things are going well." Mild; keep.
- **vague-answer `"here and there"`** — fine, distinctive.
- **names-a-number `"a month"`** — fires on "I started a month ago," "in a month or so," "once a month." VERY loose. TIGHTEN: rely on `"k a month"` / `"k per month"` / `"per month"`; REMOVE bare `"a month"`.
- **names-a-number `"a year"`** — same problem ("a year ago," "twice a year"). REMOVE bare `"a year"`; keep `"per year"`.
- **names-a-number `"million"`** — fine.
- **names-a-number `"figures"`** — fires on "six figures of debt," "the figures look off." Mostly correct (goal context). Keep, low risk.
- **says-we `"we both"`** — fine. `"our team"` fine.
- **past-attempt `"worked with"`** — fires on "I worked with them for years" about a current vendor, neutral. Mostly correct context (a past attempt). Keep, low risk.
- **past-attempt `"i bought"`** — fires on "I bought a house," "I bought leads." Mild. Keep.
- **stuck-long-time `"forever"`** — fires on "this call is taking forever" / hyperbole. Mild. Keep.
- **stuck-long-time `"always been"`** — fires on "it's always been this way" — actually correct context. Keep.
- **deadline-pressure `"my wife said"` / `"my husband said"`** — these also belong conceptually to `mentions-spouse`. Overlap, but different probe — acceptable.
- **misdiagnosis `"i just need more"`** — fires on "I just need more coffee" type filler. Low risk in a sales call. Keep.
- **real-reason-because `"deep down"`** — fine.
- **rambling `"and then"`** — VERY loose; "and then" appears in most multi-clause sentences. REMOVE `"and then"`; keep `"long story short"`, `"anyway"`, `"to make a long story"`.
- **rambling `"anyway"`** — fires on "anyway, last month..." Mild. Keep.
- **busy-no-time `"no time"` / `"don't have time"`** — DUPLICATES `no-time-to-implement` objection triggers exactly. Intended (flag vs objection). Keep.

### MISSING (false negatives) — flags
- **emotional-word** — ADD `"hate"`, `"struggling"`, `"struggle"`, `"hard"`, `"pissed off"`, `"can't stand"`, `"depressing"`, `"hopeless"`, `"lost"`. Current list misses the most common ones ("it's been really hard," "I'm struggling," "I hate it").
- **names-a-number** — ADD `"hit seven figures"`, `"to 100k"`, `"100k a month"` is covered by `"k a month"`; ADD `"grand a month"` (prospects say "100 grand a month" constantly — `"k a month"` will NOT match "grand").
- **mentions-spouse** — ADD `"my significant other"`, `"my missus"`, `"my old lady"`, `"my wife and I"`. Minor.
- **says-we** — ADD `"the team and I"`, `"my partners"` (have `"the partners"` / `"my business partner"` — `"my partners"` plural is a gap).
- **past-attempt** — ADD `"i've done"`, `"signed up for"`, `"invested in"`, `"i paid for"`, `"took a course"`. Current list misses "I signed up for a program," "I invested in coaching."
- **surface-goal-no-why** — ADD `"i want to scale up"`, `"take it to the next level"`, `"want to expand"`. Mild.
- **no-pain** — ADD `"things are steady"`, `"we're doing alright"`, `"not bad"`, `"could be worse"`, `"happy enough"`. The flag should catch every minimizer.
- **stuck-long-time** — ADD `"since forever"`, `"for the longest time"`, `"a couple years"`, `"been at this"`, `"ages"`, `"a while now"`. Big gap: "a while now" / "a couple years" are the MOST common ways prospects say this; current list jumps from "a few years" to specific year counts.
- **deadline-pressure** — ADD `"under pressure"`, `"need this fixed by"`, `"running low"`, `"burning through"`, `"can't sustain"`, `"this has to change"`.
- **mentions-competitor** — ADD `"got a quote from"`, `"saw someone else"`, `"another coach"`, `"another agency"`, `"weighing my options"`.
- **logistics-question** — ADD `"what's the time commitment"`, `"how long does it take"`, `"do you offer"`, `"is there a contract"`, `"how big are the groups"`, `"who do I work with"`.
- **deadline-pressure / job-they-want-to-leave** fine otherwise.
- **busy-no-time** — ADD `"slammed"`, `"buried"`, `"spread thin"`, `"can't keep up"`, `"juggling too much"`.
- **misdiagnosis** — ADD `"all I need is"`, `"the only thing missing is"`, `"if I just had"`.
- **doubt-themselves** — ADD `"i know what i'm doing"`, `"i've got the skills"`, `"i just need the time"`, `"it's not rocket science"` (overconfidence side of the doubt belief — flag note explicitly says "or overconfidence" but triggers only cover the humble side).
- **real-reason-because** — ADD `"truthfully"`, `"the truth is"`, `"what it really comes down to"`, `"honestly"`. Note: `"honestly"` is loose-ish but high-signal here.
- **contradiction** — ADD `"actually wait"`, `"hmm actually"`, `"or maybe not"`. Minor — this flag is inherently hard to trigger on substring; mostly fine as-is.

### OVERLAPS — flags
- `"i think so"` / `"i guess so"` / `"i'm not sure"` / `"maybe"` — in BOTH `vague-answer` and `uncertain-tonality`. Different beliefs (pain vs trust) and different probes. If both fire on one input the rep gets two probes — confusing. RECOMMEND: keep hedge words (`"i think so"`, `"i guess so"`, `"maybe"`, `"i'm not sure"`) in `uncertain-tonality` ONLY; let `vague-answer` keep the *content-vague* words (`"kind of"`, `"sort of"`, `"a few things"`). Currently `"i guess"` is in vague-answer and `"i guess so"` is in uncertain-tonality — near-collision.
- `"my wife said"` / `"my husband said"` — `mentions-spouse` triggers (`"my wife"`, `"my husband"`) WILL substring-match these, AND `deadline-pressure` lists them explicitly. Same input fires two flags. RECOMMEND: remove `"my wife said"` / `"my husband said"` from `deadline-pressure` (the spouse flag already catches the spouse mention; the deadline angle is secondary).
- `"my business partner"` — in both `says-we` and (conceptually) the support objections. Flags vs objections — acceptable.
- `nervous` / `scared` / `burned before` / `been burned` — `fear-risk-word` flag duplicates `nerves-fear` and `been-burned` objection triggers. Intended (discovery vs close). Keep.
- `no time` / `don't have time` / `swamped` — `busy-no-time` flag duplicates `no-time-to-implement` objection. Intended. Keep.

---

## PRIORITY SUMMARY

Highest-impact REMOVALS (kill the worst false-positive noise):
1. `vague-answer` → remove `"you know"` (fires on nearly every sentence).
2. `rambling` → remove `"and then"`.
3. `names-a-number` → remove bare `"a month"` and `"a year"`.
4. `waffling-smokescreen` → remove bare `"maybe"` and `"kind of"`.
5. `nerves-fear` → remove bare `"I don't know"`.
6. `trust-why-you` → remove `"why you"`.
7. `discount-request` → remove bare `"deal"`.
8. `price-too-expensive` → tighten `"that's a lot"` and bare `"expensive"`.

Highest-impact ADDITIONS (kill the worst false-negatives):
1. `been-burned` → `"how is this different"` / `"don't see how this is different"` / `"doesn't work for me"`.
2. `stuck-long-time` flag → `"a while now"` / `"a couple years"` / `"for the longest time"`.
3. `emotional-word` flag → `"struggling"` / `"hate"` / `"hard"`.
4. New `outbound-brushoff` objection (or confirm funnel-stages owns it) → `"what is this about"` / `"make it quick"` / `"fully booked"` / `"no thank you"`.
5. `price-too-expensive` → `"come up with the money"` / `"can't make this work"` / `"pretty expensive"`.
6. `spouse-partner` → `"financial advisor"` / `"run this by my"` / `"let my wife know"`.
7. `names-a-number` flag → `"grand a month"` (current `"k a month"` misses "grand").

Structural: gate discovery flags to the discovery phase and objections to the close phase so a single utterance doesn't surface a flag-probe and an objection-card at once.
