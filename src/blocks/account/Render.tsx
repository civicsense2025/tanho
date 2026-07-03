import Link from "next/link";
import type { RenderCtx } from "../types";
import { boundPlaceholder } from "../bound-common";
import type { AccountContent } from "./fields";
import type { AccountResolved } from "./resolve";
import styles from "./account.module.css";

const day = (ms: number | null) => (ms ? new Date(ms).toISOString().slice(0, 10) : "—");

/**
 * Account panel. Pure presentation of the CURRENT viewer's resolved state —
 * anonymous viewers get a sign-in CTA; members get their own plan card. It
 * never renders another person's data (resolve only ever returns the viewer's).
 */
export function RenderAccount({
  content,
  ctx,
}: {
  content: AccountContent & { _resolved?: AccountResolved | null };
  ctx: RenderCtx;
}) {
  const ph = boundPlaceholder(ctx, "Account", content._resolved);
  if (ph) return <div style={ph.style}>{ph.label}</div>;

  const r = content._resolved;

  if (!r || !r.signedIn) {
    return (
      <section className={styles.card}>
        <p className={styles.prompt}>Sign in to manage your membership.</p>
        <Link className={styles.cta} href="/signin">
          Sign in →
        </Link>
      </section>
    );
  }

  if (!r.memberActive) {
    return (
      <section className={styles.card}>
        <h2 className={styles.head}>Account</h2>
        <p className={styles.faint}>Free — no paid membership.</p>
        <Link className={styles.link} href="/account">
          Manage account →
        </Link>
      </section>
    );
  }

  return (
    <section className={styles.card}>
      <h2 className={styles.head}>Membership</h2>
      <dl className={styles.meta}>
        <div>
          <dt>Plan</dt>
          <dd>{r.tier ?? "Member"}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{r.status ?? "active"}</dd>
        </div>
        <div>
          <dt>Since</dt>
          <dd className={styles.mono}>{day(r.since)}</dd>
        </div>
        <div>
          <dt>Next bill</dt>
          <dd className={styles.mono}>{day(r.currentPeriodEnd)}</dd>
        </div>
      </dl>
      <Link className={styles.link} href="/account">
        Manage account →
      </Link>
    </section>
  );
}
