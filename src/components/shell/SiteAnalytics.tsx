'use client';

import { lazy, Suspense } from 'react';

/**
 * Vercel Web Analytics, page views only (see `src/lib/analytics.ts` for why every URL
 * loses its query string first).
 *
 * Everything that does the work, `@vercel/analytics` and the scrubber, sits behind one
 * lazy import in `VercelAnalytics.tsx`, so it is its own chunk and costs the routes'
 * first-load JS budget only this file. A page view is reported once the page is up
 * either way.
 */
const VercelAnalytics = lazy(() => import('./VercelAnalytics'));

export function SiteAnalytics() {
  return (
    <Suspense fallback={null}>
      <VercelAnalytics />
    </Suspense>
  );
}
