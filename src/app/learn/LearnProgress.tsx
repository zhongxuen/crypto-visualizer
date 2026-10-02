'use client';

import { ArrowRight, Check, Circle } from 'lucide-react';
import Link from 'next/link';

import { chapterProgressId } from '@/components/state/progress';
import { useProgress } from '@/components/state/useProgress';

import type { PathChapter } from './path';

/**
 * The parts of `/learn` that read the learner's progress (`cv:v1`, in their own
 * browser). The server render shows nothing ticked and "Start with module 1"; the stored
 * progress arrives right after hydration.
 */

export interface ResumePlace {
  href: string;
  moduleNumber: number;
  moduleTitle: string;
  chapterTitle: string;
}

/** "Resume where you left off", or "Start with module 1" for a first visit. */
export function ResumeCard({
  places,
  start,
  total,
}: {
  /** Every chapter's link, keyed `slug/chapter` (`chapterProgressId`). */
  places: Record<string, ResumePlace>;
  start: { href: string; title: string };
  /** How many modules are built, for "2 of 6 finished". */
  total: number;
}) {
  const { progress } = useProgress();
  const resume = progress.resume
    ? places[chapterProgressId(progress.resume.slug, progress.resume.chapter)]
    : undefined;
  const finished = progress.completed.filter((id) => !id.includes('/')).length;

  return (
    <div className="border-border bg-surface flex flex-col gap-3 rounded-(--radius) border p-4 md:flex-row md:items-center md:justify-between md:p-5">
      <div className="flex flex-col gap-1">
        <p className="font-medium">
          {resume ? 'Pick up where you left off' : 'New here? Start at the beginning.'}
        </p>
        <p className="text-fg-secondary text-sm" data-testid="path-progress">
          {finished} of {total} modules finished. Your progress stays in this browser.
        </p>
      </div>
      <Link
        href={resume ? resume.href : start.href}
        className="bg-accent text-accent-fg focus-visible:outline-focus min-h-target inline-flex items-center gap-2 self-start rounded-md px-4 text-sm font-medium hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 md:self-auto"
      >
        {resume
          ? `Resume module ${resume.moduleNumber}: ${resume.chapterTitle}`
          : `Start with ${start.title}`}
        <ArrowRight aria-hidden="true" className="size-4" />
      </Link>
    </div>
  );
}

/** A module's chapters, each a link into its walkthrough, ticked once finished. */
export function ChapterLinks({
  slug,
  chapters,
}: {
  slug: string;
  chapters: readonly PathChapter[];
}) {
  const { progress } = useProgress();
  const moduleDone = progress.completed.includes(slug);
  const here = progress.resume?.slug === slug ? progress.resume.chapter : undefined;

  return (
    <ol className="flex flex-col">
      {chapters.map((chapter, index) => {
        const done =
          moduleDone || progress.completed.includes(chapterProgressId(slug, chapter.id));
        return (
          <li key={chapter.id}>
            <Link
              href={chapter.href}
              className="hover:bg-surface-overlay focus-visible:outline-focus min-h-target flex items-center gap-2 rounded-md px-2 text-sm focus-visible:outline-2 md:min-h-9"
            >
              <span className="text-fg-muted w-4 font-mono text-xs">{index + 1}</span>
              <span className="flex-1">{chapter.title}</span>
              {here === chapter.id && !done ? (
                <span className="text-fg-muted text-xs">You were here</span>
              ) : null}
              {done ? (
                <>
                  <Check aria-hidden="true" className="text-ok size-4" />
                  <span className="sr-only">(done)</span>
                </>
              ) : (
                <Circle aria-hidden="true" className="text-border-strong size-4" />
              )}
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
