import { describe, expect, it } from 'vitest';

import { createRun } from '../events/builder';
import { emitPow, emitValidate } from './dh';
import { bruteForceLog } from './eavesdropper';
import type { DhEvent } from './events';
import { dhMitmRun } from './mitm';
import { hexToOklab, recipeOklab } from './paint';
import { getGroup, isGroupId, type DhGroupId } from './params';
import { DH_SHARE_STATE } from './state';

/**
 * Diffie-Hellman guards and the branches the honest runs never reach: an unknown group,
 * a share that fails validation, a zero exponent in the 2048-bit summary, a value with no
 * discrete log, bad paint, and user-chosen keys in the MITM chapter. `tests/dh.test.ts`
 * covers the exchanges themselves.
 */

const P23 = getGroup('p23'); // q = 11, g = 2
const MODP = getGroup('modp2048');

describe('groups', () => {
  it('refuses an unknown group id and tells ids apart', () => {
    expect(() => getGroup('p99' as DhGroupId)).toThrow(
      'Unknown Diffie-Hellman group "p99"',
    );
    expect(isGroupId('p23')).toBe(true);
    expect(isGroupId('modp2048')).toBe(true);
    expect(isGroupId('p99')).toBe(false);
  });
});

describe('share validation step', () => {
  function validate(y: bigint, group = P23) {
    const run = createRun<DhEvent>();
    emitValidate(run, 'v', 'bob', 'A', y, group);
    const [event] = run.finish().events;
    return event as Extract<DhEvent, { kind: 'dh.validate' }>;
  }

  it('rejects a toy share outside the subgroup, with the numbers', () => {
    // 5 is not a square mod 23, so 5^11 mod 23 = 22 = −1.
    const event = validate(5n);
    expect(event.ok).toBe(false);
    expect(event.check).toBe('22');
    expect(event.label).toBe('Bob checks A: 5^11 mod 23 = 22, so it is rejected.');
  });

  it('rejects 1 even though 1^q = 1: it is out of range', () => {
    const event = validate(1n);
    expect(event.check).toBe('1');
    expect(event.ok).toBe(false);
  });

  it('rejects a 2048-bit share by name, not by value', () => {
    const event = validate(MODP.p - 1n, MODP);
    expect(event.ok).toBe(false);
    expect(event.label).toBe(
      `Bob checks A: A^q mod p = ${MODP.p - 1n}, so it is rejected.`,
    );
  });
});

describe('2048-bit exponent summary', () => {
  it('counts no squarings and no multiplications for x = 0', () => {
    const run = createRun<DhEvent>();
    const { result, summary } = emitPow(run, {
      id: 'x',
      actor: 'alice',
      purpose: 'public',
      base: MODP.g,
      exp: 0n,
      group: MODP,
    });
    expect(result).toBe(1n);
    expect(summary?.squarings).toBe(0);
    expect(summary?.multiplications).toBe(0);
    expect(run.length).toBe(0);
  });

  it('counts one squaring per bit and one multiplication per 1 bit otherwise', () => {
    const { summary } = emitPow(createRun<DhEvent>(), {
      id: 'x',
      actor: 'alice',
      purpose: 'public',
      base: MODP.g,
      exp: 0b1011n,
      group: MODP,
    });
    expect(summary?.squarings).toBe(4);
    expect(summary?.multiplications).toBe(3);
  });

  it('skips the steps for a toy group when not stepped', () => {
    const run = createRun<DhEvent>();
    const { result, summary } = emitPow(run, {
      id: 'x',
      actor: 'alice',
      purpose: 'public',
      base: P23.g,
      exp: 6n,
      group: P23,
      stepped: false,
    });
    expect(result).toBe(18n); // 2^6 = 64 = 2·23 + 18
    expect(summary).toBeUndefined();
    expect(run.length).toBe(0);
  });
});

describe('brute force', () => {
  it('finds nothing for a value outside the subgroup', () => {
    expect(bruteForceLog(P23, 5n)).toBeNull();
    expect(bruteForceLog(P23, 0n)).toBeNull();
    expect(bruteForceLog(P23, 18n)).toBe(6n);
  });
});

describe('paint guards', () => {
  it('refuses a colour that is not #rrggbb', () => {
    expect(() => hexToOklab('red')).toThrow('Not a #rrggbb colour: red');
    expect(() => hexToOklab('#fff')).toThrow(RangeError);
    expect(() => hexToOklab('#FFAA00')).not.toThrow();
  });

  it('refuses an unknown paint and an empty pot', () => {
    const pots = { red: '#ff0000' };
    expect(() => recipeOklab({ blue: 1 }, pots)).toThrow('No paint called "blue"');
    expect(() => recipeOklab({}, pots)).toThrow('An empty pot has no colour');
    expect(() => recipeOklab({ red: 0 }, pots)).toThrow('An empty pot has no colour');
  });
});

describe('MITM with chosen keys', () => {
  it('marks the user’s a and b as chosen, not drawn from the seed', () => {
    // The default message, 42, doesn't fit below p = 23, so pass one that does.
    const run = dhMitmRun({ group: 'p23', seed: 1, a: 6n, b: 9n }, 5n);
    const privates = (run.events as readonly DhEvent[]).filter(
      (e): e is Extract<DhEvent, { kind: 'dh.private' }> => e.kind === 'dh.private',
    );
    const byName = Object.fromEntries(privates.map((e) => [e.name, e]));
    expect(byName.a.value).toBe('6');
    expect(byName.a.source).toBe('user');
    expect(byName.b.value).toBe('9');
    expect(byName.b.source).toBe('user');
    expect(byName['m₁'].source).toBe('seed');
  });

  it('refuses a message outside [1, p − 1]', () => {
    expect(() => dhMitmRun({ group: 'p23', seed: 1 }, 23n)).toThrow(
      'The message must be between 1 and 22.',
    );
  });
});

describe('share state', () => {
  it('accepts a MITM link with a message inside the group', () => {
    const parsed = DH_SHARE_STATE.schema.safeParse({
      ...DH_SHARE_STATE.defaults,
      input: { scene: 'mitm', group: 'p23', msg: 5 },
    });
    expect(parsed.success).toBe(true);
  });
});
