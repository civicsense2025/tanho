import { Guide } from "@/lib/db";
import { Tag } from "@/components/ui";

const DIFFICULTY_TONE: Record<Guide["difficulty"], "olive" | "maroon" | "neutral"> = {
  beginner: "olive",
  intermediate: "neutral",
  advanced: "maroon",
};

function formatRange(min: number | null, max: number | null, unit: string): string | null {
  if (min == null && max == null) return null;
  if (min != null && max != null) return min === max ? `${min}${unit}` : `${min}–${max}${unit}`;
  return `${min ?? max}${unit}`;
}

export function GuideMeta({ guide }: { guide: Guide }) {
  const effort = formatRange(guide.effortHoursMin, guide.effortHoursMax, " hrs");
  const costRange = formatRange(guide.costMinUsd, guide.costMaxUsd, "");
  const cost = costRange ? `$${costRange}${guide.costPeriod === "monthly" ? "/mo" : " one-time"}` : null;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
      <Tag tone={DIFFICULTY_TONE[guide.difficulty]}>{guide.difficulty}</Tag>
      {effort && <Tag>⏱ {effort}</Tag>}
      {cost && <Tag>$ {cost}</Tag>}
    </div>
  );
}
