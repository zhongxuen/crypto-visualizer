/**
 * The built-in AES examples and default seed, on their own so a page can read them
 * without importing every run builder in `./scenarios.ts` (phase 10's JS budget).
 * `./share.ts` and the module's first-screen run use these; `./scenarios.ts` re-exports
 * them.
 */

/**
 * The built-in examples. `appendixB` is FIPS 197 Appendix B (whose key is the one
 * expanded in Appendix A.1); `c1` is Appendix C.1 of the 2001 edition, now kept in NIST's
 * "examples with intermediate values".
 */
export const AES_EXAMPLES = {
  appendixB: {
    keyHex: '2b7e151628aed2a6abf7158809cf4f3c',
    ptHex: '3243f6a8885a308d313198a2e0370734',
  },
  c1: {
    keyHex: '000102030405060708090a0b0c0d0e0f',
    ptHex: '00112233445566778899aabbccddeeff',
  },
  /** Two equal 16-byte blocks, so ECB's repeat shows. */
  modesText: 'ATTACK AT DAWN!!ATTACK AT DAWN!!Retreat at dusk.',
} as const;

/** The default seed for IVs and nonces in the built-in runs. */
export const AES_DEFAULT_SEED = 7;
