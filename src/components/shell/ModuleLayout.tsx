'use client';

import { BookOpen, ChevronUp } from 'lucide-react';
import {
  useCallback,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from 'react';

import { CitationsProvider } from '@/components/inspector/CitationsContext';
import { StepTransitionProvider } from '@/components/motion/useStepTransition';
import { ShareLinkContext, type ShareLink } from '@/components/state/ShareLinkContext';
import type { CitationRegistry } from '@/core/citations/registry';
import { cn } from '@/lib/cn';
import { MODULES } from '@/modules/registry';

import { DisclaimerBanner } from './DisclaimerBanner';
import { MoreMenu } from './Menus';
import { useDismiss } from './useDismiss';

/**
 * The module workspace (docs/UIUX.md §4.3): every module page is laid out by this.
 *
 * - **Header**: module number and title, chapter tabs, the mode switch in a fixed slot
 *   (B9), a "More options" menu and the "For learning only" chip.
 * - **Stage**: the visual, on squared paper, as large as it can be. In free play the
 *   inputs sit just above it in a "Your input" card.
 * - **Lesson rail**: the chapter's prose, the step's "Why?" and the phase list. A column
 *   beside the stage from `lg`; below it, a bottom sheet with a one-line peek, so the
 *   picture is on the first screen on a phone too (P2). Free play keeps the lesson, folded
 *   (P8).
 * - **Dock**: the timeline, pinned to the bottom of the viewport.
 */

export type ModuleMode = 'walkthrough' | 'free';

const noSubscribe = () => () => {};

export interface ModuleLayoutProps {
  title: string;
  intro: string;
  /** The module's registry slug: its number and tint come from the registry. */
  slug?: string;
  /** The citations this module's steps cite: its own registry, not the whole site's. */
  citations: CitationRegistry;
  mode?: ModuleMode;
  onModeChange?: (mode: ModuleMode) => void;
  /** The chapter tabs, in the header. */
  chapters?: ReactNode;
  /** Display options (hex or binary), in the header's "More options" menu. */
  tools?: ReactNode;
  /** The chapter's prose, at the top of the lesson rail. */
  lesson?: ReactNode;
  /** Just above the visual: free play's inputs, or a picker the chapter needs. */
  controls?: ReactNode;
  /** The main picture. */
  children: ReactNode;
  /** In the lesson rail, under the prose: the step's "Why?" and the phase list. */
  inspector?: ReactNode;
  /** The dock, pinned to the bottom of the viewport. */
  timeline?: ReactNode;
  /** The step on screen, for the motion primitives (`useStepTransition`). */
  step?: number;
  /** The page's share state: the dock's "Copy link" uses it, and e2e waits for `ready`. */
  share?: ShareLink & { ready: boolean };
  className?: string;
}

const MODES: { id: ModuleMode; label: string }[] = [
  { id: 'walkthrough', label: 'Walkthrough' },
  { id: 'free', label: 'Free play' },
];

/** Walkthrough or free play: a segmented control whose active pill slides. */
export function ModeSwitch({
  mode,
  onModeChange,
}: {
  mode: ModuleMode;
  onModeChange: (mode: ModuleMode) => void;
}) {
  const index = MODES.findIndex((option) => option.id === mode);
  return (
    <div
      role="group"
      aria-label="Mode"
      className="border-border bg-surface-overlay relative grid grid-cols-2 rounded-md border p-0.5"
    >
      <span
        aria-hidden="true"
        className="bg-surface absolute inset-y-0.5 left-0.5 w-[calc(50%-0.125rem)] rounded-[5px] shadow-sm transition-transform duration-(--dur-quick) ease-(--ease-out)"
        style={{ transform: `translateX(${index * 100}%)` }}
      />
      {MODES.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={mode === option.id}
          onClick={() => onModeChange(option.id)}
          className={cn(
            'focus-visible:outline-focus min-h-target relative rounded-[5px] px-3 text-sm whitespace-nowrap focus-visible:outline-2 md:min-h-8',
            mode === option.id
              ? 'text-fg font-medium'
              : 'text-fg-secondary hover:text-fg',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** The lesson rail: a column from `lg`, a bottom sheet with a peek below it. */
function LessonRail({
  lesson,
  inspector,
  mode,
}: {
  lesson?: ReactNode;
  inspector?: ReactNode;
  mode?: ModuleMode;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLElement>(null);
  const peek = useRef<HTMLButtonElement>(null);
  const id = useId();
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, root, peek);

  return (
    <aside
      ref={root}
      aria-label="Lesson"
      className={cn(
        'border-border bg-surface fixed inset-x-0 bottom-(--dock-h) z-20 flex max-h-[70vh] flex-col border-t shadow-[0_-8px_24px_-12px_rgb(0_0_0/0.25)]',
        'lg:sticky lg:top-4 lg:bottom-auto lg:z-auto lg:max-h-[calc(100vh-var(--dock-h)-2rem)] lg:min-w-0 lg:self-start lg:border-0 lg:bg-transparent lg:shadow-none',
      )}
    >
      <button
        ref={peek}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
        className="focus-visible:outline-focus min-h-target flex w-full items-center gap-2 px-4 text-left text-sm font-medium focus-visible:outline-2 focus-visible:-outline-offset-2 lg:hidden"
      >
        <BookOpen aria-hidden="true" className="text-accent size-4" />
        <span className="flex-1">Lesson, why and phases</span>
        <ChevronUp
          aria-hidden="true"
          className={cn('size-4 transition-transform', open && 'rotate-180')}
        />
      </button>
      <div
        id={id}
        className={cn(
          'min-h-0 flex-col gap-4 overflow-y-auto overscroll-contain px-4 pb-4 lg:flex lg:px-0 lg:pb-0',
          open ? 'flex' : 'hidden',
        )}
      >
        {lesson ? (
          mode === 'free' ? (
            <details className="border-border bg-surface rounded-lg border px-4 py-2">
              <summary className="min-h-target cursor-pointer py-2 text-sm font-medium md:min-h-0">
                The lesson for this chapter
              </summary>
              {lesson}
            </details>
          ) : (
            <section aria-label="Lesson text">{lesson}</section>
          )
        ) : null}
        {inspector}
      </div>
    </aside>
  );
}

export function ModuleLayout({
  title,
  intro,
  slug,
  citations,
  mode,
  onModeChange,
  chapters,
  tools,
  lesson,
  controls,
  children,
  inspector,
  timeline,
  step = 0,
  share,
  className,
}: ModuleLayoutProps) {
  const entry = slug ? MODULES.find((m) => m.slug === slug) : undefined;
  // True once React has hydrated (the keyboard shortcuts work from then on). e2e waits for
  // `data-hydrated` before pressing keys on a page with no share state.
  const hydrated = useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false,
  );
  const hasRail = Boolean(lesson || inspector);
  const style = {
    '--dock-h': timeline ? '3.75rem' : '0px',
    '--tint': entry ? `var(--tint-${entry.slug})` : 'var(--accent)',
  } as CSSProperties;

  return (
    <CitationsProvider citations={citations}>
      <ShareLinkContext.Provider value={share ?? null}>
        <StepTransitionProvider step={step}>
          <div
            className={cn(
              'flex flex-1 flex-col',
              // At least a screen below the 56 px header, so the dock (sticky) always
              // sits on the bottom edge, where the lesson sheet (fixed) expects it,
              // even when the stage is short.
              timeline && 'min-h-[calc(100dvh-3.5rem)]',
              className,
            )}
            style={style}
            data-share-ready={share ? share.ready : undefined}
            data-hydrated={hydrated || undefined}
          >
            <main
              id="main"
              className={cn(
                'mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-4 pt-4 md:pt-6',
                hasRail ? 'pb-16 lg:pb-6' : 'pb-6',
              )}
            >
              <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 border-b-2 border-(--tint) pb-3 [grid-template-areas:'title_more''tabs_tabs''mode_mode''chip_chip'] lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:[grid-template-areas:'title_more_mode''tabs_chip_chip']">
                <div className="flex min-w-0 flex-col gap-0.5 [grid-area:title]">
                  {entry ? (
                    <p className="font-display text-sm text-(--tint)">
                      Module {String(entry.number).padStart(2, '0')}
                    </p>
                  ) : null}
                  <h1 className="font-display text-2xl leading-tight md:text-3xl">
                    {title}
                  </h1>
                  <p className="text-fg-secondary text-sm md:text-base">{intro}</p>
                </div>
                {mode && onModeChange ? (
                  <div className="[grid-area:mode]">
                    <ModeSwitch mode={mode} onModeChange={onModeChange} />
                  </div>
                ) : null}
                {tools ? (
                  <div className="justify-self-end [grid-area:more]">
                    <MoreMenu>{tools}</MoreMenu>
                  </div>
                ) : null}
                {chapters ? (
                  <div className="min-w-0 [grid-area:tabs]">{chapters}</div>
                ) : null}
                <DisclaimerBanner className="min-w-0 [grid-area:chip] lg:justify-self-end" />
              </header>

              <div
                className={cn(
                  'grid gap-6',
                  hasRail && 'lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]',
                )}
              >
                <div className="flex min-w-0 flex-col gap-4">
                  {controls ? (
                    <section aria-label="Your input" className="flex flex-col gap-3">
                      {controls}
                    </section>
                  ) : null}
                  <section
                    aria-label="Visualization"
                    className="border-border bg-paper flex min-w-0 flex-col gap-4 rounded-(--radius) border p-3 md:p-5"
                  >
                    {children}
                  </section>
                </div>
                {hasRail ? (
                  <LessonRail lesson={lesson} inspector={inspector} mode={mode} />
                ) : null}
              </div>
            </main>
            {timeline ? (
              <div
                role="region"
                aria-label="Timeline"
                className="border-border bg-surface/95 sticky bottom-0 z-30 border-t backdrop-blur"
              >
                <div className="mx-auto max-w-7xl px-2 md:px-4">{timeline}</div>
              </div>
            ) : null}
          </div>
        </StepTransitionProvider>
      </ShareLinkContext.Provider>
    </CitationsProvider>
  );
}
