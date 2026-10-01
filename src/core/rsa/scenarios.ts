import type { Scenario } from '../scenarios';
import type { RsaKeyInput } from './keygen';
import { rsaKeyRun } from './keygen';
import { rsaMalleabilityRun } from './malleability';
import { rsaEncryptRun } from './rsa';
import { rsaSignRun } from './sign';
import { RSA_DEFAULT_SEED, RSA_EXAMPLE, RSA_PAPER_INPUT } from './examples';

export { RSA_DEFAULT_SEED, RSA_EXAMPLE, RSA_PAPER_INPUT } from './examples';

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
