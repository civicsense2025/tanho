import Link from "next/link";
import { unsubscribeAction } from "@/modules/people/newsletter-actions";
import styles from "../confirm/confirm.module.css";

export const metadata = { title: "Unsubscribe" };

/** Token-based unsubscribe landing — honored irreversibly (no re-enable here). */
export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const result = token
    ? await unsubscribeAction({ token })
    : { ok: false, message: "This unsubscribe link is missing its token." };

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
