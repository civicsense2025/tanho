import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Suspense } from "react";
import { ThemeStyle } from "@/modules/theme/ThemeStyle";
import { getGeneralSettings } from "@/modules/settings/queries";
import { getTheme } from "@/modules/theme/queries";
import { mediaPublicUrl } from "@/modules/fonts/queries";
import { getSeoSettings, resolveOgImage, buildVerification } from "@/modules/seo";
import { getCanonicalSiteUrl } from "@/modules/domain/queries";
import "./globals.css";

const BASE_FALLBACK = process.env.APP_URL ?? "http://localhost:3000";

// Everything a visitor reads comes from the database — never from code.
export async function generateMetadata(): Promise<Metadata> {
  const [general, theme, seo] = await Promise.all([
    getGeneralSettings(),
    getTheme(),
    getSeoSettings(),
  ]);
  const [faviconUrl, base, defaultImages] = await Promise.all([
    mediaPublicUrl(theme.faviconMediaId),
    getCanonicalSiteUrl(seo.siteUrl, BASE_FALLBACK),
    resolveOgImage(null),
  ]);
  const desc = general.tagline || undefined;
  return {
    // Anchors every relative URL-based metadata field (canonical, og:image,
    // og:url) to the canonical origin. Without this, a relative OG/canonical
    // in any route is a build error — which is why OG was absent before.
    metadataBase: new URL(base),
    title: {
      default: general.name,
      template: `%s · ${general.name}`,
    },
    description: desc,
    robots: general.indexable ? undefined : { index: false, follow: false },
    verification: buildVerification(seo.verification),
    // Site-wide social defaults; per-page metadata (buildPageMetadata) overrides
    // title/description/url/image and flips og:type to article where relevant.
    openGraph: {
      type: "website",
      siteName: general.name,
      title: general.name,
      description: desc,
      images: defaultImages,
    },
    twitter: {
      card: "summary_large_image",
      title: general.name,
      description: desc,
      images: defaultImages,
    },
    // A custom favicon (any uploaded image incl. sanitized SVG) overrides the
    // default. When unset, Next serves the app's own icon convention.
    ...(faviconUrl ? { icons: { icon: faviconUrl } } : {}),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const general = await getGeneralSettings();
  return (
    <html
      lang={general.language}
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body>
        <ThemeStyle />
        <Suspense>{children}</Suspense>
      </body>
    </html>
  );
}
