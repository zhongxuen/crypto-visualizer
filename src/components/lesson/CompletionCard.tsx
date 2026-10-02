'use client';

import { ArrowRight, Check, Map as MapIcon } from 'lucide-react';
import Link from 'next/link';
import { useId, type CSSProperties, type ReactNode } from 'react';

import { MODULES } from '@/modules/registry';

import { useReducedMotion } from '../timeline/useMediaQuery';

/**
 * The end of a module's walkthrough (docs/UIUX.md §2.1 P11): what the learner now knows,
 * in three bullets, and the next module on the path.
 *
 * It arrives with a short burst of hex digits (§7.1: 12 particles, 800 ms), which is
 * decoration only and never rendered under reduced motion; the card says everything.
 *
 * Shown only at the end of the last chapter, which is never a page's first screen, so
 * modules load it after hydration (it is re-exported from each module's `runs.ts`) and it
 * costs no first-load JS.
 */

const HEX = '0123456789abcdef';
const PARTICLES = 12;

/** The burst: twelve digits flung out from the top of the card, each on its own line. */
function HexBurst() {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute top-6 left-1/2">
      {Array.from({ length: PARTICLES }, (_, i) => {
        // Fanned upwards and out, spread evenly; the same every time (no randomness).
        const angle = Math.PI * (1.1 + (0.8 * i) / (PARTICLES - 1));
        const reach = i % 2 === 0 ? 90 : 60;
        const style = {
          '--dx': `${Math.round(Math.cos(angle) * reach * 1.6)}px`,
          '--dy': `${Math.round(Math.sin(angle) * reach)}px`,
          '--spin': `${(i % 3) * 40 - 40}deg`,
          animationDelay: `${(i % 4) * 30}ms`,
        } as CSSProperties;
        return (
          <span key={i} className="hex-confetti" style={style}>
            {HEX[(i * 5 + 3) % 16]}
          </span>
        );
      })}
    </span>
  );
}

export function CompletionCard({
  slug,
  learned,
  children,
}: {
  /** The module just finished: its registry slug. */
  slug: string;
  /** What the learner can now explain: three short sentences. */
  learned: readonly string[];
  /** One line on what to try next in this module, such as free play. */
  children?: ReactNode;
}) {
  const reduced = useReducedMotion();
  const heading = useId();
  const entry = MODULES.find((m) => m.slug === slug);
  const next = entry ? MODULES.find((m) => m.number === entry.number + 1) : undefined;

  return (
    <section
      aria-labelledby={heading}
      data-testid="completion-card"
      className="border-border bg-surface motion-reveal relative flex flex-col gap-4 overflow-hidden rounded-(--radius) border border-t-4 border-t-(--tint,var(--accent)) p-4 md:p-5"
    >
      {reduced ? null : <HexBurst />}
      <div className="flex flex-col gap-1">
        {entry ? (
          <p className="font-display text-sm text-(--tint,var(--accent))">
            Module {String(entry.number).padStart(2, '0')} complete
          </p>
        ) : null}
        <h2 id={heading} className="font-display text-xl">
          What you can now explain
        </h2>
      </div>
      <ul className="flex flex-col gap-2">
        {learned.map((line) => (
          <li key={line} className="flex gap-2 text-sm leading-6">
            <Check aria-hidden="true" className="text-ok mt-1 size-4 shrink-0" />
            <span>{line}</span>
          </li>
        ))}
      </ul>
      {children ? <p className="text-fg-secondary text-sm">{children}</p> : null}
      <div className="flex flex-wrap items-center gap-3">
        {next && next.status === 'ready' ? (
          <Link
            href={next.route}
            className="bg-accent text-accent-fg focus-visible:outline-focus min-h-target inline-flex items-center gap-2 rounded-md px-4 text-sm font-medium hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Next: {String(next.number).padStart(2, '0')} {next.title}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        ) : next ? (
          <p className="border-border-strong text-fg-secondary rounded-md border border-dashed px-3 py-2 text-sm">
            Next on the path: <strong className="font-medium">{next.title}</strong>,
            coming soon.
          </p>
        ) : null}
        <Link
          href="/learn"
          className="text-fg-secondary hover:text-fg focus-visible:outline-focus min-h-target inline-flex items-center gap-1.5 rounded-md px-1 text-sm underline underline-offset-4 focus-visible:outline-2"
        >
          <MapIcon aria-hidden="true" className="size-4" />
          The learning path
        </Link>
      </div>
    </section>
  );
}
