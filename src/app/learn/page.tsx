import { Clock } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { MODULES } from '@/modules/registry';

import { ProgressNode } from '../_home/ProgressNode';
import { ChapterLinks, ResumeCard, type ResumePlace } from './LearnProgress';
import { learningPath, type PathModule } from './path';

export const metadata: Metadata = {
  title: 'The learning path',
  description:
    'Six modules in order, from one byte to a key exchange: every chapter, how long each takes, and what you will be able to explain at the end.',
};

/**
 * `/learn` (docs/UIUX.md §2.1 P1, §4.1): the learning path at full size. Every module in
 * teaching order, its chapters as links straight into the walkthrough, ticks from the
 * learner's own progress, and "resume where you left off". A server component; only the
 * ticks and the resume card read progress on the client.
 */

const TITLES = new Map(MODULES.map((m) => [m.slug, m.title]));

/** The modules that build on `slug`: where its ideas are used next. */
function leadsTo(slug: string): string[] {
  return MODULES.filter((m) => m.buildsOn.includes(slug)).map((m) => m.title);
}

export default function LearnPage() {
  const path = learningPath();
  const ready = path.filter((m) => m.entry.status === 'ready');
  const places: Record<string, ResumePlace> = {};
  for (const { entry, chapters } of ready) {
    for (const chapter of chapters) {
      places[`${entry.slug}/${chapter.id}`] = {
        href: chapter.href,
        moduleNumber: entry.number,
        moduleTitle: entry.title,
        chapterTitle: chapter.title,
      };
    }
  }
  const minutes = ready.reduce((sum, m) => sum + m.entry.minutes, 0);

  return (
    <main
      id="main"
      className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-10"
    >
      <header className="flex flex-col gap-3">
        <p className="text-accent text-sm font-semibold tracking-wide uppercase">
          The learning path
        </p>
        <h1 className="font-display text-4xl">From one byte to a key exchange</h1>
        <p className="text-fg-secondary text-lg leading-8">
          {ready.length} modules, about {Math.round(minutes / 5) * 5} minutes in all. Each
          builds on the ones before it, so the path runs in order, but every chapter below
          opens on its own.
        </p>
      </header>

      <ResumeCard
        places={places}
        start={{ href: ready[0].entry.route, title: ready[0].entry.title }}
        total={ready.length}
      />

      <ol className="flex flex-col gap-4" aria-label="Modules in order">
        {path.map((module) => (
          <li key={module.entry.slug} id={module.entry.slug} className="scroll-mt-6">
            <ModuleStop module={module} />
          </li>
        ))}
      </ol>
    </main>
  );
}

function ModuleStop({ module: { entry, chapters, learned } }: { module: PathModule }) {
  const ready = entry.status === 'ready';
  const builds = entry.buildsOn.map((slug) => TITLES.get(slug)).filter(Boolean);
  const next = ready ? leadsTo(entry.slug) : [];

  return (
    <article
      aria-labelledby={`${entry.slug}-heading`}
      className={
        ready
          ? 'border-border bg-surface grid gap-5 rounded-(--radius) border border-l-4 border-l-(--tint) p-4 md:grid-cols-[minmax(0,1fr)_16rem] md:p-5'
          : 'border-border-strong text-fg-secondary flex flex-col gap-3 rounded-(--radius) border border-dashed p-4 md:p-5'
      }
      style={{ '--tint': `var(--tint-${entry.slug})` } as React.CSSProperties}
      data-status={entry.status}
    >
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex items-center gap-3">
          <ProgressNode slug={entry.slug} number={entry.number} ready={ready} />
          <h2
            id={`${entry.slug}-heading`}
            className="font-display text-2xl leading-tight"
          >
            <span className="sr-only">Module {entry.number}: </span>
            {ready ? (
              <Link
                href={entry.route}
                className="focus-visible:outline-focus rounded-sm hover:underline focus-visible:outline-2"
              >
                {entry.title}
              </Link>
            ) : (
              entry.title
            )}
          </h2>
        </div>
        <p className="text-fg-secondary leading-7">{entry.blurb}</p>
        <p className="text-fg-muted flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="inline-flex items-center gap-1">
            <Clock aria-hidden="true" className="size-4" />
            About {entry.minutes} min
          </span>
          <span>
            {builds.length > 0 ? `Builds on ${builds.join(', ')}` : 'Start here'}
          </span>
          {next.length > 0 ? <span>Leads to {next.join(', ')}</span> : null}
          {ready ? null : <span className="font-medium">Coming next</span>}
        </p>
        {learned.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            <h3 className="text-sm font-semibold">By the end you can explain</h3>
            <ul className="text-fg-secondary flex list-disc flex-col gap-1 ps-5 text-sm leading-6">
              {learned.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
      {chapters.length > 0 ? (
        <nav aria-label={`${entry.title} chapters`} className="flex flex-col gap-1">
          <h3 className="px-2 text-sm font-semibold">Chapters</h3>
          <ChapterLinks slug={entry.slug} chapters={chapters} />
        </nav>
      ) : null}
    </article>
  );
}
