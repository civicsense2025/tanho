"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  installPackFromPeer,
  refreshFederatedCatalog,
} from "../federation-actions";
import type { FederatedPeer } from "../federation-queries";
import type { PeerPackSummary } from "../federation";

/**
 * Interactive federated browse screen. Renders the merged peer catalog
 * grouped by peer instance; each pack has an Install button that calls
 * `installPackFromPeer` and surfaces the import diagnostics (missing types,
 * dropped blocks) or an error. A Refresh button force-refreshes the catalog.
 */
export function FederatedBrowseScreen({ peers }: { peers: FederatedPeer[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [flash, setFlash] = useState<string | null>(null);
  // Per-pack status keyed by `${peerUrl}|${type}|${slug}`.
  const [status, setStatus] = useState<
    Record<string, { kind: "ok"; link: string; note: string } | { kind: "err"; msg: string } | { kind: "working" }>
  >({});

  const keyOf = (peerUrl: string, p: PeerPackSummary) => `${peerUrl}|${p.type}|${p.slug}`;

  const install = (peerUrl: string, p: PeerPackSummary) => {
    const k = keyOf(peerUrl, p);
    setStatus((s) => ({ ...s, [k]: { kind: "working" } }));
    setFlash(null);
    start(async () => {
      const res = await installPackFromPeer(peerUrl, p.type, p.slug);
      if (!res.ok) {
        setStatus((s) => ({ ...s, [k]: { kind: "err", msg: res.error } }));
        return;
      }
      const d = res.data!;
      const notes: string[] = [];
      if (d.missingTypes.length)
        notes.push(`${d.missingTypes.length} unknown type(s): ${d.missingTypes.join(", ")}`);
      if (d.dropped.length) notes.push(`${d.dropped.length} invalid block(s) dropped`);
      const link =
        p.type === "design-pack" ? "/admin/design-packs" : "/admin/block-packs";
      setStatus((s) => ({
        ...s,
        [k]: { kind: "ok", link, note: notes.length ? `Installed — ${notes.join(" · ")}` : "Installed." },
      }));
      router.refresh();
    });
  };

  const refresh = () => {
    setFlash(null);
    start(async () => {
      await refreshFederatedCatalog();
      router.refresh();
      setFlash("Catalog refreshed ✓");
      setTimeout(() => setFlash(null), 1600);
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
        <button
          type="button"
          onClick={refresh}
          disabled={pending}
          style={{
            fontSize: "var(--text-sm)",
            color: "var(--text-muted)",
            background: "none",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            padding: "var(--space-2) var(--space-4)",
            cursor: pending ? "default" : "pointer",
          }}
        >
          Refresh
        </button>
        {flash ? (
          <span style={{ fontSize: "var(--text-xs)", color: "var(--success)" }}>{flash}</span>
        ) : null}
      </div>

      {peers.length === 0 ? (
        <p style={{ color: "var(--text-faint)", fontSize: "var(--text-sm)" }}>
          No peer instances configured. Add peer URLs in{" "}
          <Link href="/admin/settings/marketplace" style={{ color: "var(--accent)" }}>
            Marketplace settings
          </Link>{" "}
          to browse their catalogs here.
        </p>
      ) : null}

      {peers.map((peer) => (
        <PeerBlock key={peer.peerUrl} peer={peer} status={status} onInstall={install} keyOf={keyOf} />
      ))}
    </div>
  );
}

function PeerBlock({
  peer,
  status,
  onInstall,
  keyOf,
}: {
  peer: FederatedPeer;
  status: Record<string, { kind: "ok"; link: string; note: string } | { kind: "err"; msg: string } | { kind: "working" }>;
  onInstall: (peerUrl: string, p: PeerPackSummary) => void;
  keyOf: (peerUrl: string, p: PeerPackSummary) => string;
}) {
  return (
    <section
      style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        padding: "var(--space-5)",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
        <h2 style={{ margin: 0, fontSize: "var(--text-sm)", fontWeight: 500 }}>{peer.peerName}</h2>
        <span style={{ fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>{peer.peerUrl}</span>
        {peer.error ? (
          <span
            style={{
              fontSize: "var(--text-2xs)",
              fontFamily: "var(--font-label)",
              textTransform: "uppercase",
              letterSpacing: "var(--tracking-wide)",
              color: "var(--danger)",
              border: "1px solid var(--danger)",
              borderRadius: "var(--radius-pill)",
              padding: "1px 7px",
            }}
          >
            Unreachable
          </span>
        ) : (
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>
            {peer.packs.length} pack{peer.packs.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {peer.error ? (
        <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
          Could not load this peer&apos;s catalog: {peer.error}
        </p>
      ) : peer.packs.length === 0 ? (
        <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>
          This peer has no published packs.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {peer.packs.map((p) => {
            const k = keyOf(peer.peerUrl, p);
            const st = status[k];
            return (
              <div
                key={k}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "var(--space-4)",
                  padding: "var(--space-3) 0",
                  borderTop: "1px solid var(--border)",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: "var(--text-sm)", fontWeight: 500 }}>{p.title}</span>
                    <span
                      style={{
                        fontFamily: "var(--font-label)",
                        fontSize: "var(--text-2xs)",
                        textTransform: "uppercase",
                        letterSpacing: "var(--tracking-wide)",
                        color: "var(--text-faint)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-pill)",
                        padding: "1px 7px",
                      }}
                    >
                      {p.type}
                    </span>
                  </div>
                  {p.description ? (
                    <p style={{ margin: "2px 0 0", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                      {p.description}
                    </p>
                  ) : null}
                  <div style={{ fontSize: "var(--text-2xs)", color: "var(--text-faint)", marginTop: 4 }}>
                    {p.requiredBlockTypes.length} required type{p.requiredBlockTypes.length === 1 ? "" : "s"}
                    {p.requiredBlockTypes.length ? `: ${p.requiredBlockTypes.join(", ")}` : ""}
                  </div>
                  {st?.kind === "ok" ? (
                    <div style={{ marginTop: 6, fontSize: "var(--text-xs)", color: "var(--success)" }}>
                      {st.note}{" "}
                      <Link href={st.link} style={{ color: "var(--accent)" }}>
                        View →
                      </Link>
                    </div>
                  ) : null}
                  {st?.kind === "err" ? (
                    <div style={{ marginTop: 6, fontSize: "var(--text-xs)", color: "var(--danger)" }}>
                      {st.msg}
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => onInstall(peer.peerUrl, p)}
                  disabled={st?.kind === "working" || st?.kind === "ok"}
                  style={{
                    fontSize: "var(--text-xs)",
                    fontWeight: 500,
                    color: "var(--bg)",
                    background: "var(--accent)",
                    border: "none",
                    borderRadius: "var(--radius-sm)",
                    padding: "var(--space-2) var(--space-4)",
                    cursor: st?.kind === "working" || st?.kind === "ok" ? "default" : "pointer",
                    opacity: st?.kind === "working" || st?.kind === "ok" ? 0.6 : 1,
                  }}
                >
                  {st?.kind === "working" ? "Installing…" : st?.kind === "ok" ? "Installed ✓" : "Install"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
