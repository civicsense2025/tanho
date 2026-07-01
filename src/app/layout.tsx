import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SITE_URL } from "@/lib/seo";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Tan Ho — Product Designer & Digital Marketer",
  description: "I'm a Forbes 30 Under 30 product designer and front-end developer. I co-founded Fiveable, scaled it to 15M+ students, and secured $15M in funding. I build products at the intersection of design, growth, and engineering.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen" style={{ background: "var(--background)", color: "var(--foreground)" }}>{children}</body>
    </html>
  );
}
