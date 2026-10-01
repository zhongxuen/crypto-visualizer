import { hexToBytes } from '../bytes/hex';
import { utf8Encode } from '../bytes/utf8';
import type { Scenario } from '../scenarios';
import { avalancheRun, encryptBlock, keyExpansionRun } from './aes128';
import { cbcRun } from './modes/cbc';
import { ctrRun } from './modes/ctr';
import { ecbRun } from './modes/ecb';
import { gcmExplanationRun } from './modes/gcm';
import { penguinRun } from './penguin';
import { AES_DEFAULT_SEED, AES_EXAMPLES } from './examples';

export { AES_DEFAULT_SEED, AES_EXAMPLES } from './examples';

const key = () => hexToBytes(AES_EXAMPLES.appendixB.keyHex);
const modesText = () => utf8Encode(AES_EXAMPLES.modesText);

export const AES_SCENARIOS: readonly Scenario[] = [
  { id: 'aes.key-expansion', run: () => keyExpansionRun(key()) },
  {
    id: 'aes.fips197-appendix-b',
    run: () =>
      encryptBlock(key(), hexToBytes(AES_EXAMPLES.appendixB.ptHex), { emit: true })
        .result,
  },
  {
    id: 'aes.fips197-c1',
    run: () =>
      encryptBlock(
        hexToBytes(AES_EXAMPLES.c1.keyHex),
        hexToBytes(AES_EXAMPLES.c1.ptHex),
        {
          emit: true,
        },
      ).result,
  },
  {
    id: 'aes.avalanche',
    run: () => avalancheRun(key(), hexToBytes(AES_EXAMPLES.appendixB.ptHex), 0),
  },
  { id: 'aes.ecb', run: () => ecbRun(key(), modesText()) },
  { id: 'aes.cbc', run: () => cbcRun(key(), modesText(), AES_DEFAULT_SEED) },
  { id: 'aes.ctr', run: () => ctrRun(key(), modesText(), AES_DEFAULT_SEED) },
  { id: 'aes.penguin', run: () => penguinRun(key(), AES_DEFAULT_SEED) },
  { id: 'aes.gcm', run: gcmExplanationRun },
];
