import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components: public pages opt into caching with `use cache` +
  // cacheTag(); everything else (admin, gated pages) is dynamic by default.
  cacheComponents: true,
  experimental: {
    serverActions: {
      // Media uploads go through a server action; default cap is 1MB.
      // Keep in sync with MAX_UPLOAD_BYTES in modules/media/validation.ts.
      bodySizeLimit: "16mb",
    },
  },
};

export default nextConfig;
