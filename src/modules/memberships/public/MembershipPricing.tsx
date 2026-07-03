import { formatCents } from "@/modules/commerce/money";
import type { MembershipTier } from "../validation";
import { JoinButton, type CtaMode } from "./JoinButton";
import styles from "./membership.module.css";

const cadenceLabel = (c: MembershipTier["cadence"]) => (c === "yr" ? "/year" : "/month");

/**
 * The public pricing table. Pure render — tiers + the resolved CTA mode come
 * from the server page. `configured` gates checkout: when payments aren't set
 * up we show a muted "opens soon" note instead of live CTAs.
 */
export function MembershipPricing({
  tiers,
  mode,
  configured,
}: {
  tiers: MembershipTier[];
  mode: CtaMode;
  configured: boolean;
}) {
  return (
    <div className={styles.grid}>
      {tiers.map((tier) => (
        <article
          key={tier.slug}
          className={styles.card}
          data-featured={tier.featured || undefined}
        >
          {tier.featured ? <span className={styles.badge}>Most popular</span> : null}
          <h2 className={styles.tierName}>{tier.name}</h2>
          <p className={styles.price}>
            <span className={styles.amount}>{formatCents(tier.priceCents)}</span>
            <span className={styles.cadence}>{cadenceLabel(tier.cadence)}</span>
          </p>
          {tier.features.length ? (
            <ul className={styles.features}>
              {tier.features.map((f, i) => (
                <li key={i} className={styles.feature}>
                  <span aria-hidden className={styles.check}>
                    ✓
                  </span>
                  {f}
                </li>
              ))}
            </ul>
          ) : null}
          {configured ? (
            <JoinButton
              mode={mode}
              tierSlug={tier.slug}
              tierName={tier.name}
              featured={tier.featured}
            />
          ) : (
            <p className={styles.soon}>Memberships open soon</p>
          )}
        </article>
      ))}
    </div>
  );
}
