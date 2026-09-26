import type { Citation } from '../citations/types';

/** RFC 2104 sections the HMAC steps come from. Length extension cites FIPS 180-4 §5.1.1. */
export const HMAC_CITATIONS: readonly Citation[] = [
  {
    id: 'rfc2104.2',
    doc: 'RFC 2104',
    section: '2',
    title: 'Definition of HMAC',
    url: 'https://www.rfc-editor.org/rfc/rfc2104#section-2',
  },
  {
    id: 'rfc2104.3',
    doc: 'RFC 2104',
    section: '3',
    title: 'Keys: longer than a block are hashed first',
    url: 'https://www.rfc-editor.org/rfc/rfc2104#section-3',
  },
  {
    id: 'rfc2104.6',
    doc: 'RFC 2104',
    section: '6',
    title: 'Security: why the nested construction resists attacks',
    url: 'https://www.rfc-editor.org/rfc/rfc2104#section-6',
  },
];
