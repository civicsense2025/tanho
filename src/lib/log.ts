/**
 * Structured logging with automatic secret/PII redaction, for operational
 * visibility (debugging, error triage). This is a DIFFERENT system from
 * src/lib/audit.ts, which is the persisted, append-only compliance record —
 * do not use this as a substitute for that, and do not fold audit.ts into
 * this one. This module is stdout/stderr only, never persisted by the app
 * itself (retention/shipping is the deploy platform's job).
 *
 * Emits one JSON line per call: { level, ts, msg, ...redact(meta) }.
 *
 * USAGE: pass PII/secrets as structured meta fields, never string-interpolated
 * into `msg` — only meta goes through redact():
 *   log.error("checkout failed", { email: order.email, err });
 * NOT:
 *   console.error(`checkout failed for ${order.email}`);  // email leaks, unredacted
 */

// Case-insensitive key-name denylist. The VALUE is redacted, not the key.
const SENSITIVE_KEY_PATTERN = /^(email|.*key|.*token|.*secret|.*password|authorization|cookie|ssn)$/i;

// String-shape patterns that are secrets even under an innocuous key name.
// Whole-string variants (fast path for the common case: the value IS the secret).
const JWT_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const LICENSE_KEY_PATTERN = /^OYS-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i;
// Embedded (non-anchored) variants — a secret quoted inline inside a longer
// message (e.g. an Error's message text) must still be caught, not just a
// value that IS entirely the secret. `g` so every occurrence is replaced.
const JWT_EMBEDDED_PATTERN = /[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{10,}/g;
const LICENSE_KEY_EMBEDDED_PATTERN = /OYS-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}/gi;
// scheme://user:pass@host — redact only the credential portion, keep scheme/host diagnosable.
const CONN_STRING_CREDENTIAL_PATTERN = /^(\w+:\/\/)([^:/@]+):([^@/]+)@/;

const REDACTED = "[REDACTED]";

function redactString(value: string): string {
  if (JWT_PATTERN.test(value) || LICENSE_KEY_PATTERN.test(value)) return REDACTED;
  if (CONN_STRING_CREDENTIAL_PATTERN.test(value)) {
    return value.replace(CONN_STRING_CREDENTIAL_PATTERN, `$1${REDACTED}@`);
  }
  // Fallback: a secret quoted inline inside a longer message (most commonly an
  // Error's .message) — replace just the matched span, keep the rest readable.
  let redacted = value;
  if (JWT_EMBEDDED_PATTERN.test(redacted)) redacted = redacted.replace(JWT_EMBEDDED_PATTERN, REDACTED);
  if (LICENSE_KEY_EMBEDDED_PATTERN.test(redacted)) redacted = redacted.replace(LICENSE_KEY_EMBEDDED_PATTERN, REDACTED);
  return redacted;
}

/** Captures only the standard, safe Error fields — never enumerates arbitrary
 *  properties on a thrown object, which could carry attacker-controlled or
 *  sensitive data attached by some other layer. */
function redactError(err: unknown): { name: string; message: string; stack?: string } | unknown {
  if (err instanceof Error) {
    return { name: err.name, message: redactString(err.message), stack: err.stack };
  }
  return err;
}

/** Recursively redacts a plain metadata object. Arrays and Error instances
 *  are handled specially; everything else is walked as a plain object. */
function redact(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[MAX_DEPTH]"; // guard against accidental cycles/huge objects
  if (value instanceof Error) return redactError(value);
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (typeof value === "string") return redactString(value);
  if (value === null || typeof value !== "object") return value;

  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    out[key] = SENSITIVE_KEY_PATTERN.test(key) ? REDACTED : redact(val, depth + 1);
  }
  return out;
}

type Level = "info" | "warn" | "error";

function emit(level: Level, msg: string, meta?: Record<string, unknown>): void {
  const line = {
    level,
    ts: new Date().toISOString(),
    msg,
    ...(meta ? (redact(meta) as Record<string, unknown>) : {}),
  };
  const json = JSON.stringify(line);
  if (level === "error") console.error(json);
  else if (level === "warn") console.warn(json);
  else console.log(json);
}

export const log = {
  info: (msg: string, meta?: Record<string, unknown>) => emit("info", msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => emit("warn", msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => emit("error", msg, meta),
};

// Exported for testing.
export const _internal = { redact, redactString, redactError };
