import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { VECTOR_CARDS } from '@/app/about/facts';
import { REALISTIC_BITS } from '@/core/rsa/keygen';

/** The about page's test-vector cards quote the test suite, so they're checked against it. */
describe('about page test-vector cards', () => {
  it('has one card per differential test file', () => {
    const files = readdirSync(join(process.cwd(), 'tests/differential'))
      .filter((name) => name.endsWith('.test.ts'))
      .map((name) => `tests/differential/${name}`)
      .sort();
    expect(VECTOR_CARDS.map((card) => card.file).sort()).toEqual(files);
  });

  it.each(VECTOR_CARDS)('$algorithm quotes its file word for word', (card) => {
    const source = readFileSync(join(process.cwd(), card.file), 'utf8');
    for (const evidence of card.evidence) expect(source, evidence).toContain(evidence);
  });

  it('counts the RSA cases: sizes × 8 seeds × 5 messages', () => {
    const rsa = VECTOR_CARDS.find((card) => card.algorithm === 'RSA')!;
    expect(rsa.figure).toBe(String(REALISTIC_BITS.length * 8 * 5));
  });
});
