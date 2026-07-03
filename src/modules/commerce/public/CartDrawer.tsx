"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/core/Button";
import { startCheckout } from "../checkout-actions";
import { formatMoney } from "../format-money";
import { lineKey, useCart } from "./CartProvider";
import styles from "./shop.module.css";

/**
 * Slide-over cart. The checkout button sends only {productId, variantId, qty}
 * to the server action — never prices. The server recomputes every amount
 * from the DB, so the display snapshot here can't influence what is charged.
 */
export function CartDrawer() {
  const { lines, subtotalCents, open, setOpen, setQty, remove } = useCart();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const currency = lines[0]?.currency ?? "usd";

  if (!open) return null;

  const checkout = () => {
    setError(null);
    startTransition(async () => {
      const result = await startCheckout({
        items: lines.map((l) => ({
          productId: l.productId,
          variantId: l.variantId,
          qty: l.qty,
        })),
      });
      if (result.ok) {
        window.location.href = result.url;
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <>
      <div className={styles.overlay} onClick={() => setOpen(false)} aria-hidden />
      <aside className={styles.drawer} role="dialog" aria-label="Shopping cart">
        <div className={styles.drawerHead}>
          <span className={styles.drawerTitle}>Cart</span>
          <button type="button" className={styles.close} onClick={() => setOpen(false)}>
            Close ✕
          </button>
        </div>

        <div className={styles.drawerBody}>
          {lines.length === 0 ? (
            <p className={styles.emptyCart}>Your cart is empty.</p>
          ) : (
            lines.map((l) => {
              const key = lineKey(l);
              return (
                <div key={key} className={styles.cartLine}>
                  <div>
                    <div className={styles.cartLineName}>{l.name}</div>
                    <div className={styles.cartLineControls}>
                      <input
                        type="number"
                        min={1}
                        className={styles.qtyStepper}
                        value={l.qty}
                        aria-label={`Quantity for ${l.name}`}
                        onChange={(e) => setQty(key, Number(e.target.value))}
                      />
                      <button
                        type="button"
                        className={styles.removeLink}
                        onClick={() => remove(key)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <div>{formatMoney(l.unitCents * l.qty, l.currency)}</div>
                </div>
              );
            })
          )}
        </div>

        <div className={styles.drawerFoot}>
          <div className={styles.subtotal}>
            <span>Subtotal</span>
            <span>{formatMoney(subtotalCents, currency)}</span>
          </div>
          {error ? <p className={styles.errorMsg}>{error}</p> : null}
          <Button
            variant="solid"
            onClick={checkout}
            disabled={lines.length === 0}
            loading={pending}
          >
            Checkout
          </Button>
        </div>
      </aside>
    </>
  );
}
