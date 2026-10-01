import { describe, expect, it } from 'vitest';

import { expandSchedule, smallSigma0, smallSigma1 } from './schedule';

/**
 * The message schedule on its own (FIPS 180-4 §6.2.2 step 1), with the trace the
 * schedule panel reads. `compress.test.ts` checks the schedule `compress` inlines.
 */
describe('expandSchedule', () => {
  /** The one padded block of "abc" (FIPS 180-4 Appendix B.1). */
  const abc = () => {
    const W = new Uint32Array(64);
    W[0] = 0x61626380;
    W[15] = 0x00000018;
    return W;
  };

  it('reports every word t = 16..63 with the σ0 and σ1 it used', () => {
    const W = abc();
    const seen: number[] = [];
    expandSchedule(W, (t, w, s0, s1) => {
      seen.push(t);
      expect(w).toBe(W[t]);
      expect(s0).toBe(smallSigma0(W[t - 15]));
      expect(s1).toBe(smallSigma1(W[t - 2]));
      expect(w).toBe((s1 + W[t - 7] + s0 + W[t - 16]) >>> 0);
    });
    expect(seen).toEqual(Array.from({ length: 48 }, (_, i) => 16 + i));
    // W16 = σ1(W14) + W9 + σ0(W1) + W0 = W0, since W1..W14 are zero.
    expect(W[16]).toBe(0x61626380);
  });

  it('fills the same words with or without a trace', () => {
    const traced = abc();
    expandSchedule(traced, () => {});
    const plain = abc();
    expandSchedule(plain);
    expect(Array.from(traced)).toEqual(Array.from(plain));
  });
});
