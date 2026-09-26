/**
 * Why unsalted hashes leak, and what a salt changes.
 *
 * The attacker's tool here is a precomputed table: hash every common password once, then
 * look any stolen hash up instantly. (A real rainbow table does the same job in far less
 * space by storing hash/reduce chains and recomputing along them; that trade-off is
 * Oechslin 2003. The demo is the simpler, bigger table.)
 *
 * A random per-user salt, stored next to the hash as `salt ‖ SHA-256(salt ‖ password)`,
 * makes equal passwords hash differently and makes the table useless: it would have to
 * be rebuilt for every salt (RFC 8018 §4.1).
 */

import { bytesToHex, hexToBytes } from '../bytes/hex';
import { utf8Encode } from '../bytes/utf8';
import { createRun } from '../events/builder';
import { sha256 } from '../sha256/sha256';
import { createRng } from '../sim/rng';
import type { SimResult } from '../sim/result';
import { COMMON_PASSWORDS } from './data/commonPasswords';
import type { KdfEvent, StoredUser } from './events';

export const SALT_BYTES = 16;

/** Fictional users. Two share a password; one chose something not in the table. */
export const EXAMPLE_USERS: readonly { name: string; password: string }[] = [
  { name: 'alice', password: 'sunshine' },
  { name: 'bob', password: 'letmein' },
  { name: 'carol', password: 'sunshine' },
  { name: 'dan', password: 'qwerty' },
  { name: 'erin', password: 'purple-otter-42' },
];

/** SHA-256(salt ‖ password), or SHA-256(password) with no salt. */
export function hashPassword(password: string, salt?: readonly number[]): number[] {
  const text = utf8Encode(password);
  const input = new Uint8Array((salt?.length ?? 0) + text.length);
  if (salt) input.set(salt);
  input.set(text, salt?.length ?? 0);
  return Array.from(sha256(input));
}

/** A 16-byte salt for `name`, from the seeded generator. Display only. */
export function saltFor(name: string, seed: number): number[] {
  const rng = createRng(seed).fork(`salt:${name}`);
  return Array.from({ length: SALT_BYTES }, () => rng.int(256));
}

/** The attacker's table: hex digest → password. */
export function buildLookupTable(
  passwords: readonly string[] = COMMON_PASSWORDS,
): Map<string, string> {
  const table = new Map<string, string>();
  for (const password of passwords) {
    table.set(bytesToHex(Uint8Array.from(hashPassword(password))), password);
  }
  return table;
}

let cachedTable: Map<string, string> | undefined;
/** The table over the built-in list, built once. */
export function commonTable(): Map<string, string> {
  cachedTable ??= buildLookupTable();
  return cachedTable;
}

export function storeUsers(
  users: readonly { name: string; password: string }[],
  seed: number | null,
): StoredUser[] {
  return users.map(({ name, password }) => {
    if (seed === null) return { name, password, hash: hashPassword(password) };
    const salt = saltFor(name, seed);
    return { name, password, salt, hash: hashPassword(password, salt) };
  });
}

/** Look a stored hash up. A salted hash never matches an unsalted table entry. */
export function lookup(
  table: Map<string, string>,
  hash: readonly number[],
): string | undefined {
  return table.get(bytesToHex(Uint8Array.from(hash)));
}

function sharedPair(users: StoredUser[]): [StoredUser, StoredUser] | undefined {
  for (let i = 0; i < users.length; i += 1) {
    for (let j = i + 1; j < users.length; j += 1) {
      if (users[i].password === users[j].password) return [users[i], users[j]];
    }
  }
  return undefined;
}

const short = (hash: readonly number[]) =>
  `${bytesToHex(Uint8Array.from(hash)).slice(0, 12)}…`;

export interface PasswordRunInput {
  users?: readonly { name: string; password: string }[];
  /** `null` for unsalted; otherwise the seed the salts come from. */
  seed: number | null;
}

/** The users table, the shared-password collision, the attacker's table, the lookups. */
export function passwordTableRun({
  users = EXAMPLE_USERS,
  seed,
}: PasswordRunInput): SimResult<KdfEvent> {
  const salted = seed !== null;
  const stored = storeUsers(users, seed);
  const table = commonTable();
  const run = createRun<KdfEvent>();
  const prefix = salted ? 'kdf.salted' : 'kdf.unsalted';

  run.group(
    salted ? 'Salted storage' : 'Unsalted storage',
    () => {
      run.step({
        kind: 'kdf.users',
        id: `${prefix}.users`,
        label: salted
          ? 'The server stores a random salt for each user and SHA-256(salt ‖ password).'
          : 'The server stores SHA-256(password) for each user, never the password itself.',
        detail: salted
          ? 'The salt is not secret. It sits next to the hash, and its only job is to make every user’s hash different.'
          : 'Hashing is one-way, so a stolen table of hashes does not directly reveal the passwords. That is the theory.',
        citation: salted ? 'rfc8018.4.1' : 'fips180-4.6.2.2',
        salted,
        users: stored,
      });
      const pair = sharedPair(stored);
      if (pair) {
        const equal =
          bytesToHex(Uint8Array.from(pair[0].hash)) ===
          bytesToHex(Uint8Array.from(pair[1].hash));
        run.step({
          kind: 'kdf.collision',
          id: `${prefix}.collision`,
          label: equal
            ? `${pair[0].name} and ${pair[1].name} have the same hash, ${short(pair[0].hash)}, so they have the same password.`
            : `${pair[0].name} and ${pair[1].name} chose the same password, but their salted hashes differ.`,
          detail: equal
            ? 'An attacker learns this without cracking anything: crack one and you have both.'
            : 'Different salts mean different inputs to SHA-256, so equal passwords no longer stand out.',
          citation: salted ? 'rfc8018.4.1' : 'fips180-4.6.2.2',
          salted,
          names: [pair[0].name, pair[1].name],
          hashes: [pair[0].hash, pair[1].hash],
          equal,
        });
      }
    },
    {
      id: salted ? 'salted-storage' : 'unsalted-storage',
      description: salted ? 'A salt per user.' : 'Plain SHA-256 of each password.',
    },
  );

  run.group(
    'The attacker’s table',
    () => {
      if (!salted) {
        run.step({
          kind: 'kdf.table',
          id: `${prefix}.table`,
          label: `The attacker hashes ${table.size} common passwords once, ahead of time.`,
          detail:
            'This is a precomputed lookup table. A real rainbow table stores hash/reduce chains instead, trading lookup time for far less space, but it answers the same question.',
          citation: 'oechslin2003',
          size: table.size,
          sample: [...table.entries()].slice(0, 5).map(([hash, password]) => ({
            password,
            hash: Array.from(hexToBytes(hash)),
          })),
        });
      }
      for (const user of stored) {
        const found = lookup(table, user.hash);
        run.step({
          kind: 'kdf.lookup',
          id: `${prefix}.lookup.${user.name}`,
          label:
            found !== undefined
              ? `${user.name}: ${short(user.hash)} is in the table. The password is “${found}”.`
              : salted
                ? `${user.name}: no match. The table was built without this salt.`
                : `${user.name}: no match. This password is not on the common list.`,
          ...(salted
            ? {
                detail:
                  'To use a table now, the attacker would have to build a new one for this one salt, which is no faster than just guessing this user’s password.',
              }
            : {}),
          citation: salted ? 'rfc8018.4.1' : 'seclists-10k',
          salted,
          name: user.name,
          hash: user.hash,
          hit: found !== undefined,
          ...(found !== undefined ? { found } : {}),
        });
      }
    },
    {
      id: salted ? 'salted-lookup' : 'unsalted-lookup',
      description: 'Look every stolen hash up in the precomputed table.',
    },
  );

  return run.finish();
}
