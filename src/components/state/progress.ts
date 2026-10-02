/**
 * The learner's progress and preferences, kept in `localStorage` under `cv:v1`.
 *
 * Versioned so the shape can change without breaking a returning visitor: whatever is
 * stored goes through `migrateProgress`, which accepts every version it knows and falls
 * back to the empty default for anything else. Nothing here throws.
 *
 * Only completion flags, the last chapter opened and display preferences live here:
 * never an input a learner typed, and never a password (CLAUDE.md: typed free-text passwords are never put in a
 * URL or in localStorage).
 */

export const PROGRESS_KEY = 'cv:v1';

export type ThemePref = 'system' | 'light' | 'dark';
export type BytePref = 'hex' | 'binary';

export interface ProgressPrefs {
  theme: ThemePref;
  bytes: BytePref;
}

/** A place in the walkthroughs: a module and one of its chapters. */
export interface LessonPlace {
  /** The module's registry slug, e.g. `'aes'`. */
  slug: string;
  /** The chapter id, e.g. `'modes'`. */
  chapter: string;
}

export interface ProgressV1 {
  v: 1;
  /**
   * What the learner finished, unique and in completion order: a whole module's
   * walkthrough as its slug (`'xor'`), one chapter of it as `slug/chapter` (`'xor/otp'`,
   * `chapterProgressId`).
   */
  completed: string[];
  /** The walkthrough chapter opened last, for the learning path's "resume". */
  resume?: LessonPlace;
  prefs: ProgressPrefs;
}

/** The `completed` id for one chapter of a module's walkthrough. */
export function chapterProgressId(slug: string, chapter: string): string {
  return `${slug}/${chapter}`;
}

export const DEFAULT_PROGRESS: ProgressV1 = Object.freeze({
  v: 1,
  completed: [],
  prefs: Object.freeze({ theme: 'system', bytes: 'hex' }),
}) as ProgressV1;

function freshDefault(): ProgressV1 {
  return { v: 1, completed: [], prefs: { theme: 'system', bytes: 'hex' } };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function uniqueStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === 'string'))];
}

/**
 * Bring any stored value up to the current version.
 *
 * - `v: 1` is read field by field, keeping what's valid and defaulting the rest
 *   (`resume` came later, and is simply absent from older values).
 * - A bare array (the pre-versioned shape: just the completed ids) becomes `completed`.
 * - Anything else is the default.
 */
export function migrateProgress(raw: unknown): ProgressV1 {
  const result = freshDefault();

  if (Array.isArray(raw)) {
    result.completed = uniqueStrings(raw);
    return result;
  }
  if (!isObject(raw) || raw.v !== 1) return result;

  result.completed = uniqueStrings(raw.completed);
  if (
    isObject(raw.resume) &&
    typeof raw.resume.slug === 'string' &&
    typeof raw.resume.chapter === 'string'
  ) {
    result.resume = { slug: raw.resume.slug, chapter: raw.resume.chapter };
  }
  if (isObject(raw.prefs)) {
    const { theme, bytes } = raw.prefs;
    if (theme === 'system' || theme === 'light' || theme === 'dark') {
      result.prefs.theme = theme;
    }
    if (bytes === 'hex' || bytes === 'binary') result.prefs.bytes = bytes;
  }
  return result;
}

/** Parse the stored string. Never throws. */
export function parseProgress(stored: string | null): ProgressV1 {
  if (stored === null) return freshDefault();
  try {
    return migrateProgress(JSON.parse(stored));
  } catch {
    return freshDefault();
  }
}
