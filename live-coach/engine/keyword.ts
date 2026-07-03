/**
 * Keyword engine — direct port of `analyzeKeyword` from app/app.js.
 *
 * The static SPA and this Worker MUST agree on what counts as an objection or
 * a discovery flag for a given prospect line, so this code mirrors the SPA
 * line-for-line: same normalisation, same scoring, same bucket priority, same
 * top-3 cutoff. Don't optimise without also patching app/app.js.
 *
 * Source of truth for the trigger lists is `app-data/*.json` — imported below.
 * Wrangler bundles the JSON into the Worker at build time.
 */

import objectionsData from "../../app-data/objection-responses.json";
import discoveryData from "../../app-data/discovery-flags.json";
import funnelData from "../../app-data/funnel-stages.json";

export interface Objection {
  id: string;
  bucket: string;
  type?: string;
  label: string;
  triggers: string[];
  response_steps: string[];
  do_not?: string;
  alt_reframes?: string[];
  source?: string;
}

export interface DiscoveryFlag {
  id: string;
  signal: string;
  belief: string;
  triggers: string[];
  probe: string;
  note?: string;
}

export interface UniversalFramework {
  rule: string;
  step_1_diffuse: string;
  step_2_isolate: string;
  step_3_temp_check: string;
  step_4_scale: string;
  step_5_double_tie_down: string;
  [k: string]: unknown;
}

export interface FunnelStage {
  id: string;
  name: string;
  goal: string;
  listen_for?: string;
  say?: string[];
  options?: { id: string; title: string; lines: string[] }[];
  advance_when?: string;
}

export interface Match<T> {
  item: T;
  score: number;
  hits: string[];
}

export interface KeywordResult {
  objections: Match<Objection>[];
  flags: Match<DiscoveryFlag>[];
}

export const OBJECTIONS: Objection[] = (objectionsData as { objections: Objection[] }).objections;
export const FRAMEWORK: UniversalFramework = (objectionsData as { universal_framework: UniversalFramework }).universal_framework;
export const FLAGS: DiscoveryFlag[] = (discoveryData as { flags: DiscoveryFlag[] }).flags;
export const BELIEF_PROMPTS: Record<string, string[]> = (discoveryData as { belief_prompts: Record<string, string[]> }).belief_prompts;
export const STAGES: FunnelStage[] = (funnelData as { stages: FunnelStage[] }).stages;

/** Cole's funnel order — handle uncertainty objections before any logistic. */
const BUCKET_RANK: Record<string, number> = {
  uncertainty: 0,
  financial: 1,
  support: 2,
  process: 3,
};
function bucketRank(b: string): number {
  return BUCKET_RANK[b] ?? 9;
}

const MIN_SCORE = 1.0;
const MAX_INPUT = 2000;

/**
 * Normalise an utterance for trigger matching. Mirrors app.js `norm`:
 *   - lowercase
 *   - strip apostrophes (so "can't" matches "cant" trigger)
 *   - non-alphanumeric → space (preserves "$" for "$X")
 *   - collapse whitespace
 *   - pad with a leading + trailing space so `indexOf(" foo ")` only matches
 *     whole-phrase boundaries (no "a lot" / "a lottery" bleed)
 */
export function norm(s: string): string {
  return (
    " " +
    String(s)
      .toLowerCase()
      .replace(/['’]/g, "") // ' and '
      .replace(/[^a-z0-9$ ]+/g, " ")
      .replace(/\s+/g, " ")
      .trim() +
    " "
  );
}

function scoreTriggers(inputNorm: string, triggers: string[]): { score: number; hits: string[] } {
  let score = 0;
  const hits: string[] = [];
  for (const t of triggers) {
    const tn = norm(t); // " phrase "
    const phrase = tn.slice(1, -1);
    if (phrase.length < 2) continue;
    const words = phrase.split(" ");
    if (inputNorm.indexOf(tn) !== -1) {
      // Single-word triggers are weak — heavy false-positive risk.
      const base = words.length === 1 ? 0.4 : 1;
      score += base + Math.min(words.length - 1, 4) * 0.4;
      hits.push(t);
    } else if (words.length >= 2) {
      let present = 0;
      for (const w of words) {
        if (w.length > 2 && inputNorm.indexOf(" " + w + " ") !== -1) present++;
      }
      if (present >= Math.ceil(words.length * 0.7)) {
        score += 0.5;
        hits.push(t);
      }
    }
  }
  return { score, hits };
}

/**
 * Analyze one prospect utterance. Returns the top 3 objections (bucket-ordered)
 * and top 3 discovery flags above the noise floor.
 */
export function analyzeKeyword(text: string): KeywordResult {
  const clean = text.length > MAX_INPUT ? text.slice(0, MAX_INPUT) : text;
  const inputNorm = norm(clean);
  const objs: Match<Objection>[] = [];
  const flgs: Match<DiscoveryFlag>[] = [];

  for (const o of OBJECTIONS) {
    const r = scoreTriggers(inputNorm, o.triggers || []);
    if (r.score >= MIN_SCORE) objs.push({ item: o, score: r.score, hits: r.hits });
  }
  for (const f of FLAGS) {
    const r = scoreTriggers(inputNorm, f.triggers || []);
    if (r.score >= MIN_SCORE) flgs.push({ item: f, score: r.score, hits: r.hits });
  }

  objs.sort((a, b) => {
    const d = bucketRank(a.item.bucket) - bucketRank(b.item.bucket);
    return d !== 0 ? d : b.score - a.score;
  });
  flgs.sort((a, b) => b.score - a.score);

  return { objections: objs.slice(0, 3), flags: flgs.slice(0, 3) };
}

export function stageById(id: string): FunnelStage {
  return STAGES.find((s) => s.id === id) || STAGES[0];
}

/** DISCOVER mnemonic — matches app.js order + labels. */
export const DISCOVER_ORDER: string[] = ["desire", "pain", "math", "cost", "doubt", "trust", "support", "money", "why"];
export const DISCOVER_LETTER: Record<string, string> = {
  desire: "D",
  pain: "I",
  math: "S",
  cost: "C",
  doubt: "O",
  trust: "V",
  support: "E",
  money: "R",
  why: "Y",
};
export const BELIEF_LABEL: Record<string, string> = {
  desire: "Desire",
  pain: "Issue",
  math: "Sum",
  cost: "Cost",
  doubt: "Own",
  trust: "Verify",
  support: "Everyone",
  money: "Resources",
  why: "Why",
};
