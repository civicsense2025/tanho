import Link from "next/link";
import { confirmSubscriptionAction } from "@/modules/people/newsletter-actions";
import styles from "./confirm.module.css";

export const metadata = { title: "Confirm subscription" };

/** Double-opt-in landing — verifies the signed token server-side, then reports. */
export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const result = token
    ? await confirmSubscriptionAction(token)
    : { ok: false, message: "This confirmation link is missing its token." };

  return (
    <main className={styles.wrap}>
      <p className={styles.msg} data-ok={result.ok || undefined}>
        {result.message}
      </p>
      <Link className={styles.link} href="/">
        ← Back to the site
      </Link>
    </main>
  );
}
