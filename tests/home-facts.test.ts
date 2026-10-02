import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { CORE_COVERAGE_FLOOR, DIFFERENTIAL_ALGORITHMS } from '@/app/_home/facts';
import { MODULES } from '@/modules/registry';

/** The home page's "How we know it's right" figures are the repository's, not copy. */
describe('home page facts', () => {
  it('counts one algorithm per differential test file', () => {
    const files = readdirSync(join(process.cwd(), 'tests/differential')).filter((name) =>
      name.endsWith('.test.ts'),
    );
    expect(files).toHaveLength(DIFFERENTIAL_ALGORITHMS);
  });

  it('quotes the coverage floor verify enforces', () => {
    const config = readFileSync(join(process.cwd(), 'vitest.config.mts'), 'utf8');
    expect(config).toContain(
      `'src/core/**': { statements: ${CORE_COVERAGE_FLOOR}, branches: ${CORE_COVERAGE_FLOOR}, functions: ${CORE_COVERAGE_FLOOR}, lines: ${CORE_COVERAGE_FLOOR} }`,
    );
  });

  it('builds each module only on modules that come before it', () => {
    for (const entry of MODULES) {
      for (const slug of entry.buildsOn) {
        const earlier = MODULES.find((m) => m.slug === slug);
        expect(earlier, `${entry.slug} builds on ${slug}`).toBeDefined();
        expect(earlier!.number).toBeLessThan(entry.number);
      }
    }
  });
});
