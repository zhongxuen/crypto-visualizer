import { GENERAL_CITATIONS } from '@/core/citations/general';
import { HMAC_CITATIONS } from '@/core/hmac/citations';
import { KDF_CITATIONS } from '@/core/kdf/citations';
import { SHA256_CITATIONS } from '@/core/sha256/citations';
import { createCitationRegistry } from '@/core/citations/registry';

/**
 * What this page's steps cite: its own lists, not the whole site's registry (which would
 * put every module's titles and URLs in this route's first load). Checked against every
 * citation the module's runs emit by `tests/module-citations.test.ts`.
 */
export const PASSWORDS_PAGE_CITATIONS = createCitationRegistry([
  GENERAL_CITATIONS,
  SHA256_CITATIONS,
  HMAC_CITATIONS,
  KDF_CITATIONS,
]);
