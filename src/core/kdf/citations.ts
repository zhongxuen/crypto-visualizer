import type { Citation } from '../citations/types';

/** Sources for module 3: PBKDF2, salts, the cost numbers and the password list. */
export const KDF_CITATIONS: readonly Citation[] = [
  {
    id: 'rfc8018.4.1',
    doc: 'RFC 8018',
    section: '4.1',
    title: 'Salt: why a random per-password salt defeats precomputation',
    url: 'https://www.rfc-editor.org/rfc/rfc8018#section-4.1',
  },
  {
    id: 'rfc8018.4.2',
    doc: 'RFC 8018',
    section: '4.2',
    title: 'Iteration count: making each guess expensive',
    url: 'https://www.rfc-editor.org/rfc/rfc8018#section-4.2',
  },
  {
    id: 'rfc8018.5.2',
    doc: 'RFC 8018',
    section: '5.2',
    title: 'PBKDF2',
    url: 'https://www.rfc-editor.org/rfc/rfc8018#section-5.2',
  },
  {
    id: 'rfc7914.11',
    doc: 'RFC 7914',
    section: '11',
    title: 'Test vectors for PBKDF2 with HMAC-SHA-256',
    url: 'https://www.rfc-editor.org/rfc/rfc7914#section-11',
  },
  {
    id: 'rfc9106.3',
    doc: 'RFC 9106',
    section: '3',
    title: 'Argon2 algorithm: time, memory and parallelism',
    url: 'https://www.rfc-editor.org/rfc/rfc9106#section-3',
  },
  {
    id: 'rfc9106.4',
    doc: 'RFC 9106',
    section: '4',
    title: 'Parameter choice, and why memory-hardness hurts GPUs',
    url: 'https://www.rfc-editor.org/rfc/rfc9106#section-4',
  },
  {
    id: 'provos-mazieres1999',
    doc: 'Provos & Mazières 1999',
    title: 'A future-adaptable password scheme (bcrypt)',
    url: 'https://www.usenix.org/legacy/events/usenix99/provos/provos.pdf',
  },
  {
    id: 'owasp-password-storage',
    doc: 'OWASP Password Storage Cheat Sheet',
    title: 'PBKDF2-HMAC-SHA256: 600,000 iterations recommended',
    url: 'https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html',
  },
  {
    id: 'hashcat-rtx4090',
    doc: 'hashcat 6.2.6 benchmark, RTX 4090',
    title: 'Guesses per second for SHA-256, PBKDF2, bcrypt and scrypt on one GPU',
    url: 'https://gist.github.com/Chick3nman/32e662a5bb63bc4f51b847bb422222fd',
  },
  {
    id: 'oechslin2003',
    doc: 'Oechslin 2003',
    title: 'Making a faster cryptanalytic time-memory trade-off (rainbow tables)',
    url: 'https://doi.org/10.1007/978-3-540-45146-4_36',
  },
  {
    id: 'seclists-10k',
    doc: 'SecLists',
    title: '10,000 most common passwords',
    url: 'https://github.com/danielmiessler/SecLists/blob/913b327317496d062bcc7cace524aaad8a693be2/Passwords/Common-Credentials/10k-most-common.txt',
  },
];
