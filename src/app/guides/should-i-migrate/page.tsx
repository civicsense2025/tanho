import Link from "next/link";
import { MigrationQuiz } from "@/components/MigrationQuiz";

export const metadata = { title: "Should I migrate? — Self-Hosting Migration Guides" };

export default function ShouldIMigratePage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-20">
      <Link href="/guides" className="text-xs transition-colors mb-12 inline-block" style={{ color: "var(--muted)" }}>← All guides</Link>
      <h1 className="text-3xl font-medium tracking-tight mb-3" style={{ color: "var(--foreground)" }}>Should you migrate?</h1>
      <p className="text-lg leading-relaxed mb-12 max-w-xl" style={{ color: "var(--muted)" }}>
        Answer a few questions about your skills, budget, and goals to get a personalized recommendation.
      </p>
      <MigrationQuiz />
    </main>
  );
}
