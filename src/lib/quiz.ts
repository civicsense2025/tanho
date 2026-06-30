export type ScoreAxis = "readiness" | "urgency" | "complexityTolerance";

export interface QuizOption {
  value: string;
  label: string;
  weight: Partial<Record<ScoreAxis, number>>;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: QuizOption[];
}

export interface QuizAnswer {
  questionId: string;
  value: string;
}

export type QuizVerdict = "migrate_now" | "migrate_later" | "stay_hosted";
export type QuizDifficulty = "beginner" | "intermediate" | "advanced";

export interface QuizResult {
  verdict: QuizVerdict;
  suggestedDifficulty: QuizDifficulty;
  rationale: string[];
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "current_platform",
    prompt: "What platform is your site or store on today?",
    options: [
      { value: "squarespace", label: "Squarespace", weight: {} },
      { value: "webflow", label: "Webflow", weight: { complexityTolerance: 1 } },
      { value: "wix", label: "Wix", weight: {} },
      { value: "shopify", label: "Shopify", weight: { complexityTolerance: 2 } },
      { value: "other", label: "Something else / a SaaS data tool", weight: { complexityTolerance: 1 } },
    ],
  },
  {
    id: "technical_skill",
    prompt: "How comfortable are you with the command line, servers, or basic code?",
    options: [
      { value: "none", label: "Not at all — I've never used a terminal", weight: { readiness: -2, complexityTolerance: -2 } },
      { value: "some", label: "A little — I can follow a step-by-step guide", weight: { readiness: 1, complexityTolerance: 0 } },
      { value: "comfortable", label: "Comfortable — I've set up software before", weight: { readiness: 2, complexityTolerance: 2 } },
      { value: "expert", label: "Very comfortable — I write code regularly", weight: { readiness: 3, complexityTolerance: 3 } },
    ],
  },
  {
    id: "budget",
    prompt: "What's your monthly budget for hosting and tools?",
    options: [
      { value: "under_10", label: "Under $10/mo", weight: { readiness: -1 } },
      { value: "10_30", label: "$10–30/mo", weight: { readiness: 1 } },
      { value: "30_100", label: "$30–100/mo", weight: { readiness: 2 } },
      { value: "100_plus", label: "$100+/mo", weight: { readiness: 3 } },
    ],
  },
  {
    id: "time",
    prompt: "How much time can you set aside for a migration?",
    options: [
      { value: "hour", label: "Less than an hour", weight: { readiness: -2, urgency: -1 } },
      { value: "afternoon", label: "An afternoon", weight: { readiness: 1, urgency: 0 } },
      { value: "weekend", label: "A weekend", weight: { readiness: 2, urgency: 1 } },
      { value: "week_plus", label: "A week or more", weight: { readiness: 3, urgency: 1 } },
    ],
  },
  {
    id: "data_sensitivity",
    prompt: "How important is owning and controlling your data and uptime?",
    options: [
      { value: "low", label: "Not very — convenience matters more", weight: { urgency: -2 } },
      { value: "medium", label: "Somewhat — I'd like more control eventually", weight: { urgency: 1 } },
      { value: "high", label: "Very — data ownership is a top priority", weight: { urgency: 3 } },
    ],
  },
  {
    id: "motivation",
    prompt: "What's driving you to consider self-hosting?",
    options: [
      { value: "cost", label: "Reducing recurring subscription costs", weight: { urgency: 1, readiness: 1 } },
      { value: "control", label: "More control / fewer platform restrictions", weight: { urgency: 2 } },
      { value: "privacy", label: "Data privacy and governance", weight: { urgency: 2 } },
      { value: "curious", label: "Just curious, no urgent need", weight: { urgency: -2 } },
    ],
  },
];

function scoreAnswers(answers: QuizAnswer[]): Record<ScoreAxis, number> {
  const totals: Record<ScoreAxis, number> = { readiness: 0, urgency: 0, complexityTolerance: 0 };
  for (const answer of answers) {
    const question = QUIZ_QUESTIONS.find((q) => q.id === answer.questionId);
    const option = question?.options.find((o) => o.value === answer.value);
    if (!option) continue;
    for (const [axis, weight] of Object.entries(option.weight)) {
      totals[axis as ScoreAxis] += weight ?? 0;
    }
  }
  return totals;
}

export function computeResult(answers: QuizAnswer[]): QuizResult {
  const scores = scoreAnswers(answers);
  const rationale: string[] = [];

  let verdict: QuizVerdict;
  if (scores.readiness < 0 || scores.urgency < -1) {
    verdict = "stay_hosted";
    rationale.push("Your current setup is likely the right fit for now — the time, budget, or motivation for self-hosting isn't there yet.");
  } else if (scores.readiness < 3 || scores.urgency < 2) {
    verdict = "migrate_later";
    rationale.push("You have some of the readiness for a migration, but building up more time, budget, or technical comfort first will make it smoother.");
  } else {
    verdict = "migrate_now";
    rationale.push("You have the readiness and motivation to start a self-hosting migration now.");
  }

  let suggestedDifficulty: QuizDifficulty;
  if (scores.complexityTolerance >= 3) suggestedDifficulty = "advanced";
  else if (scores.complexityTolerance >= 1) suggestedDifficulty = "intermediate";
  else suggestedDifficulty = "beginner";
  rationale.push(`Based on your technical comfort, start with guides rated "${suggestedDifficulty}" or easier.`);

  if (scores.urgency >= 2) rationale.push("Data ownership and control are clearly important to you — prioritize guides that emphasize self-managed data.");
  if (scores.readiness <= 0) rationale.push("Consider starting with a low-stakes test site before migrating anything business-critical.");

  return { verdict, suggestedDifficulty, rationale };
}
