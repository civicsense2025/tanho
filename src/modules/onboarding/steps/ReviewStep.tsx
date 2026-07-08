import Link from "next/link";
import type { WizardStepProps } from "../types";
import type { GeneralSettings } from "@/modules/settings/validation";

/** Plain summary + a restrained success state — no confetti/animation, matching the app's design ethos. */
export function ReviewStep({ initial }: WizardStepProps) {
  const general = initial.general as GeneralSettings;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
        You&apos;re all set. Here&apos;s what&apos;s configured — you can revisit any of it in Settings
        whenever you like.
      </p>
      <ul style={{ margin: 0, paddingLeft: "var(--space-5)", fontSize: "var(--text-sm)", color: "var(--text)" }}>
        <li>
          Site name — <strong>{general.name}</strong> (<Link href="/admin/settings/general">edit</Link>)
        </li>
        <li>
          Brand — <Link href="/admin/settings/brand">edit</Link>
        </li>
      </ul>
    </div>
  );
}
