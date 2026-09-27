import type { ChapterInfo } from '@/components/lesson';
import type { AesChapter } from '@/core/aes/state';

export const AES_META = {
  slug: 'aes',
  title: 'AES',
  intro:
    'One 16-byte block through AES-128 on a 4×4 grid, round by round. Then the modes: ECB and its leak, CBC chaining, CTR, and GCM described.',
} as const;

export const AES_CHAPTER_LIST: readonly ChapterInfo<AesChapter>[] = [
  { id: 'block', title: 'One block' },
  { id: 'keys', title: 'Key schedule' },
  { id: 'avalanche', title: 'Avalanche' },
  { id: 'modes', title: 'Modes' },
  { id: 'penguin', title: 'ECB penguin' },
  { id: 'gcm', title: 'GCM' },
];
