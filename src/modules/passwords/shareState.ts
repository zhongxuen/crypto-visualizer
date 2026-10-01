/**
 * The /passwords share state is defined in core (`src/core/kdf/state.ts`) so the
 * registry test in `src/core/state` covers it. It names built-in examples by id and never
 * carries a typed password.
 */
export { PASSWORDS_SHARE } from '@/core/kdf/share';
export type { PasswordsShareState } from '@/core/kdf/state';
