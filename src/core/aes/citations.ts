import type { Citation } from '../citations/types';

const FIPS = 'https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.197-upd1.pdf';
const SP38A =
  'https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-38a.pdf';
const SP38D =
  'https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-38d.pdf';

/**
 * FIPS 197 (2023 update), SP 800-38A and SP 800-38D sections the AES steps come from.
 * The PDFs have no section anchors. The avalanche run cites `webster-tavares1985`, which
 * the SHA-256 citations already register.
 */
export const AES_CITATIONS: readonly Citation[] = [
  {
    id: 'fips197.3.4',
    doc: 'FIPS 197',
    section: '3.4',
    title: 'The state: input bytes to a 4×4 array, column by column',
    url: FIPS,
  },
  {
    id: 'fips197.4.2',
    doc: 'FIPS 197',
    section: '4.2',
    title: 'Multiplication in GF(2^8) and xtime',
    url: FIPS,
  },
  {
    id: 'fips197.4.4',
    doc: 'FIPS 197',
    section: '4.4',
    title: 'Multiplicative inverses in GF(2^8)',
    url: FIPS,
  },
  {
    id: 'fips197.5.1',
    doc: 'FIPS 197',
    section: '5.1',
    title: 'CIPHER(): the rounds and the output',
    url: FIPS,
  },
  {
    id: 'fips197.5.1.1',
    doc: 'FIPS 197',
    section: '5.1.1',
    title: 'SUBBYTES() and the S-box',
    url: FIPS,
  },
  {
    id: 'fips197.5.1.2',
    doc: 'FIPS 197',
    section: '5.1.2',
    title: 'SHIFTROWS()',
    url: FIPS,
  },
  {
    id: 'fips197.5.1.3',
    doc: 'FIPS 197',
    section: '5.1.3',
    title: 'MIXCOLUMNS()',
    url: FIPS,
  },
  {
    id: 'fips197.5.1.4',
    doc: 'FIPS 197',
    section: '5.1.4',
    title: 'ADDROUNDKEY()',
    url: FIPS,
  },
  {
    id: 'fips197.5.2',
    doc: 'FIPS 197',
    section: '5.2',
    title: 'KEYEXPANSION(): ROTWORD, SUBWORD and Rcon',
    url: FIPS,
  },
  {
    id: 'fips197.5.3',
    doc: 'FIPS 197',
    section: '5.3',
    title: 'INVCIPHER(): the inverse cipher',
    url: FIPS,
  },
  {
    id: 'sp800-38a.6.1',
    doc: 'NIST SP 800-38A',
    section: '6.1',
    title: 'The Electronic Codebook (ECB) mode',
    url: SP38A,
  },
  {
    id: 'sp800-38a.6.2',
    doc: 'NIST SP 800-38A',
    section: '6.2',
    title: 'The Cipher Block Chaining (CBC) mode',
    url: SP38A,
  },
  {
    id: 'sp800-38a.6.5',
    doc: 'NIST SP 800-38A',
    section: '6.5',
    title: 'The Counter (CTR) mode',
    url: SP38A,
  },
  {
    id: 'sp800-38a.b',
    doc: 'NIST SP 800-38A',
    section: 'Appendix B',
    title: 'Generation of counter blocks',
    url: SP38A,
  },
  {
    id: 'sp800-38a.c',
    doc: 'NIST SP 800-38A',
    section: 'Appendix C',
    title: 'Generation of initialization vectors',
    url: SP38A,
  },
  {
    id: 'rfc5652.6.3',
    doc: 'RFC 5652',
    section: '6.3',
    title: 'Content-encryption process: PKCS #7 padding',
    url: 'https://www.rfc-editor.org/rfc/rfc5652#section-6.3',
  },
  {
    id: 'sp800-38d.6.4',
    doc: 'NIST SP 800-38D',
    section: '6.4',
    title: 'GHASH function',
    url: SP38D,
  },
  {
    id: 'sp800-38d.6.5',
    doc: 'NIST SP 800-38D',
    section: '6.5',
    title: 'GCTR function',
    url: SP38D,
  },
  {
    id: 'sp800-38d.7.1',
    doc: 'NIST SP 800-38D',
    section: '7.1',
    title: 'GCM authenticated encryption',
    url: SP38D,
  },
  {
    id: 'sp800-38d.8',
    doc: 'NIST SP 800-38D',
    section: '8',
    title: 'Uniqueness requirement on IVs and keys',
    url: SP38D,
  },
];
