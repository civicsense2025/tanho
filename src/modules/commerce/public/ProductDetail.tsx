import { sanitizeRichHtml, safeJsonLd } from "@/lib/sanitize";
import { getSeoSettings } from "@/modules/seo/queries";
import { getGeneralSettings } from "@/modules/settings/queries";
import type { ProductDetail as ProductDetailData } from "../storefront-queries";
import { stockLine } from "./stock-line";
import { BuyBox } from "./BuyBox";
import styles from "./shop.module.css";

const SHIPPING_LABEL: Record<string, string> = {
  standard: "Standard shipping",
  heavy: "Heavy / freight",
  digital: "Digital — no shipping",
};

/** Public product page: gallery + add-to-cart buy box + meta + description. */
export async function ProductDetail({ product }: { product: ProductDetailData }) {
  const [seo, general] = await Promise.all([getSeoSettings(), getGeneralSettings()]);
  const siteUrl = (seo.siteUrl || process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const href = `/shop/${product.slug}`;
  const stock = stockLine(product);
  const descHtml = product.description ? sanitizeRichHtml(product.description) : "";

  const jsonLd = safeJsonLd({
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.images?.length ? product.images.map((i) => absolute(siteUrl, i)) : undefined,
    sku: product.sku || undefined,
    brand: { "@type": "Brand", name: general.name },
    offers: {
      "@type": "Offer",
      url: `${siteUrl}${href}`,
      priceCurrency: product.currency.toUpperCase(),
      price: (product.priceCents / 100).toFixed(2),
      availability:
        product.trackInventory && product.inventory <= 0 && !product.allowBackorder
          ? "https://schema.org/OutOfStock"
          : "https://schema.org/InStock",
    },
  });

  return (
    <article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <div className={styles.detail}>
        <div className={styles.gallery}>
          <div className={styles.galleryMain}>
            {product.images?.[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.images[0]} alt={product.name} />
            ) : (
              <div className={styles.placeholder} aria-hidden />
            )}
          </div>
        </div>

        <div>
          <BuyBox
            productId={product.id}
            name={product.name}
            href={href}
            basePriceCents={product.priceCents}
            compareAtCents={product.compareAtCents}
            currency={product.currency}
            inventory={product.inventory}
            trackInventory={product.trackInventory}
            allowBackorder={product.allowBackorder}
            variants={product.variants.map((v) => ({
              id: v.id,
              label: v.label,
              priceCents: v.priceCents,
              inventory: v.inventory,
            }))}
          />

          <div className={styles.meta}>
            {stock ? (
              <span className={`${styles.metaRow} ${stock.low ? styles.stockLow : ""}`}>
                {stock.text}
              </span>
            ) : null}
            {product.sku ? <span className={styles.metaRow}>SKU · {product.sku}</span> : null}
            <span className={styles.metaRow}>
              {SHIPPING_LABEL[product.shippingClass] ?? "Standard shipping"}
            </span>
          </div>
        </div>
      </div>

      {descHtml ? (
        <div
          className="prose"
          style={{ marginTop: "var(--space-10)", maxWidth: "42rem" }}
          dangerouslySetInnerHTML={{ __html: descHtml }}
        />
      ) : null}
    </article>
  );
}

const absolute = (siteUrl: string, path: string) =>
  path.startsWith("http") ? path : `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
