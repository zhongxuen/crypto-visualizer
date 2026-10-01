'use client';

import { ChevronRight } from 'lucide-react';
import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';

import { HexBinToggle, useByteFormat } from '@/components/blocks';
import { StepInspector } from '@/components/inspector';
import { ChapterContext, ChapterTabs } from '@/components/lesson';
import { ModuleLayout, type ModuleMode } from '@/components/shell';
import { useProgress, useShareState } from '@/components/state';
import {
  BUTTON,
  PhaseStepper,
  StepCaption,
  TimelineBar,
  useRunView,
} from '@/components/timeline';
import {
  PASSWORDS_SHARE,
  PBKDF2_EXAMPLES,
  type PasswordsChapter,
} from '@/core/kdf/share';
import type { PasswordsShareState } from '@/core/kdf/state';

import { CostView } from './components/CostView';
import { Pbkdf2View } from './components/Pbkdf2View';
import { AttackerTable, tableStateAt, UsersTable } from './components/UsersView';
import { PASSWORDS_CHAPTER_LIST, PASSWORDS_META } from './meta';
import { pbkdf2Inputs, passwordsRunFor } from './runs';
import { usePbkdf2Worker } from './usePbkdf2Worker';

type Input = PasswordsShareState['input'];
const DEFAULTS = PASSWORDS_SHARE.defaults.input;

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
  const job = usePbkdf2Worker();

  const { exampleId, iterations } = state.input;
  const result = useMemo(
    () => passwordsRunFor(mode, state.input, state.seed, typed),
    // Only the inputs a run depends on; the cost sliders and step must not rebuild it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, chapter, exampleId, iterations, state.seed, typed],
  );

  const { reset } = job;
  useEffect(() => reset(), [result, reset]);

  const view = useRunView(result, {
    initialStep: linked?.step,
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

  const startWorker = () => {
    const params = pbkdf2Inputs(mode, state.input, typed);
    job.start({
      password: Array.from(params.password),
      salt: Array.from(params.salt),
      iterations: params.iterations,
      dkLen: params.dkLen,
    });
  };

  const event = view.event;
  const hasRun = result.events.length > 0;
  const table = event ? tableStateAt(result.events, view.index) : null;

  return (
    <ModuleLayout
      title={PASSWORDS_META.title}
      intro={PASSWORDS_META.intro}
      mode={mode}
      onModeChange={setModeChoice}
      controls={
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
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
            {chapter === 'pbkdf2' ? (
              <HexBinToggle value={format} onChange={setFormat} />
            ) : null}
          </div>
          {mode === 'walkthrough' ? (
            <ChapterContext.Provider value={chapter}>
              {walkthrough}
            </ChapterContext.Provider>
          ) : chapter !== 'cost' ? (
            <FreePlayInputs
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
          ) : null}
        </>
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

      {chapter === 'cost' ? <CostView input={state.input} onChange={setInput} /> : null}

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

      {event && chapter === 'pbkdf2' ? (
        <Pbkdf2View event={event} format={format} job={job} onStart={startWorker} />
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

function FreePlayInputs({
  chapter,
  input,
  onChange,
  typed,
  onTyped,
}: {
  chapter: PasswordsChapter;
  input: Input;
  onChange: (patch: Partial<Input>) => void;
  typed: string;
  onTyped: (value: string) => void;
}) {
  const id = useId();
  const field =
    'border-border bg-surface focus-visible:outline-focus w-full rounded-md border px-2 py-1.5 font-mono focus-visible:outline-2';

  return (
    <div className="border-border bg-surface grid gap-3 rounded-lg border p-3 sm:grid-cols-2">
      <div className="flex flex-col gap-1 text-sm sm:col-span-2">
        <label htmlFor={`${id}-own`}>Try your own password</label>
        <input
          id={`${id}-own`}
          type="text"
          autoComplete="off"
          spellCheck={false}
          className={field}
          value={typed}
          maxLength={64}
          onChange={(e) => onTyped(e.target.value)}
          aria-describedby={`${id}-own-note`}
          data-private=""
        />
        <p id={`${id}-own-note`} className="text-warn text-xs">
          Don’t type a real password. It stays in this page’s memory only: it is never put
          in the link, in your browser’s storage or in analytics, and a share link won’t
          include it.
        </p>
      </div>
      {chapter === 'lookup' || chapter === 'salt' ? (
        <label className="flex items-center gap-2 text-sm" htmlFor={`${id}-salt`}>
          <input
            id={`${id}-salt`}
            type="checkbox"
            checked={chapter === 'salt'}
            onChange={(e) => onChange({ chapter: e.target.checked ? 'salt' : 'lookup' })}
            className="accent-accent size-4"
          />
          Salt the hashes
        </label>
      ) : null}
      {chapter === 'pbkdf2' ? (
        <>
          <label className="flex flex-col gap-1 text-sm" htmlFor={`${id}-example`}>
            Built-in example {typed ? '(its salt is used with your password)' : ''}
            <select
              id={`${id}-example`}
              className={field}
              value={input.exampleId}
              onChange={(e) =>
                onChange({ exampleId: e.target.value as Input['exampleId'] })
              }
            >
              {PBKDF2_EXAMPLES.map((example) => (
                <option key={example.id} value={example.id}>
                  {example.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm" htmlFor={`${id}-iterations`}>
            Iterations
            <input
              id={`${id}-iterations`}
              type="number"
              min={1}
              max={10_000_000}
              className={field}
              value={input.iterations}
              onChange={(e) => {
                const value = Number(e.target.value);
                if (Number.isInteger(value) && value >= 1 && value <= 10_000_000) {
                  onChange({ iterations: value });
                }
              }}
            />
          </label>
        </>
      ) : null}
    </div>
  );
}
