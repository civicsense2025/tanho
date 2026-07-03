import Link from "next/link";
import { verifyEmailAction } from "@/modules/people/account-actions";
import styles from "../../newsletter/confirm/confirm.module.css";

export const metadata = { title: "Verify email" };

/** Email verification landing — validates the signed token server-side. */
export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const result = token
    ? await verifyEmailAction(token)
    : { ok: false, message: "This verification link is missing its token." };

  return (
    <main className={styles.wrap}>
      <p className={styles.msg} data-ok={result.ok || undefined}>
        {result.message}
      </p>
      <Link className={styles.link} href="/account">
        ← Go to your account
      </Link>
    </main>
  );
}
