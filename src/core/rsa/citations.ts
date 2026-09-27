import type { Citation } from '../citations/types';

const RFC = 'https://www.rfc-editor.org/rfc/rfc8017';
const FIPS186 = 'https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.186-5.pdf';
const HAC = 'https://cacr.uwaterloo.ca/hac/about';

/**
 * RFC 8017 (PKCS #1 v2.2) sections the RSA steps come from, FIPS 186-5 for Miller-Rabin,
 * the Handbook of Applied Cryptography for the textbook algorithms (extended Euclid,
 * trial division, square-and-multiply), and Boneh's survey for the attacks.
 */
export const RSA_CITATIONS: readonly Citation[] = [
  {
    id: 'rfc8017.3.1',
    doc: 'RFC 8017',
    section: '3.1',
    title: 'RSA public key: the modulus n and public exponent e',
    url: `${RFC}#section-3.1`,
  },
  {
    id: 'rfc8017.3.2',
    doc: 'RFC 8017',
    section: '3.2',
    title: 'RSA private key: d, λ(n) and the CRT values',
    url: `${RFC}#section-3.2`,
  },
  {
    id: 'rfc8017.5.1.1',
    doc: 'RFC 8017',
    section: '5.1.1',
    title: 'RSAEP: c = mᵉ mod n',
    url: `${RFC}#section-5.1.1`,
  },
  {
    id: 'rfc8017.5.1.2',
    doc: 'RFC 8017',
    section: '5.1.2',
    title: 'RSADP: m = cᵈ mod n',
    url: `${RFC}#section-5.1.2`,
  },
  {
    id: 'rfc8017.5.2.1',
    doc: 'RFC 8017',
    section: '5.2.1',
    title: 'RSASP1: s = mᵈ mod n',
    url: `${RFC}#section-5.2.1`,
  },
  {
    id: 'rfc8017.5.2.2',
    doc: 'RFC 8017',
    section: '5.2.2',
    title: 'RSAVP1: m = sᵉ mod n',
    url: `${RFC}#section-5.2.2`,
  },
  {
    id: 'rfc8017.7.1',
    doc: 'RFC 8017',
    section: '7.1',
    title: 'RSAES-OAEP: randomised encryption padding',
    url: `${RFC}#section-7.1`,
  },
  {
    id: 'rfc8017.8.1',
    doc: 'RFC 8017',
    section: '8.1',
    title: 'RSASSA-PSS: randomised signature padding',
    url: `${RFC}#section-8.1`,
  },
  {
    id: 'rfc8017.9.2',
    doc: 'RFC 8017',
    section: '9.2',
    title: 'EMSA-PKCS1-v1_5: how a real signature encodes the hash',
    url: `${RFC}#section-9.2`,
  },
  {
    id: 'fips186-5.b.3',
    doc: 'FIPS 186-5',
    section: 'Appendix B.3',
    title: 'Probable primes and the Miller-Rabin test',
    url: FIPS186,
  },
  {
    id: 'hac.2.4.2',
    doc: 'Handbook of Applied Cryptography',
    section: '2.4.2',
    title: 'The extended Euclidean algorithm',
    url: `${HAC}/chap2.pdf`,
  },
  {
    id: 'hac.3.2.1',
    doc: 'Handbook of Applied Cryptography',
    section: '3.2.1',
    title: 'Trial division',
    url: `${HAC}/chap3.pdf`,
  },
  {
    id: 'hac.14.6.1',
    doc: 'Handbook of Applied Cryptography',
    section: '14.6.1',
    title: 'Left-to-right binary exponentiation (square-and-multiply)',
    url: `${HAC}/chap14.pdf`,
  },
  {
    id: 'boneh1999',
    doc: 'Boneh, Twenty Years of Attacks on the RSA Cryptosystem (1999)',
    title: 'Textbook RSA attacks: malleability and small public exponents',
    url: 'https://crypto.stanford.edu/~dabo/pubs/papers/RSA-survey.pdf',
  },
];
