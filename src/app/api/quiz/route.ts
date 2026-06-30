import { NextRequest, NextResponse } from "next/server";
import { computeResult, QuizAnswer } from "@/lib/quiz";
import { listGuides, logQuizResponse } from "@/lib/db";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const answers = (body.answers || []) as QuizAnswer[];
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
