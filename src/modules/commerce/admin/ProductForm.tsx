"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Section, Row } from "@/components/admin/Section";
import { Seg } from "@/components/admin/Seg";
import { Input } from "@/components/forms/Input";
import { Textarea } from "@/components/forms/Textarea";
import { Select } from "@/components/forms/Select";
import { Button } from "@/components/core/Button";
import { dollarsToCents } from "../money";
import { deleteProduct, setProductCollections, updateProduct } from "../product-actions";
import type { ProductRow, VariantRow } from "../queries";
import { CURRENCIES } from "../validation";
import { PhotosField } from "./PhotosField";
import { VariantsRepeater } from "./VariantsRepeater";
import { CollectionsField, type CollectionOption } from "./CollectionsField";
import { ProductDetailSections } from "./ProductDetailSections";
import { initState, intOf, type FormState } from "./product-form-state";
import styles from "./commerce.module.css";

/** Product editor — Core, Photos, Collections, Inventory, Variants, Shipping, SEO. */
export function ProductForm({
  product,
  variants,
  collectionIds,
  collectionOptions,
  stripeConnected,
}: {
  product: ProductRow;
  variants: VariantRow[];
  collectionIds: string[];
  collectionOptions: CollectionOption[];
  stripeConnected: boolean;
}) {
  const router = useRouter();
  const [s, setS] = useState<FormState>(() => initState(product));
  const [selected, setSelected] = useState<string[]>(collectionIds);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setS((p) => ({ ...p, [k]: v }));
    setFlash(null);
  };

  const save = () =>
    startTransition(async () => {
      setError(null);
      const res = await updateProduct(product.id, {
        name: s.name,
        slug: s.slug,
        status: s.status,
        priceCents: dollarsToCents(s.price),
        compareAtCents: s.compareAt.trim() ? dollarsToCents(s.compareAt) : null,
        currency: s.currency,
        sku: s.sku,
        description: s.description,
        images: s.images,
        trackInventory: s.trackInventory,
        inventory: intOf(s.inventory),
        lowStockThreshold: intOf(s.lowStockThreshold),
        allowBackorder: s.allowBackorder,
        weight: s.weight,
        weightUnit: s.weightUnit,
        dims: product.dims ?? { l: "", w: "", h: "", unit: "in" },
        shippingClass: s.shippingClass,
        seo: { title: s.seoTitle, description: s.seoDescription },
      });
      if (!res.ok) return setError(res.error);
      await setProductCollections(product.id, selected);
      setFlash("Saved ✓");
      router.refresh();
      setTimeout(() => setFlash(null), 1600);
    });

  const remove = () =>
    startTransition(async () => {
      if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
      const res = await deleteProduct(product.id);
      if (res.ok) router.push("/admin/shop/products");
      else setError(res.error);
    });

  const syncLine = !stripeConnected
    ? "Stripe not connected — this product won't sync until you connect payments."
    : product.stripeProductId
      ? `Synced to Stripe · ${product.stripeProductId}`
      : "Not yet synced to Stripe — save while active to sync.";

  return (
    <main className={styles.page}>
      <div className={styles.headerRow}>
        <Link href="/admin/shop/products" className={styles.back}>
          ← Products
        </Link>
        <span style={{ flex: 1 }} />
        {error ? <span className={styles.error}>{error}</span> : null}
        {flash ? (
          <span style={{ fontSize: "var(--text-xs)", color: "var(--success)" }}>{flash}</span>
        ) : null}
        <Button variant="ghost" size="sm" onClick={remove} disabled={pending}>
          Delete
        </Button>
        <Button variant="accent" size="sm" onClick={save} loading={pending}>
          Save
        </Button>
      </div>

      <Section title="Core">
        <Row label="Name">
          <Input value={s.name} onChange={(e) => set("name", e.target.value)} />
        </Row>
        <Row label="Slug">
          <Input value={s.slug} onChange={(e) => set("slug", e.target.value.toLowerCase())} />
        </Row>
        <Row label="Status">
          <Seg
            value={s.status}
            onChange={(v) => set("status", v as FormState["status"])}
            options={[
              { value: "draft", label: "Draft" },
              { value: "active", label: "Active" },
            ]}
          />
        </Row>
        <Row label="Price">
          <Input value={s.price} onChange={(e) => set("price", e.target.value)} placeholder="0.00" />
        </Row>
        <Row label="Compare-at price">
          <Input value={s.compareAt} onChange={(e) => set("compareAt", e.target.value)} placeholder="—" />
        </Row>
        <Row label="Currency">
          <Select value={s.currency} onChange={(e) => set("currency", e.target.value as FormState["currency"])}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c.toUpperCase()}
              </option>
            ))}
          </Select>
        </Row>
        <Row label="SKU">
          <Input value={s.sku} onChange={(e) => set("sku", e.target.value)} />
        </Row>
        <Row label="Description" stack>
          <Textarea rows={4} value={s.description} onChange={(e) => set("description", e.target.value)} />
        </Row>
        <p className={styles.syncLine}>{syncLine}</p>
      </Section>

      <Section title="Photos">
        <PhotosField images={s.images} onChange={(next) => set("images", next)} />
      </Section>

      <Section title="Collections">
        <CollectionsField options={collectionOptions} selected={selected} onChange={setSelected} />
      </Section>

      <ProductDetailSections s={s} set={set} />

      <Section title="Variants" desc="Each variant saves on its own.">
        <VariantsRepeater
          productId={product.id}
          variants={variants}
          onChange={() => router.refresh()}
        />
      </Section>
    </main>
  );
}
