import { NextResponse } from "next/server";
import type { z } from "zod";

/**
 * Parses an untrusted request body against a Zod schema at the API trust boundary. Returns a
 * discriminated result so a route reads: `const r = await parseBody(req, schema); if (!r.ok)
 * return r.response;`. On failure it yields a ready 400 in the codebase's existing `{ error }`
 * shape — no throw, no leaking internals.
 *
 * This is where public/untrusted input (subscribe, checkout, webhooks) is narrowed BEFORE it
 * can reach a DB filter — the generalized form of the quiz route's sanitizeAnswers() guard
 * against Mongo operator-injection.
 */
export type ParseResult<T> = { ok: true; data: T } | { ok: false; response: NextResponse };

export async function parseBody<S extends z.ZodTypeAny>(
  req: Request,
  schema: S
): Promise<ParseResult<z.infer<S>>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { ok: false, response: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }) };
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    const issue = result.error.issues[0];
    const field = issue?.path.join(".") || "body";
    return {
      ok: false,
      response: NextResponse.json({ error: `Invalid ${field}: ${issue?.message ?? "validation failed"}` }, { status: 400 }),
    };
  }
  return { ok: true, data: result.data };
}
