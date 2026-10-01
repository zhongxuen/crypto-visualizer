/** Site-wide copy, kept in one place so the layout, home page and metadata agree. */
export const SITE = {
  name: 'Crypto Visualizer',
  tagline: 'The actual maths behind the padlock icon, one step at a time.',
  description:
    'The actual maths behind the padlock icon, one step at a time: XOR, SHA-256, HMAC, PBKDF2, AES, RSA and Diffie-Hellman.',
  disclaimer:
    'For learning only. Keys and randomness here are for display: nothing on this site may be used to protect real data.',
  repoUrl: 'https://github.com/zhongxuen/crypto-visualizer',
} as const;

/**
 * Where this deployment lives, for `metadataBase`, `sitemap.xml` and `robots.txt`, which
 * all need an absolute URL. Adapted from Internet Visualizer's `src/lib/site.ts`. In order:
 *
 *  1. `NEXT_PUBLIC_SITE_URL`, a custom domain. Vercel's own variables only know the
 *     `*.vercel.app` name, so set this once the project has a domain.
 *  2. `VERCEL_PROJECT_PRODUCTION_URL`, the production hostname. Vercel sets it on
 *     previews too, which is what a canonical URL wants: a preview points at production.
 *  3. `VERCEL_URL`, this deployment, before the project has a production domain.
 *  4. `http://localhost:3000`, for development and the unit tests.
 */
export interface SiteEnv {
  readonly NEXT_PUBLIC_SITE_URL?: string | undefined;
  readonly VERCEL_ENV?: string | undefined;
  readonly VERCEL_PROJECT_PRODUCTION_URL?: string | undefined;
  readonly VERCEL_URL?: string | undefined;
  // `process.env` has an index signature; without one here it isn't assignable.
  readonly [key: string]: string | undefined;
}

export const LOCAL_SITE_URL = 'http://localhost:3000';

function stripTrailingSlashes(url: string): string {
  return url.replace(/\/+$/, '');
}

/** The origin this deployment describes itself as, without a trailing slash. */
export function siteUrl(env: SiteEnv = process.env): string {
  const explicit = env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) {
    return stripTrailingSlashes(
      /^https?:\/\//i.test(explicit) ? explicit : `https://${explicit}`,
    );
  }
  const host = env.VERCEL_PROJECT_PRODUCTION_URL?.trim() || env.VERCEL_URL?.trim();
  return host ? stripTrailingSlashes(`https://${host}`) : LOCAL_SITE_URL;
}

/** `siteUrl()` joined to a root-relative path. `absoluteUrl('/')` has no trailing slash. */
export function absoluteUrl(path: string, env: SiteEnv = process.env): string {
  const base = siteUrl(env);
  if (path === '/' || path === '') return base;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Production, as opposed to a Vercel preview. An unset `VERCEL_ENV` (a local or
 * self-hosted build) counts as production, so a self-hosted copy isn't silently
 * unindexable. `robots.ts` uses this to keep previews out of search results.
 */
export function isProductionDeployment(env: SiteEnv = process.env): boolean {
  const vercelEnv = env.VERCEL_ENV?.trim();
  return !vercelEnv || vercelEnv === 'production';
}
