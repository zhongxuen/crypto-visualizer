import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

import { DisclaimerBanner } from './DisclaimerBanner';

/**
 * The page layout every module uses: title, one-line intro, the disclaimer, the mode
 * switch, then the visual area beside the inspector, with the timeline pinned to the
 * bottom of the viewport.
 */

export type ModuleMode = 'walkthrough' | 'free';

export interface ModuleLayoutProps {
  title: string;
  intro: string;
  mode?: ModuleMode;
  onModeChange?: (mode: ModuleMode) => void;
  /** Above the visual: inputs, chapter picker, lesson prose. */
  controls?: ReactNode;
  /** The main picture. */
  children: ReactNode;
  /** Beside the picture at `lg`, below it on narrow screens. */
  inspector?: ReactNode;
  /** Pinned to the bottom of the viewport. */
  timeline?: ReactNode;
  className?: string;
}

const MODES: { id: ModuleMode; label: string }[] = [
  { id: 'walkthrough', label: 'Walkthrough' },
  { id: 'free', label: 'Free play' },
];

export function ModeSwitch({
  mode,
  onModeChange,
}: {
  mode: ModuleMode;
  onModeChange: (mode: ModuleMode) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Mode"
      className="border-border bg-surface-overlay inline-flex rounded-md border p-0.5"
    >
      {MODES.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={mode === option.id}
          onClick={() => onModeChange(option.id)}
          className={cn(
            'focus-visible:outline-focus rounded-[5px] px-3 py-1 text-sm focus-visible:outline-2',
            mode === option.id
              ? 'bg-surface text-fg font-medium shadow-sm'
              : 'text-fg-secondary hover:text-fg',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function ModuleLayout({
  title,
  intro,
  mode,
  onModeChange,
  controls,
  children,
  inspector,
  timeline,
  className,
}: ModuleLayoutProps) {
  return (
    <div className={cn('flex flex-1 flex-col', className)}>
      <main
        id="main"
        className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-6"
      >
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="text-fg-secondary">{intro}</p>
          </div>
          {mode && onModeChange ? (
            <ModeSwitch mode={mode} onModeChange={onModeChange} />
          ) : null}
        </header>
        <DisclaimerBanner />
        {controls ? <div className="flex flex-col gap-3">{controls}</div> : null}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <section aria-label="Visualization" className="flex min-w-0 flex-col gap-4">
            {children}
          </section>
          {inspector ? (
            <aside aria-label="Step inspector" className="flex min-w-0 flex-col gap-3">
              {inspector}
            </aside>
          ) : null}
        </div>
      </main>
      {timeline ? (
        <div
          role="region"
          aria-label="Timeline"
          className="border-border bg-surface/95 sticky bottom-0 z-10 border-t backdrop-blur"
        >
          <div className="mx-auto max-w-6xl px-4 py-2">{timeline}</div>
        </div>
      ) : null}
    </div>
  );
}
