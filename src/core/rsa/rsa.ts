/**
 * Textbook RSA encryption and decryption (RFC 8017 §5.1.1 RSAEP and §5.1.2 RSADP):
 * c = mᵉ mod n and m = cᵈ mod n, with no padding. Paper mode steps every bit of
 * square-and-multiply; realistic mode shows each exponentiation as one summary step.
 *
 * Unpadded RSA is deterministic and malleable (see `malleability.ts`). Real systems use
 * OAEP, which this project describes but does not implement.
 */

import { createRun, type RunBuilder } from '../events/builder';
import type { CitationId } from '../citations/types';
import type { SimResult } from '../sim/result';
import { modPow, modPowTrace } from './bigmath';
import type { RsaEvent, RsaMode, RsaPowOp } from './events';
import { emitKeyPair, generateKey, type RsaKey, type RsaKeyInput } from './keygen';

/** RSAEP: c = mᵉ mod n. Throws unless 0 ≤ m < n. */
export function rsaEncrypt(key: Pick<RsaKey, 'n' | 'e'>, m: bigint): bigint {
  if (m < 0n || m >= key.n) throw new RangeError('message representative out of range');
  return modPow(m, key.e, key.n);
}

/** RSADP: m = cᵈ mod n. Throws unless 0 ≤ c < n. */
export function rsaDecrypt(key: Pick<RsaKey, 'n' | 'd'>, c: bigint): bigint {
  if (c < 0n || c >= key.n)
    throw new RangeError('ciphertext representative out of range');
  return modPow(c, key.d, key.n);
}

/** Why m can't be encrypted under modulus n, or `null`. */
export function messageProblem(m: bigint | undefined, n: bigint): string | null {
  if (m === undefined) return 'Type a whole number to encrypt.';
  if (m < 0n) return 'The message must be 0 or more.';
  if (m >= n) return `The message must be less than n = ${n}.`;
  return null;
}

const POW: Record<RsaPowOp, { citation: CitationId; name: string; formula: string }> = {
  encrypt: { citation: 'rfc8017.5.1.1', name: 'Encrypt', formula: 'c = mᵉ mod n' },
  decrypt: { citation: 'rfc8017.5.1.2', name: 'Decrypt', formula: 'm = cᵈ mod n' },
  sign: { citation: 'rfc8017.5.2.1', name: 'Sign', formula: 's = hᵈ mod n' },
  verify: { citation: 'rfc8017.5.2.2', name: 'Verify', formula: 'h = sᵉ mod n' },
};

const digits = (x: bigint) => x.toString().length;

/**
 * `base^exp mod n` as steps: one per exponent bit then the result (paper), or a single
 * summary (realistic). Returns the result.
 */
export function emitPow(
  run: RunBuilder<RsaEvent>,
  {
    op,
    base,
    exp,
    n,
    mode,
    expected,
    resultLabel,
  }: {
    op: RsaPowOp;
    base: bigint;
    exp: bigint;
    n: bigint;
    mode: RsaMode;
    expected?: bigint;
    resultLabel: (result: bigint) => string;
  },
): bigint {
  const { result, rows } = modPowTrace(base, exp, n);
  const { citation, formula } = POW[op];
  const common = { op, base: String(base), exp: String(exp), n: String(n) };
  const check =
    expected === undefined ? {} : { expected: String(expected), ok: result === expected };

  if (mode === 'paper') {
    const expBits = exp.toString(2);
    const view = rows.map((r) => ({
      bit: r.bit,
      before: String(r.before),
      squared: String(r.squared),
      after: String(r.after),
    }));
    rows.forEach((row, i) => {
      const square = `${row.before}² mod ${n} = ${row.squared}`;
      run.step({
        kind: 'rsa.powStep',
        id: `rsa.${op}.bit${i}`,
        label: row.bit
          ? `Bit ${i + 1} of ${rows.length} is 1: square, ${square}, then multiply, × ${base} mod ${n} = ${row.after}.`
          : `Bit ${i + 1} of ${rows.length} is 0: square only, ${square}.`,
        detail: `${formula}, exponent ${exp} = ${expBits} in binary. Square-and-multiply reads the exponent from the top bit: square the running value for every bit, and multiply by the base when the bit is 1. ${rows.length} bits take ${rows.length} squarings and ${expBits.split('1').length - 1} multiplications instead of ${exp - 1n} multiplications.`,
        citation: 'hac.14.6.1',
        ...common,
        expBits,
        row: i,
        rows: view,
      });
    });
    run.step({
      kind: 'rsa.powResult',
      id: `rsa.${op}.result`,
      label: resultLabel(result),
      detail: `${formula}. Each intermediate value was reduced mod n, so no number in the working got bigger than n².`,
      citation,
      ...common,
      result: String(result),
      ...check,
    });
    return result;
  }

  const multiplications = rows.filter((r) => r.bit === 1).length;
  run.step({
    kind: 'rsa.powResult',
    id: `rsa.${op}.result`,
    label: resultLabel(result),
    detail: `${formula}, computed in one go: a ${digits(exp)}-digit exponent, ${rows.length} squarings and ${multiplications} multiplications of numbers up to ${digits(n)} digits. Every step works the same way as in paper mode; there are just too many to show.`,
    citation,
    ...common,
    result: String(result),
    summary: {
      squarings: rows.length,
      multiplications,
      digits: {
        base: digits(base),
        exp: digits(exp),
        n: digits(n),
        result: digits(result),
      },
    },
    ...check,
  });
  return result;
}

/** The encrypt-and-decrypt chapter: key, c = mᵉ mod n, then m = cᵈ mod n. */
export function rsaEncryptRun(input: RsaKeyInput, m: bigint): SimResult<RsaEvent> {
  const { key } = generateKey(input);
  const problem = messageProblem(m, key.n);
  if (problem) throw new RangeError(problem);
  const run = createRun<RsaEvent>();

  run.group('Key', () => emitKeyPair(run, key, 'rsa.enc.key'), {
    id: 'key',
    description: 'The key pair from the first chapter.',
  });

  let c = 0n;
  run.group(
    'Encrypt',
    () => {
      run.step({
        kind: 'rsa.message',
        id: 'rsa.enc.m',
        label: `The message is the number m = ${m}, which must be less than n = ${key.n}.`,
        detail:
          'RSA encrypts a number, not text. Text is first turned into a number (and, in real use, padded). m has to be below n because everything is computed mod n: a bigger m would come back as m mod n.',
        citation: 'rfc8017.5.1.1',
        m: String(m),
        n: String(key.n),
      });
      c = emitPow(run, {
        op: 'encrypt',
        base: m,
        exp: key.e,
        n: key.n,
        mode: key.mode,
        resultLabel: (r) => `Ciphertext c = ${m}^${key.e} mod ${key.n} = ${r}.`,
      });
    },
    { id: 'encrypt', description: 'c = mᵉ mod n with the public key.' },
  );

  run.group(
    'Decrypt',
    () => {
      emitPow(run, {
        op: 'decrypt',
        base: c,
        exp: key.d,
        n: key.n,
        mode: key.mode,
        expected: m,
        resultLabel: (r) =>
          `Decrypted m = ${c}^${key.d} mod ${key.n} = ${r}${r === m ? ', the original message.' : '.'}`,
      });
    },
    { id: 'decrypt', description: 'm = cᵈ mod n with the private key.' },
  );

  return run.finish();
}
