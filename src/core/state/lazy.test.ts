import { describe, expect, it } from 'vitest';

import { AES_SHARE } from '../aes/share';
import { DH_SHARE } from '../dh/share';
import { PASSWORDS_SHARE } from '../kdf/share';
import { RSA_SHARE } from '../rsa/share';
import { HASHING_SHARE } from '../sha256/share';
import { XOR_SHARE } from '../xor/share';
import { SHARE_STATES } from './index';
import type { LazyShareState } from './schema';

/**
 * Each module's page holds a `LazyShareState` (zod-free) and loads the full definition
 * only when a link is read. The two must describe the same state, or a page would render
 * defaults its own schema rejects.
 */
const LAZY: readonly LazyShareState[] = [
  XOR_SHARE,
  HASHING_SHARE,
  PASSWORDS_SHARE,
  AES_SHARE,
  RSA_SHARE,
  DH_SHARE,
] as LazyShareState[];

describe('lazy share states', () => {
  it('cover every registered share state', () => {
    expect(LAZY.map((lazy) => lazy.m).sort()).toEqual(
      SHARE_STATES.map((full) => full.m).sort(),
    );
  });

  for (const lazy of LAZY) {
    it(`${lazy.m}: load() resolves to the registered definition, with the same defaults`, async () => {
      const full = await lazy.load();
      expect(SHARE_STATES).toContain(full);
      expect(full.m).toBe(lazy.m);
      expect(full.v).toBe(lazy.v);
      expect(full.defaults).toEqual(lazy.defaults);
      expect(full.schema.safeParse(lazy.defaults).success).toBe(true);
    });
  }
});
