import { pbkdf2Sync } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { bytesToHex } from '@/core/bytes/hex';
import { utf8Encode } from '@/core/bytes/utf8';
import type { KdfEvent } from '@/core/kdf/events';
import { pbkdf2, pbkdf2Run, STEPPED_ITERATIONS } from '@/core/kdf/pbkdf2';
import { createRng } from '@/core/sim/rng';

/** PBKDF2-HMAC-SHA-256 in src/core/kdf against RFC 7914 §11 and node:crypto. */

const node = (p: Uint8Array, s: Uint8Array, c: number, dkLen: number) =>
  pbkdf2Sync(p, s, c, dkLen, 'sha256').toString('hex');

describe('RFC 7914 §11 test vectors', () => {
  it('P = "passwd", S = "salt", c = 1, dkLen = 64', () => {
    expect(bytesToHex(pbkdf2(utf8Encode('passwd'), utf8Encode('salt'), 1, 64))).toBe(
      '55ac046e56e3089fec1691c22544b605f94185216dde0465e68b9d57c20dacbc' +
        '49ca9cccf179b645991664b39d77ef317c71b845b1e30bd509112041d3a19783',
    );
  });

  it('P = "Password", S = "NaCl", c = 80000, dkLen = 64 (fast path)', () => {
    expect(
      bytesToHex(pbkdf2(utf8Encode('Password'), utf8Encode('NaCl'), 80_000, 64)),
    ).toBe(
      '4ddcd8f60b98be21830cee5ef22701f9641a4418d04c0414aeff08876b34ab56' +
        'a1d425a1225833549adb841b51c9b3176a272bdebba1d078478f62b397f33c8d',
    );
  });
});

describe('against node:crypto', () => {
  it('matches pbkdf2Sync on 200 seeded cases (c ≤ 2,000, dkLen 1–64)', () => {
    const rng = createRng('pbkdf2-differential');
    let multiBlock = 0;
    for (let i = 0; i < 200; i += 1) {
      const password = Uint8Array.from({ length: rng.int(80) }, () => rng.int(256));
      const salt = Uint8Array.from({ length: rng.int(40) }, () => rng.int(256));
      const c = 1 + rng.int(2000);
      const dkLen = 1 + rng.int(64);
      if (dkLen > 32) multiBlock += 1;
      expect(bytesToHex(pbkdf2(password, salt, c, dkLen)), `case ${i}`).toBe(
        node(password, salt, c, dkLen),
      );
    }
    expect(multiBlock).toBeGreaterThan(50);
    // About 200,000 HMAC calls: ~2 s plain, over 5 s under coverage instrumentation.
  }, 60_000);

  it('handles a key of several blocks with a partial last block', () => {
    const p = utf8Encode('pw');
    const s = utf8Encode('NaCl');
    expect(bytesToHex(pbkdf2(p, s, 3, 100))).toBe(node(p, s, 3, 100));
  });

  it('reports progress up to the total', () => {
    const seen: number[] = [];
    pbkdf2(utf8Encode('pw'), utf8Encode('s'), 25, 40, {
      onProgress: (done, total) => {
        expect(total).toBe(50);
        seen.push(done);
      },
      progressEvery: 10,
    });
    expect(seen).toEqual([11, 21, 36, 46, 50]);
  });

  it('rejects a bad iteration count or key length', () => {
    expect(() => pbkdf2(new Uint8Array(), new Uint8Array(), 0, 32)).toThrow(RangeError);
    expect(() => pbkdf2(new Uint8Array(), new Uint8Array(), 1, 0)).toThrow(RangeError);
  });
});

describe('stepped path', () => {
  const password = utf8Encode('passwd');
  const salt = utf8Encode('salt');

  it('ends with the same key as the fast path and node:crypto', () => {
    for (const [c, dkLen] of [
      [1, 64],
      [2, 20],
      [3, 32],
      [1000, 64],
      [4096, 33],
    ]) {
      const events = pbkdf2Run({ password, salt, iterations: c, dkLen }).events;
      const key = events.at(-1) as Extract<KdfEvent, { kind: 'kdf.pbkdfKey' }>;
      expect(key.kind).toBe('kdf.pbkdfKey');
      expect(bytesToHex(Uint8Array.from(key.dk))).toBe(node(password, salt, c, dkLen));
    }
  });

  it('steps U1–U3 with the running XOR, then summarises the rest', () => {
    const events = pbkdf2Run({ password, salt, iterations: 1000, dkLen: 32 }).events;
    const us = events.filter((e) => e.kind === 'kdf.pbkdfU');
    expect(us.map((e) => e.iteration)).toEqual([1, 2, 3]);
    expect(STEPPED_ITERATIONS).toBe(3);
    // T after U2 is U1 ⊕ U2.
    expect(us[1].t).toEqual(us[0].u.map((byte, i) => byte ^ us[1].u[i]));
    // U2's input is U1.
    expect(us[1].input).toEqual(us[0].u);
    // U1's input is salt ‖ INT(1).
    expect(us[0].input).toEqual([...salt, 0, 0, 0, 1]);
    const rest = events.find((e) => e.kind === 'kdf.pbkdfRest')!;
    expect([rest.from, rest.to, rest.pending]).toEqual([4, 1000, false]);
    expect(rest.label).toContain('997 more times');
  });

  it('can leave the rest pending for a Worker', () => {
    const events = pbkdf2Run({
      password,
      salt,
      iterations: 600_000,
      dkLen: 32,
      finish: false,
    }).events;
    const rest = events.at(-1) as Extract<KdfEvent, { kind: 'kdf.pbkdfRest' }>;
    expect(rest.pending).toBe(true);
    expect('t' in rest).toBe(false);
    expect(events.some((e) => e.kind === 'kdf.pbkdfKey')).toBe(false);
  });
});
