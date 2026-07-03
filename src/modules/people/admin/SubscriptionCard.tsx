import styles from "./profile.module.css";

type Subscription = { id: string; list: string; status: string };

/** Email-subscription sidebar card. Unsubscribes are honored (no re-enable). */
export function SubscriptionCard({ subscriptions }: { subscriptions: Subscription[] }) {
  return (
    <section className={styles.card}>
      <h3 className={styles.cardHead}>Email subscription</h3>
      {subscriptions.length === 0 ? (
        <p className={styles.faint}>Not subscribed to any lists.</p>
      ) : (
        <ul className={styles.subs}>
          {subscriptions.map((s) => (
            <li key={s.id} className={styles.subRow}>
              <span>{s.list}</span>
              <span className={styles.subStatus} data-status={s.status}>
                {s.status}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className={styles.note}>
        Unsubscribes are honored — re-enabling requires a fresh opt-in from the
        reader.
      </p>
    </section>
  );
}
