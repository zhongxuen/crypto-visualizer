import type { ChapterInfo } from '@/components/lesson';
import type { RsaChapter } from '@/core/rsa/state';

export const RSA_META = {
  slug: 'rsa',
  title: 'RSA',
  intro:
    'RSA with numbers small enough to check on paper: two primes, n and φ(n), d by extended Euclid, then encrypt, decrypt, sign and verify. Then why unpadded RSA is unsafe.',
} as const;

export const RSA_CHAPTER_LIST: readonly ChapterInfo<RsaChapter>[] = [
  { id: 'keys', title: 'Keys' },
  { id: 'encrypt', title: 'Encrypt and decrypt' },
  { id: 'sign', title: 'Sign and verify' },
  { id: 'malleability', title: 'Malleability' },
];
