/**
 * Eve on the public channel: she sees p, g, A and B and nothing else. In a toy group she
 * solves the discrete logarithm by exhaustive search (HAC §3.6.1): try x = 1, 2, 3, …,
 * each g^x mod p one multiplication from the last, until g^x = A. Then Bᵃ mod p is the
 * shared secret. For a 2048-bit group the same search would outlast the universe, which
 * the growth table shows.
 *
 * Exhaustive search is the simplest attack, not the best. Baby-step giant-step and
 * Pollard's rho take about √q steps, and the number field sieve is faster still for
 * finite-field groups; 2048 bits is the size at which all of them stay out of reach.
 */

import { createRun } from '../events/builder';
import { bitLength } from '../rsa/bigmath';
import type { SimResult } from '../sim/result';
import { dhExchange, dhSecret, type DhInput } from './dh';
import type { DhEvent, EveGrowthRow } from './events';
import { emitParams } from './dh';
import { DH_GROUPS, digits, type DhGroup } from './params';

/** Eve's first guesses are one step each; the rest up to the answer are one step. */
export const EVE_STEPPED_TRIES = 12;

/** Guesses a second in the growth table. */
export const TRIES_PER_SECOND = 1_000_000_000n;

const SECONDS_PER_YEAR = 31_557_600n; // Julian year

/** Exhaustive search for x in [1, q − 1] with g^x mod p = y. Returns x, or null. */
export function bruteForceLog(group: DhGroup, y: bigint): bigint | null {
  let value = 1n;
  for (let x = 1n; x < group.q; x += 1n) {
    value = (value * group.g) % group.p;
    if (value === y) return x;
  }
  return null;
}

export function growthRow(group: DhGroup): EveGrowthRow {
  const worstCase = group.q - 1n;
  const years = worstCase / TRIES_PER_SECOND / SECONDS_PER_YEAR;
  return {
    group: group.name,
    groupKind: group.kind,
    bits: bitLength(group.p),
    pDigits: digits(group.p),
    worstCase: String(worstCase),
    worstCaseDigits: digits(worstCase),
    years: String(years),
    yearsDigits: digits(years),
  };
}

/** Eve's chapter: what she sees, the search, the secret, and how the search grows. */
export function dhEveRun(input: DhInput): SimResult<DhEvent> {
  const ex = dhExchange(input);
  const { group, A, B } = ex;
  const toy = group.kind === 'toy';
  const run = createRun<DhEvent>();

  run.group(
    'What Eve sees',
    () => {
      emitParams(run, group, 'dh.eve.params');
      run.step({
        kind: 'dh.eveView',
        id: 'dh.eve.view',
        label: toy
          ? `Eve reads the channel: p = ${group.p}, g = ${group.g}, A = ${A}, B = ${B}. Not a, not b.`
          : 'Eve reads the channel: p, g, A and B, each hundreds of digits long. Not a, not b.',
        detail:
          'To get the secret she needs a or b. Finding a from A = gᵃ mod p is the discrete logarithm problem.',
        citation: 'hac.3.6.1',
        actor: 'eve',
        p: String(group.p),
        g: String(group.g),
        A: String(A),
        B: String(B),
      });
    },
    { id: 'view', description: 'Only the public values.' },
  );

  if (toy) {
    const found = bruteForceLog(group, A);
    if (found === null) throw new Error(`No discrete log of ${A} in ${group.name}`);

    run.group(
      'Brute force',
      () => {
        let value = 1n;
        const tryStep = (x: bigint) => {
          const match = value === A;
          run.step({
            kind: 'dh.eveTry',
            id: `dh.eve.try${x}`,
            label: match
              ? `x = ${x}: ${group.g}^${x} mod ${group.p} = ${value}. That is A.`
              : `x = ${x}: ${group.g}^${x} mod ${group.p} = ${value}, not ${A}.`,
            detail: `Each guess is the previous value times g = ${group.g}, mod ${group.p}: one multiplication per guess, up to q − 1 = ${group.q - 1n} guesses.`,
            citation: 'hac.3.6.1',
            actor: 'eve',
            x: String(x),
            value: String(value),
            target: String(A),
            match,
          });
        };
        const stepped = BigInt(EVE_STEPPED_TRIES);
        for (let x = 1n; x <= found; x += 1n) {
          value = (value * group.g) % group.p;
          if (x <= stepped || x === found) {
            tryStep(x);
          } else if (x === stepped + 1n && found - 1n > stepped) {
            // Everything between the stepped guesses and the answer, as one step.
            const to = found - 1n;
            run.step({
              kind: 'dh.eveSkip',
              id: 'dh.eve.skip',
              label: `x = ${x} to ${to}: ${to - x + 1n} more guesses, none of them A.`,
              detail: 'The same multiplication each time, shown as one step.',
              citation: 'hac.3.6.1',
              actor: 'eve',
              from: String(x),
              to: String(to),
              count: String(to - x + 1n),
            });
          }
        }
      },
      { id: 'search', description: 'Try every exponent until gˣ mod p = A.' },
    );

    const shared = dhSecret(group, B, found);
    run.group(
      'Eve wins',
      () => {
        run.step({
          kind: 'dh.eveFound',
          id: 'dh.eve.found',
          label: `After ${found} guesses Eve knows a = ${found}, and computes B^a mod p = ${shared}.`,
          detail: `The same secret Alice and Bob hold${shared === ex.aliceSecret ? '' : ' (it isn’t, which would be a bug)'}. With p = ${group.p} the search takes at most ${group.q - 1n} guesses: a computer does that in well under a millisecond.`,
          citation: 'hac.3.6.1',
          actor: 'eve',
          x: String(found),
          tries: String(found),
          B: String(B),
          p: String(group.p),
          shared: String(shared),
          ok: shared === ex.aliceSecret,
        });
      },
      { id: 'found', description: 'The discrete log gives Eve the secret.' },
    );
  }

  run.group(
    'Why real p is huge',
    () => {
      const rows = DH_GROUPS.map(growthRow);
      const real = rows[rows.length - 1];
      run.step({
        kind: 'dh.eveGrowth',
        id: 'dh.eve.growth',
        label: `Each extra digit of p multiplies the search by about 10. At 2048 bits it is a ${real.worstCaseDigits}-digit number of guesses.`,
        detail: `At a billion guesses a second the 2048-bit search takes a ${real.yearsDigits}-digit number of years. Better attacks than guessing exist (baby-step giant-step and Pollard's rho need about √q steps, the number field sieve fewer still), and 2048 bits is chosen so that even they are out of reach.`,
        citation: 'hac.3.6.1',
        actor: 'eve',
        rows,
      });
    },
    { id: 'growth', description: 'How the number of guesses grows with p.' },
  );

  return run.finish();
}
