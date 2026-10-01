import { GENERAL_CITATIONS } from '@/core/citations/general';
import { createCitationRegistry } from '@/core/citations/registry';
import { RSA_CITATIONS } from '@/core/rsa/citations';

/**
 * What the page cites before its later chapters load: the keys chapter's steps cite only
 * RSA's own list. The full registry (`./citations`, which adds SHA-256's for signing)
 * comes with `./runs`, together with the only runs whose steps need it. Checked by
 * `tests/module-citations.test.ts`.
 */
export const RSA_KEYS_CITATIONS = createCitationRegistry([
  GENERAL_CITATIONS,
  RSA_CITATIONS,
]);
