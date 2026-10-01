import { describe, expect, it } from 'vitest';

import type { CitationRegistry } from '@/core/citations/registry';
import { SCENARIOS } from '@/core/scenarios';
import { AES_BLOCK_CITATIONS } from '@/modules/aes/blockCitations';
import { AES_PAGE_CITATIONS } from '@/modules/aes/citations';
import { DH_PAGE_CITATIONS } from '@/modules/dh/citations';
import { HASHING_PAGE_CITATIONS } from '@/modules/hashing/citations';
import { HASHING_SHA256_CITATIONS } from '@/modules/hashing/sha256Citations';
import { PASSWORDS_PAGE_CITATIONS } from '@/modules/passwords/citations';
import { MODULES } from '@/modules/registry';
import { RSA_PAGE_CITATIONS } from '@/modules/rsa/citations';
import { RSA_KEYS_CITATIONS } from '@/modules/rsa/keysCitations';
import { XOR_PAGE_CITATIONS } from '@/modules/xor/citations';

/**
 * Each module page provides only its own citations to `CitationLink` (phase 10's JS
 * budget; see `src/components/inspector/CitationsContext.tsx`). A step citing something
 * outside its page's registry would show "Source: <id>" instead of a link, so every
 * citation each module's scenarios emit must be in that module's registry.
 *
 * Scenario ids are `<algo>.<name>`; this maps each algorithm to the page that shows it.
 */
const PAGE_OF_ALGO: Record<string, { slug: string; citations: CitationRegistry }> = {
  xor: { slug: 'xor', citations: XOR_PAGE_CITATIONS },
  sha256: { slug: 'hashing', citations: HASHING_PAGE_CITATIONS },
  hmac: { slug: 'hashing', citations: HASHING_PAGE_CITATIONS },
  kdf: { slug: 'passwords', citations: PASSWORDS_PAGE_CITATIONS },
  aes: { slug: 'aes', citations: AES_PAGE_CITATIONS },
  rsa: { slug: 'rsa', citations: RSA_PAGE_CITATIONS },
  dh: { slug: 'dh', citations: DH_PAGE_CITATIONS },
};

describe('module citation registries', () => {
  it('cover every algorithm in the scenario catalogue', () => {
    const algos = new Set(SCENARIOS.map((scenario) => scenario.id.split('.')[0]));
    expect([...algos].filter((algo) => !PAGE_OF_ALGO[algo])).toEqual([]);
  });

  it('cover every ready module', () => {
    const pages = new Set(Object.values(PAGE_OF_ALGO).map((page) => page.slug));
    const ready = MODULES.filter((m) => m.status === 'ready').map((m) => m.slug);
    expect(ready.filter((slug) => !pages.has(slug))).toEqual([]);
  });

  it("hold every citation their module's scenarios emit", () => {
    const missing = SCENARIOS.flatMap((scenario) => {
      const page = PAGE_OF_ALGO[scenario.id.split('.')[0]];
      return scenario
        .run()
        .events.filter((event) => !page.citations.has(event.citation))
        .map((event) => `${page.slug} page: ${scenario.id} cites ${event.citation}`);
    });
    expect([...new Set(missing)]).toEqual([]);
  });

  // A page whose later chapters load after hydration starts with a smaller registry; the
  // full one comes with the runs that need it. The first chapter's steps must be covered
  // by the small one, or they'd show "Source: <id>" until the rest loads.
  it("hold every citation the first chapter's scenarios emit before the rest loads", () => {
    const FIRST: Record<string, { pattern: RegExp; citations: CitationRegistry }> = {
      aes: { pattern: /^aes\.fips197-(appendix-b|c1)$/, citations: AES_BLOCK_CITATIONS },
      rsa: { pattern: /^rsa\.keygen-/, citations: RSA_KEYS_CITATIONS },
      sha256: {
        pattern: /^sha256\.(abc|two-block)$/,
        citations: HASHING_SHA256_CITATIONS,
      },
    };
    const covered = Object.values(FIRST).map(
      ({ pattern }) => SCENARIOS.filter((scenario) => pattern.test(scenario.id)).length,
    );
    expect(covered.every((n) => n > 0)).toBe(true);
    const missing = SCENARIOS.flatMap((scenario) => {
      const first = Object.values(FIRST).find(({ pattern }) => pattern.test(scenario.id));
      if (!first) return [];
      return scenario
        .run()
        .events.filter((event) => !first.citations.has(event.citation))
        .map((event) => `${scenario.id} cites ${event.citation}`);
    });
    expect([...new Set(missing)]).toEqual([]);
  });
});
