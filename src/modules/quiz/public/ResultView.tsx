"use client";

import { Button } from "@/components/core/Button";
import type { GuideData } from "@/entities/schemas/guide";
import type { QuizResult } from "../logic";
import styles from "./quiz.module.css";

const VERDICT_LABEL: Record<QuizResult["verdict"], string> = {
  ready: "Your result",
  "start-small": "Your result",
  "prep-first": "Your result",
};

/**
 * Shared result screen for every interaction style: verdict headline, the
 * transparent score readout, narrative, and the recommended guide cards
 * (linking to /guides/:hub/:slug). Pure presentation over a computed result.
 */
export function ResultView({
  result,
  onRestart,
}: {
  result: QuizResult;
  onRestart: () => void;
}) {
  const pct = Math.round((result.score / result.maxScore) * 100);
  return (
    <div className={styles.result}>
      <div className={styles.verdictLabel}>{VERDICT_LABEL[result.verdict]}</div>
      <h2 className={styles.verdictHeadline}>{result.headline}</h2>

      <div className={styles.scoreRow}>
        <span>
          Readiness {result.score} of {result.maxScore}
        </span>
        <span className={styles.scoreBar}>
          <span className={styles.scoreFill} style={{ width: `${pct}%` }} />
        </span>
      </div>

      <p className={styles.narrative}>{result.narrative}</p>

      <div className={styles.matchesLabel}>Recommended guides</div>
      {result.matches.length === 0 ? (
        <p className={styles.emptyMatches}>
          No guides are published yet — check back soon.
        </p>
      ) : (
        <div className={styles.matches}>
          {result.matches.map((g) => {
            const data = g.data as GuideData;
            const href = data.category ? `/guides/${data.category}/${g.slug}` : `/guides`;
            return (
              <a key={g.id} href={href} className={styles.card}>
                <h3 className={styles.cardTitle}>{g.title}</h3>
                {data.tagline ? <p className={styles.cardTagline}>{data.tagline}</p> : null}
              </a>
            );
          })}
        </div>
      )}

      <div className={styles.restart}>
        <Button variant="outline" onClick={onRestart}>
          Start over
        </Button>
      </div>
    </div>
  );
}
