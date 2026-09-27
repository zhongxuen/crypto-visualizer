/**
 * Diffie-Hellman groups: safe primes p = 2q + 1 with a generator g of the subgroup of
 * prime order q (RFC 2631 §2.2.1).
 *
 * RFC 2631 §2.2.1.2 makes g as h^((p−1)/q) mod p. For a safe prime (p − 1)/q = 2, so g
 * is a square, and every square other than 1 has order q. The toy groups use g = 2 where
 * 2 is itself a square (p ≡ ±1 mod 8) and g = 4 = 2² otherwise.
 *
 * Why the subgroup matters: the whole group mod p has order p − 1 = 2q, so an element
 * outside the subgroup can have order 1 or 2. A public key of order 2 confines the
 * shared secret to {1, p − 1}, and an attacker who can send one learns a bit of the
 * private key. Keeping every value in a subgroup of prime order q, and checking
 * y^q mod p = 1 (RFC 2631 §2.1.5), leaves no small subgroup to confine anything to.
 */

import type { CitationId } from '../citations/types';
import { bitLength } from '../rsa/bigmath';
import type { DhGroupKind, RealGroupView } from './events';

export interface DhGroup {
  id: string;
  kind: DhGroupKind;
  /** Short name for the UI, e.g. `'p = 23'`. */
  name: string;
  p: bigint;
  /** (p − 1) / 2, prime. */
  q: bigint;
  g: bigint;
  citation: CitationId;
}

/**
 * RFC 3526 §3, the 2048-bit MODP group (group 14): p = 2²⁰⁴⁸ − 2¹⁹⁸⁴ − 1 +
 * 2⁶⁴ · (⌊2¹⁹¹⁸ π⌋ + 124476), g = 2. `tests/differential/dh.test.ts` checks it against
 * Node's built-in `modp14`.
 */
export const MODP_2048_P = BigInt(
  '0x' +
    'FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD1' +
    '29024E088A67CC74020BBEA63B139B22514A08798E3404DD' +
    'EF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245' +
    'E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7ED' +
    'EE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3D' +
    'C2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F' +
    '83655D23DCA3AD961C62F356208552BB9ED529077096966D' +
    '670C354E4ABC9804F1746C08CA18217C32905E462E36CE3B' +
    'E39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9' +
    'DE2BCBF6955817183995497CEA956AE515D2261898FA0510' +
    '15728E5A8AACAA68FFFFFFFFFFFFFFFF',
);

function toy(p: number, g: number): DhGroup {
  return {
    id: `p${p}`,
    kind: 'toy',
    name: `p = ${p}`,
    p: BigInt(p),
    q: BigInt((p - 1) / 2),
    g: BigInt(g),
    citation: 'rfc2631.2.2.1',
  };
}

/** Every group the module offers, smallest first. */
export const DH_GROUPS = [
  toy(23, 2),
  toy(47, 2),
  toy(59, 4),
  toy(467, 4),
  toy(2039, 2),
  {
    id: 'modp2048',
    kind: 'realistic',
    name: 'RFC 3526 group 14 (2048-bit)',
    p: MODP_2048_P,
    q: (MODP_2048_P - 1n) / 2n,
    g: 2n,
    citation: 'rfc3526.3',
  },
] as const satisfies readonly DhGroup[];

export type DhGroupId = (typeof DH_GROUPS)[number]['id'];

export const DH_GROUP_IDS = DH_GROUPS.map((g) => g.id) as [DhGroupId, ...DhGroupId[]];

export const TOY_GROUPS: readonly DhGroup[] = DH_GROUPS.filter((g) => g.kind === 'toy');

/** Toy groups at or below this p list their subgroup, for the modular clock. */
export const CLOCK_LIMIT = 60n;

export function getGroup(id: DhGroupId): DhGroup {
  const group = DH_GROUPS.find((g) => g.id === id);
  if (!group) throw new RangeError(`Unknown Diffie-Hellman group "${id}"`);
  return group;
}

export function isGroupId(id: string): id is DhGroupId {
  return DH_GROUPS.some((g) => g.id === id);
}

export const digits = (x: bigint): number => x.toString().length;

/**
 * The standard 2048-bit groups, by size only. RFC 3526 group 14 is the one the realistic
 * mode computes with; RFC 7919 ffdhe2048 is the group TLS 1.3 names for finite-field
 * Diffie-Hellman, and has the same size.
 */
export const REAL_GROUPS: readonly RealGroupView[] = [
  {
    name: 'MODP group 14',
    doc: 'RFC 3526',
    bits: bitLength(MODP_2048_P),
    digits: digits(MODP_2048_P),
  },
  { name: 'ffdhe2048', doc: 'RFC 7919', bits: 2048, digits: 617 },
];
