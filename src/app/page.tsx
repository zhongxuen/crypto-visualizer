import { ArrowRight, Clock } from 'lucide-react';
import Link from 'next/link';

import { bytesToHex } from '@/core/bytes/hex';
import { utf8Decode, utf8Encode } from '@/core/bytes/utf8';
import { xor } from '@/core/xor/xor';
import { SITE } from '@/lib/site';
import { MODULES, type ModuleEntry } from '@/modules/registry';

import { HOME_FACTS } from './_home/facts';
import { ProgressNode } from './_home/ProgressNode';
import { XorDemo, type DemoStage } from './_home/XorDemo';

/**
 * The home page (docs/UIUX.md §2.1 P1, §4.1): one way in ("Start with module 1"), the
 * modules as a numbered learning path with a time and "builds on" each, and what backs
 * the site's claim to be correct. A server component; only the demo's pause-off-screen
 * and the progress rings run on the client.
 */

const TITLES = new Map(MODULES.map((entry) => [entry.slug, entry.title]));

/** The hero demo's stages, worked out by core: "Hi", masked and unmasked. */
function demoStages(): DemoStage[] {
  const hex = (bytes: ArrayLike<number>) => bytesToHex(Uint8Array.from(bytes), ' ');
  const message = utf8Encode('Hi');
  const key = Uint8Array.from([0x4a, 0x34]);
  const masked = xor(message, key);
  const unmasked = xor(masked, key);
  return [
    { label: 'Text', value: '“Hi”', kind: 'text' },
    { label: 'As UTF-8 bytes', value: hex(message), kind: 'bytes' },
    { label: '⊕ the key', value: hex(key), kind: 'key' },
    { label: 'Masked', value: hex(masked), kind: 'bytes' },
    { label: '⊕ the same key', value: hex(key), kind: 'key' },
    { label: 'Unmasked', value: hex(unmasked), kind: 'bytes' },
    {
      label: 'Text again',
      value: `“${utf8Decode(Uint8Array.from(unmasked))}”`,
      kind: 'text',
    },
  ];
}

export default function Home() {
  const first = MODULES[0];
  return (
    <main id="main" className="flex w-full flex-1 flex-col">
      <section aria-labelledby="hero-heading" className="border-border border-b">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-12 md:py-20 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-5">
            <p className="text-accent text-sm font-semibold tracking-wide uppercase">
              Cryptography, one step at a time
            </p>
            <h1 id="hero-heading" className="font-display text-4xl md:text-5xl">
              {SITE.name}
            </h1>
            <p className="text-fg-secondary max-w-xl text-lg leading-8">{SITE.tagline}</p>
            <p className="text-fg-secondary max-w-xl">
              Six short modules, from a single byte to a key exchange. Each one steps
              through a real algorithm, forwards and back, with every value on screen.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={first.route}
                className="bg-accent text-accent-fg focus-visible:outline-focus min-h-target inline-flex items-center gap-2 rounded-md px-5 font-medium hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                Start with module 1
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
              <a
                href="#path"
                className="text-fg-secondary hover:text-fg focus-visible:outline-focus min-h-target inline-flex items-center rounded-md px-3 underline underline-offset-4 focus-visible:outline-2"
              >
                Pick a topic
              </a>
            </div>
          </div>
          <XorDemo
            stages={demoStages()}
            caption={
              <>
                XOR the bytes of “Hi” with a key and they turn to noise; XOR them with the
                same key and the text comes back. That is module 1.
              </>
            }
          />
        </div>
      </section>

      <section
        id="path"
        aria-labelledby="modules-heading"
        className="mx-auto flex w-full max-w-6xl scroll-mt-4 flex-col gap-6 px-4 py-12"
      >
        <div className="flex flex-col gap-2">
          <h2 id="modules-heading" className="font-display text-3xl">
            Modules
          </h2>
          <p className="text-fg-secondary max-w-2xl">
            The modules build on each other, so the path runs in order. Each says what it
            builds on, if you’d rather jump ahead.
          </p>
        </div>
        <ol className="learning-path grid gap-x-6 gap-y-4 md:grid-cols-2 lg:grid-cols-4">
          {MODULES.map((entry) => (
            <li
              key={entry.slug}
              id={`module-${entry.slug}`}
              className="relative scroll-mt-6"
            >
              <ModuleCard entry={entry} />
            </li>
          ))}
        </ol>
      </section>

      <section
        aria-labelledby="facts-heading"
        className="border-border bg-surface border-t"
      >
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-12">
          <h2 id="facts-heading" className="font-display text-3xl">
            How we know it’s right
          </h2>
          <ul className="grid gap-4 md:grid-cols-3">
            {HOME_FACTS.map((fact) => (
              <li key={fact.figure}>
                <Link
                  href={fact.href}
                  className="border-border bg-bg hover:border-border-strong focus-visible:outline-focus flex h-full flex-col gap-1 rounded-(--radius) border p-5 focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  <span className="font-display text-accent text-4xl">{fact.figure}</span>
                  <span className="font-medium">{fact.title}</span>
                  <span className="text-fg-secondary text-sm">{fact.detail}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}

function ModuleCard({ entry }: { entry: ModuleEntry }) {
  const ready = entry.status === 'ready';
  const builds = entry.buildsOn.map((slug) => TITLES.get(slug)).filter(Boolean);

  const body = (
    <>
      <div className="flex items-center gap-3">
        <ProgressNode slug={entry.slug} number={entry.number} ready={ready} />
        <h3 className="leading-snug font-semibold">
          <span className="sr-only">{entry.number}. </span>
          {entry.title}
        </h3>
      </div>
      <p className="text-fg-secondary text-sm leading-6">{entry.blurb}</p>
      <p className="text-fg-muted mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span className="inline-flex items-center gap-1">
          <Clock aria-hidden="true" className="size-3.5" />
          About {entry.minutes} min
        </span>
        <span>{builds.length > 0 ? `Builds on ${builds.join(', ')}` : 'Start here'}</span>
        {ready ? null : <span className="font-medium">Coming next</span>}
      </p>
    </>
  );

  const cardClass = 'flex h-full flex-col gap-3 rounded-(--radius) border p-5';

  if (!ready) {
    return (
      <article
        className={`${cardClass} border-border text-fg-secondary border-dashed`}
        data-status={entry.status}
      >
        {body}
      </article>
    );
  }

  return (
    <Link
      href={entry.route}
      className={`${cardClass} border-border bg-surface focus-visible:outline-focus transition-[translate,border-color] duration-(--dur-quick) hover:-translate-y-0.5 hover:border-(--tint) focus-visible:outline-2 focus-visible:outline-offset-2`}
      style={{ '--tint': `var(--tint-${entry.slug})` } as React.CSSProperties}
      data-status={entry.status}
    >
      <article className="flex h-full flex-col gap-3">{body}</article>
    </Link>
  );
}
