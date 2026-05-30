"""Scrub source/author attributions from data files that render in the
triage tool. Also widens the price-too-expensive triggers so common
'no money' variants fire.

Idempotent — safe to re-run.

Scrubs:
- triage-data/triage-data.json (every string, recursively)
- app-data/objection-responses.json (only objection/situation user-facing
  fields: label/response_steps/do_not/button). Leaves universal_framework
  alone — closer-only, behind app.js Claude prompt logic.
"""
import json
import os
import re
import sys

base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

NAMES = r"(?:Cayden|Cole(?:\s+Gordon)?|Jeremy(?:\s+Miner)?|Ravi(?:\s+Abuvala)?|Matt\s+Ryder|Coach\s+Cayden|NEPQ)"

# IGNORECASE applied at re.sub call time — catches "COLE", "Cole", "cole" alike.
SUBS = [
    # Verbatim source sentence
    (r"Verbatim source: [^.]+\.\s*", ""),

    # Whole-paren removals (containing source/author tag at any position)
    (rf"\s*\(Source:[^)]*\)\s*", " "),
    (rf"\s*\({NAMES}\s*[,:—-]+[^)]*\)\s*", " "),                  # (Cole, ...) / (Cole: ...) / (Cole — ...)
    (rf"\s*\({NAMES}\)\s*", " "),                                  # (Cole) bare
    (rf"\s*\({NAMES}/(?:Matt|Cole|Jeremy|Cayden|NEPQ)[^)]*\)\s*", " "),  # (Cayden/Matt, ...) / (Jeremy Miner / Cole)
    (rf"\s*\([^)]*{NAMES}[^)]*video[^)]*\)\s*", " "),              # (... from a future Cayden video)
    (rf"\s*\([^)]*{NAMES}[^)]*role-play[^)]*\)\s*", " "),          # (Cole, role-play 2)
    (r"\s*\(⚠ GAP[^)]*\)\s*", " "),                                # dev-note GAPs

    # Drop the "Cole + Jeremy's", "Cole/Jeremy's", "Jeremy/Cole" attribution prefixes
    (rf"\b{NAMES}\s*[+/]\s*{NAMES}'s\s+", ""),
    (rf"\b{NAMES}\s*[+/]\s*{NAMES}\s+", ""),

    # Inside-paren leading attribution: "(Cole — text)" -> "(text)"
    (rf"\(\s*{NAMES}\s*[—-]+\s*", "("),
    # Inside-paren trailing attribution: "(text — Cole)" / "(text Cole)" -> "(text)"
    (rf"\s*[—-]+\s*{NAMES}\s*\)", ")"),
    (rf"\s+{NAMES}\s*\)", ")"),

    # Possessive prefix: "Cole's INVERSION" -> "INVERSION"
    (rf"\b{NAMES}'s\s+", ""),

    # Em-dash / hyphen inline attributions in body text: "...probe — Cole..."
    (rf"\s*[—-]{{1,2}}\s*{NAMES}\b", ""),

    # Leading bare-name + CAPS technique: "COLE INVERSION:" -> "INVERSION:"
    (rf"\b{NAMES}\s+(?=[A-Z]{{3,}})", ""),

    # Bare leading names with colon: "Cole: stay calm" -> "stay calm"
    (rf"\b{NAMES}:\s*", ""),

    # Bare leading names with verb: "Cole tell:" / "Cole reframes" -> drop name
    (rf"\b{NAMES}\s+(?=tell\b|reframes?\b|teaches?\b|says?\b|notes?\b)", ""),

    # Trailing bare NEPQ at end of caps phrase: "BUY NEPQ" -> "BUY"
    (r"\s+NEPQ\b", ""),
    # Strip standalone "NEPQ " when it leads a sentence
    (r"\bNEPQ\s+", ""),

    # Inline attribution mid-sentence: "Cole reframes it as ..." (after stripping above)
    (rf"\b{NAMES}\s+(?=\w+\s+it\s)", ""),

    # Cleanup
    (r"\(\s*\)", ""),
    (r"\[\s*\]", ""),
    (r" {2,}", " "),
    (r" ([,.;:!?])", r"\1"),
    (r"\( ", "("),
    (r" \)", ")"),
]

PRICE_TRIGGERS_TO_ADD = [
    "no money",
    "got no money",
    "have no money",
    "no money to",
    "no money right now",
    "no budget",
    "no budget for",
    "zero budget",
    "out of budget",
    "cant afford",
    "cant afford it",
    "dont have the money",
    "dont have money",
    "dont have it",
    "dont have the cash",
    "broke right now",
    "im broke",
    "tight on cash",
    "cash poor",
    "money is tight",
    "cant swing it",
    "cant swing that",
]


def scrub(s):
    if not isinstance(s, str):
        return s
    out = s
    # Apply repeatedly until stable (catches nested patterns), case-insensitive.
    for _ in range(6):
        prev = out
        for pat, rep in SUBS:
            out = re.sub(pat, rep, out, flags=re.IGNORECASE)
        if out == prev:
            break
    return out.strip()


def walk(obj):
    if isinstance(obj, dict):
        return {k: walk(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [walk(x) for x in obj]
    return scrub(obj)


def scrub_file(rel_path, full_walk=True):
    path = os.path.join(base, rel_path)
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    if full_walk:
        clean = walk(data)
    else:
        clean = data
        for o in clean.get("objections", []):
            for k in ("label", "do_not"):
                if k in o:
                    o[k] = scrub(o[k])
            if "response_steps" in o:
                o["response_steps"] = [scrub(s) for s in o["response_steps"]]
        for s in clean.get("situations", []):
            for k in ("label", "do_not", "button"):
                if k in s:
                    s[k] = scrub(s[k])
            if "response_steps" in s:
                s["response_steps"] = [scrub(x) for x in s["response_steps"]]
    with open(path, "w", encoding="utf-8") as f:
        json.dump(clean, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print("scrubbed:", rel_path)


def widen_price_triggers():
    path = os.path.join(base, "app-data/objection-responses.json")
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    for o in data["objections"]:
        if o.get("id") == "price-too-expensive":
            existing = set(t.lower() for t in o.get("triggers", []))
            added = []
            for t in PRICE_TRIGGERS_TO_ADD:
                if t.lower() not in existing:
                    o["triggers"].append(t)
                    added.append(t)
            print("price-too-expensive: now %d triggers (+%d new)" % (len(o["triggers"]), len(added)))
            break
    else:
        sys.exit("price-too-expensive not found")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")


widen_price_triggers()
scrub_file("triage-data/triage-data.json", full_walk=True)
scrub_file("app-data/objection-responses.json", full_walk=False)
print("done.")
