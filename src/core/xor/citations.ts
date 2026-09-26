import type { Citation } from '../citations/types';

/**
 * Module 1 has no standard to cite for XOR itself. It cites where the one-time pad comes
 * from, the proof that it's perfectly secret, and the best-known failure of reusing it.
 * UTF-8 steps cite `rfc3629.3` from `../citations/general.ts`.
 */
export const XOR_CITATIONS: readonly Citation[] = [
  {
    id: 'vernam1926',
    doc: 'Vernam 1926',
    title: 'Cipher printing telegraph systems (the XOR one-time pad)',
    url: 'https://doi.org/10.1109/T-AIEE.1926.5061224',
  },
  {
    id: 'shannon1949',
    doc: 'Shannon 1949',
    title: 'Communication theory of secrecy systems (perfect secrecy)',
    url: 'https://doi.org/10.1002/j.1538-7305.1949.tb00928.x',
  },
  {
    id: 'venona',
    doc: 'Venona project',
    title: 'Reused one-time pad pages broken by US codebreakers',
    url: 'https://en.wikipedia.org/wiki/Venona_project',
  },
];
