/**
 * "Should I migrate?" quiz — a pure, framework-free scorer shared by all three
 * interaction styles (wizard/scroll/split) AND any API caller. Port of the
 * design's quiz-logic.js. No React, no I/O, no side effects: given answers and
 * the published guide set, it returns a transparent rule-based verdict.
 *
 * Scoring is deliberately legible (0–8, one point per "readiness" signal) so
 * the result screen can explain WHY. See docs/entities/guides.md.
 */

import type { EntryRow } from "@/modules/entries/schema";
import type { GuideData } from "@/entities/schemas/guide";

/** One selectable answer. `score` (0–2) feeds the readiness total. */
export type QuizOption = {
  value: string;
  label: string;
  /** Points this option contributes to the 0–8 readiness score. */
  score: number;
};

export type QuizQuestion = {
  id: QuizQuestionId;
  prompt: string;
  help?: string;
  options: QuizOption[];
};

export type QuizQuestionId =
  | "platform"
  | "cli"
  | "budget"
  | "time"
  | "data"
  | "motivation";

/** Answer map: question id → chosen option value. Partial while in progress. */
export type QuizAnswers = Partial<Record<QuizQuestionId, string>>;

export type Verdict = "ready" | "start-small" | "prep-first";

export type QuizResult = {
  score: number;
  /** Max attainable readiness score, for a "X of Y" readout. */
  maxScore: number;
  verdict: Verdict;
  headline: string;
  narrative: string;
  /** Highest guide difficulty this person should attempt: 3=adv, 2=int, 1=beg. */
  difficultyCeiling: 1 | 2 | 3;
  /** The source platform the person is leaving, if they told us. */
  sourcePlatform: string | null;
  /** Matched published guides, best first (never more than `limit`). */
  matches: EntryRow[];
};

export { QUIZ_QUESTIONS } from "./questions";
import { QUIZ_QUESTIONS } from "./questions";

/** Max attainable readiness score (sum of each question's best option). */
export const MAX_SCORE = QUIZ_QUESTIONS.reduce(
  (sum, q) => sum + Math.max(...q.options.map((o) => o.score)),
  0,
);

const VERDICTS: Record<
  Verdict,
  { headline: string; narrative: string; ceiling: 1 | 2 | 3 }
> = {
  ready: {
    headline: "You're ready to migrate",
    narrative:
      "Your comfort, time, and resolve all point the same way. Pick a guide and start this week — even the advanced paths are within reach.",
    ceiling: 3,
  },
  "start-small": {
    headline: "Migrate, but start small",
    narrative:
      "You have real momentum, but not unlimited runway. Begin with a contained, lower-difficulty move, prove it works, then take on the harder pieces.",
    ceiling: 2,
  },
  "prep-first": {
    headline: "Not yet — prep first",
    narrative:
      "Owning your setup is a great goal, but a few gaps would make a move painful right now. Build comfort and a plan with the beginner guides before committing.",
    ceiling: 1,
  },
};

function verdictFor(score: number): Verdict {
  if (score >= 5) return "ready";
  if (score >= 2) return "start-small";
  return "prep-first";
}

/** Numeric difficulty rank so we can compare against the ceiling. */
const DIFFICULTY_RANK: Record<GuideData["difficulty"], 1 | 2 | 3> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
};

/**
 * Match published guides to a result: keep those at or below the difficulty
 * ceiling, prefer ones leaving the same source platform, and always fall back
 * to the first eligible guide so the result never renders empty when guides
 * exist. Pure sort — stable, no mutation of the input array.
 */
export function matchGuides(
  guides: EntryRow[],
  ceiling: 1 | 2 | 3,
  sourcePlatform: string | null,
  limit = 3,
): EntryRow[] {
  const eligible = guides.filter((g) => {
    const d = (g.data as GuideData).difficulty;
    return DIFFICULTY_RANK[d] <= ceiling;
  });

  const pool = eligible.length > 0 ? eligible : guides;

  const ranked = [...pool].sort((a, b) => {
    const sa = sourcePlatform && (a.data as GuideData).source_platform === sourcePlatform ? 0 : 1;
    const sb = sourcePlatform && (b.data as GuideData).source_platform === sourcePlatform ? 0 : 1;
    if (sa !== sb) return sa - sb;
    const da = DIFFICULTY_RANK[(a.data as GuideData).difficulty];
    const db = DIFFICULTY_RANK[(b.data as GuideData).difficulty];
    if (da !== db) return da - db;
    return a.sortOrder - b.sortOrder;
  });

  return ranked.slice(0, limit);
}

/**
 * Compute the full result from answers + the published guide set. Unanswered
 * questions score 0. PURE — deterministic given its inputs.
 */
export function computeResult(answers: QuizAnswers, guides: EntryRow[]): QuizResult {
  let score = 0;
  for (const q of QUIZ_QUESTIONS) {
    const chosen = answers[q.id];
    const opt = q.options.find((o) => o.value === chosen);
    if (opt) score += opt.score;
  }

  const verdict = verdictFor(score);
  const meta = VERDICTS[verdict];
  const sourcePlatform = answers.platform ? answers.platform : null;
  const matches = matchGuides(guides, meta.ceiling, sourcePlatform);

  return {
    score,
    maxScore: MAX_SCORE,
    verdict,
    headline: meta.headline,
    narrative: meta.narrative,
    difficultyCeiling: meta.ceiling,
    sourcePlatform,
    matches,
  };
}
