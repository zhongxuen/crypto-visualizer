import { describe, expect, it } from 'vitest';

import { utf8Decode } from '../bytes/utf8';
import { createRng } from '../sim/rng';
import { characters, encodeRun, truncateUtf8 } from './encode';
import type { XorEvent } from './events';
import { otpKey, otpRun } from './otp';
import { XOR_SCENARIOS } from './scenarios';
import { XOR_SHARE_STATE } from './state';
import { cribDrag, isReadable, TWO_TIME_PAD_EXAMPLE, twoTimePadRun } from './twoTimePad';
import { asText, xor, xorRun } from './xor';

function randomText(rng: ReturnType<typeof createRng>, length: number): string {
  let text = '';
  for (let i = 0; i < length; i += 1) {
    const pick = rng.int(4);
    const codePoint =
      pick === 0
        ? 0x20 + rng.int(0x5f) // ASCII
        : pick === 1
          ? 0x80 + rng.int(0x780) // 2 bytes
          : pick === 2
            ? 0x800 + rng.int(0xd000 - 0x800) // 3 bytes, below the surrogates
            : 0x10000 + rng.int(0x100000); // 4 bytes (astral)
    text += String.fromCodePoint(codePoint);
  }
  return text;
}

describe('encode run', () => {
  it('matches TextEncoder on 1,000 seeded random strings, astral included', () => {
    const rng = createRng('xor-utf8');
    const encoder = new TextEncoder();
    for (let i = 0; i < 1000; i += 1) {
      const text = truncateUtf8(randomText(rng, 1 + rng.int(20)));
      const result = encodeRun(text);
      const done = result.events.at(-1) as Extract<XorEvent, { kind: 'xor.message' }>;
      expect(done.bytes).toEqual(Array.from(encoder.encode(text)));
      const chars = result.events.filter((e) => e.kind === 'xor.char');
      expect(chars).toHaveLength(characters(text).length);
      const last = chars.at(-1);
      if (last) expect(last.encoded).toEqual(done.bytes);
    }
  });

  it('splits é into two bytes and 🔐 into four', () => {
    const chars = encodeRun('é🔐').events.filter((e) => e.kind === 'xor.char');
    expect(chars.map((e) => e.bytes)).toEqual([
      [0xc3, 0xa9],
      [0xf0, 0x9f, 0x94, 0x90],
    ]);
    expect(chars[1].offset).toBe(2);
  });

  it('cuts text at 64 bytes on a character boundary', () => {
    const text = '🔐'.repeat(20); // 80 bytes
    expect(truncateUtf8(text)).toBe('🔐'.repeat(16));
    expect(truncateUtf8('ab', 1)).toBe('a');
  });

  it('replaces a lone surrogate, as TextEncoder does', () => {
    expect(characters('a\ud800b').map((c) => c.codePoint)).toEqual([0x61, 0xfffd, 0x62]);
  });
});

describe('xor', () => {
  it('xor(xor(p, k), k) = p for 1,000 seeded inputs', () => {
    const rng = createRng('xor-reversible');
    for (let i = 0; i < 1000; i += 1) {
      const length = rng.int(65);
      const p = Array.from({ length }, () => rng.int(256));
      const k = Array.from({ length }, () => rng.int(256));
      expect(xor(xor(p, k), k)).toEqual(p);
    }
  });

  it('shows every byte, then gets the message back', () => {
    const a = [0x48, 0x69];
    const b = [0x0f, 0xf0];
    const result = xorRun({ a, b });
    const bytes = result.events.filter((e) => e.kind === 'xor.byte');
    expect(bytes.map((e) => [e.pass, e.out])).toEqual([
      ['apply', 0x47],
      ['apply', 0x99],
      ['undo', 0x48],
      ['undo', 0x69],
    ]);
    const last = result.events.at(-1) as Extract<XorEvent, { kind: 'xor.result' }>;
    expect(last.out).toEqual(a);
    expect(last.text).toBe('Hi');
    expect(result.phases.map((p) => p.id)).toEqual(['apply', 'undo']);
  });

  it('rejects unequal lengths', () => {
    expect(() => xorRun({ a: [1], b: [1, 2] })).toThrow(RangeError);
  });

  it('reads bytes as text only when they are text', () => {
    expect(asText([0x48, 0x69])).toBe('Hi');
    expect(asText([0x00, 0x41])).toBeUndefined();
    expect(asText([0xff])).toBeUndefined();
  });
});

describe('one-time pad', () => {
  it('draws a deterministic key as long as the message', () => {
    expect(otpKey(8, 1)).toEqual(otpKey(8, 1));
    expect(otpKey(8, 1)).not.toEqual(otpKey(8, 2));
    const result = otpRun('attack at dawn', 1);
    const key = result.events.find((e) => e.kind === 'xor.key')!;
    expect(key.key).toHaveLength(14);
    const last = result.events.at(-1) as Extract<XorEvent, { kind: 'xor.result' }>;
    expect(last.text).toBe('attack at dawn');
  });
});

describe('two-time pad', () => {
  const { p1, p2, crib } = TWO_TIME_PAD_EXAMPLE;
  const result = twoTimePadRun({ p1, p2, crib, seed: 1 });

  it('cancels the key: c1 ⊕ c2 = p1 ⊕ p2', () => {
    const cancel = result.events.find((e) => e.id === 'xor.ttp.cancel') as Extract<
      XorEvent,
      { kind: 'xor.result' }
    >;
    expect(cancel.out).toEqual(
      xor(
        Array.from(new TextEncoder().encode(p1)),
        Array.from(new TextEncoder().encode(p2)),
      ),
    );
  });

  it('recovers the expected crib text where " the " sits in each message', () => {
    const cribs = result.events.filter((e) => e.kind === 'xor.crib');
    const at = (offset: number) => cribs.find((e) => e.offset === offset)!;
    // " the " is at byte 10 of p1, so p2 shows through there, and vice versa.
    expect(p1.indexOf(crib)).toBe(10);
    expect(at(10).revealedText).toBe(p2.slice(10, 15));
    expect(at(10).readable).toBe(true);
    expect(p2.indexOf(crib)).toBe(4);
    expect(at(4).revealedText).toBe(p1.slice(4, 9));
    expect(at(4).readable).toBe(true);
    expect(cribs).toHaveLength(p1.length - crib.length + 1);
  });

  it('marks most offsets as gibberish', () => {
    const readable = cribDrag(
      xor(
        Array.from(new TextEncoder().encode(p1)),
        Array.from(new TextEncoder().encode(p2)),
      ),
      Array.from(new TextEncoder().encode(crib)),
    ).filter((position) => position.readable);
    expect(readable.length).toBeLessThan(8);
    expect(readable.map((position) => position.offset)).toEqual(
      expect.arrayContaining([4, 10, 20]),
    );
  });

  it('cuts two messages to the shorter length', () => {
    const short = twoTimePadRun({ p1: 'hello there', p2: 'hi', crib: 'x', seed: 1 });
    const first = short.events[0] as Extract<XorEvent, { kind: 'xor.message' }>;
    expect(first.bytes).toHaveLength(2);
    expect(first.detail).toMatch(/cut to 2 bytes/);
  });

  it('knows what English looks like', () => {
    expect(isReadable([0x61, 0x20, 0x2e])).toBe(true);
    expect(isReadable([0x01])).toBe(false);
    expect(isReadable([])).toBe(false);
    expect(utf8Decode(Uint8Array.of(0x61))).toBe('a');
  });
});

describe('scenarios and share state', () => {
  it('registers four scenarios, each citing only xor and general sources', () => {
    expect(XOR_SCENARIOS.map((s) => s.id)).toEqual([
      'xor.encode',
      'xor.reversible',
      'xor.otp',
      'xor.two-time-pad',
    ]);
    const cited = new Set(
      XOR_SCENARIOS.flatMap((s) => s.run().events.map((e) => e.citation)),
    );
    expect([...cited].sort()).toEqual(
      ['rfc3629.3', 'rfc4648.8', 'shannon1949', 'venona', 'vernam1926'].sort(),
    );
  });

  it('rejects text over 64 bytes in a link', () => {
    const state = {
      ...XOR_SHARE_STATE.defaults,
      input: { ...XOR_SHARE_STATE.defaults.input, a: 'x'.repeat(65) },
    };
    expect(XOR_SHARE_STATE.schema.safeParse(state).success).toBe(false);
  });
});
