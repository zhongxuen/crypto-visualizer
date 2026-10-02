/**
 * The shared glossary (docs/UIUX.md §2.1 P3): one short definition per term a beginner
 * meets undefined. `<Term id>` shows the definition in place; the `/glossary` page lists
 * them all, with an anchor per id. The words themselves are in `glossaryTerms.ts`.
 *
 * Plain words, one or two sentences, and no term defined by another undefined term.
 * `module` is the route that teaches the idea properly.
 */

import { GLOSSARY_TERMS, type GlossaryId } from './glossaryTerms';

export type { GlossaryId };

export interface GlossaryEntry {
  /** What the learner sees, e.g. "UTF-8". */
  term: string;
  definition: string;
  /** Where to learn more: the module's number and route. */
  module?: { number: number; route: `/${string}` };
}

const XOR = { number: 1, route: '/xor' } as const;
const HASHING = { number: 2, route: '/hashing' } as const;
const PASSWORDS = { number: 3, route: '/passwords' } as const;
const AES = { number: 4, route: '/aes' } as const;
const RSA = { number: 5, route: '/rsa' } as const;
const DH = { number: 6, route: '/dh' } as const;

export const GLOSSARY = {
  byte: {
    term: GLOSSARY_TERMS.byte,
    definition:
      'Eight bits: a whole number from 0 to 255, usually written as two hex digits.',
    module: XOR,
  },
  hex: {
    term: GLOSSARY_TERMS.hex,
    definition:
      'Base 16, with digits 0–9 and a–f. One hex digit is four bits, so a byte is exactly two.',
    module: XOR,
  },
  'utf-8': {
    term: GLOSSARY_TERMS['utf-8'],
    definition:
      'The rule that turns text into bytes. English letters take one byte each; other characters take two to four.',
    module: XOR,
  },
  'code-point': {
    term: GLOSSARY_TERMS['code-point'],
    definition:
      'The number Unicode gives a character, such as U+0048 for “H”. UTF-8 then writes that number as bytes.',
    module: XOR,
  },
  xor: {
    term: GLOSSARY_TERMS.xor,
    definition:
      'Exclusive or: compare two bits, and the result is 1 when they differ. Doing it twice with the same key gives back what you started with.',
    module: XOR,
  },
  hash: {
    term: GLOSSARY_TERMS.hash,
    definition:
      'A fixed-size fingerprint of any input. Easy to compute, and infeasible to run backwards or to find two inputs with the same one.',
    module: HASHING,
  },
  'sigma-small': {
    term: GLOSSARY_TERMS['sigma-small'],
    definition:
      'The two “small sigma” mixes in SHA-256’s message schedule: each rotates and shifts a 32-bit word three ways and XORs the results.',
    module: HASHING,
  },
  'sigma-big': {
    term: GLOSSARY_TERMS['sigma-big'],
    definition:
      'The two “big sigma” mixes in SHA-256’s rounds: each rotates a 32-bit word three ways and XORs the results. No bits are lost.',
    module: HASHING,
  },
  ch: {
    term: GLOSSARY_TERMS.ch,
    definition:
      '“Choose”: for each bit, e picks the bit from f (where e is 1) or from g (where e is 0).',
    module: HASHING,
  },
  maj: {
    term: GLOSSARY_TERMS.maj,
    definition:
      '“Majority”: for each bit, the value that at least two of a, b and c share.',
    module: HASHING,
  },
  mac: {
    term: GLOSSARY_TERMS.mac,
    definition:
      'Message authentication code: a tag only someone with the key could compute, so a changed message is caught.',
    module: HASHING,
  },
  salt: {
    term: GLOSSARY_TERMS.salt,
    definition:
      'Random bytes stored next to a password hash and mixed into it, so the same password gives a different hash for every user.',
    module: PASSWORDS,
  },
  'block-cipher': {
    term: GLOSSARY_TERMS['block-cipher'],
    definition:
      'A keyed scramble of a fixed-size block (16 bytes for AES) that the same key can undo.',
    module: AES,
  },
  iv: {
    term: GLOSSARY_TERMS.iv,
    definition:
      'Initialisation vector: a fresh random block that starts a mode such as CBC, so the same message encrypts differently each time. It isn’t secret.',
    module: AES,
  },
  nonce: {
    term: GLOSSARY_TERMS.nonce,
    definition:
      'A “number used once”: never repeated under the same key. CTR and GCM break badly if one is reused.',
    module: AES,
  },
  mod: {
    term: GLOSSARY_TERMS.mod,
    definition:
      'The remainder after dividing. 17 mod 5 is 2. Numbers “mod n” wrap round like a clock with n hours.',
    module: RSA,
  },
  gcd: {
    term: GLOSSARY_TERMS.gcd,
    definition:
      'Greatest common divisor: the largest number that divides both. gcd(12, 18) is 6.',
    module: RSA,
  },
  phi: {
    term: GLOSSARY_TERMS.phi,
    definition:
      'Euler’s totient: how many numbers below n share no factor with it. For n = p·q with p and q prime, it is (p − 1)(q − 1).',
    module: RSA,
  },
  oklab: {
    term: GLOSSARY_TERMS.oklab,
    definition:
      'A colour space where equal steps look equally different to the eye, which makes mixing two paints look natural.',
    module: DH,
  },
} as const satisfies Record<GlossaryId, GlossaryEntry>;
