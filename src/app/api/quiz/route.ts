import { NextRequest, NextResponse } from "next/server";
import { computeResult, QuizAnswer, QUIZ_QUESTIONS } from "@/lib/quiz";
import { listContentEntries, getContentTypeBySlug, logQuizResponse } from "@/lib/db";

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

function parseData(dataJson: string): Record<string, unknown> {
  try {
    return JSON.parse(dataJson) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const answers = sanitizeAnswers(body.answers);
  const result = computeResult(answers);

  const sourcePlatform = answers.find((a) => a.questionId === "current_platform")?.value || null;
  let guides: Awaited<ReturnType<typeof listContentEntries>> = [];
  if (result.verdict !== "stay_hosted") {
    const guideType = await getContentTypeBySlug("guide");
    if (guideType) {
      const all = await listContentEntries({ contentTypeId: guideType.id, publishedOnly: true });
      // Filter in app code — no JSON-path DB operators.
      guides = all.filter((g) => {
        const data = parseData(g.data);
        if (sourcePlatform && sourcePlatform !== "other" && data.sourcePlatform !== sourcePlatform) return false;
        const difficulty = String(data.difficulty || "");
        const maxRank = result.suggestedDifficulty === "beginner" ? 0 : result.suggestedDifficulty === "intermediate" ? 1 : 2;
        const diffRank = difficulty === "beginner" ? 0 : difficulty === "intermediate" ? 1 : difficulty === "advanced" ? 2 : 0;
        return diffRank <= maxRank;
      });
    }
  }

  try {
    await logQuizResponse(answers, result, sourcePlatform);
  } catch {
    // logging is best-effort, never block the quiz result
  }

  return NextResponse.json({ result, guides });
}
