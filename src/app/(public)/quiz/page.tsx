import type { Metadata } from "next";
import { listPublishedEntries } from "@/modules/entries/queries";
import { QuizClient, type QuizStyle } from "@/modules/quiz/public/QuizClient";

export const metadata: Metadata = {
  title: "Should I migrate?",
  description:
    "A short, transparent quiz that scores your readiness to own your setup and recommends guides matched to your comfort, budget, and time.",
};

const STYLES: QuizStyle[] = ["wizard", "scroll", "split"];

function pickStyle(raw: string | string[] | undefined): QuizStyle {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return STYLES.includes(value as QuizStyle) ? (value as QuizStyle) : "wizard";
}

/**
 * The "Should I migrate?" quiz page. Server-fetches the published guide set and
 * renders the quiz client island. The interaction style comes from a ?style=
 * query param (wizard | scroll | split), defaulting to wizard. Stateless: no
 * attempt is persisted, and the quiz collects no PII.
 */
export default async function QuizPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const style = pickStyle(sp.style);
  const guides = await listPublishedEntries("guide");

  return (
    <QuizClient
      guides={guides}
      style={style}
      title="Should I migrate?"
      intro="Answer six quick questions. We'll score your readiness to own your setup — transparently — and point you to guides matched to where you are today."
    />
  );
}
