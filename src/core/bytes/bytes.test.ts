import { describe, expect, it } from 'vitest';

import { createRng, type Rng } from '../sim/rng';
import { base64urlDecode, base64urlEncode } from './base64url';
import { bitDiff, popcount, rotr32, toBinary, xorBytes } from './bits';
import { bytesToHex, hexToBytes } from './hex';
import { utf8Decode, utf8Encode } from './utf8';

/**
 * The byte helpers are implemented by hand in core. Here the platform versions
 * (`TextEncoder`, `TextDecoder`, `Buffer`) serve as oracles, on 1,000 seeded random inputs
 * each, so a failure replays exactly.
 */
const ROUNDS = 1000;

function randomBytes(rng: Rng, maxLength = 64): Uint8Array {
  return Uint8Array.from({ length: rng.int(maxLength + 1) }, () => rng.int(256));
}

/**
 * A string that exercises every UTF-8 length plus lone surrogates, which `TextEncoder`
 * replaces with U+FFFD.
 */
function randomText(rng: Rng): string {
  const units: string[] = [];
  const length = rng.int(24);
  for (let i = 0; i < length; i += 1) {
    switch (rng.int(6)) {
      case 0:
        units.push(String.fromCodePoint(rng.int(0x80)));
        break;
      case 1:
        units.push(String.fromCodePoint(0x80 + rng.int(0x800 - 0x80)));
        break;
      case 2: {
        const point = 0x800 + rng.int(0x10000 - 0x800);
        // Skip the surrogate range here; case 4 covers lone surrogates on purpose.
        units.push(
          String.fromCodePoint(point >= 0xd800 && point <= 0xdfff ? 0xe000 : point),
        );
        break;
      }
      case 3:
        units.push(String.fromCodePoint(0x10000 + rng.int(0x110000 - 0x10000)));
        break;
      case 4:
        units.push(String.fromCharCode(0xd800 + rng.int(0x800)));
        break;
      default:
        units.push('﻿'); // a BOM, anywhere, including first
    }
  }
  return units.join('');
}

describe('hex', () => {
  it('round-trips random bytes and matches Buffer', () => {
    const rng = createRng('hex');
    for (let i = 0; i < ROUNDS; i += 1) {
      const bytes = randomBytes(rng);
      const hex = bytesToHex(bytes);
      expect(hex).toBe(Buffer.from(bytes).toString('hex'));
      expect(hexToBytes(hex)).toEqual(bytes);
      expect(hexToBytes(hex.toUpperCase())).toEqual(bytes);
    }
  });

  it('joins with a separator and ignores whitespace when parsing', () => {
    expect(bytesToHex(Uint8Array.of(0xde, 0xad, 0x0f), ' ')).toBe('de ad 0f');
    expect(hexToBytes(' DE ad\n0f ')).toEqual(Uint8Array.of(0xde, 0xad, 0x0f));
    expect(hexToBytes('')).toEqual(new Uint8Array(0));
  });

  it.each(['abc', 'zz', '0x12', 'g0'])('rejects %j', (bad) => {
    expect(() => hexToBytes(bad)).toThrow(RangeError);
  });
});

describe('utf8', () => {
  const oracleDecoder = new TextDecoder('utf-8', { ignoreBOM: true });

  it('encodes like TextEncoder', () => {
    const encoder = new TextEncoder();
    const rng = createRng('utf8-encode');
    for (let i = 0; i < ROUNDS; i += 1) {
      const text = randomText(rng);
      expect(utf8Encode(text)).toEqual(encoder.encode(text));
    }
  });

  it('round-trips well-formed text', () => {
    const rng = createRng('utf8-roundtrip');
    for (let i = 0; i < ROUNDS; i += 1) {
      const text = randomText(rng).replace(/[\ud800-\udfff]/g, '');
      expect(utf8Decode(utf8Encode(text))).toBe(text);
    }
  });

  it('decodes arbitrary bytes, invalid ones included, like TextDecoder', () => {
    const rng = createRng('utf8-decode');
    for (let i = 0; i < ROUNDS; i += 1) {
      const bytes = randomBytes(rng);
      expect(utf8Decode(bytes)).toBe(oracleDecoder.decode(bytes));
    }
  });

  it.each([
    ['ASCII', 'A', [0x41]],
    ['2 bytes', 'é', [0xc3, 0xa9]],
    ['3 bytes', '€', [0xe2, 0x82, 0xac]],
    ['4 bytes', '😀', [0xf0, 0x9f, 0x98, 0x80]],
    ['a lone surrogate', '\ud800', [0xef, 0xbf, 0xbd]],
  ])('encodes %s', (_name, text, bytes) => {
    expect(Array.from(utf8Encode(text))).toEqual(bytes);
  });

  it.each([
    ['an overlong encoding', [0xc0, 0xaf]],
    ['an encoded surrogate', [0xed, 0xa0, 0x80]],
    ['a code point above U+10FFFF', [0xf4, 0x90, 0x80, 0x80]],
    ['a truncated sequence', [0xe2, 0x82]],
    ['a stray continuation byte', [0x80, 0x41]],
  ])('replaces %s like TextDecoder', (_name, bytes) => {
    const input = Uint8Array.from(bytes);
    expect(utf8Decode(input)).toBe(oracleDecoder.decode(input));
  });

  it('keeps a leading byte-order mark', () => {
    expect(utf8Decode(Uint8Array.of(0xef, 0xbb, 0xbf, 0x41))).toBe('﻿A');
  });

  it('decodes long input without overflowing the stack', () => {
    const text = 'a€😀'.repeat(50_000);
    expect(utf8Decode(utf8Encode(text))).toBe(text);
  });
});

describe('base64url', () => {
  it('encodes like Buffer and round-trips', () => {
    const rng = createRng('base64url');
    for (let i = 0; i < ROUNDS; i += 1) {
      const bytes = randomBytes(rng);
      const text = base64urlEncode(bytes);
      expect(text).toBe(Buffer.from(bytes).toString('base64url'));
      expect(base64urlDecode(text)).toEqual(bytes);
    }
  });

  it('accepts padded input', () => {
    expect(base64urlDecode('QQ==')).toEqual(Uint8Array.of(0x41));
    expect(base64urlDecode('QUI=')).toEqual(Uint8Array.of(0x41, 0x42));
  });

  it('uses the URL-safe alphabet', () => {
    expect(base64urlEncode(Uint8Array.of(0xfb, 0xff))).toBe('-_8');
  });

  it.each([
    ['a character outside the alphabet', 'QU+C'],
    ['standard base64 slash', 'QU/C'],
    ['an impossible length', 'QUJDR'],
    ['non-zero leftover bits', 'QR'],
    ['padding that does not fit', 'QQ='],
    ['padding in the middle', 'QQ==QQ'],
  ])('rejects %s', (_name, text) => {
    expect(() => base64urlDecode(text)).toThrow(RangeError);
  });
});

describe('bits', () => {
  it('prints binary', () => {
    expect(toBinary(0x41)).toBe('01000001');
    expect(toBinary(Uint8Array.of(0x41, 0x00))).toBe('01000001 00000000');
    expect(toBinary(Uint8Array.of(0x41, 0x00), '')).toBe('0100000100000000');
    expect(() => toBinary(256)).toThrow(RangeError);
  });

  it('XORs like Buffer, and XOR with the same key twice is the identity', () => {
    const rng = createRng('xor');
    for (let i = 0; i < ROUNDS; i += 1) {
      const a = randomBytes(rng);
      const b = Uint8Array.from({ length: a.length }, () => rng.int(256));
      const expected = Uint8Array.from(a, (byte, index) => byte ^ b[index]);
      expect(xorBytes(a, b)).toEqual(expected);
      expect(xorBytes(xorBytes(a, b), b)).toEqual(a);
    }
    expect(() => xorBytes(new Uint8Array(1), new Uint8Array(2))).toThrow(RangeError);
  });

  it('rotates 32-bit words right', () => {
    expect(rotr32(0x00000001, 1)).toBe(0x80000000);
    expect(rotr32(0x12345678, 8)).toBe(0x78123456);
    expect(rotr32(0x12345678, 0)).toBe(0x12345678);
    expect(rotr32(0x12345678, 32)).toBe(0x12345678);

    const rng = createRng('rotr');
    for (let i = 0; i < ROUNDS; i += 1) {
      const word = (rng.int(0x10000) * 0x10000 + rng.int(0x10000)) >>> 0;
      const n = rng.int(32);
      const expected = Number(
        ((BigInt(word) >> BigInt(n)) | (BigInt(word) << BigInt(32 - n))) & 0xffffffffn,
      );
      expect(rotr32(word, n)).toBe(expected);
      expect(rotr32(rotr32(word, n), 32 - n)).toBe(word);
    }
  });

  it('counts set bits', () => {
    expect(popcount(0)).toBe(0);
    expect(popcount(0xffffffff)).toBe(32);
    expect(popcount(0x80000001)).toBe(2);
    expect(popcount(Uint8Array.of(0xff, 0x01))).toBe(9);

    const rng = createRng('popcount');
    for (let i = 0; i < ROUNDS; i += 1) {
      const bytes = randomBytes(rng);
      expect(popcount(bytes)).toBe(toBinary(bytes, '').split('1').length - 1);
    }
  });

  it('lists flipped bits, most significant bit of byte 0 first', () => {
    expect(bitDiff(Uint8Array.of(0x00, 0x00), Uint8Array.of(0x80, 0x01))).toEqual([
      0, 15,
    ]);
    expect(bitDiff(Uint8Array.of(0xaa), Uint8Array.of(0xaa))).toEqual([]);
    expect(() => bitDiff(new Uint8Array(1), new Uint8Array(2))).toThrow(RangeError);

    const rng = createRng('bitdiff');
    for (let i = 0; i < ROUNDS; i += 1) {
      const a = randomBytes(rng);
      const b = Uint8Array.from({ length: a.length }, () => rng.int(256));
      const diff = bitDiff(a, b);
      expect(diff.length).toBe(popcount(xorBytes(a, b)));
      const binaryA = toBinary(a, '');
      const binaryB = toBinary(b, '');
      const expected = [...binaryA].flatMap((bit, index) =>
        bit === binaryB[index] ? [] : [index],
      );
      expect(diff).toEqual(expected);
    }
  });
});
