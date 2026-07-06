import styles from "./WizardShell.module.css";

const TIERS: Array<{ value: 1 | 2 | 3; label: string; blurb: string }> = [
  { value: 1, label: "New to this", blurb: "Extra explanations and guided defaults at every step." },
  { value: 2, label: "Comfortable", blurb: "The standard setup screens, no extra hand-holding." },
  { value: 3, label: "Experienced", blurb: "Dense screens, manual entry by default, help tucked away." },
];

/** First wizard screen — picks the difficulty tier that shapes every later step's defaults and help density. */
export function DifficultyPicker({
  onChoose,
  pending,
}: {
  onChoose: (difficulty: 1 | 2 | 3) => void;
  pending: boolean;
}) {
  return (
    <div>
      <h2 className={styles.title}>How much guidance do you want?</h2>
      <p className={styles.blurb}>
        This only changes how much explanation you see and what&apos;s pre-filled — every setting is
        still reachable either way.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        {TIERS.map((tier) => (
          <button
            key={tier.value}
            type="button"
            onClick={() => onChoose(tier.value)}
            disabled={pending}
            style={{
              textAlign: "left",
              padding: "var(--space-4)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              background: "var(--surface-card)",
              cursor: pending ? "default" : "pointer",
            }}
          >
            <div style={{ fontSize: "var(--text-sm)", color: "var(--text)" }}>{tier.label}</div>
            <div style={{ fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>{tier.blurb}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
