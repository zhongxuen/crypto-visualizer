/**
 * The citation registry: every algorithm's citations joined into one.
 *
 * APPEND-ONLY. A new citation list gets one import line and one entry line. Merge
 * conflicts here are resolved by keeping both sides (CLAUDE.md, parallel-agent rules).
 */

import { AES_CITATIONS } from '../aes/citations';
import { DH_CITATIONS } from '../dh/citations';
import { HMAC_CITATIONS } from '../hmac/citations';
import { KDF_CITATIONS } from '../kdf/citations';
import { RSA_CITATIONS } from '../rsa/citations';
import { SHA256_CITATIONS } from '../sha256/citations';
import { XOR_CITATIONS } from '../xor/citations';
import { GENERAL_CITATIONS } from './general';
import { createCitationRegistry } from './registry';

export const CITATIONS = createCitationRegistry([
  GENERAL_CITATIONS,
  XOR_CITATIONS,
  SHA256_CITATIONS,
  HMAC_CITATIONS,
  KDF_CITATIONS,
  AES_CITATIONS,
  RSA_CITATIONS,
  DH_CITATIONS,
]);

export { createCitationRegistry, type CitationRegistry } from './registry';
export type { Citation, CitationDoc, CitationId, KnownCitationDoc } from './types';
