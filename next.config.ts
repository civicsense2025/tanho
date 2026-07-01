import type { NextConfig } from "next";

/**
 * Content-Security-Policy for the template, composed at server start.
 *
 * Shipped as Report-Only (see headers() below) so it can NEVER silently break a
 * customer's configured theme or analytics — it only reports violations. Tighten
 * to enforcing (and ideally nonce-based script-src) once report data confirms the
 * directives are complete for real deployments.
 *
 * White-label surfaces the policy must accommodate:
 *  - Theme CSS is an inline <style> (src/components/ThemeStyle.tsx) -> style-src
 *    allows 'unsafe-inline' (styles are far lower risk than scripts).
 *  - GA4 (src/components/GoogleAnalytics.tsx, only when NEXT_PUBLIC_GA_MEASUREMENT_ID
 *    is set) loads googletagmanager.com + runs an inline init script and beacons to
 *    google-analytics.com.
 *  - JSON-LD is inline application/ld+json (not executable JS).
 *  - Escape hatch: a customer using a different analytics/vendor extends the policy
 *    via NEXT_PUBLIC_CSP_EXTRA_SCRIPT_SRC / _CONNECT_SRC (env, not code edits).
 */
function contentSecurityPolicy(): string {
  const extraScript = process.env.NEXT_PUBLIC_CSP_EXTRA_SCRIPT_SRC?.trim();
  const extraConnect = process.env.NEXT_PUBLIC_CSP_EXTRA_CONNECT_SRC?.trim();

  const scriptSrc = [
    "'self'",
    "'unsafe-inline'", // inline GA4 init + Next inline runtime; Report-Only for now
    "https://www.googletagmanager.com",
    extraScript,
  ].filter(Boolean);

  const connectSrc = [
    "'self'",
    "https://www.google-analytics.com",
    "https://region1.google-analytics.com",
    extraConnect,
  ].filter(Boolean);

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:", // images already allow remote https hosts
    "font-src 'self' data:",
    `connect-src ${connectSrc.join(" ")}`,
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ];
  return directives.join("; ");
}

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Report-Only: reports violations without blocking, so a wrong directive can't
  // break a customer's theme/analytics. Switch the key to "Content-Security-Policy"
  // to enforce once report data confirms coverage.
  { key: "Content-Security-Policy-Report-Only", value: contentSecurityPolicy() },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
