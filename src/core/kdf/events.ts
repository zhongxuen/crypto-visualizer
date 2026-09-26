import type { EventBase } from '../events/types';

/**
 * The events of module 3, "Passwords and salts". The users and passwords in these events
 * are the built-in fictional examples. A password a learner types is only ever held in
 * page memory; it is never put in a URL or in storage.
 */

export interface StoredUser {
  name: string;
  password: string;
  /** Absent when unsalted. */
  salt?: number[];
  /** SHA-256(password), or SHA-256(salt ‖ password). */
  hash: number[];
}

/** The users table as the server stores it. */
export type KdfUsersEvent = EventBase & {
  kind: 'kdf.users';
  salted: boolean;
  users: StoredUser[];
};

/** Two users with the same password: same hash or not? */
export type KdfCollisionEvent = EventBase & {
  kind: 'kdf.collision';
  salted: boolean;
  names: [string, string];
  hashes: [number[], number[]];
  equal: boolean;
};

/** The attacker's precomputed table: hash → password for common passwords. */
export type KdfTableEvent = EventBase & {
  kind: 'kdf.table';
  size: number;
  sample: { password: string; hash: number[] }[];
};

/** Looking one stored hash up in the table. */
export type KdfLookupEvent = EventBase & {
  kind: 'kdf.lookup';
  salted: boolean;
  name: string;
  hash: number[];
  hit: boolean;
  /** The password the table gave back, on a hit. */
  found?: string;
};

/** PBKDF2's inputs and how many blocks the key needs (RFC 8018 §5.2 steps 1–2). */
export type KdfPbkdfSetupEvent = EventBase & {
  kind: 'kdf.pbkdfSetup';
  passwordLength: number;
  salt: number[];
  iterations: number;
  dkLen: number;
  /** l: blocks of 32 bytes. */
  blocks: number;
  /** r: bytes used from the last block. */
  lastBlockBytes: number;
};

/** One iteration: Uj = HMAC(P, Uj−1), and the running XOR T. */
export type KdfPbkdfUEvent = EventBase & {
  kind: 'kdf.pbkdfU';
  block: number;
  iteration: number;
  /** HMAC's message: salt ‖ INT(i) for U1, else the previous U. */
  input: number[];
  u: number[];
  t: number[];
};

/** Iterations past the stepped ones, computed on the fast path. */
export type KdfPbkdfRestEvent = EventBase & {
  kind: 'kdf.pbkdfRest';
  block: number;
  from: number;
  to: number;
  /** T after the last iteration, or absent while it's still being computed. */
  t?: number[];
  pending: boolean;
};

/** A finished block Ti. */
export type KdfPbkdfBlockEvent = EventBase & {
  kind: 'kdf.pbkdfBlock';
  block: number;
  t: number[];
};

/** DK = T1 ‖ T2 ‖ … cut to dkLen. */
export type KdfPbkdfKeyEvent = EventBase & {
  kind: 'kdf.pbkdfKey';
  dk: number[];
};

export type KdfEvent =
  | KdfUsersEvent
  | KdfCollisionEvent
  | KdfTableEvent
  | KdfLookupEvent
  | KdfPbkdfSetupEvent
  | KdfPbkdfUEvent
  | KdfPbkdfRestEvent
  | KdfPbkdfBlockEvent
  | KdfPbkdfKeyEvent;
