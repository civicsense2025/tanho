/**
 * Warns (never fails) when a database connection URL doesn't appear to request
 * TLS in production. Both postgres.js and the MongoDB driver read TLS purely
 * from the connection string, so a deploy that forgot sslmode=require / tls=true
 * would otherwise connect in plaintext with zero signal.
 *
 * WARN-ONLY BY DESIGN: this is a self-hosted, white-label template. A same-host
 * or VPN-tunneled private-network database is a legitimate, intentional
 * configuration for many self-hosters — hard-failing would break real
 * deployments outside our control (the same principle behind the Report-Only
 * CSP). So this only ever logs a warning; it never throws and never blocks
 * startup. The warning never includes the connection string (which may carry
 * credentials) — only the adapter label.
 */

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\.\d+\.\d+\.\d+$/,
  /^10\.\d+\.\d+\.\d+$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,
  /^192\.168\.\d+\.\d+$/,
];

// Managed hosts that terminate/require TLS server-side regardless of the
// client-supplied query string, so the absence of an explicit sslmode/tls
// param there is not a real gap.
const ALWAYS_TLS_HOST_SUFFIXES = [
  ".neon.tech",
  ".supabase.co",
  ".render.com",
  ".mongodb.net",
  ".turso.io",
];

function isPrivateHost(host: string): boolean {
  return PRIVATE_HOST_PATTERNS.some((p) => p.test(host));
}

function isAlwaysTlsHost(host: string): boolean {
  return ALWAYS_TLS_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix));
}

function hasExplicitPostgresTls(parsed: URL): boolean {
  const sslmode = parsed.searchParams.get("sslmode");
  return sslmode !== null && ["require", "verify-ca", "verify-full", "prefer"].includes(sslmode);
}

function hasExplicitMongoTls(parsed: URL): boolean {
  if (parsed.protocol === "mongodb+srv:") return true; // SRV records default to TLS (Atlas et al.)
  const tls = parsed.searchParams.get("tls") ?? parsed.searchParams.get("ssl");
  return tls === "true";
}

/** Kind of connection string being checked — the two backends parse different
 *  query params. */
export type DbKind = "postgres" | "mongodb";

/**
 * Logs a one-time warning if `url` doesn't appear to request TLS and isn't a
 * private/known-always-TLS host, but ONLY when NODE_ENV=production. No-op
 * otherwise (including if the URL fails to parse — malformed URLs fail loudly
 * elsewhere in the connection path already).
 */
export function warnIfNoTls(url: string, kind: DbKind, label: string): void {
  if (process.env.NODE_ENV !== "production") return;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return; // not this check's job to validate the URL shape
  }
  const host = parsed.hostname;
  if (isPrivateHost(host) || isAlwaysTlsHost(host)) return;
  const hasTls = kind === "postgres" ? hasExplicitPostgresTls(parsed) : hasExplicitMongoTls(parsed);
  if (hasTls) return;
  const param = kind === "postgres" ? "sslmode=require" : "tls=true";
  console.warn(
    `[${label}] production database connection does not appear to request TLS ` +
      `(no ${param} in the connection string, and the host isn't recognized as ` +
      `private or always-TLS). Add ${param} to the connection URL unless this is ` +
      `intentionally an unencrypted private-network connection.`,
  );
}
