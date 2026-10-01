import { afterEach, describe, expect, it, vi } from 'vitest';

import robots from '../src/app/robots';
import sitemap from '../src/app/sitemap';
import { absoluteUrl, isProductionDeployment, siteUrl } from '../src/lib/site';
import { MODULES } from '../src/modules/registry';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('siteUrl', () => {
  it('prefers an explicit domain, adding a scheme and dropping a trailing slash', () => {
    expect(siteUrl({ NEXT_PUBLIC_SITE_URL: 'crypto.example/' })).toBe(
      'https://crypto.example',
    );
    expect(
      siteUrl({ NEXT_PUBLIC_SITE_URL: 'http://x.test', VERCEL_URL: 'y.vercel.app' }),
    ).toBe('http://x.test');
  });

  it('then the production hostname, then this deployment, then localhost', () => {
    expect(
      siteUrl({
        VERCEL_PROJECT_PRODUCTION_URL: 'cv.vercel.app',
        VERCEL_URL: 'p.vercel.app',
      }),
    ).toBe('https://cv.vercel.app');
    expect(siteUrl({ VERCEL_URL: 'p.vercel.app' })).toBe('https://p.vercel.app');
    expect(siteUrl({})).toBe('http://localhost:3000');
  });

  it('joins paths without doubling or dangling a slash', () => {
    const env = { VERCEL_URL: 'p.vercel.app' };
    expect(absoluteUrl('/', env)).toBe('https://p.vercel.app');
    expect(absoluteUrl('aes', env)).toBe('https://p.vercel.app/aes');
    expect(absoluteUrl('/aes', env)).toBe('https://p.vercel.app/aes');
  });

  it('treats only a Vercel preview or development build as not production', () => {
    expect(isProductionDeployment({})).toBe(true);
    expect(isProductionDeployment({ VERCEL_ENV: 'production' })).toBe(true);
    expect(isProductionDeployment({ VERCEL_ENV: 'preview' })).toBe(false);
  });
});

describe('sitemap', () => {
  const urls = () => sitemap().map((entry) => new URL(entry.url).pathname);

  it('lists home, about and every ready module', () => {
    const ready = MODULES.filter((m) => m.status === 'ready').map((m) => m.route);
    expect(urls()).toEqual(expect.arrayContaining(['/', '/about', ...ready]));
  });

  it('leaves out /demo and planned modules', () => {
    const planned = MODULES.filter((m) => m.status !== 'ready').map((m) => m.route);
    for (const path of ['/demo', ...planned]) expect(urls()).not.toContain(path);
  });
});

describe('robots', () => {
  it('disallows /demo in production and points at the sitemap', () => {
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'cv.vercel.app');
    const result = robots();
    expect(result.rules).toMatchObject({ allow: '/', disallow: '/demo' });
    expect(result.sitemap).toBe('https://cv.vercel.app/sitemap.xml');
  });

  it('disallows everything on a preview', () => {
    vi.stubEnv('VERCEL_ENV', 'preview');
    const result = robots();
    expect(result.rules).toEqual({ userAgent: '*', disallow: '/' });
    expect(result.sitemap).toBeUndefined();
  });
});
