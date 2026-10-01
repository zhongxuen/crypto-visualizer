import type { MetadataRoute } from 'next';

import { absoluteUrl } from '@/lib/site';
import { MODULES } from '@/modules/registry';

/**
 * Every page worth a search result, with the modules read from the registry so a new
 * module is listed without an edit here.
 *
 * Left out on purpose: `/demo`, the building-blocks test bed (noindex, linked from
 * nowhere; CLAUDE.md), and `planned` modules, which have no route yet. `lastModified` is
 * omitted because the only easy value, the build time, would claim every page changed on
 * every deploy.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: absoluteUrl('/'), changeFrequency: 'monthly', priority: 1 },
    ...MODULES.filter((entry) => entry.status === 'ready').map((entry) => ({
      url: absoluteUrl(entry.route),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    { url: absoluteUrl('/about'), changeFrequency: 'yearly', priority: 0.5 },
  ];
}
