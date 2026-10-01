/**
 * The password-key guard, on its own so the share-state codec can use it without
 * importing zod (see `LazyShareState` in `./schema.ts`).
 *
 * RULE: free-text password inputs are never encoded (CLAUDE.md).
 */

/** Keys that look like a free-text secret. Matched case-insensitively, anywhere in a key. */
const SECRET_KEY = /password|passphrase|passwd|secret/i;

/** Paths of keys in `value` that look like free-text secrets, e.g. `['input.password']`. */
export function findSecretKeys(value: unknown, path = ''): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => findSecretKeys(item, `${path}[${index}]`));
  }
  if (value === null || typeof value !== 'object') return [];

  return Object.entries(value).flatMap(([key, child]) => {
    const childPath = path ? `${path}.${key}` : key;
    return [
      ...(SECRET_KEY.test(key) ? [childPath] : []),
      ...findSecretKeys(child, childPath),
    ];
  });
}
