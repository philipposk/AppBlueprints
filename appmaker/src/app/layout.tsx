import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteJsonLd } from "@/components/SiteJsonLd";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://appblueprints.6x7.gr"),
  alternates: { canonical: "./" },
  robots: { index: true, follow: true },
  title: "AppBlueprints · Development Blueprint Generator",
  description:
    "Transform app ideas into structured development blueprints with AI-powered Instructions, Cursor Rules, and actionable TODO lists.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="antialiased">
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-background text-foreground`}
      >
        <SiteJsonLd />
        <div className="min-h-dvh w-full">{children}</div>
      </body>
    </html>
  );
}
