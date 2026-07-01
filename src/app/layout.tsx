import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SITE_URL } from "@/lib/seo";
import { getSettings } from "@/lib/settings";
import { ThemeStyle } from "@/components/ThemeStyle";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

// The static `metadata` export can't read the DB (Next.js requires it to be a plain object, not
// async), so title/description/verification -- which can now change via /admin/settings without
// a rebuild -- move to generateMetadata() below. metadataBase stays a build-time constant since
// SITE_URL itself isn't (yet) a settings-editable field.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
};

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    title: settings.title,
    description: settings.description,
    verification: settings.analytics.googleSiteVerification
      ? { google: settings.analytics.googleSiteVerification }
      : undefined,
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const settings = await getSettings();
  return (
    <html
      lang={settings.locale}
      data-theme={settings.theme.defaultMode}
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <head>
        <ThemeStyle theme={settings.theme} />
      </head>
      <body className="min-h-screen" style={{ background: "var(--background)", color: "var(--foreground)" }}>
        {children}
        <GoogleAnalytics measurementId={settings.analytics.gaMeasurementId} />
      </body>
    </html>
  );
}
