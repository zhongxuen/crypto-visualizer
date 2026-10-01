import { describe, expect, it } from 'vitest';
import * as z from 'zod/mini';

import { createRng } from '../sim/rng';
import { SHARE_STATES } from './index';
import { defineShareState, findSecretKeys, type ModuleShareState } from './schema';
import {
  decodeShareState,
  encodeShareState,
  MAX_SHARE_STATE_LENGTH,
  shareStateFromSearch,
  shareStateToSearch,
} from './shareState';

/** A stand-in module branch, shaped like a real one. */
const DEMO = defineShareState({
  m: 'demo',
  v: 1,
  input: z.object({
    plaintext: z.string().check(z.maxLength(4000)),
    mode: z.enum(['ecb', 'cbc', 'ctr']),
    exampleId: z.optional(z.string()),
  }),
  defaults: { seed: 7, step: 0, input: { plaintext: 'hello', mode: 'ecb' } },
});

const OTHER = defineShareState({
  m: 'other',
  v: 1,
  input: z.object({ n: z.number() }),
  defaults: { seed: 1, step: 0, input: { n: 1 } },
});

// A narrow branch fits the registry's element type.
const REGISTRY_SHAPE: readonly ModuleShareState[] = [DEMO, OTHER];

function b64(text: string): string {
  return Buffer.from(text, 'utf8').toString('base64url');
}

describe('encode → decode', () => {
  it('is the identity on random valid states', () => {
    const rng = createRng('share-state');
    const modes = ['ecb', 'cbc', 'ctr'] as const;
    for (let i = 0; i < 1000; i += 1) {
      const plaintext = Array.from({ length: rng.int(40) }, () =>
        String.fromCodePoint(
          rng.chance(0.8) ? 0x20 + rng.int(0x5f) : 0x80 + rng.int(0x3000),
        ),
      ).join('');
      const state = {
        m: 'demo' as const,
        v: 1,
        seed: rng.int(0x10000) * 0x10000 + rng.int(0x10000),
        step: rng.int(500),
        input: { plaintext, mode: modes[rng.int(3)] },
      };
      const encoded = encodeShareState(DEMO, state);
      expect(encoded).not.toBeNull();
      expect(decodeShareState(DEMO, encoded)).toStrictEqual(state);
    }
  });

  it('encodes UTF-8 JSON as base64url', () => {
    const encoded = encodeShareState(DEMO, DEMO.defaults);
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(JSON.parse(Buffer.from(encoded!, 'base64url').toString('utf8'))).toEqual(
      DEMO.defaults,
    );
  });

  it('works through a query string', () => {
    const state = { ...DEMO.defaults, step: 12 };
    const search = shareStateToSearch(DEMO, state);
    expect(search).toMatch(/^\?s=/);
    expect(shareStateFromSearch(DEMO, search!)).toStrictEqual(state);
    expect(shareStateFromSearch(DEMO, new URLSearchParams(search!))).toStrictEqual(state);
  });
});

describe('decode falls back to the default and never throws', () => {
  const valid = encodeShareState(DEMO, { ...DEMO.defaults, step: 3 })!;

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['an empty string', ''],
    ['non-base64url characters', '!!!***'],
    ['an impossible base64url length', 'abcde'],
    ['base64url that is not JSON', b64('not json')],
    ['JSON that is not an object', b64('42')],
    ['JSON null', b64('null')],
    ['another module’s state', encodeShareState(OTHER, OTHER.defaults)],
    ['a newer version', b64(JSON.stringify({ ...DEMO.defaults, v: 2 }))],
    ['a missing field', b64(JSON.stringify({ m: 'demo', v: 1, seed: 1, step: 0 }))],
    ['a negative step', b64(JSON.stringify({ ...DEMO.defaults, step: -1 }))],
    ['a fractional seed', b64(JSON.stringify({ ...DEMO.defaults, seed: 1.5 }))],
    ['a seed above 32 bits', b64(JSON.stringify({ ...DEMO.defaults, seed: 2 ** 32 }))],
    [
      'an input of the wrong shape',
      b64(JSON.stringify({ ...DEMO.defaults, input: { plaintext: 1, mode: 'ecb' } })),
    ],
    [
      'a password-like key',
      b64(
        JSON.stringify({
          ...DEMO.defaults,
          input: { ...DEMO.defaults.input, password: 'x' },
        }),
      ),
    ],
    ['a truncated link', valid.slice(0, -3)],
    ['an oversized value', 'A'.repeat(MAX_SHARE_STATE_LENGTH + 4)],
  ])('%s', (_name, encoded) => {
    expect(decodeShareState(DEMO, encoded)).toStrictEqual(DEMO.defaults);
  });

  it('survives 1,000 random strings', () => {
    const rng = createRng('garbage');
    const alphabet =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_=+/{}"';
    for (let i = 0; i < 1000; i += 1) {
      const text = Array.from(
        { length: rng.int(80) },
        () => alphabet[rng.int(alphabet.length)],
      ).join('');
      expect(() => decodeShareState(DEMO, text)).not.toThrow();
    }
  });

  it('returns a fresh copy of the defaults each time', () => {
    const first = decodeShareState(DEMO, null);
    first.input.plaintext = 'mutated';
    expect(decodeShareState(DEMO, null).input.plaintext).toBe('hello');
    expect(DEMO.defaults.input.plaintext).toBe('hello');
  });
});

describe('size limit', () => {
  it('returns null rather than a link longer than 2 KB', () => {
    const state = {
      ...DEMO.defaults,
      input: { plaintext: 'x'.repeat(3000), mode: 'ecb' as const },
    };
    expect(encodeShareState(DEMO, state)).toBeNull();
    expect(shareStateToSearch(DEMO, state)).toBeNull();
  });
});

describe('free-text passwords are never encoded', () => {
  it('finds password-like keys at any depth', () => {
    expect(
      findSecretKeys({
        input: { userPassword: 'a', nested: [{ passphrase: 'b' }], ok: 1 },
      }),
    ).toEqual(['input.userPassword', 'input.nested[0].passphrase']);
    expect(findSecretKeys({ exampleId: 'common-1', salt: 'x' })).toEqual([]);
  });

  it('refuses to define a state with a password field', () => {
    expect(() =>
      defineShareState({
        m: 'passwords',
        v: 1,
        input: z.object({ password: z.string() }),
        defaults: { seed: 0, step: 0, input: { password: 'hunter2' } },
      }),
    ).toThrow(/never encoded/);
  });

  it('refuses to encode one, even if the schema would strip it', () => {
    const state = { ...DEMO.defaults, input: { ...DEMO.defaults.input, password: 'x' } };
    expect(() => encodeShareState(DEMO, state)).toThrow(/never put in a URL/);
  });

  it('shares a built-in example by id instead', () => {
    const state = {
      ...DEMO.defaults,
      input: { ...DEMO.defaults.input, exampleId: 'common-1' },
    };
    expect(decodeShareState(DEMO, encodeShareState(DEMO, state))).toStrictEqual(state);
  });
});

describe('defineShareState', () => {
  it('rejects defaults that do not match the schema', () => {
    expect(() =>
      defineShareState({
        m: 'bad',
        v: 1,
        input: z.object({ n: z.number().check(z.gte(10)) }),
        defaults: { seed: 0, step: 0, input: { n: 1 } },
      }),
    ).toThrow(/defaults are invalid/);
  });

  it('rejects an invalid state on encode', () => {
    expect(() => encodeShareState(DEMO, { ...DEMO.defaults, step: -1 })).toThrow(
      /invalid/,
    );
  });
});

describe('SHARE_STATES registry', () => {
  it('has one branch per module', () => {
    const slugs = SHARE_STATES.map((definition) => definition.m);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('round-trips every module’s defaults through a link', () => {
    for (const definition of [...SHARE_STATES, ...REGISTRY_SHAPE]) {
      const encoded = encodeShareState(definition, definition.defaults);
      expect(encoded, definition.m).not.toBeNull();
      expect(decodeShareState(definition, encoded)).toStrictEqual(definition.defaults);
    }
  });
});
