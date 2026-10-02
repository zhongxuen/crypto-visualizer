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

export interface PathStop {
  slug: string;
  number: number;
  title: string;
  /** The module's first chapter. */
  href: string;
}

/**
 * Where to go next: back into the chapter last opened, or, once that module is finished,
 * on to the next unfinished one. "Start with module 1" on a first visit.
 */
export function ResumeCard({
  places,
  modules,
}: {
  /** Every chapter's link, keyed `slug/chapter` (`chapterProgressId`). */
  places: Record<string, ResumePlace>;
  /** The built modules, in order. */
  modules: readonly PathStop[];
}) {
  const { progress } = useProgress();
  const done = (slug: string) => progress.completed.includes(slug);
  const place = progress.resume;
  const resume =
    place && !done(place.slug)
      ? places[chapterProgressId(place.slug, place.chapter)]
      : undefined;
  const finished = modules.filter((m) => done(m.slug)).length;
  const after = modules.find((m) => m.slug === place?.slug)?.number ?? 0;
  const next =
    modules.find((m) => m.number > after && !done(m.slug)) ??
    modules.find((m) => !done(m.slug));

  let heading: string;
  let action: { href: string; label: string };
  if (resume) {
    heading = 'Pick up where you left off';
    action = {
      href: resume.href,
      label: `Resume module ${resume.moduleNumber}: ${resume.chapterTitle}`,
    };
  } else if (next && finished === 0 && !place) {
    heading = 'New here? Start at the beginning.';
    action = { href: next.href, label: `Start with ${next.title}` };
  } else if (next) {
    heading = 'Ready for the next module';
    action = {
      href: next.href,
      label: `Continue with module ${next.number}: ${next.title}`,
    };
  } else {
    heading = 'Every module finished. TLS 1.3 comes next.';
    action = { href: modules[0].href, label: `Revisit ${modules[0].title}` };
  }

  return (
    <div className="border-border bg-surface flex flex-col gap-3 rounded-(--radius) border p-4 md:flex-row md:items-center md:justify-between md:p-5">
      <div className="flex flex-col gap-1">
        <p className="font-medium">{heading}</p>
        <p className="text-fg-secondary text-sm" data-testid="path-progress">
          {finished} of {modules.length} modules finished. Your progress stays in this
          browser.
        </p>
      </div>
      <Link
        href={action.href}
        className="bg-accent text-accent-fg focus-visible:outline-focus min-h-target inline-flex items-center gap-2 self-start rounded-md px-4 text-sm font-medium hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 md:self-auto"
      >
        {action.label}
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
