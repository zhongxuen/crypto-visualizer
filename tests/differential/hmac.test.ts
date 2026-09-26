import { createHmac } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { bytesToHex, hexToBytes } from '@/core/bytes/hex';
import { utf8Encode } from '@/core/bytes/utf8';
import type { HmacEvent } from '@/core/hmac/events';
import { hmac, hmacKey, hmacKeyState, hmacRun, hmacWithState } from '@/core/hmac/hmac';
import { sha256 } from '@/core/sha256/sha256';
import { createRng } from '@/core/sim/rng';

/** HMAC-SHA-256 in src/core/hmac against RFC 4231 and node:crypto. */

const node = (key: Uint8Array, message: Uint8Array) =>
  createHmac('sha256', key).update(message).digest('hex');

const repeat = (byte: number, length: number) => new Uint8Array(length).fill(byte);

/** RFC 4231 §4.2–4.8, HMAC-SHA-256 results. Case 5 is truncated to 128 bits (§4.6). */
const RFC4231: { name: string; key: Uint8Array; data: Uint8Array; tag: string }[] = [
  {
    name: 'test case 1 (§4.2)',
    key: repeat(0x0b, 20),
    data: utf8Encode('Hi There'),
    tag: 'b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7',
  },
  {
    name: 'test case 2 (§4.3)',
    key: utf8Encode('Jefe'),
    data: utf8Encode('what do ya want for nothing?'),
    tag: '5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843',
  },
  {
    name: 'test case 3 (§4.4)',
    key: repeat(0xaa, 20),
    data: repeat(0xdd, 50),
    tag: '773ea91e36800e46854db8ebd09181a72959098b3ef8c122d9635514ced565fe',
  },
  {
    name: 'test case 4 (§4.5)',
    key: hexToBytes('0102030405060708090a0b0c0d0e0f10111213141516171819'),
    data: repeat(0xcd, 50),
    tag: '82558a389a443c0ea4cc819899f2083a85f0faa3e578f8077a2e3ff46729665b',
  },
  {
    name: 'test case 5, truncated to 128 bits (§4.6)',
    key: repeat(0x0c, 20),
    data: utf8Encode('Test With Truncation'),
    tag: 'a3b6167473100ee06e0c796c2955552b',
  },
  {
    name: 'test case 6, key longer than a block (§4.7)',
    key: repeat(0xaa, 131),
    data: utf8Encode('Test Using Larger Than Block-Size Key - Hash Key First'),
    tag: '60e431591ee0b67f0d8a26aacbf5b77f8e0bc6213728c5140546040f0ee37f54',
  },
  {
    name: 'test case 7, key and data longer than a block (§4.8)',
    key: repeat(0xaa, 131),
    data: utf8Encode(
      'This is a test using a larger than block-size key and a larger than block-size data. The key needs to be hashed before being used by the HMAC algorithm.',
    ),
    tag: '9b09ffa71b942fcb27635fbcd5b0e944bfdc63644f0713938a7f51535c3a35e2',
  },
];

describe('RFC 4231 test cases', () => {
  it.each(RFC4231)('$name', ({ key, data, tag }) => {
    const out = bytesToHex(hmac(key, data));
    expect(out.slice(0, tag.length)).toBe(tag);
  });
});

describe('against node:crypto', () => {
  it('matches createHmac on 500 seeded keys and messages, keys up to 200 bytes', () => {
    const rng = createRng('hmac-differential');
    for (let i = 0; i < 500; i += 1) {
      const key = Uint8Array.from({ length: rng.int(201) }, () => rng.int(256));
      const message = Uint8Array.from({ length: rng.int(300) }, () => rng.int(256));
      expect(bytesToHex(hmac(key, message)), `key ${key.length}`).toBe(
        node(key, message),
      );
    }
  });

  it('covers keys of exactly 63, 64 and 65 bytes', () => {
    for (const length of [0, 1, 63, 64, 65, 128]) {
      const key = repeat(0x42, length);
      const message = utf8Encode('boundary');
      expect(bytesToHex(hmac(key, message)), `key ${length}`).toBe(node(key, message));
    }
  });

  it('reuses a precomputed key state', () => {
    const state = hmacKeyState(utf8Encode('key'));
    for (const text of ['a', 'bb', '']) {
      const message = utf8Encode(text);
      expect(bytesToHex(hmacWithState(state, message))).toBe(
        node(utf8Encode('key'), message),
      );
    }
  });
});

describe('stepped path', () => {
  const key = utf8Encode('Jefe');
  const message = utf8Encode('what do ya want for nothing?');
  const events = hmacRun(key, message).events;
  const find = <K extends HmacEvent['kind']>(kind: K, id: string) =>
    events.find((e) => e.kind === kind && e.id === id) as unknown as Extract<
      HmacEvent,
      { kind: K }
    >;

  it('ends with the same tag as the fast path and node:crypto', () => {
    const tag = find('hmac.tag', 'hmac.tag');
    expect(bytesToHex(Uint8Array.from(tag.tag))).toBe(node(key, message));
    expect(find('hmac.hash', 'hmac.outer').digest).toEqual(tag.tag);
  });

  it('shows K0, both pads and a collapsed inner and outer hash', () => {
    expect(events.map((e) => e.id)).toEqual([
      'hmac.naive',
      'hmac.key',
      'hmac.ipad',
      'hmac.inner',
      'hmac.opad',
      'hmac.outer',
      'hmac.tag',
    ]);
    const k0 = find('hmac.key', 'hmac.key');
    expect(k0.k0).toHaveLength(64);
    expect(k0.hashed).toBe(false);
    expect(find('hmac.pad', 'hmac.ipad').padded[0]).toBe(key[0] ^ 0x36);
    expect(find('hmac.pad', 'hmac.opad').padded[63]).toBe(0x5c);
    const inner = find('hmac.hash', 'hmac.inner');
    expect(inner.digest).toEqual(Array.from(sha256(Uint8Array.from(inner.input))));
  });

  it('hashes a key longer than a block first', () => {
    const long = repeat(0xaa, 131);
    const k0 = hmacRun(long, message).events.find((e) => e.kind === 'hmac.key')!;
    expect(k0.hashed).toBe(true);
    expect(k0.citation).toBe('rfc2104.3');
    expect(Array.from(hmacKey(long).subarray(0, 32))).toEqual(Array.from(sha256(long)));
  });

  it('explains length extension with the naive tag and SHA-256’s glue padding', () => {
    const naive = find('hmac.naive', 'hmac.naive');
    expect(bytesToHex(Uint8Array.from(naive.naiveTag))).toBe(
      bytesToHex(sha256(Uint8Array.from([...key, ...message]))),
    );
    expect(naive.glue[0]).toBe(0x80);
    expect((key.length + message.length + naive.glue.length) % 64).toBe(0);
    expect(naive.citation).toBe('fips180-4.5.1.1');
  });
});
