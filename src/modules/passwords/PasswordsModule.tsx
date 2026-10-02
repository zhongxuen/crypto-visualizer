'use client';

import { ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

import { HexBinToggle, useByteFormat } from '@/components/blocks';
import { StepInspector } from '@/components/inspector';
import { ChapterContext, ChapterTabs } from '@/components/lesson';
import { ModuleLayout, type ModuleMode } from '@/components/shell';
import { useDeferredImport, useProgress, useShareState } from '@/components/state';
import {
  BUTTON,
  PhaseStepper,
  StepCaption,
  TimelineBar,
  useRunView,
} from '@/components/timeline';
import { PASSWORDS_SHARE, type PasswordsChapter } from '@/core/kdf/share';
import type { PasswordsShareState } from '@/core/kdf/state';

import { AttackerTable, tableStateAt, UsersTable } from './components/UsersView';
import { PASSWORDS_PAGE_CITATIONS } from './citations';
import { PASSWORDS_CHAPTER_LIST, PASSWORDS_META } from './meta';
import { EMPTY_RUN, tableRunFor } from './tableRun';

type Input = PasswordsShareState['input'];
const DEFAULTS = PASSWORDS_SHARE.defaults.input;

/**
 * PBKDF2's run, and the PBKDF2 and cost views, loaded right after hydration.
 * Free play's inputs come with it too: not through `next/dynamic`, whose loader alone
 * costs more first-load JS than any of the forms (phase 10's budget).
 */
const loadRuns = () => import('./runs');

function isDefaultInput(input: Input): boolean {
  return (Object.keys(DEFAULTS) as (keyof Input)[]).every(
    (key) => key === 'chapter' || input[key] === DEFAULTS[key],
  );
}

/**
 * Module 3. Renders `src/core/kdf` runs; computes no crypto itself (the full PBKDF2 count
 * runs core's `pbkdf2` in a Web Worker).
 *
 * PRIVACY: the password a learner types lives only in the `typed` state below. It is
 * never passed to `setState` (the share link) or to `useProgress` (localStorage), and
 * the share-state codec refuses password-like keys even if it were.
 * `PasswordsModule.test.tsx` checks both.
 */
export function PasswordsModule({ walkthrough }: { walkthrough?: ReactNode }) {
  const share = useShareState(PASSWORDS_SHARE);
  const { state, setState, linked } = share;
  const [modeChoice, setModeChoice] = useState<ModuleMode | null>(null);
  const mode: ModuleMode =
    modeChoice ?? (linked && !isDefaultInput(linked.input) ? 'free' : 'walkthrough');
  const [typed, setTyped] = useState('');
  const chapter = state.input.chapter;
  const [format, setFormat] = useByteFormat();
  const { markComplete, progress } = useProgress();

  const { exampleId, iterations } = state.input;
  const runs = useDeferredImport(loadRuns);
  const loading = chapter === 'pbkdf2' && runs === null;
  const result = useMemo(
    () =>
      chapter !== 'pbkdf2'
        ? tableRunFor(mode, state.input, state.seed, typed)
        : runs
          ? runs.passwordsRunFor(mode, state.input, state.seed, typed)
          : EMPTY_RUN,
    // Only the inputs a run depends on; the cost sliders and step must not rebuild it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, chapter, exampleId, iterations, state.seed, typed, runs],
  );

  const view = useRunView(result, {
    // Held back until the run exists, or a link's step would land on an empty run.
    initialStep: loading ? undefined : linked?.step,
    onStep: (step) =>
      setState((current) => (current.step === step ? current : { ...current, step })),
  });

  const chapterIndex = PASSWORDS_CHAPTER_LIST.findIndex((c) => c.id === chapter);
  const lastChapter = chapterIndex === PASSWORDS_CHAPTER_LIST.length - 1;

  useEffect(() => {
    if (mode === 'walkthrough' && lastChapter) markComplete(PASSWORDS_META.slug);
  }, [mode, lastChapter, markComplete]);

  const selectChapter = (id: PasswordsChapter) =>
    setState((current) => ({
      ...current,
      step: 0,
      input: { ...current.input, chapter: id },
    }));
  const setInput = (patch: Partial<Input>) =>
    setState((current) => ({ ...current, input: { ...current.input, ...patch } }));

  const event = view.event;
  const hasRun = result.events.length > 0;
  const table = event ? tableStateAt(result.events, view.index) : null;

  return (
    <ModuleLayout
      citations={PASSWORDS_PAGE_CITATIONS}
      title={PASSWORDS_META.title}
      intro={PASSWORDS_META.intro}
      slug={PASSWORDS_META.slug}
      step={view.index}
      share={share}
      mode={mode}
      onModeChange={setModeChoice}
      chapters={
        <ChapterTabs
          chapters={PASSWORDS_CHAPTER_LIST}
          current={chapter}
          onSelect={selectChapter}
          done={
            progress.completed.includes(PASSWORDS_META.slug)
              ? PASSWORDS_CHAPTER_LIST.map((c) => c.id)
              : []
          }
        />
      }
      tools={
        chapter === 'pbkdf2' ? <HexBinToggle value={format} onChange={setFormat} /> : null
      }
      lesson={
        <ChapterContext.Provider value={chapter}>{walkthrough}</ChapterContext.Provider>
      }
      controls={
        mode === 'free' && chapter !== 'cost' && runs ? (
          <runs.FreePlayInputs
            chapter={chapter}
            input={state.input}
            onChange={(patch) =>
              setState((current) => ({
                ...current,
                step: 0,
                input: { ...current.input, ...patch },
              }))
            }
            typed={typed}
            onTyped={setTyped}
          />
        ) : null
      }
      inspector={
        hasRun ? (
          <>
            <StepInspector event={event} />
            <PhaseStepper
              phases={result.phases}
              currentIndex={view.phaseIndex}
              onSeek={(time) => view.store.getState().seek(time)}
            />
          </>
        ) : undefined
      }
      timeline={hasRun ? <TimelineBar store={view.store} result={result} /> : undefined}
    >
      {hasRun ? (
        <StepCaption
          index={view.index}
          count={result.events.length}
          group={event?.group}
          label={event?.label}
        />
      ) : null}

      {(chapter === 'cost' || chapter === 'pbkdf2') && !runs ? (
        <p className="text-fg-muted">Loading this chapter…</p>
      ) : null}

      {chapter === 'cost' && runs ? (
        <runs.CostView input={state.input} onChange={setInput} />
      ) : null}

      {event && table && (chapter === 'lookup' || chapter === 'salt') ? (
        <div className="flex flex-col gap-4">
          <UsersTable
            users={table.users}
            salted={table.salted}
            lookups={table.lookups}
            current={event.kind === 'kdf.lookup' ? event.name : undefined}
          />
          {event.kind === 'kdf.table' ? <AttackerTable event={event} /> : null}
        </div>
      ) : null}

      {event && chapter === 'pbkdf2' && runs ? (
        <runs.Pbkdf2Chapter
          event={event}
          format={format}
          run={result}
          request={() => runs.pbkdf2Request(mode, state.input, typed)}
        />
      ) : null}

      {mode === 'walkthrough' && view.atEnd && !lastChapter ? (
        <button
          type="button"
          className={`${BUTTON} self-start`}
          onClick={() => selectChapter(PASSWORDS_CHAPTER_LIST[chapterIndex + 1].id)}
        >
          Next chapter: {PASSWORDS_CHAPTER_LIST[chapterIndex + 1].title}
          <ChevronRight aria-hidden="true" className="size-4" />
        </button>
      ) : null}
    </ModuleLayout>
  );
}
