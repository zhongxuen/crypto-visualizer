import { GENERAL_CITATIONS } from '@/core/citations/general';
import { XOR_CITATIONS } from '@/core/xor/citations';
import { createCitationRegistry } from '@/core/citations/registry';

/**
 * What this page's steps cite: its own lists, not the whole site's registry (which would
 * put every module's titles and URLs in this route's first load). Checked against every
 * citation the module's runs emit by `tests/module-citations.test.ts`.
 */
export const XOR_PAGE_CITATIONS = createCitationRegistry([
  GENERAL_CITATIONS,
  XOR_CITATIONS,
]);
