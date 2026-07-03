import Link from "next/link";
import type { DataSourceConnectionSummary } from "../queries";
import styles from "./data-sources.module.css";

/** List of external database connections — owner-only screen, entry point to create/edit/allowlist. */
export function ConnectionsScreen({
  connections,
  isSupabaseOAuthConfigured,
}: {
  connections: DataSourceConnectionSummary[];
  /** BYO — only render the one-click Supabase entry point once the deployment has registered its own OAuth app. */
  isSupabaseOAuthConfigured: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {connections.length === 0 ? (
        <p className={styles.empty}>
          No external database connections yet. Connect a Postgres or Supabase database so
          bound blocks can read live rows from your own data.
        </p>
      ) : (
        connections.map((c) => (
          <Link key={c.id} href={`/admin/settings/data-sources/${c.id}`} style={{ textDecoration: "none" }}>
            <div className={styles.card}>
              <div className={styles.row}>
                <span className={styles.name}>{c.name}</span>
                <span className={`${styles.status} ${c.status === "connected" ? styles.statusConnected : c.status === "error" ? styles.statusError : ""}`}>
                  {c.status}
                </span>
              </div>
              <span className={styles.meta}>
                {c.provider} · {c.allowlistJson.length} table{c.allowlistJson.length === 1 ? "" : "s"} allowlisted
              </span>
            </div>
          </Link>
        ))
      )}
      <div className={styles.actions}>
        <Link href="/admin/settings/data-sources/new">+ Connect a database</Link>
        {isSupabaseOAuthConfigured ? (
          <Link href="/api/oauth/supabase?intent=create" prefetch={false}>
            Connect with Supabase
          </Link>
        ) : null}
      </div>
    </div>
  );
}
