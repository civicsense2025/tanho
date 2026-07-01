import { TextLink } from "@/components/ui";
import { MigrationQuiz } from "@/components/MigrationQuiz";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Should I migrate? — Self-Hosting Migration Guides" };

export default function ShouldIMigratePage() {
  return (
    <main style={{ maxWidth: "var(--width-prose)", margin: "0 auto", padding: "var(--space-10) var(--gutter)" }}>
      <div style={{ marginBottom: "var(--space-8)" }}>
        <TextLink arrow="back" muted href="/guides" style={{ fontSize: "var(--text-xs)" }}>
          All guides
        </TextLink>
      </div>
      <h1 style={{ margin: "0 0 var(--space-3)", fontSize: "var(--text-h1)", fontWeight: 500, letterSpacing: "var(--tracking-tight)", color: "var(--text)" }}>
        Should you migrate?
      </h1>
      <p style={{ margin: "0 0 var(--space-10)", fontSize: "var(--text-lg)", lineHeight: "var(--leading-normal)", maxWidth: "var(--width-prose)", color: "var(--text-muted)" }}>
        Answer a few questions about your skills, budget, and goals to get a personalized recommendation.
      </p>
      <MigrationQuiz />
    </main>
  );
}
