'use client';

import { ChevronRight, SkipForward } from 'lucide-react';
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
import { utf8Encode } from '@/core/bytes/utf8';
import type { HmacEvent } from '@/core/hmac/events';
import type { Sha256Event } from '@/core/sha256/events';
import { createRun } from '@/core/events/builder';
import { MAX_STEPPED_BYTES } from '@/core/sha256/sha256';
import {
  HASHING_SHARE,
  MAX_HMAC_KEY_BYTES,
  type HashingChapter,
} from '@/core/sha256/share';

import { AvalancheView } from './components/AvalancheView';
import { HmacView } from './components/HmacView';
import { Sha256View } from './components/Sha256View';
import { HASHING_CHAPTER_LIST, HASHING_META } from './meta';
import { hashingRunFor, type HashingEvent } from './runs';

const DEFAULTS = HASHING_SHARE.defaults.input;
const EMPTY_RUN = createRun<HashingEvent>().finish();

function isDefaultInput(input: typeof DEFAULTS): boolean {
  return (
    input.message === DEFAULTS.message &&
    input.key === DEFAULTS.key &&
    input.bit === DEFAULTS.bit
  );
}

/**
 * Module 2. Renders `src/core/sha256` and `src/core/hmac` runs; computes no crypto
 * itself. Only the current step's detail is rendered, so scrubbing across all 64
 * rounds stays smooth.
 */
export function HashingModule({ walkthrough }: { walkthrough?: ReactNode }) {
  const share = useShareState(HASHING_SHARE);
  const { state, setState, linked } = share;
  const [modeChoice, setModeChoice] = useState<ModuleMode | null>(null);
  const mode: ModuleMode =
    modeChoice ?? (linked && !isDefaultInput(linked.input) ? 'free' : 'walkthrough');
  const chapter = state.input.chapter;
  const [format, setFormat] = useByteFormat();
  const { markComplete, progress } = useProgress();

  const result = useMemo(
    () => hashingRunFor(chapter, mode, state.input) ?? EMPTY_RUN,
    // `state.step` changes on every step and must not rebuild the run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chapter, mode, state.input.message, state.input.key, state.input.bit],
  );

  const view = useRunView(result, {
    initialStep: linked?.step,
    onStep: (step) =>
      setState((current) => (current.step === step ? current : { ...current, step })),
  });

  const chapterIndex = HASHING_CHAPTER_LIST.findIndex((c) => c.id === chapter);
  const lastChapter = chapterIndex === HASHING_CHAPTER_LIST.length - 1;

  useEffect(() => {
    if (mode === 'walkthrough' && lastChapter && view.atEnd)
      markComplete(HASHING_META.slug);
  }, [mode, lastChapter, view.atEnd, markComplete]);

  const selectChapter = (id: HashingChapter) =>
    setState((current) => ({
      ...current,
      step: 0,
      input: { ...current.input, chapter: id },
    }));
  const setInput = (patch: Partial<typeof DEFAULTS>) =>
    setState((current) => ({
      ...current,
      step: 0,
      input: { ...current.input, ...patch },
    }));

  const event = view.event;
  const lastIndex = result.events.length - 1;

  return (
    <ModuleLayout
      title={HASHING_META.title}
      intro={HASHING_META.intro}
      mode={mode}
      onModeChange={setModeChoice}
      controls={
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <ChapterTabs
              chapters={HASHING_CHAPTER_LIST}
              current={chapter}
              onSelect={selectChapter}
              done={
                progress.completed.includes(HASHING_META.slug)
                  ? HASHING_CHAPTER_LIST.map((c) => c.id)
                  : []
              }
            />
            <HexBinToggle value={format} onChange={setFormat} />
          </div>
          {mode === 'walkthrough' ? (
            <ChapterContext.Provider value={chapter}>
              {walkthrough}
            </ChapterContext.Provider>
          ) : (
            <FreePlayInputs
              chapter={chapter}
              input={state.input}
              onChange={setInput}
              shareable={share.shareable}
            />
          )}
        </>
      }
      inspector={
        <>
          <StepInspector event={event} />
          <div
            className="max-h-96 overflow-y-auto"
            tabIndex={0}
            role="region"
            aria-label="Groups of this run"
          >
            <PhaseStepper
              phases={result.phases}
              currentIndex={view.phaseIndex}
              onSeek={(time) => view.store.getState().seek(time)}
            />
          </div>
        </>
      }
      timeline={<TimelineBar store={view.store} result={result} />}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <StepCaption
          index={view.index}
          count={result.events.length}
          group={event?.group}
          label={event?.label}
          className="min-w-0 flex-1"
        />
        {chapter === 'sha256' && lastIndex > 0 && view.index < lastIndex ? (
          <button
            type="button"
            className={BUTTON}
            onClick={() => view.store.getState().seekStep(lastIndex)}
          >
            <SkipForward aria-hidden="true" className="size-4" />
            Skip to digest
          </button>
        ) : null}
      </div>
      {!event ? (
        <p className="text-fg-muted">
          Type a message with at least {Math.floor(state.input.bit / 8) + 1} bytes to flip
          bit {state.input.bit}.
        </p>
      ) : event.kind === 'sha256.avalanche' ? (
        <AvalancheView event={event} />
      ) : event.kind.startsWith('sha256.') ? (
        <Sha256View event={event as Sha256Event} format={format} />
      ) : (
        <HmacView event={event as HmacEvent} format={format} />
      )}
      {mode === 'walkthrough' && view.atEnd && !lastChapter ? (
        <button
          type="button"
          className={`${BUTTON} self-start`}
          onClick={() => selectChapter(HASHING_CHAPTER_LIST[chapterIndex + 1].id)}
        >
          Next chapter: {HASHING_CHAPTER_LIST[chapterIndex + 1].title}
          <ChevronRight aria-hidden="true" className="size-4" />
        </button>
      ) : null}
      {mode === 'walkthrough' && view.atEnd && lastChapter ? (
        <p className="border-ok rounded-md border px-3 py-2 text-sm">
          Walkthrough complete. Hash your own message in Free play.
        </p>
      ) : null}
    </ModuleLayout>
  );
}

function FreePlayInputs({
  chapter,
  input,
  onChange,
  shareable,
}: {
  chapter: HashingChapter;
  input: typeof DEFAULTS;
  onChange: (patch: Partial<typeof DEFAULTS>) => void;
  shareable: boolean;
}) {
  const id = useId();
  const field =
    'border-border bg-surface focus-visible:outline-focus w-full rounded-md border px-2 py-1.5 font-mono focus-visible:outline-2';
  const bits = utf8Encode(input.message).length * 8;

  return (
    <div className="border-border bg-surface grid gap-3 rounded-lg border p-3 sm:grid-cols-2">
      <label className="flex flex-col gap-1 text-sm" htmlFor={`${id}-message`}>
        Message (up to {MAX_STEPPED_BYTES} bytes, three blocks)
        <input
          id={`${id}-message`}
          className={field}
          value={input.message}
          onChange={(e) =>
            utf8Encode(e.target.value).length <= MAX_STEPPED_BYTES &&
            onChange({ message: e.target.value })
          }
        />
      </label>
      {chapter === 'avalanche' ? (
        <label className="flex flex-col gap-1 text-sm" htmlFor={`${id}-bit`}>
          Bit to flip (0 to {Math.max(0, bits - 1)}, from the left)
          <input
            id={`${id}-bit`}
            type="number"
            min={0}
            max={Math.max(0, bits - 1)}
            className={field}
            value={input.bit}
            onChange={(e) => {
              const bit = Number(e.target.value);
              if (Number.isInteger(bit) && bit >= 0 && bit < MAX_STEPPED_BYTES * 8)
                onChange({ bit });
            }}
          />
        </label>
      ) : null}
      {chapter === 'hmac' ? (
        <label className="flex flex-col gap-1 text-sm" htmlFor={`${id}-key`}>
          MAC key (up to {MAX_HMAC_KEY_BYTES} bytes; over 64 gets hashed first)
          <input
            id={`${id}-key`}
            className={field}
            value={input.key}
            onChange={(e) =>
              utf8Encode(e.target.value).length <= MAX_HMAC_KEY_BYTES &&
              onChange({ key: e.target.value })
            }
          />
        </label>
      ) : null}
      {!shareable ? (
        <p className="text-warn text-sm sm:col-span-2">
          This state is too large for a share link.
        </p>
      ) : null}
    </div>
  );
}
