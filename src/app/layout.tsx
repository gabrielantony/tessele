import type { Metadata } from "next";
import Script from "next/script";
import FocusRings from "@/components/FocusRings";
import SmoothScroll from "@/components/SmoothScroll";
import SectionTiming from "@/components/analytics/SectionTiming";
import WhatsappClickTracker from "@/components/analytics/WhatsappClickTracker";
import {
  UMAMI_ALLOWED_DOMAIN,
  UMAMI_SCRIPT_SRC,
  UMAMI_WEBSITE_ID,
} from "@/lib/analytics";
import { fraunces, raleway } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tessele",
  // TODO: your own description / OG tags go here.
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${raleway.variable} ${fraunces.variable}`}>
      <body className="bg-canvas text-ink font-body text-body lining-nums">
        <FocusRings />
        <SmoothScroll />
        <WhatsappClickTracker />
        <SectionTiming />
        {/*
          No id, no script, no measurement -- see the comment on UMAMI_WEBSITE_ID.
          `data-do-not-track` honours the browser preference, and `data-domains` is
          what keeps localhost and previews out of the numbers.
        */}
        {UMAMI_WEBSITE_ID ? (
          <Script
            strategy="afterInteractive"
            src={UMAMI_SCRIPT_SRC}
            data-website-id={UMAMI_WEBSITE_ID}
            data-domains={UMAMI_ALLOWED_DOMAIN}
            data-do-not-track="true"
          />
        ) : null}
        {children}
      </body>
    </html>
  );
}
