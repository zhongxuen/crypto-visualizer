import { utf8Encode } from '../bytes/utf8';
import type { Scenario } from '../scenarios';
import { avalancheRun } from './avalanche';
import { sha256Run } from './run';

/** FIPS 180-4 example messages (NIST's SHA-256 examples, one and two blocks). */
export const SHA256_EXAMPLES = {
  abc: 'abc',
  twoBlock: 'abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq',
} as const;

export const SHA256_SCENARIOS: readonly Scenario[] = [
  { id: 'sha256.abc', run: () => sha256Run(utf8Encode(SHA256_EXAMPLES.abc)) },
  { id: 'sha256.two-block', run: () => sha256Run(utf8Encode(SHA256_EXAMPLES.twoBlock)) },
  { id: 'sha256.avalanche', run: () => avalancheRun(utf8Encode('hello'), 7) },
];
