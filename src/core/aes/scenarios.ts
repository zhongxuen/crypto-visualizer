import { hexToBytes } from '../bytes/hex';
import { utf8Encode } from '../bytes/utf8';
import type { Scenario } from '../scenarios';
import { avalancheRun, encryptBlock, keyExpansionRun } from './aes128';
import { cbcRun } from './modes/cbc';
import { ctrRun } from './modes/ctr';
import { ecbRun } from './modes/ecb';
import { gcmExplanationRun } from './modes/gcm';
import { penguinRun } from './penguin';

/**
 * The built-in examples. `appendixB` is FIPS 197 Appendix B (whose key is the one
 * expanded in Appendix A.1); `c1` is Appendix C.1 of the 2001 edition, now kept in NIST's
 * "examples with intermediate values".
 */
export const AES_EXAMPLES = {
  appendixB: {
    keyHex: '2b7e151628aed2a6abf7158809cf4f3c',
    ptHex: '3243f6a8885a308d313198a2e0370734',
  },
  c1: {
    keyHex: '000102030405060708090a0b0c0d0e0f',
    ptHex: '00112233445566778899aabbccddeeff',
  },
  /** Two equal 16-byte blocks, so ECB's repeat shows. */
  modesText: 'ATTACK AT DAWN!!ATTACK AT DAWN!!Retreat at dusk.',
} as const;

/** The default seed for IVs and nonces in the built-in runs. */
export const AES_DEFAULT_SEED = 7;

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
