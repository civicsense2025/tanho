import type { NextConfig } from "next";
import { resolveEnvPrefix } from "./src/lib/env/prefix";

// Build-time prefix resolution: copies prefixed env vars (e.g.
// `TANHO_NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`) to their canonical names BEFORE
// Next inlines `NEXT_PUBLIC_*` into the client bundle. Server-runtime reads are
// handled separately by src/instrumentation.ts; this call is specifically for
// the build-time-inlined vars that the runtime hook cannot reach. Canonical
// names always win. See src/lib/env/prefix.ts for resolution rules.
resolveEnvPrefix();

const nextConfig: NextConfig = {
  // Cache Components: public pages opt into caching with `use cache` +
  // cacheTag(); everything else (admin, gated pages) is dynamic by default.
  cacheComponents: true,
  // re2 is a native (.node) module used by the redirect pattern engine
  // (modules/redirects/engine-patterns.ts → the api/redirect-resolve route).
  // The bundler can't inline a native binary, so opt it out and let the route
  // handler `require()` it at runtime from node_modules. (Not usable in the
  // proxy, which is edge-bundled — by design the proxy never imports it.)
  serverExternalPackages: ["re2"],
  // Lets a phone on the same LAN hit the dev server directly (e.g. testing
  // the Swift app against `npm run dev`) — otherwise Next blocks dev-asset
  // requests (HMR, /_next/*) whose Origin isn't localhost. Dev-only;
  // unrelated to production hosts. No CIDR support — list literal hosts.
  allowedDevOrigins: ["192.168.4.64"],
  experimental: {
    serverActions: {
      // Media uploads go through a server action; default cap is 1MB.
      // Keep in sync with MAX_UPLOAD_BYTES in modules/media/validation.ts.
      bodySizeLimit: "16mb",
      // Separate from `allowedDevOrigins` above — this one guards the
      // Server Actions CSRF check (Origin vs Host) that login/forms hit.
      allowedOrigins: ["192.168.4.64:3141"],
    },
  },
};

export default nextConfig;
