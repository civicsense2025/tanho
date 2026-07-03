import Link from "next/link";
import styles from "./commerce.module.css";

/** Connect-Stripe banner shown when the store is unlocked but payments aren't wired. */
export function ConnectStripeBanner() {
  return (
    <div className={styles.banner}>
      <span>Payments aren&rsquo;t connected — checkout is disabled until you connect Stripe.</span>
      <span style={{ flex: 1 }} />
      <Link href="/admin/settings/payments" className={styles.bannerLink}>
        Connect Stripe →
      </Link>
    </div>
  );
}
