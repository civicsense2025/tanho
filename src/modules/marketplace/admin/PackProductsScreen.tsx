"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Section, Row } from "@/components/admin/Section";
import { Input } from "@/components/forms/Input";
import { Select } from "@/components/forms/Select";
import { Button } from "@/components/core/Button";
import { Seg } from "@/components/admin/Seg";
import { formatMoney } from "@/modules/commerce/format-money";
import {
  createPackProduct,
  updatePackProductPrice,
  unlinkPackProduct,
  type PackProduct,
} from "../commerce-actions";
import type { EntryRow } from "@/modules/entries/schema";

type PackOption = { id: string; title: string; type: "block_pack" | "design_pack" };

/**
 * The Pack Products admin screen — list, create, edit price, and unlink
 * commerce products linked to block packs and design packs.
 */
export function PackProductsScreen({
  products,
  blockPacks,
  designPacks,
}: {
  products: PackProduct[];
  blockPacks: EntryRow[];
  designPacks: EntryRow[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [flash, setFlash] = useState<string | null>(null);

  // Create form state
  const packOptions: PackOption[] = [
    ...blockPacks.map((p) => ({ id: p.id, title: p.title, type: "block_pack" as const })),
    ...designPacks.map((p) => ({ id: p.id, title: p.title, type: "design_pack" as const })),
  ];
  const linkedIds = new Set(products.map((p) => p.packEntryId));
  const available = packOptions.filter((o) => !linkedIds.has(o.id));

  const [selPack, setSelPack] = useState<string>(available[0]?.id ?? "");
  const [priceDollars, setPriceDollars] = useState("19.00");
  const [currency, setCurrency] = useState("usd");

  const create = () =>
    start(async () => {
      setFlash(null);
      const opt = packOptions.find((o) => o.id === selPack);
      if (!opt) return setFlash("Select a pack first.");
      const priceCents = Math.round(Number.parseFloat(priceDollars) * 100);
      if (Number.isNaN(priceCents) || priceCents < 0) return setFlash("Enter a valid price.");
      const res = await createPackProduct({
        packType: opt.type,
        packEntryId: opt.id,
        price: priceCents,
        currency,
      });
      if (!res.ok) return setFlash(res.error);
      setFlash("Created ✓");
      router.refresh();
    });

  const editPrice = (productId: string) =>
    start(async () => {
      const raw = window.prompt("New price (in dollars, e.g. 29.00):");
      if (raw === null) return;
      const priceCents = Math.round(Number.parseFloat(raw) * 100);
      if (Number.isNaN(priceCents) || priceCents < 0) return setFlash("Invalid price.");
      const res = await updatePackProductPrice(productId, { price: priceCents, currency });
      if (!res.ok) return setFlash(res.error);
      setFlash("Price updated ✓");
      router.refresh();
    });

  const unlink = (productId: string) =>
    start(async () => {
      if (!window.confirm("Unlink this product from its pack? The product row is kept for order history.")) return;
      const res = await unlinkPackProduct(productId);
      if (!res.ok) return setFlash(res.error);
      setFlash("Unlinked ✓");
      router.refresh();
    });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
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

      <Section
        title="Create pack product"
        desc="Link a block pack or design pack to a commerce product. Buyers who purchase it get an automatic download/install entitlement."
      >
        {available.length > 0 ? (
          <>
            <Row label="Pack">
              <Select
                value={selPack}
                onChange={(e) => setSelPack(e.target.value)}
                style={{ maxWidth: 400 }}
              >
                {available.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.type === "block_pack" ? "Block pack" : "Design pack"} — {o.title}
                  </option>
                ))}
              </Select>
            </Row>
            <Row label="Price (USD)">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={priceDollars}
                onChange={(e) => setPriceDollars(e.target.value)}
                style={{ maxWidth: 160 }}
              />
            </Row>
            <Row label="Currency">
              <Seg
                value={currency}
                onChange={(v) => setCurrency(v)}
                options={[
                  { value: "usd", label: "USD" },
                  { value: "eur", label: "EUR" },
                  { value: "gbp", label: "GBP" },
                  { value: "cad", label: "CAD" },
                ]}
              />
            </Row>
            <div style={{ marginTop: "var(--space-4)" }}>
              <Button variant="accent" size="sm" onClick={create} loading={pending}>
                Create product
              </Button>
            </div>
          </>
        ) : (
          <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
            All packs already have products. Import or create more packs to list them here.
          </p>
        )}
      </Section>

      <Section title="Pack products" desc="Commerce products linked to packs. Edit the price or unlink a pack.">
        {products.length === 0 ? (
          <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
            No pack products yet. Create one above.
          </p>
        ) : (
          <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
            {products.map((p, i) => (
              <div
                key={p.id}
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
                      {p.packTitle}
                    </span>
                    <span style={badgeStyle}>
                      {p.packType === "block_pack" ? "block pack" : "design pack"}
                    </span>
                    <span style={badgeStyle}>{p.status}</span>
                  </div>
                  <div style={{ fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>
                    {formatMoney(p.priceCents, p.currency)} · /shop/{p.slug}
                  </div>
                </div>
                <button type="button" onClick={() => editPrice(p.id)} disabled={pending} style={btnStyle}>
                  Edit price
                </button>
                <button
                  type="button"
                  onClick={() => unlink(p.id)}
                  disabled={pending}
                  style={{ ...btnStyle, color: "var(--danger)" }}
                >
                  Unlink
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>
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
