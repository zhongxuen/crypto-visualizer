/**
 * The scenario catalogue: every built-in run the product can show.
 *
 * `tests/determinism.test.ts` runs each one twice and requires deep-equal results, and
 * `tests/citations.test.ts` requires every event in each to cite something that resolves.
 * Both pass on an empty catalogue and gain coverage as modules land.
 *
 * APPEND-ONLY. An algorithm exports its own `Scenario[]` from `src/core/<algo>/` and adds
 * one import line and one spread line here. Merge conflicts are resolved by keeping both
 * sides (CLAUDE.md, parallel-agent rules).
 */

import { AES_SCENARIOS } from './aes/scenarios';
import type { CryptoEvent } from './events/types';
import { HMAC_SCENARIOS } from './hmac/scenarios';
import { KDF_SCENARIOS } from './kdf/scenarios';
import { RSA_SCENARIOS } from './rsa/scenarios';
import { SHA256_SCENARIOS } from './sha256/scenarios';
import type { SimResult } from './sim/result';
import { XOR_SCENARIOS } from './xor/scenarios';

export interface Scenario {
  /** Unique across the catalogue, `<algo>.<name>`, e.g. `'aes.fips197-appendix-b'`. */
  id: string;
  /** Deterministic: no arguments, no clock, no unseeded randomness. */
  run: () => SimResult<CryptoEvent>;
}

export const SCENARIOS: readonly Scenario[] = [
  ...XOR_SCENARIOS,
  ...SHA256_SCENARIOS,
  ...HMAC_SCENARIOS,
  ...KDF_SCENARIOS,
  ...AES_SCENARIOS,
  ...RSA_SCENARIOS,
];
