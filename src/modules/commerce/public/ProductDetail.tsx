import { sanitizeRichHtml } from "@/lib/sanitize";
import { getSeoSettings } from "@/modules/seo/queries";
import { getGeneralSettings } from "@/modules/settings/queries";
import { getCanonicalSiteUrl } from "@/modules/domain/queries";
import { JsonLd, product as productSchema } from "@/modules/seo";
import { RenderBlocks } from "@/blocks/renderer/BlockRenderer";
import { getPublishedProductBlocks, type ProductDetail as ProductDetailData } from "../storefront-queries";
import { stockLine } from "./stock-line";
import { BuyBox } from "./BuyBox";
import styles from "./shop.module.css";

const BASE_FALLBACK = process.env.APP_URL ?? "http://localhost:3000";

const SHIPPING_LABEL: Record<string, string> = {
  standard: "Standard shipping",
  heavy: "Heavy / freight",
  digital: "Digital — no shipping",
};

/** Public product page: gallery + add-to-cart buy box + meta + description. */
export async function ProductDetail({ product }: { product: ProductDetailData }) {
  const [seo, general, blocks] = await Promise.all([
    getSeoSettings(),
    getGeneralSettings(),
    getPublishedProductBlocks(product.id),
  ]);
  const siteUrl = (await getCanonicalSiteUrl(seo.siteUrl, BASE_FALLBACK)).replace(/\/$/, "");
  const href = `/shop/${product.slug}`;
  const stock = stockLine(product);
  const descHtml = product.description ? sanitizeRichHtml(product.description) : "";

  // Product schema now comes from the shared builder (was inline here); the
  // emitted markup is identical, but the availability rule lives in one place.
  const inStock = !(product.trackInventory && product.inventory <= 0 && !product.allowBackorder);
  const ld = productSchema(
    {
      name: product.name,
      url: href,
      images: product.images,
      sku: product.sku,
      priceCents: product.priceCents,
      currency: product.currency,
      inStock,
    },
    { siteName: general.name, siteUrl },
  );

  return (
    <article>
      <JsonLd schema={ld} />
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

      {blocks.length > 0 ? (
        <div style={{ marginTop: "var(--space-10)" }}>
          <RenderBlocks blocks={blocks} />
        </div>
      ) : descHtml ? (
        <div
          className="prose"
          style={{ marginTop: "var(--space-10)", maxWidth: "42rem" }}
          dangerouslySetInnerHTML={{ __html: descHtml }}
        />
      ) : null}
    </article>
  );
}
