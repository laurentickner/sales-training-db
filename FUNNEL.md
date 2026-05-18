# The Sales Call Funnel — Map & Decision Tree

How a call flows, and where every part of this database plugs in. This is the spine the
real-time app reads from.

## The funnel

```
                    ┌─────────────────────────────────────┐
   1. INTRODUCTION  │  rapport · qualify · frame the call  │  ~60 sec
                    └──────────────────┬──────────────────┘
                                       ▼
                    ┌─────────────────────────────────────┐
   2. DISCOVERY     │  pain · doubt · cost · desire ·      │  bulk of call
                    │  money · support · (trust starts)   │  → prevents objections
                    └──────────────────┬──────────────────┘
                                       ▼
                    ┌─────────────────────────────────────┐
   3. TRANSITION    │  get them to ASK you to pitch        │  ~30-60 sec
                    └──────────────────┬──────────────────┘
                                       ▼
                    ┌─────────────────────────────────────┐
   4. PITCH         │  high-level promise → bridge        │  the method sale
                    │  (4 pillars) → delivery             │  builds TRUST
                    └──────────────────┬──────────────────┘
                                       ▼
                    ┌─────────────────────────────────────┐
   5. COMMITTING    │  questions · temp check · scale     │  thesis buy-in
                    │  1-10 · onboarding · PRICE DROP     │
                    └──────────────────┬──────────────────┘
                                       ▼
                    ┌─────────────────────────────────────┐
   6. OBJECTIONS    │  diffuse → isolate → handle →       │ ◄─┐ loop until
                    │  re-tie-down → CLOSE                │   │ 100% in
                    └──────────────────┬──────────────────┘ ──┘
                                       ▼
                                  ✅ CLOSED → button down the sale
```

## The objection decision tree

When an objection lands, **never chase it.** Run this tree:

```
Prospect raises an objection (after price)
        │
        ▼
"No problem."  ──►  diffuse the pressure
        │
        ▼
TEMP CHECK: "Money/that aside — do you feel like this is 100%
            what you need? Is there anything else keeping you
            from being less than 100% certain?"
        │
        ├──► answer is UNCERTAIN  ──►  it's an UNCERTAINTY objection
        │         │                   (handle FIRST — it's the real one)
        │         ▼
        │    Which uncertainty?
        │     ├─ "think about it / proposal"  → objections/think-about-it.md
        │     ├─ "been burned / won't work"   → objections/been-burned-before.md
        │     ├─ "competitor is cheaper"      → objections/competitor-cheaper.md
        │     ├─ "want to see it / quotes"    → objections/more-objections-from-webinar.md
        │     └─ nerves / can't pull trigger  → objections/nerves-cant-pull-trigger.md
        │
        └──► answer is "I'm 100% in, it's just ___"  ──►  it's a LOGISTIC
                  │
                  ▼
             DOUBLE TIE-DOWN: "So [X] aside, you're 100% in?"
                  │
                  ├─ money      → objections/price-and-financial.md
                  ├─ spouse/partner/team → objections/support-spouse-partner-team.md
                  └─ timing     → objections/timing-start-later.md
```

**The iron rule:** uncertainty is a *true objection*; money / support / timing are
*logistics*. Handle uncertainty FIRST. A logistic handled while uncertainty is still live
is a smoke screen — you'll lose the deal.

## The 3 objection buckets → files

| Bucket | What it is | Files |
|--------|-----------|-------|
| **Uncertainty** | Not 100% sure it's right / now is right (money aside) | think-about-it, been-burned-before, competitor-cheaper, nerves-cant-pull-trigger |
| **Support** | Must check with someone (spouse/partner/board/team) | support-spouse-partner-team |
| **Financial** | Literally can't make it work right now | price-and-financial |
| *(catch-all)* | Multi-partner, quotes, see-it, trust, financing | more-objections-from-webinar |
| *(framework)* | The universal handle for ALL of the above | 00-core-framework |

## Where each thing lives

- **The end-to-end script:** `MASTER-SALES-SCRIPT.md`
- **Phase-by-phase scripting:** `sales-process/`
- **Objection rebuttals:** `objections/`
- **App data (trigger → response):** `app-data/`
- **Raw source transcripts:** `transcripts/` (13 hand-given + 134 full channel)
