import { GENERAL_CITATIONS } from '@/core/citations/general';
import { createCitationRegistry } from '@/core/citations/registry';
import { SHA256_CITATIONS } from '@/core/sha256/citations';

/**
 * What the page cites before its later chapters load: the SHA-256 chapter's steps cite
 * only SHA-256's own list. The full registry (`./citations`, which adds HMAC's) comes with
 * `./runs`, together with the only runs whose steps need it. Checked by
 * `tests/module-citations.test.ts`.
 */
export const HASHING_SHA256_CITATIONS = createCitationRegistry([
  GENERAL_CITATIONS,
  SHA256_CITATIONS,
]);
