import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { encodeShareState, findSecretKeys } from '../state';
import {
  BENCHMARK,
  formatDuration,
  formatRate,
  PASSWORD_SPACES,
  schemeRates,
  secondsToExhaust,
} from './costModel';
import { COMMON_PASSWORDS } from './data/commonPasswords';
import type { KdfEvent } from './events';
import {
  buildLookupTable,
  EXAMPLE_USERS,
  hashPassword,
  lookup,
  passwordTableRun,
  saltFor,
} from './lookupTable';
import { groupDigits } from './pbkdf2';
import { PASSWORDS_SHARE_STATE } from './state';

describe('common password list', () => {
  it('has 200 unique entries, most common first', () => {
    expect(COMMON_PASSWORDS).toHaveLength(200);
    expect(new Set(COMMON_PASSWORDS).size).toBe(200);
    expect(COMMON_PASSWORDS.slice(0, 3)).toEqual(['password', '123456', '12345678']);
  });
});

describe('lookup table', () => {
  it('hashes with SHA-256 (checked against node:crypto)', () => {
    expect(hashPassword('sunshine')).toEqual(
      Array.from(createHash('sha256').update('sunshine').digest()),
    );
    const salt = saltFor('alice', 1);
    expect(hashPassword('sunshine', salt)).toEqual(
      Array.from(
        createHash('sha256')
          .update(Buffer.concat([Buffer.from(salt), Buffer.from('sunshine')]))
          .digest(),
      ),
    );
  });

  it('hits for unsalted hashes and misses for salted ones', () => {
    const table = buildLookupTable();
    expect(lookup(table, hashPassword('sunshine'))).toBe('sunshine');
    expect(lookup(table, hashPassword('sunshine', saltFor('alice', 1)))).toBeUndefined();

    const lookups = (seed: number | null) =>
      passwordTableRun({ seed }).events.flatMap((e) =>
        e.kind === 'kdf.lookup' ? [e] : [],
      );
    const unsalted = lookups(null);
    expect(unsalted.map((e) => [e.name, e.hit])).toEqual([
      ['alice', true],
      ['bob', true],
      ['carol', true],
      ['dan', true],
      ['erin', false],
    ]);
    expect(unsalted[0].found).toBe('sunshine');
    expect(lookups(1).every((e) => !e.hit)).toBe(true);
  });

  it('shows equal hashes for a shared password only without a salt', () => {
    const collision = (seed: number | null) =>
      passwordTableRun({ seed }).events.find(
        (e) => e.kind === 'kdf.collision',
      ) as Extract<KdfEvent, { kind: 'kdf.collision' }>;
    expect(collision(null).equal).toBe(true);
    expect(collision(null).names).toEqual(['alice', 'carol']);
    expect(collision(1).equal).toBe(false);
  });

  it('draws 16-byte salts per user, deterministically', () => {
    expect(saltFor('alice', 1)).toHaveLength(16);
    expect(saltFor('alice', 1)).toEqual(saltFor('alice', 1));
    expect(saltFor('alice', 1)).not.toEqual(saltFor('carol', 1));
    expect(EXAMPLE_USERS).toHaveLength(5);
  });

  it('says what a real rainbow table is', () => {
    const table = passwordTableRun({ seed: null }).events.find(
      (e) => e.kind === 'kdf.table',
    )!;
    expect(table.detail).toMatch(/rainbow table/);
    expect(table.citation).toBe('oechslin2003');
  });
});

describe('cost model', () => {
  it('uses the benchmark rates at the benchmark settings', () => {
    const rates = schemeRates({
      pbkdf2Iterations: 999,
      bcryptCost: 5,
      argon2MemoryMiB: 16,
    });
    expect(rates.map((r) => r.perGpu)).toEqual([
      BENCHMARK.sha256,
      BENCHMARK.pbkdf2.rate,
      BENCHMARK.bcrypt.rate,
      BENCHMARK.scrypt.rate,
    ]);
  });

  it('scales with the work: 10× iterations is 10× slower, +1 bcrypt cost is 2×', () => {
    const base = schemeRates({
      pbkdf2Iterations: 1000,
      bcryptCost: 10,
      argon2MemoryMiB: 64,
    });
    const more = schemeRates({
      pbkdf2Iterations: 10_000,
      bcryptCost: 11,
      argon2MemoryMiB: 128,
    });
    expect(base[1].perGpu / more[1].perGpu).toBeCloseTo(10);
    expect(base[2].perGpu / more[2].perGpu).toBeCloseTo(2);
    expect(base[3].perGpu / more[3].perGpu).toBeCloseTo(2);
  });

  it('gives every rate a source, and marks the Argon2 figure as an estimate', () => {
    for (const rate of schemeRates()) {
      expect(rate.citation).toBe('hashcat-rtx4090');
      expect(rate.basis.length).toBeGreaterThan(10);
    }
    expect(schemeRates().find((r) => r.id === 'argon2id')!.estimate).toBe(true);
  });

  it('computes and formats time to exhaust a space', () => {
    expect(secondsToExhaust(200, 100)).toBe(2);
    expect(() => secondsToExhaust(1, 0)).toThrow(RangeError);
    expect(() =>
      schemeRates({ pbkdf2Iterations: 0, bcryptCost: 12, argon2MemoryMiB: 1 }),
    ).toThrow();
    expect(formatDuration(0.001)).toBe('under a second');
    expect(formatDuration(90)).toBe('1.5 minutes');
    expect(formatDuration(3600)).toBe('1 hour');
    expect(formatDuration(3 * 365.25 * 24 * 3600)).toBe('3 years');
    expect(formatDuration(4.2e9 * 365.25 * 24 * 3600)).toBe('4.2 × 10^9 years');
    expect(formatDuration(Infinity)).toBe('forever');
    expect(formatRate(21_975.5e6)).toBe('22 billion');
    expect(formatRate(8_865.7e3)).toBe('8.9 million');
    expect(formatRate(1437.5)).toBe('1.4 thousand');
    expect(formatRate(3)).toBe('3.0');
    expect(PASSWORD_SPACES.find((s) => s.id === 'lower8')!.size).toBe(208_827_064_576);
    expect(groupDigits(600000)).toBe('600,000');
  });
});

describe('passwords share state', () => {
  it('carries only a built-in example id, never a password', () => {
    expect(findSecretKeys(PASSWORDS_SHARE_STATE.defaults)).toEqual([]);
    const withPassword = {
      ...PASSWORDS_SHARE_STATE.defaults,
      input: { ...PASSWORDS_SHARE_STATE.defaults.input, password: 'hunter2' },
    };
    expect(() => encodeShareState(PASSWORDS_SHARE_STATE, withPassword)).toThrow(
      /never put in a URL/,
    );
  });
});
