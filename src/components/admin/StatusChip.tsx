import styles from "./EntityList.module.css";

type StatusTone = "accent" | "accent2" | "faint";

const STATUS_TONE: Record<string, StatusTone> = {
  published: "accent2",
  active: "accent2",
  live: "accent2",
  draft: "faint",
  planned: "faint",
  scheduled: "accent",
  pending: "accent",
};

function statusTone(status: string): StatusTone {
  return STATUS_TONE[status.toLowerCase()] ?? "faint";
}

/** Status chip: 5px dot + mono uppercase label. */
export function StatusChip({ status }: { status: string }) {
  const tone = statusTone(status);
  const color =
    tone === "accent2"
      ? "var(--accent-2)"
      : tone === "accent"
        ? "var(--accent)"
        : "var(--text-faint)";
  return (
    <span className={styles.chip}>
      <span className={styles.chipDot} style={{ background: color }} />
      {status}
    </span>
  );
}
