import type { ChapterInfo } from '@/components/lesson';
import type { XorChapter } from '@/core/xor/state';

export const XOR_META = {
  slug: 'xor',
  title: 'Bits, bytes and XOR',
  intro:
    'Text becomes bytes, XOR masks them and unmasks them, and a one-time pad used twice gives both messages away.',
} as const;

export const XOR_CHAPTER_LIST: readonly ChapterInfo<XorChapter>[] = [
  { id: 'bytes', title: 'Text to bytes' },
  { id: 'xor', title: 'XOR' },
  { id: 'otp', title: 'One-time pad' },
  { id: 'ttp', title: 'Two-time pad' },
];
