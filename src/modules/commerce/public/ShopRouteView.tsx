import type { ShopRoute } from "./router";
import { CartProvider } from "./CartProvider";
import { CartButton } from "./CartButton";
import { CartDrawer } from "./CartDrawer";
import { ShopIndex } from "./ShopIndex";
import { ProductDetail } from "./ProductDetail";
import { ShopSuccess } from "./ShopSuccess";

/**
 * Dispatches a resolved shop route to its template, wrapped in the cart
 * context so the add-to-cart island, header cart button, and drawer share
 * one localStorage-backed state. The store templates are server components;
 * only the cart pieces are client islands.
 */
export function ShopRouteView({ route }: { route: ShopRoute }) {
  return (
    <CartProvider>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: "var(--space-6)",
        }}
      >
        <CartButton />
      </div>

      <ShopBody route={route} />
      <CartDrawer />
    </CartProvider>
  );
}

function ShopBody({ route }: { route: ShopRoute }) {
  switch (route.kind) {
    case "shop-index":
      return (
        <ShopIndex
          collections={route.collections}
          products={route.products}
          activeCollectionId={route.activeCollectionId}
        />
      );
    case "product-detail":
      return <ProductDetail product={route.product} />;
    case "shop-success":
      return <ShopSuccess order={route.order} />;
  }
}
