"use client";

import { useState, useTransition } from "react";
import { Section, Row } from "@/components/admin/Section";
import { Toggle, Seg } from "@/components/admin/Seg";
import { Input } from "@/components/forms/Input";
import { Textarea } from "@/components/forms/Textarea";
import { Button } from "@/components/core/Button";
import { saveMarketplaceSettings } from "../actions";
import type { MarketplaceSettings } from "../schema";

/**
 * The Marketplace settings screen — master flag, catalog identity, visibility,
 * and peer-instance management (for federated discovery in M6).
 */
export function MarketplaceForm({ initial }: { initial: MarketplaceSettings }) {
  const [s, setS] = useState(initial);
  const [peerInput, setPeerInput] = useState("");
  const [dirty, setDirty] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const patch = (next: Partial<MarketplaceSettings>) => {
    setS((p) => ({ ...p, ...next }));
    setDirty(true);
    setFlash(null);
  };

  const addPeer = () => {
    const url = peerInput.trim();
    if (!url) return;
    let valid: URL | null = null;
    try {
      valid = new URL(url);
    } catch {
      valid = null;
    }
    if (!valid || (valid.protocol !== "http:" && valid.protocol !== "https:")) {
      setFlash("Enter a valid http(s) URL");
      return;
    }
    if (s.peerInstances.includes(url)) {
      setPeerInput("");
      return;
    }
    patch({ peerInstances: [...s.peerInstances, url] });
    setPeerInput("");
  };

  const removePeer = (url: string) => {
    patch({ peerInstances: s.peerInstances.filter((u) => u !== url) });
  };

  const save = () =>
    startTransition(async () => {
      const res = await saveMarketplaceSettings(s);
      if (res.error) setFlash(res.error);
      else {
        setDirty(false);
        setFlash("Saved ✓");
        setTimeout(() => setFlash(null), 1600);
      }
    });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
        <span style={{ flex: 1 }} />
        {flash ? (
          <span
            style={{
              fontSize: "var(--text-xs)",
              color: flash.includes("✓") ? "var(--success)" : "var(--danger)",
            }}
          >
            {flash}
          </span>
        ) : null}
        <Button variant="accent" size="sm" onClick={save} loading={pending}>
          {dirty ? "Save •" : "Save"}
        </Button>
      </div>

      <Section
        title="Marketplace"
        desc="Turn on a public catalog of your block packs and design packs so other instances can discover and install them."
      >
        <Row label="Enable marketplace">
          <Toggle value={s.enabled} onChange={(v) => patch({ enabled: v })} />
        </Row>
      </Section>

      {s.enabled ? (
        <>
          <Section title="Catalog identity" desc="Shown on the public marketplace page and in the catalog.json endpoint.">
            <Row label="Name">
              <Input
                value={s.name}
                placeholder="My Pack Marketplace"
                onChange={(e) => patch({ name: e.target.value })}
              />
            </Row>
            <Row label="Description" stack>
              <Textarea
                rows={2}
                value={s.description}
                placeholder="A short description of this marketplace."
                onChange={(e) => patch({ description: e.target.value })}
              />
            </Row>
          </Section>

          <Section
            title="Visibility"
            desc="Public means the catalog routes respond for anyone (and peer instances). Private 404s the public routes."
          >
            <Row label="Visibility">
              <Seg
                value={s.visibility}
                onChange={(v) => patch({ visibility: v as "public" | "private" })}
                options={[
                  { value: "private", label: "Private" },
                  { value: "public", label: "Public" },
                ]}
              />
            </Row>
          </Section>

          <Section
            title="Peer instances"
            desc="URLs of other platform instances to browse in federated discovery (M6). Add one per line."
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              <div style={{ display: "flex", gap: "var(--space-2)" }}>
                <Input
                  value={peerInput}
                  placeholder="https://example.com"
                  onChange={(e) => setPeerInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addPeer();
                    }
                  }}
                />
                <Button variant="outline" size="sm" onClick={addPeer}>
                  Add
                </Button>
              </div>
              {s.peerInstances.length > 0 ? (
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                  {s.peerInstances.map((url) => (
                    <li
                      key={url}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--space-3)",
                        fontSize: "var(--text-sm)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius)",
                        padding: "var(--space-2) var(--space-3)",
                      }}
                    >
                      <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {url}
                      </span>
                      <button
                        type="button"
                        onClick={() => removePeer(url)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--text-muted)",
                          fontSize: "var(--text-xs)",
                        }}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
                  No peer instances yet.
                </p>
              )}
            </div>
          </Section>
        </>
      ) : null}
    </div>
  );
}
