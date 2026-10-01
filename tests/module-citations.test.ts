import { describe, expect, it } from 'vitest';

import type { CitationRegistry } from '@/core/citations/registry';
import { SCENARIOS } from '@/core/scenarios';
import { AES_PAGE_CITATIONS } from '@/modules/aes/citations';
import { DH_PAGE_CITATIONS } from '@/modules/dh/citations';
import { HASHING_PAGE_CITATIONS } from '@/modules/hashing/citations';
import { PASSWORDS_PAGE_CITATIONS } from '@/modules/passwords/citations';
import { MODULES } from '@/modules/registry';
import { RSA_PAGE_CITATIONS } from '@/modules/rsa/citations';
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
});
