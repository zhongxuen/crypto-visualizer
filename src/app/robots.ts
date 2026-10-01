import type { MetadataRoute } from 'next';

import { absoluteUrl, isProductionDeployment } from '@/lib/site';

/**
 * In production, everything but `/demo`. On a preview, nothing: a preview serves the
 * same pages under a hostname that stops existing, so indexing it would only make
 * duplicates that turn into dead links.
 */
export default function robots(): MetadataRoute.Robots {
  if (!isProductionDeployment()) {
    return { rules: { userAgent: '*', disallow: '/' } };
  }
  return {
    rules: { userAgent: '*', allow: '/', disallow: '/demo' },
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
