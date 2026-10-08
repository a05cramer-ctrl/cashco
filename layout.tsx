import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";

import { BRAND } from "@/brand";
import { SITE_URL } from "@/lib/site";

import "@/styles/site.css";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", display: "swap", axes: ["opsz", "wdth"] });
const ui = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });

const title = `${BRAND.name} ($${BRAND.ticker})`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${title} · ${BRAND.tagline}`, template: `%s · ${title}` },
  description: BRAND.description,
  openGraph: { title, description: BRAND.description, type: "website", url: "/", siteName: BRAND.name },
  twitter: { card: "summary_large_image", title, description: BRAND.description },
};

export const viewport: Viewport = { themeColor: "#0b0b0e" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${ui.variable} ${mono.variable}`}>
      <body>
        <noscript>
          <style>{".reveal{opacity:1!important;transform:none!important}"}</style>
        </noscript>
        {children}
      </body>
    </html>
  );
}
