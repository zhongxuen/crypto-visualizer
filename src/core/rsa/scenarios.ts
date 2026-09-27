import type { Scenario } from '../scenarios';
import type { RsaKeyInput } from './keygen';
import { rsaKeyRun } from './keygen';
import { rsaMalleabilityRun } from './malleability';
import { rsaEncryptRun } from './rsa';
import { rsaSignRun } from './sign';

/**
 * The hand-worked example: p = 61, q = 53, e = 17 gives n = 3233, φ(n) = 3120 and
 * d = 2753, and m = 65 encrypts to c = 2790.
 */
export const RSA_EXAMPLE = {
  p: 61n,
  q: 53n,
  e: 17n,
  n: 3233n,
  phi: 3120n,
  d: 2753n,
  m: 65n,
  c: 2790n,
  text: 'Pay Bob 10',
} as const;

/** The default seed for realistic-mode primes. */
export const RSA_DEFAULT_SEED = 1;

export const RSA_PAPER_INPUT: RsaKeyInput = {
  mode: 'paper',
  p: RSA_EXAMPLE.p,
  q: RSA_EXAMPLE.q,
  e: RSA_EXAMPLE.e,
  seed: RSA_DEFAULT_SEED,
};

const REALISTIC: RsaKeyInput = { mode: 'realistic', bits: 512, seed: RSA_DEFAULT_SEED };

export const RSA_SCENARIOS: readonly Scenario[] = [
  { id: 'rsa.keygen-61-53-17', run: () => rsaKeyRun(RSA_PAPER_INPUT) },
  { id: 'rsa.encrypt-65', run: () => rsaEncryptRun(RSA_PAPER_INPUT, RSA_EXAMPLE.m) },
  { id: 'rsa.sign', run: () => rsaSignRun(RSA_PAPER_INPUT, RSA_EXAMPLE.text) },
  {
    id: 'rsa.malleability',
    run: () => rsaMalleabilityRun(RSA_PAPER_INPUT, RSA_EXAMPLE.m),
  },
  { id: 'rsa.keygen-paper-seeded', run: () => rsaKeyRun({ mode: 'paper', seed: 42 }) },
  { id: 'rsa.keygen-realistic', run: () => rsaKeyRun(REALISTIC) },
  { id: 'rsa.encrypt-realistic', run: () => rsaEncryptRun(REALISTIC, RSA_EXAMPLE.m) },
  { id: 'rsa.sign-realistic', run: () => rsaSignRun(REALISTIC, RSA_EXAMPLE.text) },
];
