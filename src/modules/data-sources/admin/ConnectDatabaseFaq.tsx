import styles from "./data-sources.module.css";

const FAQ_ITEMS: Array<{ q: string; a: string }> = [
  {
    q: "Where do I find my Supabase database password?",
    a: "In the Supabase dashboard, go to Settings → Database. This is the Postgres role password, not your service-role or anon API key — those are JWTs and won't work over the Postgres wire protocol.",
  },
  {
    q: "Should I use the pooler or a direct connection?",
    a: "Use the pooler (the default here) unless you have a specific reason not to. It handles many short-lived connections efficiently, which matches how this app queries your data.",
  },
  {
    q: "Do I need to allow this app's IP through my database firewall?",
    a: "If your database restricts inbound connections by IP, add this app's outbound IP (or allow all — Supabase's pooler is public by default). Self-hosted Postgres behind a firewall will need an explicit allow rule.",
  },
  {
    q: "Why is SSL/TLS required?",
    a: "Credentials and query results travel over this connection, so we don't allow sslmode=disable or unencrypted connections. Most managed providers (Supabase included) require TLS already.",
  },
  {
    q: "Is my password stored securely?",
    a: "Yes — connection credentials are encrypted at rest before they're saved, and are only decrypted server-side at query time.",
  },
  {
    q: "What if the connection test fails?",
    a: "Double check host, port, database name, username, and password. Also confirm the database accepts connections from outside its own network, and that TLS isn't disabled.",
  },
];

/** FAQ accordion for the connect-database screen — same <details>/<summary> pattern as the public accordion block. */
export function ConnectDatabaseFaq() {
  return (
    <div className={styles.faq}>
      <h2 className={styles.faqTitle}>Frequently asked questions</h2>
      <div style={{ borderTop: "1px solid var(--border)" }}>
        {FAQ_ITEMS.map((item, i) => (
          <details key={i} className={styles.faqItem}>
            <summary className={styles.faqSummary}>{item.q}</summary>
            <div className={styles.faqAnswer}>{item.a}</div>
          </details>
        ))}
      </div>
    </div>
  );
}
