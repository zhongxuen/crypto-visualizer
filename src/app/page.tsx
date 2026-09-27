import Link from 'next/link';

import { SITE } from '@/lib/site';
import { MODULES, type ModuleEntry } from '@/modules/registry';

export default function Home() {
  return (
    <main
      id="main"
      className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-6 py-16 sm:py-24"
    >
      <header className="flex flex-col gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">{SITE.name}</h1>
        <p className="text-lg leading-8">{SITE.tagline}</p>
        <p className="text-fg-muted text-sm">{SITE.disclaimer}</p>
      </header>

      <section aria-labelledby="modules-heading" className="flex flex-col gap-4">
        <h2 id="modules-heading" className="text-xl font-semibold">
          Modules
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {MODULES.map((entry) => (
            <li key={entry.slug} id={`module-${entry.slug}`} className="scroll-mt-6">
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
          <span className="text-fg-muted mr-2 font-mono">{entry.number}.</span>{' '}
          {entry.title}
        </h3>
        <span className="border-border-strong text-fg-secondary shrink-0 rounded-full border px-2 py-0.5 text-xs">
          {ready ? 'Ready' : entry.phase === 2 ? 'Phase 2' : 'Planned'}
        </span>
      </div>
      <p className="text-fg-secondary text-sm leading-6">{entry.blurb}</p>
    </>
  );

  const cardClass =
    'flex h-full flex-col gap-2 rounded-lg border border-border bg-surface p-5';

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
      className={`${cardClass} hover:border-border-strong transition-colors focus-visible:outline-2 focus-visible:outline-offset-2`}
      data-status={entry.status}
    >
      <article className="flex flex-col gap-2">{body}</article>
    </Link>
  );
}
