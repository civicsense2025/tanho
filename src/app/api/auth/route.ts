import { NextRequest, NextResponse } from "next/server";
import { signAdminToken, COOKIE_NAME } from "@/lib/auth";
import { verifyAdminPassword } from "@/lib/admin-password";
import { parseBody } from "@/lib/validation/parse";
import { adminLoginSchema } from "@/lib/validation/schemas";
import {
  rateLimit,
  lockoutRemainingMs,
  recordFailedAttempt,
  clearFailedAttempts,
} from "@/lib/rate-limit";
import { audit, auditContext } from "@/lib/audit";

// Node runtime so the (later) crypto-based compare and jose signing work.
export const runtime = "nodejs";

/** Best-effort client IP for rate-limiting. Behind Vercel/most proxies the first
 *  x-forwarded-for hop is the client; fall back to x-real-ip, then a constant so
 *  a spoofed-away header still shares one bucket rather than bypassing the limit. */
function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

// Coarse burst limit on the login endpoint, independent of the failed-attempt
// lockout: stops rapid-fire hammering even before the lockout threshold.
const LOGIN_RATE = { capacity: 10, refillPerSec: 0.2 } as const;

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const key = `admin-login:${ip}`;

  // 1) Hard lockout after too many consecutive failures.
  const locked = lockoutRemainingMs(key);
  if (locked > 0) {
    return NextResponse.json(
      { error: "Too many failed attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(locked / 1000)) } },
    );
  }
  // 2) Coarse burst rate-limit.
  if (!rateLimit(key, LOGIN_RATE)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  // 3) Validate the body — missing/non-string password is a clean 400.
  const parsed = await parseBody(req, adminLoginSchema);
  if (!parsed.ok) return parsed.response;

  const ctx = auditContext(req);
  if (!verifyAdminPassword(parsed.data.password)) {
    recordFailedAttempt(key);
    await audit({ ...ctx, actor: "admin", action: "admin.login", target: null, outcome: "failure", metadata: null });
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  clearFailedAttempts(key);
  await audit({ ...ctx, actor: "admin", action: "admin.login", target: null, outcome: "success", metadata: null });
  const token = await signAdminToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 7, path: "/" });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(COOKIE_NAME);
  return res;
}
