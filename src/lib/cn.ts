import { clsx, type ClassValue } from 'clsx';

/**
 * Join class names, dropping falsy ones.
 *
 * A plain join, with no tailwind-merge: merging cost 8.4 KB of first-load JS on every
 * route (docs/UIUX.md §3 B2). So calls must be conflict-free: no two classes that set the
 * same property under the same variant (`border` with `border-2`, `bg-surface` with
 * `bg-highlight`). Pick one per branch instead, as `cond ? 'border-2 …' : 'border …'`.
 * Where a caller really must override a shared base (a `BUTTON` with another border
 * colour), use Tailwind's important suffix, `border-warn!`. The UI tests check every
 * call they render against tailwind-merge (tests/setup.ts).
 */
export const cn = (...inputs: ClassValue[]): string => clsx(inputs);
