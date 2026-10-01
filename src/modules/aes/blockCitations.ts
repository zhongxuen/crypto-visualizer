import { AES_CITATIONS } from '@/core/aes/citations';
import { GENERAL_CITATIONS } from '@/core/citations/general';
import { createCitationRegistry } from '@/core/citations/registry';

/**
 * What the page cites before its later chapters load: the block chapter's steps cite only
 * AES's own list. The full registry (`./citations`, which adds the avalanche chapter's
 * source from SHA-256's list) comes with `./runs`, together with the only runs whose steps
 * need it. Checked by `tests/module-citations.test.ts`.
 */
export const AES_BLOCK_CITATIONS = createCitationRegistry([
  GENERAL_CITATIONS,
  AES_CITATIONS,
]);
