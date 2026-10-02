/**
 * The glossary's words alone, keyed by id: what a `<Term>` shows before anyone opens it.
 *
 * Kept apart from the definitions (`glossary.ts`) so a walkthrough's first load carries
 * only these few labels; `<Term>` loads the definitions right after hydration.
 */
export const GLOSSARY_TERMS = {
  byte: 'byte',
  hex: 'hex',
  'utf-8': 'UTF-8',
  'code-point': 'code point',
  xor: 'XOR',
  hash: 'hash',
  'sigma-small': 'σ0, σ1',
  'sigma-big': 'Σ0, Σ1',
  ch: 'Ch',
  maj: 'Maj',
  mac: 'MAC',
  salt: 'salt',
  'block-cipher': 'block cipher',
  iv: 'IV',
  nonce: 'nonce',
  mod: 'mod',
  gcd: 'GCD',
  phi: 'φ(n)',
  oklab: 'OKLab',
} as const;

export type GlossaryId = keyof typeof GLOSSARY_TERMS;
