import type { Citation } from '../citations/types';

const FIPS = 'https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.180-4.pdf';

/** FIPS 180-4 sections the SHA-256 steps come from. The PDF has no section anchors. */
export const SHA256_CITATIONS: readonly Citation[] = [
  {
    id: 'fips180-4.4.1.2',
    doc: 'FIPS 180-4',
    section: '4.1.2',
    title: 'SHA-256 functions: Ch, Maj, Σ0, Σ1, σ0, σ1',
    url: FIPS,
  },
  {
    id: 'fips180-4.4.2.2',
    doc: 'FIPS 180-4',
    section: '4.2.2',
    title: 'SHA-256 constants K0–K63',
    url: FIPS,
  },
  {
    id: 'fips180-4.5.1.1',
    doc: 'FIPS 180-4',
    section: '5.1.1',
    title: 'Padding the message (SHA-256)',
    url: FIPS,
  },
  {
    id: 'fips180-4.5.2.1',
    doc: 'FIPS 180-4',
    section: '5.2.1',
    title: 'Parsing the message into 512-bit blocks',
    url: FIPS,
  },
  {
    id: 'fips180-4.5.3.3',
    doc: 'FIPS 180-4',
    section: '5.3.3',
    title: 'SHA-256 initial hash value H(0)',
    url: FIPS,
  },
  {
    id: 'fips180-4.6.2.2-1',
    doc: 'FIPS 180-4',
    section: '6.2.2, step 1',
    title: 'Prepare the message schedule W0–W63',
    url: FIPS,
  },
  {
    id: 'fips180-4.6.2.2-3',
    doc: 'FIPS 180-4',
    section: '6.2.2, step 3',
    title: 'The 64 compression rounds',
    url: FIPS,
  },
  {
    id: 'fips180-4.6.2.2-4',
    doc: 'FIPS 180-4',
    section: '6.2.2, step 4',
    title: 'Compute the intermediate hash value',
    url: FIPS,
  },
  {
    id: 'fips180-4.6.2.2',
    doc: 'FIPS 180-4',
    section: '6.2.2',
    title: 'SHA-256 hash computation: the digest',
    url: FIPS,
  },
  {
    id: 'webster-tavares1985',
    doc: 'Webster & Tavares 1985',
    title: 'On the design of S-boxes (the strict avalanche criterion)',
    url: 'https://doi.org/10.1007/3-540-39799-X_41',
  },
];
