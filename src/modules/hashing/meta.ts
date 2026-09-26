import type { ChapterInfo } from '@/components/lesson';
import type { HashingChapter } from '@/core/sha256/state';

export const HASHING_META = {
  slug: 'hashing',
  title: 'Hashing and MACs',
  intro:
    'SHA-256 through padding, the message schedule and 64 rounds, the avalanche effect, and how HMAC turns a hash into a safe MAC.',
} as const;

export const HASHING_CHAPTER_LIST: readonly ChapterInfo<HashingChapter>[] = [
  { id: 'sha256', title: 'SHA-256' },
  { id: 'avalanche', title: 'Avalanche' },
  { id: 'hmac', title: 'HMAC' },
];

/** The walkthrough's built-in inputs. */
export const HASHING_WALKTHROUGH = {
  message: 'abc',
  avalancheMessage: 'hello',
  bit: 7,
  key: 'Jefe',
  hmacMessage: 'what do ya want for nothing?',
} as const;
