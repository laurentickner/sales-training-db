# Code Review 8 — Data Pipeline & Build

Scope: `scripts/build_app_data.py`, the 3 `app-data/*.json` files, `app/data/data.js`, and how `app/app.js` consumes `window.COPILOT_DATA`.

Status at review time: `data.js` IS currently in sync with the JSON sources (verified by re-running the build in-memory). The findings below are about robustness and the structural risk, not a present-tense bug in the bundle.

---

## CRITICAL

### C1 — Build script does no validation and the app trusts the data blindly
**Location:** `scripts/build_app_data.py` (whole file); `app/app.js:9-13`.

The build script is 4 effective lines of `json.load` + `json.dumps`. It never checks that:
- the top-level keys exist (`objections.objections`, `flags.flags`, `funnel.stages`),
- each objection has `triggers` + `response_steps`,
- each flag has `triggers` + `probe`,
- `triggers` is a non-empty list.

The app then dereferences `DATA.objections.objections`, `o.triggers`, `o.response_steps`, `f.triggers`, `f.probe`, `st.name`, `st.goal` with **zero defensive checks** (`app.js:10-13, 64-74, 92, 109`). One malformed entry — e.g. an objection missing `triggers`, or a typo'd top-level key — produces a `TypeError` inside `analyzeKeyword`/`scoreTriggers` on the first keystroke, and the whole copilot dies silently mid-call (the only guard is the `if (!DATA)` alert at `app.js:8`, which won't catch a structurally-wrong-but-present object).

The `print()` at `build_app_data.py:26-27` actually *relies* on `objections['objections']`, `o['triggers']`, `fl['triggers']`, `funnel['stages']` all existing — so a bad file crashes the script with a bare `KeyError`/`TypeError` and a confusing traceback rather than a clear "discovery-flags.json: flag #4 missing 'triggers'" message.

**Fix:** Add a `validate()` function to `build_app_data.py` that runs before `json.dumps` and `sys.exit(1)`s with a precise message on the first failure. Minimum checks:
```python
REQUIRED_OBJ   = {"id","bucket","type","label","triggers","response_steps","source"}
REQUIRED_FLAG  = {"id","signal","belief","triggers","probe","note"}
REQUIRED_STAGE = {"id","name","goal","listen_for","say","advance_when"}

def need(cond, msg):
    if not cond:
        sys.exit(f"build_app_data.py: VALIDATION FAILED — {msg}")

need("objections" in objections, "objection-responses.json missing top-level 'objections'")
ids = set()
for i, o in enumerate(objections["objections"]):
    missing = REQUIRED_OBJ - o.keys()
    need(not missing, f"objection #{i} ({o.get('id','?')}) missing {missing}")
    need(isinstance(o["triggers"], list) and o["triggers"], f"objection {o['id']}: empty/invalid triggers")
    need(isinstance(o["response_steps"], list) and o["response_steps"], f"objection {o['id']}: empty response_steps")
    need(o["id"] not in ids, f"duplicate objection id {o['id']}")
    ids.add(o["id"])
# ...same shape for flags (REQUIRED_FLAG) and stages (REQUIRED_STAGE)
```
This makes the build **fail loudly** instead of shipping a `data.js` that bricks the app.

### C2 — `data.js` is generated but committed to git — guaranteed drift
**Location:** `app/data/data.js` (tracked: `git ls-files` confirms it); `build_app_data.py:22-23`.

`data.js` is a build artefact (header literally says "AUTO-GENERATED … do not edit by hand") yet it is committed. Nothing enforces regeneration: anyone editing `objection-responses.json` and forgetting to re-run the script ships a stale bundle, and the app loads the **old** knowledge base with no warning. The 3 source JSONs and `data.js` were last committed in *different* commits (`ac9ca0c` vs `1c469ad`) — the exact pattern that produces silent drift. There is no pre-commit hook, no CI step, no checksum.

**Fix — pick one, in order of preference:**
1. **Stop committing the artefact.** Add `app/data/data.js` to `.gitignore` and make `build_app_data.py` part of the deploy step. (Note: this is a static no-build app today, so see option 2 if you want zero tooling.)
2. **Make the app load the JSON directly** and delete the build script entirely. `app/index.html` can `fetch('../app-data/objection-responses.json')` etc. on init — no generated file, no drift, single source of truth. The only reason for the bundle is to avoid 3 `fetch`es / `file://` CORS; if the app is ever served over `http://` (it should be), direct loading is strictly better. This is the recommended fix.
3. If the bundle must stay committed: add a **drift guard** — a pre-commit hook (or CI check) that re-runs the build and fails if `git diff --exit-code app/data/data.js` is non-empty. This catches "edited JSON, forgot to rebuild."

Recommendation: option 2 (load JSON directly, drop the script). It removes an entire failure mode. If `file://` support is a hard requirement, keep option 3.

---

## SHOULD FIX

### S1 — Duplicate triggers across objections cause double-matches
**Location:** `objection-responses.json`.

The same trigger phrase appears in two objections, so one prospect line scores **two** cards (both shown, competing for the rep's attention mid-call):
- `"way more than I thought"` — in both `price-too-expensive` and `competitor-cheaper`.
- `"I don't know"` — in both `nerves-fear` and `waffling-smokescreen`.

And across discovery flags:
- `"scared"` — in both `emotional-word` and `fear-risk-word`.
- `"we decided"` — in both `mentions-spouse` and `says-we`.

`analyzeKeyword` (`app.js:64-74`) keeps the top 3 of each, so duplicates burn a slot and can push a more relevant card off the list. For `"I don't know"` the two objections genuinely overlap, but the rep should be pointed at one primary handle.

**Fix:** De-dup. Assign each phrase to its single best owner: `"way more than I thought"` → `competitor-cheaper` only (price already has `"more than I thought"`); `"I don't know"` → `waffling-smokescreen` only; `"scared"` → `fear-risk-word` only; `"we decided"` → `says-we` only. Then add a build-script check that errors on any trigger string appearing in 2+ objections (or 2+ flags) so this can't regress.

### S2 — Cross-objection substring triggers cause unintended co-matches
**Location:** `objection-responses.json`; matching logic `app.js:39-59`.

`scoreTriggers` matches by `inputNorm.indexOf(trigger)` substring. Several triggers are substrings of triggers belonging to a *different* objection, so the shorter one fires on input meant for the other:
- `"more than I thought"` (`price-too-expensive`) is inside `"way more than I thought"` (`competitor-cheaper`) — a prospect comparing competitors also lights up the price card.
- `"next quarter"` (`timing-start-later`) is inside `"circle back next quarter"` (`think-about-it`).
- `"how do I know"` (`trust-why-you`) is inside `"how do I know this works"` (`what-if-it-doesnt-work`).

Within the *same* objection this is harmless (and intentional — broad + specific variants). Across objections it produces noise.

**Fix:** This is a data-quality issue the build script should *report*, not silently bless. Add a cross-objection substring scan to `build_app_data.py` that prints a `WARN:` line for every trigger that is a substring of a trigger in a different objection. Then manually resolve the 3 above — e.g. drop bare `"how do I know"` from `trust-why-you` (it has 8 other, more specific triggers) and rely on `"why should I trust you"`, `"are you legit"`, etc.

### S3 — Schema inconsistency: optional fields the app reads but most entries lack
**Location:** `objection-responses.json`; `app.js:96`.

`do_not` is present on only 7 of 26 objections; `alt_reframes` on exactly 1 (`price-too-expensive`). The app handles `do_not`'s absence (`if (o.do_not)` at `app.js:96`) — fine — but **`alt_reframes` is never read by the app at all**. So either it's dead data, or the app is missing a feature it was authored for.

This isn't a crash, but it's an undeclared-optional-field situation: there is no schema saying which fields are required vs optional, so a reviewer can't tell whether a missing `do_not` is intentional or an oversight. (For comparison: discovery flags are perfectly uniform — all 24 have all 6 fields. Funnel stages: all 6 have all 6 fields. Objections are the only inconsistent file.)

**Fix:** (a) Decide whether `alt_reframes` should render — if yes, add a block to `objectionCard` (`app.js:85-101`); if no, delete the field from the JSON so it's not misleading. (b) Document required vs optional fields — see N1. (c) Optionally audit the 19 objections without `do_not`: several (`been-burned` aside) clearly have anti-patterns worth a "Don't" line.

### S4 — Build script: file handles leaked, no error handling, hard-coded absolute path
**Location:** `build_app_data.py:3, 8-10, 22`.

- `base = "/Users/laurentickner/Desktop/sales-training-db"` — absolute path hard-coded. The script breaks for any other machine/checkout/CI. Derive it: `base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))`.
- `json.load(open(...))` ×3 — file handles never closed; and a malformed JSON throws a raw `json.JSONDecodeError` with no indication of *which* of the 3 files failed. Wrap each load: `try: ... except json.JSONDecodeError as e: sys.exit(f"{name}: invalid JSON — {e}")`, and use `with open(...) as f:`.

**Fix:**
```python
import json, os, sys
base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def load(name):
    path = os.path.join(base, "app-data", name)
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        sys.exit(f"build_app_data.py: missing {path}")
    except json.JSONDecodeError as e:
        sys.exit(f"build_app_data.py: {name} is not valid JSON — {e}")
```

### S5 — App has no defensive handling for a stage id it doesn't recognise
**Location:** `app.js:120, 196, 280` (`STAGES.filter(...)[0]`).

`state.stage` defaults to `"discovery"` and is only ever set from `STAGES` data, so today it's safe. But `noneCard()`, `analyze()` and `renderStageRef()` all do `STAGES.filter(s => s.id === state.stage)[0]` and then immediately dereference `.name`/`.goal`/`.say`. If a future JSON edit renames or removes a stage id while `data.js` is stale (see C2), every one of these throws `Cannot read properties of undefined`. Cheap to harden.

**Fix:** Centralise: `function stageById(id){ return STAGES.filter(s=>s.id===id)[0] || STAGES[0]; }` and use it everywhere, so a missing stage degrades gracefully instead of crashing.

---

## NICE TO HAVE

### N1 — Add a JSON-schema validation step
There is currently no machine-readable contract for the 3 files. Add `app-data/schema/` with one JSON Schema per file (objections, flags, stages) and validate in the build:
```python
import jsonschema  # or a tiny hand-rolled checker to avoid the dependency
jsonschema.validate(objections, OBJECTION_SCHEMA)
```
This subsumes C1's ad-hoc checks with a declarative spec, documents required vs optional fields (resolving S3's ambiguity — mark `do_not`/`alt_reframes` `"required": false`), and lets a CI job validate on every PR. If adding a dependency is unwanted, the explicit `validate()` from C1 is an acceptable substitute — but the schema files are still worth having as documentation.

### N2 — Build script should report the data-quality warnings, not just counts
`build_app_data.py:25-28` prints useful counts. Extend that summary to also print the S1/S2 findings every run: duplicate-trigger count, cross-objection substring count, and any empty `triggers`/`response_steps`. A non-blocking `WARN:` block at build time means these never silently accumulate. (Empty trigger arrays: none exist today — good — but nothing prevents one being added.)

### N3 — `norm()` strips apostrophes; document the trigger-authoring rule
`app.js:31` normalises `"can't"` → `"cant"`. The JSON authors clearly know this (triggers are written `"can't afford it"` and still match because both sides run through `norm()`), but it's implicit. Add a one-line note to `app-data/README.md`: *"Triggers are matched after lowercasing and stripping punctuation — write them naturally; apostrophes/hyphens are ignored."* Prevents a future contributor from 'fixing' triggers into a broken state.

### N4 — Pin the JSON `version` fields to something the build checks
`objection-responses.json` is `"version": "2.0"`, the other two are `"1.0"`. Nothing reads these. Either wire them into the build summary output (so a deploy log shows which data version shipped) or drop them. Right now they're decorative.

### N5 — `data.js` `file://` vs `http://` note
The bundle exists largely to dodge `fetch()` CORS under `file://`. If the app is always served over `http://` (it should be, given the Anthropic API call in smart mode needs a secure-ish context anyway), N5 reinforces C2 option 2: load the JSON directly and delete the build entirely. Worth a decision, not just a workaround.
