import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

import { SiteAnalytics, SiteFooter, SiteHeader, THEME_SCRIPT } from '@/components/shell';
import { SITE, siteUrl } from '@/lib/site';

import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
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
