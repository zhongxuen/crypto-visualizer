'use client';

import { Analytics } from '@vercel/analytics/next';

import { scrubAnalyticsEvent } from '@/lib/analytics';

/** The analytics component, already wired to the scrubber. Only ever loaded lazily. */
export default function VercelAnalytics() {
  return <Analytics beforeSend={scrubAnalyticsEvent} />;
}
