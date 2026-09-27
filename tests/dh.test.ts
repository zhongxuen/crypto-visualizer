import { describe, expect, it } from 'vitest';

import {
  bruteForceLog,
  combine,
  DEFAULT_PAINTS,
  DH_GROUPS,
  DH_SHARE_STATE,
  dhEveRun,
  dhExchange,
  dhExchangeRun,
  dhMitm,
  dhMitmRun,
  dhPaintRun,
  EVE_STEPPED_TRIES,
  getGroup,
  hexToOklab,
  oklabToHex,
  privateRange,
  recipeHex,
  REAL_GROUPS,
  TOY_GROUPS,
  validatePublic,
  type DhEvent,
  type DhGroupId,
} from '@/core/dh';
import { modPow } from '@/core/rsa';
import { decodeShareState, encodeShareState } from '@/core/state';

/**
 * Diffie-Hellman core (module 6): agreement over 1,000 seeds in every toy group, the
 * order-q generators, Eve's brute force, the MITM secrets, and the paint model.
 */

const of = <K extends DhEvent['kind']>(events: readonly DhEvent[], kind: K) =>
  events.filter((e): e is Extract<DhEvent, { kind: K }> => e.kind === kind);

const toyIds = TOY_GROUPS.map((g) => g.id as DhGroupId);

/** Primality by trial division, independent of the core. */
function isPrime(n: bigint): boolean {
  if (n < 2n) return false;
  for (let d = 2n; d * d <= n; d += 1n) if (n % d === 0n) return false;
  return true;
}

describe('groups', () => {
  it.each(TOY_GROUPS.map((g) => [g.name, g] as const))(
    '%s is a safe prime with a generator of the order-q subgroup',
    (_name, group) => {
      const { p, q, g } = group;
      expect(isPrime(p)).toBe(true);
      expect(isPrime(q)).toBe(true);
      expect(p).toBe(2n * q + 1n);
      expect(g).not.toBe(1n);
      expect(modPow(g, q, p)).toBe(1n);
      // q is prime, so g ≠ 1 with g^q = 1 has order exactly q. Check it by counting.
      const seen = new Set<bigint>();
      let v = 1n;
      for (let i = 0n; i < q; i += 1n) {
        seen.add(v);
        v = (v * g) % p;
      }
      expect(v).toBe(1n);
      expect(seen.size).toBe(Number(q));
    },
  );

  it('uses a generator of the order-q subgroup in the 2048-bit group too', () => {
    const { p, q, g } = getGroup('modp2048');
    expect(p).toBe(2n * q + 1n);
    expect(g).toBe(2n);
    expect(modPow(g, q, p)).toBe(1n);
    expect(p.toString(2)).toHaveLength(2048);
  });

  it('describes the real groups by size: 2048 bits, 617 digits', () => {
    expect(REAL_GROUPS.map((g) => [g.bits, g.digits])).toEqual([
      [2048, 617],
      [2048, 617],
    ]);
  });

  it('lists the subgroup for the modular clock when p ≤ 60 only', () => {
    const p23 = of(dhExchangeRun({ group: 'p23', seed: 1 }).events, 'dh.params')[0];
    expect(p23.subgroup).toEqual([
      '1',
      '2',
      '4',
      '8',
      '16',
      '9',
      '18',
      '13',
      '3',
      '6',
      '12',
    ]);
    expect(p23.gq).toBe('1');
    const p467 = of(dhExchangeRun({ group: 'p467', seed: 1 }).events, 'dh.params')[0];
    expect(p467.subgroup).toBeUndefined();
  });
});

describe('the exchange', () => {
  it.each(toyIds)('agrees on the secret for 1,000 seeds in %s', (id) => {
    const group = getGroup(id);
    const { min, max } = privateRange(group);
    for (let seed = 0; seed < 1000; seed += 1) {
      const ex = dhExchange({ group: id, seed });
      expect(ex.a >= min && ex.a <= max).toBe(true);
      expect(ex.b >= min && ex.b <= max).toBe(true);
      expect(ex.aliceSecret).toBe(ex.bobSecret);
      expect(ex.aliceSecret).toBe(modPow(group.g, ex.a * ex.b, group.p));
      expect(validatePublic(group, ex.A)).toBe(true);
      expect(validatePublic(group, ex.B)).toBe(true);
    }
  });

  it('agrees in the 2048-bit group', () => {
    for (let seed = 0; seed < 5; seed += 1) {
      const ex = dhExchange({ group: 'modp2048', seed });
      expect(ex.aliceSecret).toBe(ex.bobSecret);
    }
  });

  it('is deterministic per seed and differs across seeds', () => {
    expect(dhExchange({ group: 'p2039', seed: 3 })).toStrictEqual(
      dhExchange({ group: 'p2039', seed: 3 }),
    );
    const as = new Set(
      Array.from({ length: 50 }, (_, s) => dhExchange({ group: 'p2039', seed: s }).a),
    );
    expect(as.size).toBeGreaterThan(40);
  });

  it('rejects private keys outside [2, q − 2]', () => {
    expect(() => dhExchange({ group: 'p23', seed: 1, a: 1n })).toThrow(RangeError);
    expect(() => dhExchange({ group: 'p23', seed: 1, b: 10n })).toThrow(RangeError);
    expect(() => dhExchange({ group: 'p23', seed: 1, a: 9n, b: 2n })).not.toThrow();
  });

  it('rejects a share outside the subgroup (RFC 2631 §2.1.5)', () => {
    const group = getGroup('p23');
    expect(validatePublic(group, 22n)).toBe(false); // order 2
    expect(validatePublic(group, 5n)).toBe(false); // a non-square, order 22
    expect(validatePublic(group, 1n)).toBe(false);
    expect(validatePublic(group, 4n)).toBe(true);
  });

  it('steps a worked example: p = 23, g = 2, a = 6, b = 9', () => {
    const { events } = dhExchangeRun({ group: 'p23', seed: 1, a: 6n, b: 9n });
    const keys = of(events, 'dh.publicKey');
    expect(keys.map((k) => [k.name, k.value])).toEqual([
      ['A', '18'], // 2^6 = 64 = 18 mod 23
      ['B', '6'], // 2^9 = 512 = 6 mod 23
    ]);
    const shared = of(events, 'dh.shared');
    expect(shared.map((s) => s.value)).toEqual(['12', '12']); // 2^54 = 2^(54 mod 11) = 2^10 mod 23
    expect(of(events, 'dh.agree')[0]).toMatchObject({ same: true, alice: '12' });
    // 6 = 110 and 9 = 1001: one step per exponent bit, for each exponentiation.
    const steps = of(events, 'dh.powStep');
    expect(
      steps.filter((s) => s.actor === 'alice' && s.purpose === 'public'),
    ).toHaveLength(3);
    expect(steps.filter((s) => s.actor === 'bob' && s.purpose === 'public')).toHaveLength(
      4,
    );
    expect(of(events, 'dh.validate').every((v) => v.ok && v.check === '1')).toBe(true);
    expect(of(events, 'dh.private').map((p) => p.source)).toEqual(['user', 'user']);
  });

  it('summarises the 2048-bit exponentiations instead of stepping them', () => {
    const { events } = dhExchangeRun({ group: 'modp2048', seed: 1 });
    expect(of(events, 'dh.powStep')).toHaveLength(0);
    for (const e of [...of(events, 'dh.publicKey'), ...of(events, 'dh.shared')]) {
      expect(e.summary?.digits.p).toBe(617);
    }
    expect(of(events, 'dh.agree')[0].same).toBe(true);
  });

  it('ends with the real groups and the described X25519 event', () => {
    const { events, phases } = dhExchangeRun({ group: 'p23', seed: 1 });
    expect(events.slice(-2).map((e) => e.kind)).toEqual(['dh.realGroups', 'dh.x25519']);
    expect(of(events, 'dh.x25519')[0]).toMatchObject({
      keyBytes: 32,
      citation: 'rfc7748.6.1',
    });
    expect(phases.map((p) => p.id)).toEqual([
      'params',
      'private',
      'alice-public',
      'bob-public',
      'exchange',
      'shared',
      'practice',
    ]);
  });
});

describe('Eve', () => {
  it.each(toyIds)('brute-forces the discrete log in %s', (id) => {
    const group = getGroup(id);
    for (let seed = 0; seed < 50; seed += 1) {
      const ex = dhExchange({ group: id, seed });
      expect(bruteForceLog(group, ex.A)).toBe(ex.a);
    }
  });

  it('sees only public values', () => {
    const { events } = dhEveRun({ group: 'p23', seed: 1 });
    const [view] = of(events, 'dh.eveView');
    expect(Object.keys(view)).not.toContain('a');
    expect(Object.keys(view)).not.toContain('b');
  });

  it('steps each guess in a small search, and finds a', () => {
    const ex = dhExchange({ group: 'p23', seed: 1, a: 6n, b: 9n });
    const { events } = dhEveRun({ group: 'p23', seed: 1, a: 6n, b: 9n });
    const tries = of(events, 'dh.eveTry');
    expect(tries.map((t) => t.x)).toEqual(['1', '2', '3', '4', '5', '6']);
    expect(tries.map((t) => t.value)).toEqual(['2', '4', '8', '16', '9', '18']);
    expect(tries.map((t) => t.match)).toEqual([false, false, false, false, false, true]);
    expect(of(events, 'dh.eveSkip')).toHaveLength(0);
    const [found] = of(events, 'dh.eveFound');
    expect(found).toMatchObject({ x: '6', shared: String(ex.aliceSecret), ok: true });
  });

  it('shows a long search as stepped guesses, one skip, then the match', () => {
    for (let seed = 0; seed < 30; seed += 1) {
      const input = { group: 'p2039' as const, seed };
      const ex = dhExchange(input);
      const { events } = dhEveRun(input);
      const tries = of(events, 'dh.eveTry');
      const skips = of(events, 'dh.eveSkip');
      const [found] = of(events, 'dh.eveFound');
      expect(found.x).toBe(String(ex.a));
      expect(found.ok).toBe(true);
      expect(tries[tries.length - 1]).toMatchObject({ x: String(ex.a), match: true });
      if (ex.a > BigInt(EVE_STEPPED_TRIES) + 1n) {
        expect(tries).toHaveLength(EVE_STEPPED_TRIES + 1);
        expect(skips).toHaveLength(1);
        expect(BigInt(skips[0].count)).toBe(ex.a - BigInt(EVE_STEPPED_TRIES) - 1n);
      } else {
        expect(tries).toHaveLength(Number(ex.a));
        expect(skips).toHaveLength(0);
      }
    }
  });

  it('shows the search growing with p, to hundreds of digits', () => {
    const { events } = dhEveRun({ group: 'p23', seed: 1 });
    const [growth] = of(events, 'dh.eveGrowth');
    expect(growth.rows.map((r) => r.worstCase)).toEqual([
      ...TOY_GROUPS.map((g) => String(g.q - 1n)),
      String(getGroup('modp2048').q - 1n),
    ]);
    const digits = growth.rows.map((r) => r.worstCaseDigits);
    expect([...digits].sort((a, b) => a - b)).toEqual(digits);
    expect(growth.rows.at(-1)).toMatchObject({ bits: 2048, pDigits: 617 });
    expect(growth.rows.at(-1)!.yearsDigits).toBeGreaterThan(590);
    expect(growth.rows[0].years).toBe('0');
  });

  it('has no brute force for the 2048-bit group, only the view and the growth', () => {
    const { events } = dhEveRun({ group: 'modp2048', seed: 1 });
    expect(events.map((e) => e.kind)).toEqual([
      'dh.params',
      'dh.eveView',
      'dh.eveGrowth',
    ]);
  });
});

describe('Mallory in the middle', () => {
  it.each([...toyIds, 'modp2048' as const])(
    "Alice's and Bob's secrets differ and each equals one of Mallory's in %s",
    (id) => {
      const seeds = id === 'modp2048' ? 3 : 300;
      for (let seed = 0; seed < seeds; seed += 1) {
        const x = dhMitm({ group: id, seed });
        expect(x.aliceSecret).not.toBe(x.bobSecret);
        expect(x.aliceSecret).toBe(x.malloryWithAlice);
        expect(x.bobSecret).toBe(x.malloryWithBob);
      }
    },
  );

  it('relays the message: Mallory reads it and Bob gets it unchanged', () => {
    const { events } = dhMitmRun({ group: 'p467', seed: 1 }, 42n);
    const msgs = of(events, 'dh.mitmMessage');
    expect(msgs.map((m) => [m.actor, m.action])).toEqual([
      ['alice', 'encrypt'],
      ['mallory', 'decrypt'],
      ['mallory', 'encrypt'],
      ['bob', 'decrypt'],
    ]);
    expect(msgs[1].output).toBe('42');
    expect(msgs[3].output).toBe('42');
    expect(msgs[0].output).not.toBe(msgs[2].output);
    expect(of(events, 'dh.mitmKeys')[0].same).toBe(false);
    expect(of(events, 'dh.mitmIntercept')).toHaveLength(2);
    expect(events.at(-1)).toMatchObject({
      kind: 'dh.mitmFix',
      citation: 'rfc8446.4.4.3',
    });
  });

  it('rejects a message outside [1, p − 1]', () => {
    expect(() => dhMitmRun({ group: 'p23', seed: 1 }, 23n)).toThrow(RangeError);
    expect(() => dhMitmRun({ group: 'p23', seed: 1 }, 0n)).toThrow(RangeError);
  });
});

describe('the paint model', () => {
  it('round-trips sRGB through OKLab', () => {
    for (const hex of [
      '#000000',
      '#ffffff',
      '#f2c230',
      '#d7263d',
      '#1b6ca8',
      '#7f7f7f',
    ]) {
      expect(oklabToHex(hexToOklab(hex))).toBe(hex);
    }
  });

  it('matches OKLab reference values for white and black', () => {
    const white = hexToOklab('#ffffff');
    expect(white[0]).toBeCloseTo(1, 4);
    expect(white[1]).toBeCloseTo(0, 4);
    expect(white[2]).toBeCloseTo(0, 4);
    expect(hexToOklab('#000000')).toEqual([0, 0, 0]);
  });

  it('gives the same colour whatever order the paints go in', () => {
    const pots = { x: '#f2c230', y: '#d7263d', z: '#1b6ca8' };
    const xy_z = combine(combine({ x: 1 }, { y: 1 }), { z: 1 });
    const xz_y = combine(combine({ x: 1 }, { z: 1 }), { y: 1 });
    expect(recipeHex(xy_z, pots)).toBe(recipeHex(xz_y, pots));
  });

  it('ends with the same pot on both sides, and Eve’s pot visibly different', () => {
    const { events } = dhPaintRun();
    const [shared] = of(events, 'dh.paintShared');
    expect(shared.same).toBe(true);
    expect(shared.recipe.map((r) => r.parts)).toEqual([1, 1, 1]);
    const [eve] = of(events, 'dh.paintEve');
    expect(eve.colour).not.toBe(shared.alice);
    expect(eve.distance).toBeGreaterThan(0.02);
    expect(eve.recipe.find((r) => r.name === 'common')?.parts).toBe(2);
    expect(events.at(-1)?.kind).toBe('dh.paintLimit');
    expect(of(events, 'dh.paintPot').map((p) => p.colour)).toEqual([
      DEFAULT_PAINTS.common,
      DEFAULT_PAINTS.alice,
      DEFAULT_PAINTS.bob,
    ]);
  });
});

describe('share state', () => {
  it('round-trips the defaults and a toy exchange with chosen keys', () => {
    const state = {
      ...DH_SHARE_STATE.defaults,
      step: 4,
      input: { scene: 'exchange' as const, group: 'p23' as const, a: 6, b: 9 },
    };
    expect(
      decodeShareState(DH_SHARE_STATE, encodeShareState(DH_SHARE_STATE, state)),
    ).toEqual(state);
  });

  it('refuses keys outside the group’s range and keys for the 2048-bit group', () => {
    const bad = [
      { scene: 'exchange', group: 'p23', a: 10 },
      { scene: 'exchange', group: 'modp2048', a: 5 },
      { scene: 'mitm', group: 'p23', msg: 23 },
      { scene: 'exchange', group: 'p99' },
    ];
    for (const input of bad) {
      const parsed = DH_SHARE_STATE.schema.safeParse({
        ...DH_SHARE_STATE.defaults,
        input,
      });
      expect(parsed.success, JSON.stringify(input)).toBe(false);
    }
  });

  it('covers every group', () => {
    expect(DH_GROUPS.map((g) => g.id)).toEqual([
      'p23',
      'p47',
      'p59',
      'p467',
      'p2039',
      'modp2048',
    ]);
  });
});
