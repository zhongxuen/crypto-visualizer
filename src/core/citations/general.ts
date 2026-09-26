import type { Citation } from './types';

/** Citations shared by more than one module: the encodings every module displays. */
export const GENERAL_CITATIONS: readonly Citation[] = [
  {
    id: 'rfc3629.3',
    doc: 'RFC 3629',
    section: '3',
    title: 'UTF-8 definition',
    url: 'https://www.rfc-editor.org/rfc/rfc3629#section-3',
  },
  {
    id: 'rfc4648.8',
    doc: 'RFC 4648',
    section: '8',
    title: 'Base 16 (hex) encoding',
    url: 'https://www.rfc-editor.org/rfc/rfc4648#section-8',
  },
  {
    id: 'rfc4648.5',
    doc: 'RFC 4648',
    section: '5',
    title: 'Base 64 encoding with URL and filename safe alphabet',
    url: 'https://www.rfc-editor.org/rfc/rfc4648#section-5',
  },
];
