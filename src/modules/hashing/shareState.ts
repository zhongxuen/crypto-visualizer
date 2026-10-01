/**
 * The /hashing share state is defined in core (`src/core/sha256/state.ts`) so the
 * registry test in `src/core/state` covers it. Re-exported here for the module.
 */
export { HASHING_SHARE } from '@/core/sha256/share';
export type { HashingShareState } from '@/core/sha256/state';
