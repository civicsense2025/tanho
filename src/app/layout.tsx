import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Suspense } from "react";
import { ThemeStyle } from "@/modules/theme/ThemeStyle";
import { getGeneralSettings } from "@/modules/settings/queries";
import "./globals.css";

// Everything a visitor reads comes from the database — never from code.
export async function generateMetadata(): Promise<Metadata> {
  const general = await getGeneralSettings();
  return {
    title: {
      default: general.name,
      template: `%s · ${general.name}`,
    },
    description: general.tagline || undefined,
    robots: general.indexable ? undefined : { index: false, follow: false },
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
