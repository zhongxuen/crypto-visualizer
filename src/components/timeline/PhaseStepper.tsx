'use client';

import { Check, CircleDot } from 'lucide-react';
import { memo, useLayoutEffect, useRef } from 'react';

import type { PhaseSummary } from '@/core/sim/result';
import { cn } from '@/lib/cn';

/**
 * The groups of the run, in order, with the current one marked.
 *
 * ADAPTED from Internet Visualizer `src/components/viz/PhaseStepper.tsx` at 59ae4ad (see
 * VENDORED.md). Kept: an ordered list with a real button per group that seeks, and the
 * current group marked by an icon and the word "Now" as well as colour. Dropped: the
 * glossary links and the Simple / Full detail voices. Under reduced motion this list is
 * the primary way through a run.
 *
 * Long runs (UIUX B10): phases named "Block 1 · Schedule", "Block 1 · Rounds 1–8", ...
 * are gathered under their shared prefix. Only the group holding the current phase is
 * open; the others fold to one row that seeks to their start. The current phase is kept
 * in view inside whatever box scrolls the list, never by scrolling the page.
 */

export interface PhaseStepperProps {
  phases: readonly PhaseSummary[];
  currentIndex: number;
  onSeek: (time: number) => void;
  className?: string;
}

/** Runs of at least this many phases with one prefix are grouped. */
const GROUP_MIN = 3;
const SEPARATOR = ' · ';

export interface PhaseGroup {
  /** The shared prefix, or `null` for a phase that stands alone. */
  name: string | null;
  phases: PhaseSummary[];
}

/** Gather consecutive phases that share a "Prefix · " into groups. */
export function groupPhases(phases: readonly PhaseSummary[]): PhaseGroup[] {
  const prefixOf = (title: string) =>
    title.includes(SEPARATOR) ? title.slice(0, title.indexOf(SEPARATOR)) : null;
  const runs: PhaseGroup[] = [];
  for (const phase of phases) {
    const prefix = prefixOf(phase.title);
    const last = runs[runs.length - 1];
    if (last && prefix !== null && last.name === prefix) last.phases.push(phase);
    else runs.push({ name: prefix, phases: [phase] });
  }
  // A short run isn't worth a group: its phases stand alone.
  return runs.flatMap((run) =>
    run.name !== null && run.phases.length < GROUP_MIN
      ? run.phases.map((phase) => ({ name: null, phases: [phase] }))
      : [run],
  );
}

/** Scroll `node` into view within its nearest scrolling ancestor, leaving the page be. */
function keepInView(node: HTMLElement): void {
  let box = node.parentElement;
  while (box && box !== document.body) {
    const { overflowY } = getComputedStyle(box);
    if (
      (overflowY === 'auto' || overflowY === 'scroll') &&
      box.scrollHeight > box.clientHeight
    ) {
      const top = node.getBoundingClientRect().top - box.getBoundingClientRect().top;
      if (top < 0) box.scrollTop += top - 8;
      else if (top + node.offsetHeight > box.clientHeight) {
        box.scrollTop += top + node.offsetHeight - box.clientHeight + 8;
      }
      return;
    }
    box = box.parentElement;
  }
}

function Finished() {
  return (
    <>
      <Check aria-hidden="true" className="text-ok size-3.5" />
      <span className="sr-only">Finished</span>
    </>
  );
}

const ROW =
  'focus-visible:outline-focus flex min-h-target w-full gap-2 rounded-md border px-2 py-1.5 text-left text-sm focus-visible:outline-2 md:min-h-0';

function PhaseButton({
  phase,
  title,
  currentIndex,
  onSeek,
}: {
  phase: PhaseSummary;
  title: string;
  currentIndex: number;
  onSeek: (time: number) => void;
}) {
  const current = phase.index === currentIndex;
  const done = phase.index < currentIndex;
  return (
    <button
      type="button"
      onClick={() => onSeek(phase.startMs)}
      aria-current={current ? 'step' : undefined}
      className={cn(
        ROW,
        'items-start',
        current
          ? 'border-accent bg-surface'
          : 'hover:bg-surface-overlay border-transparent',
      )}
    >
      <span className="text-fg-muted w-6 shrink-0 font-mono text-xs">
        {phase.index + 1}
      </span>{' '}
      <span className="min-w-0 flex-1">
        <span className={cn('block', current ? 'font-semibold' : 'text-fg-secondary')}>
          {title}
        </span>
        {current && phase.description ? (
          <span className="text-fg-muted block text-xs">{phase.description}</span>
        ) : null}
      </span>{' '}
      <span className="text-fg-muted flex shrink-0 items-center gap-0.5 text-xs">
        {current ? (
          <>
            <CircleDot aria-hidden="true" className="text-accent size-3" />
            Now
          </>
        ) : done ? (
          <Finished />
        ) : null}
      </span>
    </button>
  );
}

export const PhaseStepper = memo(function PhaseStepper({
  phases,
  currentIndex,
  onSeek,
  className,
}: PhaseStepperProps) {
  const list = useRef<HTMLOListElement>(null);

  useLayoutEffect(() => {
    const node = list.current?.querySelector<HTMLElement>('[aria-current="step"]');
    if (node) keepInView(node);
  }, [currentIndex]);

  if (phases.length === 0) {
    return (
      <p className={cn('text-fg-muted text-sm', className)}>This run has no groups.</p>
    );
  }

  return (
    <>
      <h2 className="font-display mb-1 text-lg">Phases</h2>
      <ol
        ref={list}
        aria-label="Groups"
        className={cn('flex flex-col gap-0.5', className)}
      >
        {groupPhases(phases).map((group) => {
          if (group.name === null) {
            const phase = group.phases[0];
            return (
              <li key={phase.id}>
                <PhaseButton
                  phase={phase}
                  title={phase.title}
                  currentIndex={currentIndex}
                  onSeek={onSeek}
                />
              </li>
            );
          }
          const name = group.name;
          const first = group.phases[0];
          const last = group.phases[group.phases.length - 1];
          const open = currentIndex >= first.index && currentIndex <= last.index;
          return (
            <li key={first.id}>
              {open ? (
                <>
                  <p className="text-fg-muted px-2 pt-1 text-xs font-semibold tracking-wide uppercase">
                    {name}
                  </p>
                  <ol className="border-border ml-3 flex flex-col gap-0.5 border-l pl-1">
                    {group.phases.map((phase) => (
                      <li key={phase.id}>
                        <PhaseButton
                          phase={phase}
                          title={phase.title.slice(name.length + SEPARATOR.length)}
                          currentIndex={currentIndex}
                          onSeek={onSeek}
                        />
                      </li>
                    ))}
                  </ol>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => onSeek(first.startMs)}
                  className={cn(
                    ROW,
                    'hover:bg-surface-overlay items-center border-transparent',
                  )}
                >
                  <span className="text-fg-muted w-6 shrink-0 font-mono text-xs">
                    {first.index + 1}
                  </span>{' '}
                  <span className="text-fg-secondary flex-1">
                    {name}{' '}
                    <span className="text-fg-muted">· {group.phases.length} phases</span>
                  </span>
                  {currentIndex > last.index ? <Finished /> : null}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </>
  );
});
