import { NextRequest, NextResponse } from "next/server";
import { computeResult, QuizAnswer, QUIZ_QUESTIONS } from "@/lib/quiz";
import { listGuides, logQuizResponse } from "@/lib/db";

/** Only accept answers whose questionId/value pairs match a known QUIZ_QUESTIONS
 * option -- request bodies are untrusted, and unvalidated string values would
 * otherwise flow into listGuides()'s Mongo filter (operator-injection risk). */
function sanitizeAnswers(raw: unknown): QuizAnswer[] {
  if (!Array.isArray(raw)) return [];
  const answers: QuizAnswer[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const { questionId, value } = entry as Record<string, unknown>;
    if (typeof questionId !== "string" || typeof value !== "string") continue;
    const question = QUIZ_QUESTIONS.find((q) => q.id === questionId);
    if (!question?.options.some((o) => o.value === value)) continue;
    answers.push({ questionId, value });
  }
  return answers;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const answers = sanitizeAnswers(body.answers);
  const result = computeResult(answers);

  const sourcePlatform = answers.find((a) => a.questionId === "current_platform")?.value || null;
  const guides = result.verdict === "stay_hosted"
    ? []
    : await listGuides({
        publishedOnly: true,
        sourcePlatform: sourcePlatform && sourcePlatform !== "other" ? sourcePlatform : undefined,
        maxDifficulty: result.suggestedDifficulty,
      });

  try {
    await logQuizResponse(answers, result, sourcePlatform);
  } catch {
    // logging is best-effort, never block the quiz result
  }

  return NextResponse.json({ result, guides });
}
