import { NextResponse, type NextRequest } from "next/server";
import { getViewer } from "@/modules/people/viewer";
import { recordEvent } from "@/modules/analytics/track";
import { trackInputSchema } from "@/modules/analytics/validation";
import { ensureAnonId } from "@/modules/analytics/session-cookie";
import { allowEvent } from "@/modules/analytics/rate-limit";

/**
 * Client trackEvent / pageview beacon. Deliberately permissive on failure: it
 * always returns 204 (even on bad input) so a page's tracking can never break
 * navigation, and it never reflects anything back to the client. Security:
 * - event name is allowlisted (^[a-z0-9_]+$, length-capped) via zod;
 * - props are sanitized (scalars only, capped, truncated) — no PII survives;
 * - the session id is a random anon cookie, never a fingerprint;
 * - lightly rate-limited per anon id.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const res = new NextResponse(null, { status: 204 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return res;
  }

  const parsed = trackInputSchema.safeParse(body);
  if (!parsed.success) return res;

  const sessionId = ensureAnonId(req, res);
  if (!allowEvent(sessionId)) return res;

  // personId is server-derived from the reader session — never client-supplied.
  const viewer = await getViewer();

  await recordEvent({
    name: parsed.data.name,
    path: parsed.data.path,
    sessionId,
    personId: viewer?.personId ?? null,
    props: parsed.data.props,
  });

  return res;
}
