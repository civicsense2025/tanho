"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/core/Button";
import { formatMoney } from "../format-money";
import { useCart } from "./CartProvider";
import styles from "./shop.module.css";

export type BuyBoxVariant = {
  id: string;
  label: string;
  priceCents: number;
  inventory: number;
};

export type BuyBoxProps = {
  productId: string;
  name: string;
  href: string;
  basePriceCents: number;
  compareAtCents: number | null;
  currency: string;
  inventory: number;
  trackInventory: boolean;
  allowBackorder: boolean;
  variants: BuyBoxVariant[];
};

/**
 * Add-to-cart island: price, optional variant picker, quantity, Add to cart.
 * Prices shown here are DISPLAY only — the server recomputes them at checkout.
 */
export function BuyBox(props: BuyBoxProps) {
  const { add } = useCart();
  const [variantId, setVariantId] = useState<string>(props.variants[0]?.id ?? "");
  const [qty, setQty] = useState(1);

  const selected = useMemo(
    () => props.variants.find((v) => v.id === variantId),
    [props.variants, variantId],
  );

  const unitCents = selected ? selected.priceCents : props.basePriceCents;
  const inventory = selected ? selected.inventory : props.inventory;
  const soldOut = props.trackInventory && !props.allowBackorder && inventory <= 0;

  const displayName = selected ? `${props.name} — ${selected.label}` : props.name;

  const addToCart = () => {
    if (soldOut) return;
    add({
      productId: props.productId,
      variantId: selected?.id,
      qty: Math.max(1, Math.trunc(qty)),
      name: displayName,
      unitCents,
      currency: props.currency,
      href: props.href,
    });
  };

  return (
    <div className={styles.buyBox}>
      <h1 className={styles.detailTitle}>{props.name}</h1>

      <div className={styles.detailPrice}>
        <span>{formatMoney(unitCents, props.currency)}</span>
        {props.compareAtCents && props.compareAtCents > unitCents ? (
          <span className={styles.compareAt}>
            {formatMoney(props.compareAtCents, props.currency)}
          </span>
        ) : null}
      </div>

      {props.variants.length > 0 ? (
        <div className={styles.field}>
          <label className={styles.label} htmlFor="variant">
            Option
          </label>
          <select
            id="variant"
            className={styles.control}
            value={variantId}
            onChange={(e) => setVariantId(e.target.value)}
          >
            {props.variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className={styles.qtyRow}>
        <label className={styles.label} htmlFor="qty">
          Qty
        </label>
        <input
          id="qty"
          type="number"
          min={1}
          className={`${styles.control} ${styles.qtyInput}`}
          value={qty}
          onChange={(e) => setQty(Number(e.target.value))}
        />
      </div>

      <Button variant="solid" onClick={addToCart} disabled={soldOut}>
        {soldOut ? "Out of stock" : "Add to cart"}
      </Button>
    </div>
  );
}
