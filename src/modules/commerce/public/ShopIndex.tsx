import Link from "next/link";
import { formatMoney } from "../format-money";
import type { StorefrontCollection, StorefrontProduct } from "../storefront-queries";
import { stockLine } from "./stock-line";
import styles from "./shop.module.css";

/** Storefront index: visible-collection filter pills + active product grid. */
export function ShopIndex({
  collections,
  products,
  activeCollectionId,
}: {
  collections: StorefrontCollection[];
  products: StorefrontProduct[];
  activeCollectionId: string | null;
}) {
  return (
    <div>
      <header className={styles.hero}>
        <h1 className={styles.heroHeading}>Shop</h1>
      </header>

      {collections.length > 0 ? (
        <nav className={styles.pills} aria-label="Collections">
          <Link
            href="/shop"
            className={`${styles.pill} ${activeCollectionId ? "" : styles.pillActive}`}
          >
            All
          </Link>
          {collections.map((c) => (
            <Link
              key={c.id}
              href={`/shop?collection=${encodeURIComponent(c.id)}`}
              className={`${styles.pill} ${activeCollectionId === c.id ? styles.pillActive : ""}`}
            >
              {c.name}
            </Link>
          ))}
        </nav>
      ) : null}

      {products.length === 0 ? (
        <p className={styles.emptyCart}>No products yet.</p>
      ) : (
        <div className={styles.grid}>
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProductCard({ product }: { product: StorefrontProduct }) {
  const image = product.images?.[0];
  const stock = stockLine(product);
  const onSale = product.compareAtCents && product.compareAtCents > product.priceCents;

  return (
    <a href={`/shop/${encodeURIComponent(product.slug)}`} className={styles.card}>
      <div className={styles.thumb}>
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={product.name} loading="lazy" />
        ) : (
          <div className={styles.placeholder} aria-hidden />
        )}
      </div>
      <span className={styles.cardName}>{product.name}</span>
      <span className={styles.price}>
        {formatMoney(product.priceCents, product.currency)}
        {onSale ? (
          <span className={styles.compareAt}>
            {formatMoney(product.compareAtCents!, product.currency)}
          </span>
        ) : null}
      </span>
      {stock ? (
        <span className={`${styles.stock} ${stock.low ? styles.stockLow : ""}`}>{stock.text}</span>
      ) : null}
    </a>
  );
}
