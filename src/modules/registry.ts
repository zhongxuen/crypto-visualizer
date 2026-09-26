/**
 * The module manifest: every module the site has or will have, in teaching order.
 *
 * This file is deliberately *not* a module. It is the shared list that the home page and
 * navigation read, which is why `src/components` may import it (see rule 5 in
 * eslint.config.mjs). It holds no module code, only metadata.
 *
 * Parallel agents: the only edit a module agent makes here is flipping its own entry's
 * `status` from `'planned'` to `'ready'` once its route exists (00-overview.md §4).
 */

export type ModuleStatus = 'planned' | 'ready';

export interface ModuleEntry {
  /** Stable identifier, also the share-state key (`m`) for the module. */
  slug: string;
  /** Route path, e.g. `/aes`. Only linked once `status` is `'ready'`. */
  route: `/${string}`;
  title: string;
  /** One sentence: what you step through. */
  blurb: string;
  /** Position in the teaching order, from 00-overview.md §3. */
  number: number;
  status: ModuleStatus;
  /** 1 = v1, 2 = phase 2 (TLS 1.3). */
  phase: 1 | 2;
}

export const MODULES: readonly ModuleEntry[] = [
  {
    slug: 'xor',
    route: '/xor',
    title: 'Bits, bytes and XOR',
    blurb:
      'Text becomes UTF-8 bytes, then hex and binary. XOR as a reversible mask, the one-time pad, and why reusing its key breaks it.',
    number: 1,
    status: 'ready',
    phase: 1,
  },
  {
    slug: 'hashing',
    route: '/hashing',
    title: 'Hashing and MACs',
    blurb:
      'SHA-256 through padding, the message schedule and 64 compression rounds. The avalanche effect, length extension, and how HMAC fixes it.',
    number: 2,
    status: 'planned',
    phase: 1,
  },
  {
    slug: 'passwords',
    route: '/passwords',
    title: 'Passwords and salts',
    blurb:
      'Why an unsalted hash falls to a precomputed table, what a salt changes, and PBKDF2 iterations stepped for real.',
    number: 3,
    status: 'planned',
    phase: 1,
  },
  {
    slug: 'aes',
    route: '/aes',
    title: 'AES',
    blurb:
      'One 16-byte block through AES-128, round by round on a 4×4 grid. Then the modes: ECB and its leak, CBC with padding, and CTR.',
    number: 4,
    status: 'planned',
    phase: 1,
  },
  {
    slug: 'rsa',
    route: '/rsa',
    title: 'RSA',
    blurb:
      'Primes small enough to check on paper: n, φ(n), e and d by extended Euclid, then encrypt, decrypt, sign and verify.',
    number: 5,
    status: 'planned',
    phase: 1,
  },
  {
    slug: 'dh',
    route: '/dh',
    title: 'Diffie-Hellman',
    blurb:
      'The paint-mixing analogy, then real modular exponentiation. What an eavesdropper sees, and a man-in-the-middle when nothing is authenticated.',
    number: 6,
    status: 'planned',
    phase: 1,
  },
  {
    slug: 'tls',
    route: '/tls',
    title: 'Putting it together: TLS 1.3',
    blurb:
      'The RFC 8448 example handshake with real values: X25519 key share, the HKDF key schedule and AES-128-GCM records.',
    number: 7,
    status: 'planned',
    phase: 2,
  },
];
