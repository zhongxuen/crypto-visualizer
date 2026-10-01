import { expect, type Page } from '@playwright/test';

import { MODULES } from '../src/modules/registry';

/**
 * Every route the site serves, from the module registry plus the static pages, so a new
 * module is swept by `site.spec.ts` and `security.spec.ts` without an edit here.
 */

export interface ModuleRoute {
  readonly slug: string;
  readonly path: string;
  readonly title: string;
}

export const MODULE_ROUTES: readonly ModuleRoute[] = MODULES.filter(
  (entry) => entry.status === 'ready',
).map((entry) => ({ slug: entry.slug, path: entry.route, title: entry.title }));

export const PAGE_ROUTES: readonly { name: string; path: string }[] = [
  { name: 'home', path: '/' },
  { name: 'about', path: '/about' },
  // Kept as the building-blocks test bed: noindex, unlinked (CLAUDE.md).
  { name: 'demo', path: '/demo' },
  ...MODULE_ROUTES.map((route) => ({ name: route.slug, path: route.path })),
];

/** A path nothing serves, for the 404 page. */
export const NOT_FOUND_PATH = '/no-such-page';

/** The share link is written only after hydration, so it marks "keys will work". */
export async function openModule(page: Page, url: string) {
  await page.goto(url);
  await expect(page).toHaveURL(/\?s=/);
}

/** Decode the page's `?s=` state, or `null`. */
export async function linkedState(page: Page): Promise<Record<string, unknown> | null> {
  return page.evaluate(() => {
    const s = new URL(location.href).searchParams.get('s');
    if (!s) return null;
    return JSON.parse(atob(s.replace(/-/g, '+').replace(/_/g, '/')));
  });
}

/** Wait until the share link carries `step` (it's written after a short debounce). */
export async function linkHasStep(page: Page, step: number) {
  await page.waitForFunction((want) => {
    const s = new URL(location.href).searchParams.get('s');
    if (!s) return false;
    const state = JSON.parse(atob(s.replace(/-/g, '+').replace(/_/g, '/')));
    return state.step === want;
  }, step);
}

/** base64url of a JSON value, as the share codec writes it. */
export function encodeState(value: unknown): string {
  return Buffer.from(JSON.stringify(value), 'utf8')
    .toString('base64')
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}
