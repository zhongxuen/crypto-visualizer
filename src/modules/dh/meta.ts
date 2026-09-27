import type { ChapterInfo } from '@/components/lesson';
import type { DhScene } from '@/core/dh/state';

export const DH_META = {
  slug: 'dh',
  title: 'Diffie-Hellman',
  intro:
    'Two people agree on a secret over a channel everyone can read. First with paint, then with modular exponentiation mod a small prime. Then what an eavesdropper sees, and what a man in the middle can do when nothing is authenticated.',
} as const;

export const DH_CHAPTER_LIST: readonly ChapterInfo<DhScene>[] = [
  { id: 'paint', title: 'Paint' },
  { id: 'exchange', title: 'The exchange' },
  { id: 'eve', title: 'Eve listens' },
  { id: 'mitm', title: 'Man in the middle' },
];
