"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  downloadEntitledPack,
  installEntitledPack,
  type InstallDiagnostics,
} from "../entitlement-actions";
import type { PackEntitlementWithPack } from "../entitlements";

/**
 * The "Your purchases" screen — lists the current user's pack entitlements
 * with download and install buttons. Download returns the portable pack JSON
 * (saved as a file); install imports the pack into this instance.
 */
export function PurchasesScreen({
  entitlements,
}: {
  entitlements: PackEntitlementWithPack[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [flash, setFlash] = useState<string | null>(null);

  const download = (packType: "block_pack" | "design_pack", packEntryId: string, title: string) =>
    start(async () => {
      setFlash(null);
      const res = await downloadEntitledPack(packType, packEntryId);
      if (!res.ok) return setFlash(res.error);
      const blob = new Blob([JSON.stringify(res.data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pack.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

  const install = (packType: "block_pack" | "design_pack", packEntryId: string, title: string) =>
    start(async () => {
      setFlash(null);
      if (!window.confirm(`Install "${title}" into this instance?`)) return;
      const res = await installEntitledPack(packType, packEntryId);
      if (!res.ok) return setFlash(res.error);
      const d: InstallDiagnostics = res.data!;
      const notes: string[] = [];
      if (d.missingTypes.length)
        notes.push(`${d.missingTypes.length} unknown block type(s): ${d.missingTypes.join(", ")}`);
      if (d.dropped.length) notes.push(`${d.dropped.length} invalid block(s) dropped`);
      if ("pages" in d && d.pages) notes.push(`${d.pages} page(s) created`);
      setFlash(notes.length ? `Installed with notes — ${notes.join(" · ")}` : "Installed ✓");
      router.refresh();
    });

  if (entitlements.length === 0) {
    return (
      <p style={{ color: "var(--text-faint)", fontSize: "var(--text-sm)" }}>
        You haven&apos;t purchased any packs yet. When you buy a pack product from the storefront,
        it&apos;ll appear here with download and install buttons.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      {flash ? (
        <p
          style={{
            margin: 0,
            fontSize: "var(--text-xs)",
            color: flash.includes("✓") ? "var(--success)" : "var(--danger)",
          }}
        >
          {flash}
        </p>
      ) : null}

      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          overflow: "hidden",
        }}
      >
        {entitlements.map((e, i) => (
          <div
            key={e.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-4)",
              padding: "var(--space-3) var(--space-5)",
              borderTop: i === 0 ? "none" : "1px solid var(--border)",
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text)" }}>
                  {e.packTitle}
                </span>
                <span style={badgeStyle}>
                  {e.packType === "block_pack" ? "block pack" : "design pack"}
                </span>
              </div>
              <div style={{ fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>
                Purchased {new Date(e.grantedAt).toLocaleDateString()}
              </div>
            </div>
            <button
              type="button"
              onClick={() => download(e.packType, e.packEntryId, e.packTitle)}
              disabled={pending}
              style={btnStyle}
            >
              Download
            </button>
            <button
              type="button"
              onClick={() => install(e.packType, e.packEntryId, e.packTitle)}
              disabled={pending}
              style={btnStyle}
            >
              Install
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  fontSize: "var(--text-xs)",
  color: "var(--text-muted)",
  background: "none",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  padding: "var(--space-1) var(--space-3)",
  cursor: "pointer",
};

const badgeStyle: React.CSSProperties = {
  fontFamily: "var(--font-label)",
  fontSize: "var(--text-2xs)",
  textTransform: "uppercase",
  letterSpacing: "var(--tracking-wide)",
  color: "var(--text-faint)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-pill)",
  padding: "1px 7px",
};
