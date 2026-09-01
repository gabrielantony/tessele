import type { Metadata } from "next";
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
      <body className="bg-canvas text-ink font-body text-body lining-nums">{children}</body>
    </html>
  );
}
