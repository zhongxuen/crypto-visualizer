import type { ChapterInfo } from '@/components/lesson';
import type { PasswordsChapter } from '@/core/kdf/state';

export const PASSWORDS_META = {
  slug: 'passwords',
  title: 'Passwords and salts',
  intro:
    'Why an unsalted hash falls to a precomputed table, what a salt changes, and how slow hashing makes every guess expensive.',
} as const;

export const PASSWORDS_CHAPTER_LIST: readonly ChapterInfo<PasswordsChapter>[] = [
  { id: 'lookup', title: 'Unsalted hashes' },
  { id: 'salt', title: 'Salts' },
  { id: 'pbkdf2', title: 'PBKDF2' },
  { id: 'cost', title: 'Guessing cost' },
];
