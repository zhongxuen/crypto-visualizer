import Link from 'next/link';

import { SITE } from '@/lib/site';
import { MODULES, type ModuleEntry } from '@/modules/registry';

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-6 py-16 sm:py-24">
      <header className="flex flex-col gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">{SITE.name}</h1>
        <p className="text-lg leading-8">{SITE.tagline}</p>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {SITE.disclaimer}
        </p>
      </header>

      <section aria-labelledby="modules-heading" className="flex flex-col gap-4">
        <h2 id="modules-heading" className="text-xl font-semibold">
          Modules
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {MODULES.map((entry) => (
            <li key={entry.slug}>
              <ModuleCard entry={entry} />
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function ModuleCard({ entry }: { entry: ModuleEntry }) {
  const ready = entry.status === 'ready';

  const body = (
    <>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-semibold">
          <span className="mr-2 font-mono text-neutral-600 dark:text-neutral-400">
            {entry.number}.
          </span>{' '}
          {entry.title}
        </h3>
        <span className="shrink-0 rounded-full border border-neutral-300 px-2 py-0.5 text-xs text-neutral-700 dark:border-neutral-700 dark:text-neutral-300">
          {ready ? 'Ready' : entry.phase === 2 ? 'Phase 2' : 'Planned'}
        </span>
      </div>
      <p className="text-sm leading-6 text-neutral-700 dark:text-neutral-300">
        {entry.blurb}
      </p>
    </>
  );

  const cardClass =
    'flex h-full flex-col gap-2 rounded-lg border border-neutral-200 p-5 dark:border-neutral-800';

  if (!ready) {
    return (
      <article className={cardClass} data-status={entry.status}>
        {body}
      </article>
    );
  }

  return (
    <Link
      href={entry.route}
      className={`${cardClass} transition-colors hover:border-neutral-400 focus-visible:outline-2 focus-visible:outline-offset-2 dark:hover:border-neutral-600`}
      data-status={entry.status}
    >
      <article className="flex flex-col gap-2">{body}</article>
    </Link>
  );
}
