import { describe, expect, it } from 'vitest';

import { createRng } from '../sim/rng';
import { bigSigma0, bigSigma1, ch, compress, maj } from './compress';
import { H0, K } from './constants';
import { expandSchedule, smallSigma0, smallSigma1 } from './schedule';

/**
 * `compress` inlines its formulas for speed. These tests hold it to the named, readable
 * versions of the same formulas on random blocks, using the trace it reports.
 */
describe('compress agrees with the named FIPS 180-4 functions', () => {
  const rng = createRng('compress-agrees');

  for (let trial = 0; trial < 20; trial += 1) {
    const block = Uint32Array.from({ length: 64 }, (_, i) =>
      i < 16 ? rng.int(0x10000) * 0x10000 + rng.int(0x10000) : 0,
    );

    it(`on random block ${trial + 1}`, () => {
      const expected = Uint32Array.from(block);
      expandSchedule(expected);

      const W = Uint32Array.from(block);
      const H = Uint32Array.from(H0);
      const scheduleSeen: number[] = [];
      compress(H, W, {
        schedule: (t, w, s0, s1) => {
          scheduleSeen.push(t);
          expect(w).toBe(expected[t]);
          expect(s0).toBe(smallSigma0(expected[t - 15]));
          expect(s1).toBe(smallSigma1(expected[t - 2]));
        },
        round: (t, before, after, parts) => {
          const [a, b, c, , e, f, g, h] = before;
          expect(parts.S1).toBe(bigSigma1(e));
          expect(parts.S0).toBe(bigSigma0(a));
          expect(parts.ch).toBe(ch(e, f, g));
          expect(parts.maj).toBe(maj(a, b, c));
          expect(parts.K).toBe(K[t]);
          expect(parts.W).toBe(expected[t]);
          expect(parts.T1).toBe((h + parts.S1 + parts.ch + K[t] + expected[t]) % 2 ** 32);
          expect(after[0]).toBe((parts.T1 + parts.T2) % 2 ** 32);
          for (const word of [...before, ...after]) {
            expect(word).toBeGreaterThanOrEqual(0);
            expect(word).toBeLessThan(2 ** 32);
          }
        },
      });
      expect(scheduleSeen).toHaveLength(48);
      expect(Array.from(W)).toEqual(Array.from(expected));
    });
  }
});
