import { NextResponse } from "next/server";
import { ApiAuthError } from "@/modules/auth/api-tokens/guards";

/**
 * Shared response helpers for `/api/v1/*` route handlers. Every endpoint
 * returns the same discriminated-union envelope the server actions use:
 *   `{ ok: true; data?: T } | { ok: false; error: string }`
 * with HTTP status codes that mirror the outcome.
 */

export function ok<T>(data?: T, status = 200): NextResponse {
  return NextResponse.json({ ok: true, data }, { status });
}

export function fail(error: string, status = 400): NextResponse {
  return NextResponse.json({ ok: false, error }, { status });
}

/**
 * Run an async handler and translate the known error types into the right
 * status + envelope. Unknown errors become a generic 500 (never leak
 * internals).
 */
export async function handle<T>(fn: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ApiAuthError) return fail(e.message, e.status);
    if (e instanceof Error) {
      console.error("[api/v1] handler error", e);
      return fail("Internal server error", 500);
    }
    return fail("Internal server error", 500);
  }
}

/** Parse a JSON request body; returns null on malformed JSON (caller 400s). */
export async function parseBody<T = unknown>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}
