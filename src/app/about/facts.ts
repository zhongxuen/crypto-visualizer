/**
 * The about page's test-vector cards (docs/UIUX.md §2.3): for each algorithm, the
 * published vectors it is checked against and how many seeded random cases are run
 * through it and through `node:crypto`. Copy that quotes the test suite can go stale, so
 * `tests/about-facts.test.ts` checks every card against its file: each `evidence` string
 * must appear in it, word for word.
 */

export interface VectorCard {
  algorithm: string;
  /** The differential test file. */
  file: `tests/differential/${string}.test.ts`;
  /** The published vectors, by source. */
  vectors: string;
  /** The headline figure: published vectors or seeded cases. */
  figure: string;
  figureLabel: string;
  /** The comparison with Node (or the independent oracle). */
  random: string;
  /** Strings that must appear in `file`, so the card can't drift from the tests. */
  evidence: readonly string[];
}

export const VECTOR_CARDS: readonly VectorCard[] = [
  {
    algorithm: 'SHA-256',
    file: 'tests/differential/sha256.test.ts',
    vectors:
      'FIPS 180-4: “abc”, the two-block 448-bit message, one million “a” and the empty message.',
    figure: '1,000',
    figureLabel: 'seeded inputs against createHash',
    random: 'Plus every length from 0 to 130 bytes, which covers each padding edge case.',
    evidence: [
      'matches createHash on 1,000 seeded random inputs',
      'lengths 0–130',
      '"abc" (one block)',
      'the 448-bit message (two blocks)',
      'one million "a"',
      'the empty message',
    ],
  },
  {
    algorithm: 'HMAC-SHA-256',
    file: 'tests/differential/hmac.test.ts',
    vectors: 'RFC 4231: all seven test cases, including the truncated tag and long keys.',
    figure: '500',
    figureLabel: 'seeded keys and messages against createHmac',
    random: 'Keys up to 200 bytes, and keys of exactly 63, 64 and 65 bytes.',
    evidence: [
      'matches createHmac on 500 seeded keys and messages',
      'test case 7',
      'exactly 63, 64 and 65 bytes',
    ],
  },
  {
    algorithm: 'PBKDF2-HMAC-SHA-256',
    file: 'tests/differential/pbkdf2.test.ts',
    vectors: 'RFC 7914 §11: both vectors, one of them at 80,000 iterations.',
    figure: '200',
    figureLabel: 'seeded cases against pbkdf2Sync',
    random: 'Up to 2,000 iterations each, with key lengths from 1 to 64 bytes.',
    evidence: [
      'matches pbkdf2Sync on 200 seeded cases',
      'c = 80000',
      'RFC 7914 §11 test vectors',
    ],
  },
  {
    algorithm: 'AES-128',
    file: 'tests/differential/aes.test.ts',
    vectors:
      'FIPS 197 Appendices A.1, B and C.1, compared step by step, and SP 800-38A’s ECB, CBC and CTR examples.',
    figure: '1,000',
    figureLabel: 'seeded cases against createCipheriv',
    random: 'ECB, CBC and CTR, with and without PKCS#7 padding, and decryption too.',
    evidence: [
      'node:crypto createCipheriv on 1,000 seeded cases',
      'Appendix C.1 (AES-128)',
      'F.1.1 ECB-AES128.Encrypt',
      'F.2.1 CBC-AES128.Encrypt',
      'F.5.1 CTR-AES128.Encrypt',
      'decryption matches createDecipheriv',
    ],
  },
  {
    algorithm: 'RSA',
    file: 'tests/differential/rsa.test.ts',
    vectors: 'No published vectors for textbook RSA: Node’s raw RSA is the oracle.',
    figure: '120',
    figureLabel: 'encryptions against RSA_NO_PADDING',
    random:
      '128-, 256- and 512-bit keys, 8 seeds each, 5 messages per key, plus hash-then-sign.',
    evidence: [
      'raw RSA vs node:crypto (RSA_NO_PADDING)',
      '-bit keys over 8 seeds',
      'i < 5',
      'hash-then-sign matches OpenSSL',
    ],
  },
  {
    algorithm: 'Diffie-Hellman',
    file: 'tests/differential/dh.test.ts',
    vectors: 'RFC 3526 group 14: the same p and g as Node’s built-in modp14.',
    figure: '200',
    figureLabel: 'seeded key pairs per toy group',
    random:
      'OpenSSL refuses moduli this small, so toy groups are checked against g multiplied out by hand.',
    evidence: [
      'has the same p and g as Node’s modp14',
      'seed < 200',
      'are refused by OpenSSL',
    ],
  },
];
