import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

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

// ─── Site-wide constants ───────────────────────────────────────────────────────

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://doesitexist.app";
const SITE_NAME = "DoesItExist";
const OG_IMAGE = `${SITE_URL}/og-image.png`; // 1200×630 recommended

// ─── Full Metadata ─────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  // ── Core ──────────────────────────────────────────────────────────────────
  metadataBase: new URL(SITE_URL),
  title: {
    default: "DoesItExist? — Check If Your Startup Idea Already Exists",
    template: "%s | DoesItExist",
  },
  description:
    "Scan Product Hunt, Y Combinator, and the live web in 3 seconds to find competitors before you write code. Free AI startup radar.",
  keywords: [
    "startup idea validator",
    "competitor research",
    "does my startup idea exist",
    "product hunt search",
    "y combinator lookup",
    "startup competitor finder",
    "ai market research",
    "startup moat analysis",
  ],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "technology",

  // ── Open Graph ────────────────────────────────────────────────────────────
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "DoesItExist? — Check If Your Startup Idea Already Exists",
    description:
      "Scan Product Hunt, Y Combinator, and the live web in 3 seconds to find competitors before you write code.",
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "DoesItExist — AI Startup Competitor Radar",
        type: "image/png",
      },
    ],
  },

  // ── Twitter / X Card ──────────────────────────────────────────────────────
  twitter: {
    card: "summary_large_image",
    site: "@doesitexistapp",
    creator: "@doesitexistapp",
    title: "DoesItExist? — Check If Your Startup Idea Already Exists",
    description:
      "Scan Product Hunt, Y Combinator, and the live web in 3 seconds to find competitors before you write code.",
    images: [OG_IMAGE],
  },

  // ── Robots & Indexing ─────────────────────────────────────────────────────
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  // ── App manifest ─────────────────────────────────────────────────────────
  applicationName: SITE_NAME,
  referrer: "origin-when-cross-origin",

  // ── Canonical & alternates ────────────────────────────────────────────────
  alternates: {
    canonical: SITE_URL,
  },

  // ── Verification (fill in after deployment) ───────────────────────────────
  // verification: {
  //   google: "YOUR_GOOGLE_SITE_VERIFICATION_TOKEN",
  // },
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: [{ media: "(prefers-color-scheme: dark)", color: "#0f172a" }],
};

// ─── Root Layout ──────────────────────────────────────────────────────────────

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Preconnect to external origins for faster font/API loading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />

        {/* Favicon variants */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />

        {/* JSON-LD structured data — WebApplication schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "DoesItExist",
              url: SITE_URL,
              description:
                "AI-powered startup idea validator that scans Product Hunt and Y Combinator to find competitors in seconds.",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
            }),
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
