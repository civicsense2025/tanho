import { describe, expect, it } from "vitest";
import type { EntryRow } from "@/modules/entries/schema";
import type { GuideData } from "@/entities/schemas/guide";
import {
  computeResult,
  matchGuides,
  MAX_SCORE,
  QUIZ_QUESTIONS,
  type QuizAnswers,
} from "./logic";

/** Minimal published-guide row factory for match tests. */
function guide(
  slug: string,
  difficulty: GuideData["difficulty"],
  source_platform: string,
  sortOrder = 0,
): EntryRow {
  return {
    id: `id-${slug}`,
    type: "guide",
    slug,
    title: slug,
    status: "published",
    sortOrder,
    data: {
      difficulty,
      source_platform,
      category: "own-your-stack",
    } as unknown as Record<string, unknown>,
    createdAt: 0,
    updatedAt: 0,
  };
}

const GUIDES: EntryRow[] = [
  guide("beg-a", "beginner", "hosted-blog", 0),
  guide("int-a", "intermediate", "hosted-site-builder", 1),
  guide("adv-a", "advanced", "hosted-site-builder", 2),
  guide("beg-b", "beginner", "social-network", 3),
];

describe("quiz scoring fixtures", () => {
  const CASES: Array<{
    name: string;
    answers: QuizAnswers;
    score: number;
    verdict: string;
    ceiling: 1 | 2 | 3;
  }> = [
    {
      name: "all-confident / high budget / ongoing / committed → ready, ceiling 3",
      answers: {
        platform: "hosted-site-builder",
        cli: "confident",
        budget: "flexible",
        time: "ongoing",
        data: "high",
        motivation: "committed",
      },
      score: 8,
      verdict: "ready",
      ceiling: 3,
    },
    {
      name: "all-none / low → prep-first, ceiling 1",
      answers: {
        platform: "hosted-blog",
        cli: "none",
        budget: "none",
        time: "little",
        data: "low",
        motivation: "unsure",
      },
      score: 0,
      verdict: "prep-first",
      ceiling: 1,
    },
    {
      name: "mid across the board → start-small, ceiling 2",
      answers: {
        platform: "managed-store",
        cli: "some",
        budget: "modest",
        time: "weekend",
        data: "medium",
        motivation: "curious",
      },
      score: 4,
      verdict: "start-small",
      ceiling: 2,
    },
    {
      name: "exactly at the ready threshold (5) → ready",
      answers: {
        cli: "confident",
        budget: "modest",
        time: "little",
        motivation: "committed",
      },
      score: 5,
      verdict: "ready",
      ceiling: 3,
    },
    {
      name: "exactly at the start-small threshold (2) → start-small",
      answers: { cli: "some", motivation: "curious" },
      score: 2,
      verdict: "start-small",
      ceiling: 2,
    },
    {
      name: "just below start-small (1) → prep-first",
      answers: { cli: "some" },
      score: 1,
      verdict: "prep-first",
      ceiling: 1,
    },
  ];

  for (const c of CASES) {
    it(c.name, () => {
      const result = computeResult(c.answers, GUIDES);
      expect(result.score).toBe(c.score);
      expect(result.verdict).toBe(c.verdict);
      expect(result.difficultyCeiling).toBe(c.ceiling);
    });
  }

  it("max score is 8 (four readiness axes at 2 each)", () => {
    expect(MAX_SCORE).toBe(8);
  });

  it("platform and data questions never move the score", () => {
    const base = computeResult({ cli: "confident" }, GUIDES).score;
    const withContext = computeResult(
      { cli: "confident", platform: "social-network", data: "high" },
      GUIDES,
    ).score;
    expect(withContext).toBe(base);
  });

  it("every option scores within 0..2", () => {
    for (const q of QUIZ_QUESTIONS) {
      for (const o of q.options) {
        expect(o.score).toBeGreaterThanOrEqual(0);
        expect(o.score).toBeLessThanOrEqual(2);
      }
    }
  });
});

describe("guide matching", () => {
  it("prep-first (ceiling 1) recommends only beginner guides", () => {
    const matches = matchGuides(GUIDES, 1, null);
    expect(matches.every((g) => (g.data as GuideData).difficulty === "beginner")).toBe(true);
  });

  it("ready (ceiling 3) can recommend advanced guides", () => {
    const matches = matchGuides(GUIDES, 3, "hosted-site-builder");
    expect(matches.some((g) => (g.data as GuideData).difficulty === "advanced")).toBe(true);
  });

  it("prefers guides leaving the same source platform", () => {
    const matches = matchGuides(GUIDES, 3, "social-network");
    expect((matches[0].data as GuideData).source_platform).toBe("social-network");
  });

  it("falls back to guides above the ceiling when none qualify", () => {
    const advancedOnly = [guide("adv-only", "advanced", "hosted-blog")];
    const matches = matchGuides(advancedOnly, 1, null);
    expect(matches).toHaveLength(1);
    expect(matches[0].slug).toBe("adv-only");
  });

  it("returns nothing when there are no guides at all", () => {
    expect(matchGuides([], 3, null)).toHaveLength(0);
    expect(computeResult({ cli: "confident" }, []).matches).toHaveLength(0);
  });
});
