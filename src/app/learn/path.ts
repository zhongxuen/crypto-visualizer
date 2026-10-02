import type { ChapterInfo } from '@/components/lesson';
import { SHARE_STATES, shareStateToSearch, type ShareStateBase } from '@/core/state';
import { AES_LEARNED } from '@/modules/aes/learned';
import { AES_CHAPTER_LIST } from '@/modules/aes/meta';
import { DH_LEARNED } from '@/modules/dh/learned';
import { DH_CHAPTER_LIST } from '@/modules/dh/meta';
import { HASHING_LEARNED } from '@/modules/hashing/learned';
import { HASHING_CHAPTER_LIST } from '@/modules/hashing/meta';
import { PASSWORDS_LEARNED } from '@/modules/passwords/learned';
import { PASSWORDS_CHAPTER_LIST } from '@/modules/passwords/meta';
import { RSA_LEARNED } from '@/modules/rsa/learned';
import { RSA_CHAPTER_LIST } from '@/modules/rsa/meta';
import { XOR_LEARNED } from '@/modules/xor/learned';
import { XOR_CHAPTER_LIST } from '@/modules/xor/meta';
import { MODULES, type ModuleEntry } from '@/modules/registry';

/**
 * The learning path's data (`/learn`): every module in teaching order with its chapters,
 * a link straight into each chapter's walkthrough, and what the module teaches.
 *
 * Worked out on the server while the page prerenders, so the share-state schemas (zod)
 * it encodes the links with never reach the browser.
 */

export interface PathChapter {
  id: string;
  title: string;
  /** The module's route, with `?s=` opening this chapter's walkthrough at step 1. */
  href: string;
}

export interface PathModule {
  entry: ModuleEntry;
  /** Empty for a module that isn't built yet. */
  chapters: PathChapter[];
  learned: readonly string[];
}

interface ModuleLessons {
  /** The share-state input field that holds the chapter (`dh` calls it a scene). */
  key: string;
  chapters: readonly ChapterInfo[];
  learned: readonly string[];
}

const LESSONS: Record<string, ModuleLessons> = {
  xor: { key: 'chapter', chapters: XOR_CHAPTER_LIST, learned: XOR_LEARNED },
  hashing: { key: 'chapter', chapters: HASHING_CHAPTER_LIST, learned: HASHING_LEARNED },
  passwords: {
    key: 'chapter',
    chapters: PASSWORDS_CHAPTER_LIST,
    learned: PASSWORDS_LEARNED,
  },
  aes: { key: 'chapter', chapters: AES_CHAPTER_LIST, learned: AES_LEARNED },
  rsa: { key: 'chapter', chapters: RSA_CHAPTER_LIST, learned: RSA_LEARNED },
  dh: { key: 'scene', chapters: DH_CHAPTER_LIST, learned: DH_LEARNED },
};

/**
 * The link to one chapter: the module's defaults with only the chapter changed, so the
 * page opens in the walkthrough. The first chapter is the bare route.
 */
export function chapterHref(entry: ModuleEntry, key: string, chapter: string): string {
  const definition = SHARE_STATES.find((d) => d.m === entry.slug);
  if (!definition) throw new Error(`No share state for module "${entry.slug}"`);
  const defaults = definition.defaults as ShareStateBase & {
    input: Record<string, unknown>;
  };
  if (defaults.input[key] === chapter) return entry.route;
  const search = shareStateToSearch(definition, {
    ...defaults,
    input: { ...defaults.input, [key]: chapter },
  });
  if (search === null)
    throw new Error(`The link to ${entry.slug}/${chapter} is too long`);
  return `${entry.route}${search}`;
}

export function learningPath(): PathModule[] {
  return MODULES.map((entry) => {
    const lessons = entry.status === 'ready' ? LESSONS[entry.slug] : undefined;
    if (!lessons) return { entry, chapters: [], learned: [] };
    return {
      entry,
      learned: lessons.learned,
      chapters: lessons.chapters.map((c) => ({
        id: c.id,
        title: c.title,
        href: chapterHref(entry, lessons.key, c.id),
      })),
    };
  });
}
