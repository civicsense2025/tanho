/**
 * Extracts the real client IP from request headers without trusting the
 * client-controlled leftmost `x-forwarded-for` entry.
 *
 * Precedence: platform-trusted headers (x-vercel-forwarded-for,
 * cf-connecting-ip) first, then x-real-ip, then the RIGHTMOST
 * x-forwarded-for entry (set by the trusted proxy directly in front of
 * the app), else "local".
 */
export function clientIp(headers: Headers): string {
  const vercel = headers.get("x-vercel-forwarded-for");
  if (vercel) return vercel.trim();

  const cf = headers.get("cf-connecting-ip");
  if (cf) return cf.trim();

  const real = headers.get("x-real-ip");
  if (real) return real.trim();

  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }

  return "local";
}
