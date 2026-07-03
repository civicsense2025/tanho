import { postgresConfigSchema, type PostgresConfig } from "./validation";

const SUPPORTED_PROTOCOLS = new Set(["postgres:", "postgresql:"]);

/**
 * Parse a standard `postgres://` or `postgresql://` connection URI into a
 * `PostgresConfig`, using Node's built-in `URL` parser.
 *
 * The parsed result is always run through the EXISTING
 * `postgresConfigSchema.safeParse()` before being returned — this is what
 * keeps `assertNoDisabledTls` (see `./validation.ts`) applying identically
 * to pasted connection strings and manually-typed fields. This function
 * never bypasses that check; it only reshapes input into the same schema.
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
