"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { EntityList } from "@/components/admin/EntityList";
import { Button } from "@/components/core/Button";
import { createProduct } from "../product-actions";
import type { ProductListItem, ProductRow } from "../queries";
import { productColumns } from "./productColumns";
import { ConnectStripeBanner } from "./StoreBanner";
import { SetupChecklist, type SetupChecklistItem } from "./SetupChecklist";
import styles from "./commerce.module.css";

/** A unique draft slug so "+ Product" never collides. */
function draftSlug(): string {
  return `draft-${Date.now().toString(36)}`;
}

/** Products list screen — EntityList + low-stock summary + new-draft flow. */
export function ProductsScreen({
  products,
  lowStock,
  stripeConnected,
  setupItems,
}: {
  products: ProductListItem[];
  lowStock: ProductRow[];
  stripeConnected: boolean;
  setupItems?: SetupChecklistItem[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const addProduct = () =>
    startTransition(async () => {
      const res = await createProduct({
        name: "Untitled product",
        slug: draftSlug(),
        status: "draft",
        priceCents: 0,
      });
      if (res.ok && res.data) router.push(`/admin/shop/products/${res.data.id}`);
    });

  return (
    <main className={styles.page}>
      <div className={styles.headerRow}>
        <h1 className={styles.title}>Products</h1>
        <span style={{ flex: 1 }} />
        <Button variant="accent" size="sm" onClick={addProduct} loading={pending}>
          + Product
        </Button>
      </div>

      {setupItems ? <SetupChecklist items={setupItems} /> : null}

      {!stripeConnected ? <ConnectStripeBanner /> : null}

      {lowStock.length > 0 ? (
        <div className={styles.lowStock}>
          <strong>{lowStock.length}</strong>{" "}
          {lowStock.length === 1 ? "product is" : "products are"} low on stock:{" "}
          {lowStock.map((p) => p.name).join(" · ")}
        </div>
      ) : null}

      <EntityList
        items={products}
        getId={(p) => p.id}
        columns={productColumns}
        getTitle={(p) => p.name}
        getSubtitle={(p) =>
          p.variantCount > 0
            ? `${p.variantCount} ${p.variantCount === 1 ? "variant" : "variants"}`
            : undefined
        }
        getStatus={(p) => p.status}
        searchValues={(p) => [p.name, p.slug, p.sku]}
        editHref={(p) => `/admin/shop/products/${p.id}`}
        onRowClick={(p) => router.push(`/admin/shop/products/${p.id}`)}
        emptyLabel="No products yet. Add your first one."
        noun="Product"
      />
    </main>
  );
}
