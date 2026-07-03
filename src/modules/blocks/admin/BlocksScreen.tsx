"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { refreshBlockRegistry, toggleBlockEnabled } from "../actions";
import type { RegistryEntry } from "../registry-queries";

/**
 * The Blocks registry screen — every block type this install knows about,
 * grouped by category, with an on/off switch. Built-in blocks (shipped with
 * the platform) are tagged "Built in"; imported/plugin rows show their source.
 * "Refresh" re-syncs metadata from the compiled defs (picks up platform
 * updates and any newly added block types).
 */
export function BlocksScreen({ entries }: { entries: RegistryEntry[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const byCategory = new Map<string, RegistryEntry[]>();
  for (const e of entries) {
    const arr = byCategory.get(e.category) ?? [];
    arr.push(e);
    byCategory.set(e.category, arr);
  }

  const flip = (type: string, enabled: boolean) =>
    start(async () => {
      const res = await toggleBlockEnabled(type, enabled);
      if (!res.ok) window.alert(res.error);
      else router.refresh();
    });

  const refresh = () =>
    start(async () => {
      const res = await refreshBlockRegistry();
      if (!res.ok) window.alert(res.error);
      else router.refresh();
    });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={refresh}
          disabled={pending}
          style={{
            fontSize: "var(--text-sm)",
            color: "var(--accent)",
            background: "none",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            padding: "var(--space-2) var(--space-3)",
            cursor: pending ? "default" : "pointer",
          }}
        >
          Refresh from platform
        </button>
      </div>
      {[...byCategory.entries()].map(([cat, rows]) => (
        <section key={cat}>
          <h2 style={{ margin: "0 0 var(--space-3)", fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-faint)" }}>
            {cat}
          </h2>
          <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
            {rows.map((e, i) => (
              <BlockRow key={e.type} entry={e} first={i === 0} onToggle={flip} pending={pending} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function BlockRow({
  entry,
  first,
  onToggle,
  pending,
}: {
  entry: RegistryEntry;
  first: boolean;
  onToggle: (type: string, enabled: boolean) => void;
  pending: boolean;
}) {
  const off = !entry.enabled;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-4)",
        padding: "var(--space-3) var(--space-5)",
        borderTop: first ? "none" : "1px solid var(--border)",
        opacity: off ? 0.55 : 1,
      }}
    >
      <span
        style={{
          width: 30,
          height: 30,
          borderRadius: "var(--radius-sm)",
          background: "var(--accent-2-tint)",
          border: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          fontSize: "var(--text-sm)",
        }}
      >
        {entry.icon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text)" }}>{entry.label}</span>
          <span style={{ fontFamily: "var(--font-label)", fontSize: "var(--text-2xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-faint)", border: "1px solid var(--border)", borderRadius: "var(--radius-pill)", padding: "1px 7px" }}>
            {entry.source}
          </span>
        </div>
        <div style={{ fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>{entry.blurb}</div>
      </div>
      <code style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{entry.type}</code>
      <button
        type="button"
        onClick={() => onToggle(entry.type, !entry.enabled)}
        disabled={pending}
        role="switch"
        aria-checked={!off}
        title={off ? `Enable ${entry.label}` : `Disable ${entry.label}`}
        style={{
          width: 38,
          height: 22,
          borderRadius: 999,
          border: "none",
          cursor: pending ? "default" : "pointer",
          background: off ? "var(--border-strong)" : "var(--accent)",
          position: "relative",
          transition: "var(--transition)",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: off ? 2 : 18,
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: "var(--bg)",
            transition: "left var(--dur) var(--ease)",
          }}
        />
      </button>
    </div>
  );
}
