import type { Metadata } from 'next';
import { Fraunces, Geist, JetBrains_Mono } from 'next/font/google';

import { SiteAnalytics, SiteFooter, SiteHeader, THEME_SCRIPT } from '@/components/shell';
import { SITE, siteUrl } from '@/lib/site';

import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

/** Headings and module numbers: a notebook heading, not a tech brand (UIUX §5.2). */
const fraunces = Fraunces({
  variable: '--font-fraunces',
  subsets: ['latin'],
  axes: ['opsz', 'SOFT'],
});

/**
 * Numbers, bytes and code. It has Σ, σ, φ, ⊕ and ≡ (so the hashing round view no longer
 * falls back to another font, UIUX B5), and a slashed zero, so 0 and O never mix in hex.
 */
const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin', 'greek'],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: SITE.name, template: `%s · ${SITE.name}` },
  description: SITE.description,
  // The card itself is `opengraph-image.tsx`, which every route inherits.
  openGraph: {
    type: 'website',
    siteName: SITE.name,
  },
  twitter: { card: 'summary_large_image' },
};

/**
 * Only a Vercel build loads the analytics script. It is served from the deployment's own
 * `/_vercel/insights`, so anywhere else (`next dev`, the e2e build on port 3100) it would
 * be a 404 on every page.
 */
const ANALYTICS = process.env.VERCEL === '1';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      // The theme script sets `data-theme` before hydration.
      suppressHydrationWarning
      className={`${geistSans.variable} ${fraunces.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        {children}
        <SiteFooter />
        {ANALYTICS ? <SiteAnalytics /> : null}
      </body>
    </html>
  );
}
