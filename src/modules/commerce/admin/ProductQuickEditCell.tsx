"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProduct } from "../product-actions";
import { centsToDollars, dollarsToCents } from "../money";
import type { ProductListItem } from "../queries";
import styles from "./commerce.module.css";

/** Builds the full productSchema payload updateProduct requires, patching one field. */
function patchPayload(p: ProductListItem, patch: Partial<{ priceCents: number; inventory: number }>) {
  return {
    name: p.name,
    slug: p.slug,
    status: p.status,
    priceCents: p.priceCents,
    compareAtCents: p.compareAtCents,
    currency: p.currency,
    sku: p.sku,
    description: p.description,
    images: p.images,
    trackInventory: p.trackInventory,
    inventory: p.inventory,
    lowStockThreshold: p.lowStockThreshold,
    allowBackorder: p.allowBackorder,
    weight: p.weight,
    weightUnit: p.weightUnit,
    dims: p.dims ?? { l: "", w: "", h: "", unit: "in" },
    shippingClass: p.shippingClass,
    seo: p.seo ?? { title: "", description: "" },
    ...patch,
  };
}

/** Inline-editable price cell — saves on blur/enter, reverts on error. */
export function ProductQuickPrice({ product }: { product: ProductListItem }) {
  const router = useRouter();
  const [value, setValue] = useState(centsToDollars(product.priceCents));
  const [pending, startTransition] = useTransition();

  const commit = () => {
    const nextCents = dollarsToCents(value);
    if (nextCents === product.priceCents) {
      setValue(centsToDollars(product.priceCents));
      return;
    }
    startTransition(async () => {
      const res = await updateProduct(product.id, patchPayload(product, { priceCents: nextCents }));
      if (res.ok) router.refresh();
      else setValue(centsToDollars(product.priceCents));
    });
  };

  return (
    <span className={styles.quickCell} onClick={(e) => e.stopPropagation()}>
      <span className={styles.quickPrefix} aria-hidden>
        $
      </span>
      <input
        className={styles.quickInput}
        value={value}
        aria-label={`Price for ${product.name}`}
        disabled={pending}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") setValue(centsToDollars(product.priceCents));
        }}
      />
    </span>
  );
}

/** Inline-editable inventory cell — only shown when the product tracks inventory. */
export function ProductQuickInventory({ product }: { product: ProductListItem }) {
  const router = useRouter();
  const [value, setValue] = useState(String(product.inventory));
  const [pending, startTransition] = useTransition();

  if (!product.trackInventory) {
    return <span className={styles.faint}>Not tracked</span>;
  }

  const commit = () => {
    const next = Math.max(0, Math.trunc(Number(value) || 0));
    if (next === product.inventory) {
      setValue(String(product.inventory));
      return;
    }
    startTransition(async () => {
      const res = await updateProduct(product.id, patchPayload(product, { inventory: next }));
      if (res.ok) router.refresh();
      else setValue(String(product.inventory));
    });
  };

  return (
    <span className={styles.quickCell} onClick={(e) => e.stopPropagation()}>
      <input
        className={styles.quickInput}
        type="number"
        min={0}
        inputMode="numeric"
        value={value}
        aria-label={`Inventory for ${product.name}`}
        disabled={pending}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") setValue(String(product.inventory));
        }}
      />
    </span>
  );
}
