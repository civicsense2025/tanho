import type { GuideData } from "@/entities/schemas/guide";
import styles from "./entries-public.module.css";

/** Difficulty chip background: beginner = accent-2 tint, intermediate = surface, advanced = accent tint. */
const DIFFICULTY_BG: Record<GuideData["difficulty"], string> = {
  beginner: "var(--accent-2-tint)",
  intermediate: "var(--surface)",
  advanced: "var(--accent-tint)",
};

/** A row of mono 2xs uppercase chips summarising a guide's difficulty, effort, and cost. */
export function GuideMeta({ data }: { data: GuideData }) {
  const showEffort = data.effort_hours_max > 0;
  const showCost = data.cost_max_usd > 0;

  return (
    <div className={styles.metaRow}>
      <span className={styles.chip} style={{ background: DIFFICULTY_BG[data.difficulty] }}>
        {data.difficulty}
      </span>
      {showEffort ? (
        <span className={styles.chip} style={{ background: "var(--surface)" }}>
          {data.effort_hours_min}h–{data.effort_hours_max}h
        </span>
      ) : null}
      {showCost ? (
        <span className={styles.chip} style={{ background: "var(--surface)" }}>
          ${data.cost_min_usd}–${data.cost_max_usd} /{data.cost_period}
        </span>
      ) : null}
    </div>
  );
}
