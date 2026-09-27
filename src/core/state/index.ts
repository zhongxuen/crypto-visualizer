/**
 * The share-state registry: every module's branch of the `?s=` union.
 *
 * APPEND-ONLY. A module defines its branch with `defineShareState` in
 * `src/core/<algo>/state.ts` and adds one import line and one entry line here. Merge
 * conflicts are resolved by keeping both sides (CLAUDE.md, parallel-agent rules).
 * `src/core/state/state.test.ts` checks every entry: unique `m`, and defaults that
 * round-trip through a link.
 */

import { AES_SHARE_STATE } from '../aes/state';
import { PASSWORDS_SHARE_STATE } from '../kdf/state';
import { RSA_SHARE_STATE } from '../rsa/state';
import { HASHING_SHARE_STATE } from '../sha256/state';
import { XOR_SHARE_STATE } from '../xor/state';
import type { ModuleShareState } from './schema';

export const SHARE_STATES: readonly ModuleShareState[] = [
  XOR_SHARE_STATE,
  HASHING_SHARE_STATE,
  PASSWORDS_SHARE_STATE,
  AES_SHARE_STATE,
  RSA_SHARE_STATE,
];

export {
  defineShareState,
  findSecretKeys,
  SEED_SCHEMA,
  STEP_SCHEMA,
  type ModuleShareState,
  type ShareStateBase,
} from './schema';
export {
  decodeShareState,
  encodeShareState,
  MAX_SHARE_STATE_LENGTH,
  SHARE_PARAM,
  shareStateFromSearch,
  shareStateToSearch,
} from './shareState';
