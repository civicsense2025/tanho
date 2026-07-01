import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SITE_URL } from "@/lib/seo";
import { siteConfig } from "@/config/site.config";
import { ThemeStyle } from "@/components/ThemeStyle";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: siteConfig.title,
  description: siteConfig.description,
  verification: siteConfig.analytics.googleSiteVerification
    ? { google: siteConfig.analytics.googleSiteVerification }
    : undefined,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang={siteConfig.locale}
      data-theme={siteConfig.theme.defaultMode}
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <head>
        <ThemeStyle theme={siteConfig.theme} />
      </head>
      <body className="min-h-screen" style={{ background: "var(--background)", color: "var(--foreground)" }}>
        {children}
        <GoogleAnalytics measurementId={siteConfig.analytics.gaMeasurementId} />
      </body>
    </html>
  );
}
