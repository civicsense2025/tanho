import { postgresConfigSchema, type PostgresConfig } from "./validation";

const SUPPORTED_PROTOCOLS = new Set(["postgres:", "postgresql:"]);

/**
 * Parse a standard `postgres://` or `postgresql://` connection URI into a
 * `PostgresConfig`, using Node's built-in `URL` parser.
 *
 * This runs client-side (CreateConnectionForm) purely to pre-fill the
 * individual form fields from a pasted string — it's a UX convenience, NOT
 * the security boundary. The parsed result is run through
 * `postgresConfigSchema.safeParse()` for shape/TLS validation
 * (`assertNoDisabledTls`), but deliberately uses the SYNC parse, which skips
 * the schema's async host-blocklist check (that check needs a DNS lookup,
 * which isn't meaningful in the browser and wouldn't be trustworthy from a
 * client anyway). The real enforcement is server-side:
 * `createConnection`/`updateConnection` in `./connection-actions.ts` use
 * `safeParseAsync`, so every connection is actually gated there regardless
 * of what this function returns.
 *
 * Returns `{ error }` (never throws) for any malformed input, including
 * strings that aren't valid URLs at all.
 */
export function parsePostgresConnectionString(raw: string): PostgresConfig | { error: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { error: "Paste a connection string." };

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { error: "That doesn't look like a valid connection string." };
  }

  if (!SUPPORTED_PROTOCOLS.has(url.protocol)) {
    return { error: "Connection string must start with postgres:// or postgresql://" };
  }

  // URL does NOT decode .username/.password for us — they remain
  // percent-encoded as authored. Decode explicitly so a password
  // containing '@', ':', etc. round-trips correctly.
  let user: string;
  let password: string;
  try {
    user = decodeURIComponent(url.username);
    password = decodeURIComponent(url.password);
  } catch {
    return { error: "Could not decode the user or password in that connection string." };
  }

  const database = decodeURIComponent(url.pathname.replace(/^\//, ""));
  const sslmode = url.searchParams.get("sslmode");

  const candidate: Record<string, unknown> = {
    provider: "postgres",
    host: url.hostname,
    database,
    user,
    password,
  };
  if (url.port) candidate.port = url.port;
  if (sslmode) candidate.connectionStringExtra = `sslmode=${sslmode}`;

  const parsed = postgresConfigSchema.safeParse(candidate);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid connection string." };
  }
  return parsed.data;
}
