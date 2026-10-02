'use client';

import { useEffect } from 'react';

import { chapterProgressId } from './progress';
import { useProgress, writeProgress } from './useProgress';

/**
 * `useLessonProgress(...)`: what a module page records as the learner goes, for the
 * chapter ticks and the learning path (`/learn`).
 *
 * - While the walkthrough is open, the chapter on screen is the place to resume from.
 * - When a chapter's walkthrough reaches its end, that chapter is ticked; at the end of
 *   the last chapter the whole module is (its slug, which the home page and the header
 *   read).
 *
 * Free play records nothing: it isn't the lesson. Returns the chapters to tick.
 */
export function useLessonProgress<Id extends string>({
  slug,
  chapters,
  chapter,
  walkthrough,
  finished,
}: {
  slug: string;
  chapters: readonly { id: Id }[];
  chapter: Id;
  /** True in the walkthrough, false in free play. */
  walkthrough: boolean;
  /** True once this chapter's walkthrough has reached its end. */
  finished: boolean;
}): Id[] {
  const { progress } = useProgress();
  const last = chapters[chapters.length - 1]?.id === chapter;

  useEffect(() => {
    if (!walkthrough) return;
    writeProgress((current) => {
      const ids = finished
        ? [chapterProgressId(slug, chapter), ...(last ? [slug] : [])]
        : [];
      const fresh = ids.filter((id) => !current.completed.includes(id));
      const moved = current.resume?.slug !== slug || current.resume.chapter !== chapter;
      if (fresh.length === 0 && !moved) return current;
      return {
        ...current,
        completed: [...current.completed, ...fresh],
        resume: { slug, chapter },
      };
    });
  }, [slug, chapter, walkthrough, finished, last]);

  const moduleDone = progress.completed.includes(slug);
  return chapters
    .map((c) => c.id)
    .filter(
      (id) => moduleDone || progress.completed.includes(chapterProgressId(slug, id)),
    );
}
