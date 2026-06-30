import { Guide } from "@/lib/db";

const DIFFICULTY_COLOR: Record<Guide["difficulty"], string> = {
  beginner: "#1f9d55",
  intermediate: "#b58105",
  advanced: "#c0392b",
};

function formatRange(min: number | null, max: number | null, unit: string): string | null {
  if (min == null && max == null) return null;
  if (min != null && max != null) return min === max ? `${min}${unit}` : `${min}–${max}${unit}`;
  return `${min ?? max}${unit}`;
}

export function GuideMeta({ guide }: { guide: Guide }) {
  const effort = formatRange(guide.effort_hours_min, guide.effort_hours_max, " hrs");
  const costRange = formatRange(guide.cost_min_usd, guide.cost_max_usd, "");
  const cost = costRange ? `$${costRange}${guide.cost_period === "monthly" ? "/mo" : " one-time"}` : null;

  return (
    <div className="flex flex-wrap gap-1.5">
      <span
        className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full"
        style={{ color: DIFFICULTY_COLOR[guide.difficulty], border: `1px solid ${DIFFICULTY_COLOR[guide.difficulty]}` }}
      >
        {guide.difficulty}
      </span>
      {effort && (
        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ color: "var(--muted)", border: "1px solid var(--border)" }}>
          ⏱ {effort}
        </span>
      )}
      {cost && (
        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ color: "var(--muted)", border: "1px solid var(--border)" }}>
          $ {cost}
        </span>
      )}
    </div>
  );
}
