import { describe, expect, it } from 'vitest';

import {
  cbcDecrypt,
  cbcEncrypt,
  ctrCrypt,
  ctrRun,
  decryptBlock,
  ecbDecrypt,
  ecbRun,
  encryptBlock,
  expandKey,
  flipBlockBit,
  gmulSteps,
  MAX_MODE_BLOCKS,
  MAX_MODE_BYTES,
  sboxParts,
  type AesEvent,
} from '.';

/**
 * AES guards and worked-example helpers: wrong key, block and IV lengths, the stepped
 * run's size limit, the one-byte padding label, and the §4.2 / §5.1.1 worked examples
 * behind the xtime and S-box panels. `tests/differential/aes.test.ts` covers the
 * ciphers themselves against node:crypto.
 */

const KEY = new Uint8Array(16);
const IV = new Uint8Array(16);

const of = <K extends AesEvent['kind']>(events: readonly AesEvent[], kind: K) =>
  events.filter((e): e is Extract<AesEvent, { kind: K }> => e.kind === kind);

describe('length guards', () => {
  it('refuses a key that is not 16 bytes', () => {
    expect(() => expandKey(new Uint8Array(24))).toThrow(
      'AES-128 takes a 16-byte key, got 24',
    );
    expect(() => encryptBlock(new Uint8Array(15), IV)).toThrow(RangeError);
  });

  it('refuses a block that is not 16 bytes, both ways', () => {
    expect(() => encryptBlock(KEY, new Uint8Array(15))).toThrow(
      'AES takes a 16-byte block, got 15',
    );
    expect(() => decryptBlock(KEY, new Uint8Array(17))).toThrow(
      'AES takes a 16-byte block, got 17',
    );
  });

  it('refuses unpadded data that is not whole blocks', () => {
    expect(() => cbcEncrypt(KEY, IV, new Uint8Array(20), { padding: false })).toThrow(
      'CBC plaintext must be a whole number of 16-byte blocks, got 20 bytes',
    );
    expect(() => ecbDecrypt(KEY, new Uint8Array(17))).toThrow(
      'ECB ciphertext must be a whole number of 16-byte blocks, got 17 bytes',
    );
  });

  it('refuses a short IV or counter block, naming which', () => {
    expect(() => cbcDecrypt(KEY, new Uint8Array(8), new Uint8Array(16))).toThrow(
      'The IV must be 16 bytes, got 8',
    );
    expect(() => ctrCrypt(KEY, new Uint8Array(12), new Uint8Array(4))).toThrow(
      'The initial counter block must be 16 bytes, got 12',
    );
  });

  it('caps a stepped run: one byte under 16 blocks when padded, 16 blocks when not', () => {
    expect(() => ecbRun(KEY, new Uint8Array(MAX_MODE_BYTES + 1))).toThrow(
      `A stepped mode run takes at most ${MAX_MODE_BYTES} bytes (${MAX_MODE_BLOCKS} blocks), got ${MAX_MODE_BYTES + 1}`,
    );
    expect(() => ecbRun(KEY, new Uint8Array(MAX_MODE_BYTES))).not.toThrow();
    const ctrLimit = MAX_MODE_BLOCKS * 16;
    expect(() => ctrRun(KEY, new Uint8Array(ctrLimit + 1), 1)).toThrow(
      `A stepped mode run takes at most ${ctrLimit} bytes`,
    );
    expect(() => ctrRun(KEY, new Uint8Array(ctrLimit), 1)).not.toThrow();
  });
});

describe('padding step', () => {
  it('says "1 byte", singular, when one byte of padding is added', () => {
    const [pad] = of(ecbRun(KEY, new Uint8Array(15)).events, 'aes.pad');
    expect(pad.padLength).toBe(1);
    expect(pad.label).toBe('Pad with 1 byte of value 1: 15 bytes become 16.');
    expect(pad.padded.at(-1)).toBe(1);
  });

  it('says "bytes" and explains the whole extra block for a full block', () => {
    const [pad] = of(ecbRun(KEY, new Uint8Array(16)).events, 'aes.pad');
    expect(pad.label).toBe('Pad with 16 bytes of value 16: 16 bytes become 32.');
    expect(pad.detail).toContain('a whole block of 0x10');
  });
});

describe('flipBlockBit', () => {
  it('flips bit 0 as the top bit of byte 0 and bit 127 as the bottom of byte 15', () => {
    expect(flipBlockBit(IV, 0)[0]).toBe(0x80);
    expect(flipBlockBit(IV, 127)[15]).toBe(0x01);
    expect(IV.every((b) => b === 0)).toBe(true); // a copy, not in place
  });

  it('refuses a bit outside the block or not a whole number', () => {
    expect(() => flipBlockBit(IV, 128)).toThrow('No bit 128 in a 16-byte block');
    expect(() => flipBlockBit(IV, -1)).toThrow(RangeError);
    expect(() => flipBlockBit(IV, 1.5)).toThrow(RangeError);
  });
});

describe('worked examples', () => {
  it('gmulSteps reproduces FIPS 197 §4.2: {57} • {13} = {fe}', () => {
    const { steps, product } = gmulSteps(0x57, 0x13);
    expect(steps).toEqual([
      { power: 0, value: 0x57, used: true },
      { power: 1, value: 0xae, used: true },
      { power: 2, value: 0x47, used: false },
      { power: 3, value: 0x8e, used: false },
      { power: 4, value: 0x07, used: true },
    ]);
    expect(product).toBe(0xfe);
  });

  it('gmulSteps by 0 has no steps and a product of 0', () => {
    expect(gmulSteps(0x57, 0)).toEqual({ steps: [], product: 0 });
  });

  it('sboxParts reproduces FIPS 197 §5.1.1: {53} → inverse {ca} → {ed}', () => {
    expect(sboxParts(0x53)).toEqual({ input: 0x53, inverse: 0xca, output: 0xed });
    // 0 has no inverse; SBOX treats it as 0, so the output is just the constant.
    expect(sboxParts(0)).toEqual({ input: 0, inverse: 0, output: 0x63 });
  });
});
