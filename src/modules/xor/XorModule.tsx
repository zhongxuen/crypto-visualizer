'use client';

import { ChevronRight, RefreshCw } from 'lucide-react';
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
import { MAX_TEXT_BYTES } from '@/core/xor/encode';
import { XOR_SHARE, type XorChapter } from '@/core/xor/share';

import { XorEventView } from './components/XorEventView';
import { XOR_PAGE_CITATIONS } from './citations';
import { XOR_CHAPTER_LIST, XOR_META } from './meta';
import { xorRunFor } from './runs';

const DEFAULTS = XOR_SHARE.defaults.input;

function isDefaultInput(input: typeof DEFAULTS): boolean {
  return input.a === DEFAULTS.a && input.b === DEFAULTS.b && input.crib === DEFAULTS.crib;
}

/**
 * Module 1. Renders `src/core/xor` runs; computes no crypto itself.
 *
 * Walkthrough: four chapters on built-in examples, with the lesson prose from
 * `walkthrough.mdx`. Free play: the learner's own text, key seed and crib.
 */
export function XorModule({ walkthrough }: { walkthrough?: ReactNode }) {
  const share = useShareState(XOR_SHARE);
  const { state, setState, linked } = share;
  const [modeChoice, setModeChoice] = useState<ModuleMode | null>(null);
  const mode: ModuleMode =
    modeChoice ?? (linked && !isDefaultInput(linked.input) ? 'free' : 'walkthrough');
  const chapter = state.input.chapter;
  const [format, setFormat] = useByteFormat();
  const { markComplete, progress } = useProgress();

  const result = useMemo(
    () => xorRunFor(chapter, mode, state),
    // `state.step` changes on every step and must not rebuild the run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chapter, mode, state.seed, state.input.a, state.input.b, state.input.crib],
  );

  const view = useRunView(result, {
    initialStep: linked?.step,
    onStep: (step) =>
      setState((current) => (current.step === step ? current : { ...current, step })),
  });

  const chapterIndex = XOR_CHAPTER_LIST.findIndex((c) => c.id === chapter);
  const lastChapter = chapterIndex === XOR_CHAPTER_LIST.length - 1;

  useEffect(() => {
    if (mode === 'walkthrough' && lastChapter && view.atEnd) markComplete(XOR_META.slug);
  }, [mode, lastChapter, view.atEnd, markComplete]);

  const selectChapter = (id: XorChapter) =>
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

  return (
    <ModuleLayout
      citations={XOR_PAGE_CITATIONS}
      title={XOR_META.title}
      intro={XOR_META.intro}
      slug={XOR_META.slug}
      step={view.index}
      share={share}
      mode={mode}
      onModeChange={setModeChoice}
      chapters={
        <ChapterTabs
          chapters={XOR_CHAPTER_LIST}
          current={chapter}
          onSelect={selectChapter}
          done={
            progress.completed.includes(XOR_META.slug)
              ? XOR_CHAPTER_LIST.map((c) => c.id)
              : []
          }
        />
      }
      tools={<HexBinToggle value={format} onChange={setFormat} />}
      lesson={
        <ChapterContext.Provider value={chapter}>{walkthrough}</ChapterContext.Provider>
      }
      controls={
        mode === 'free' ? (
          <FreePlayInputs
            chapter={chapter}
            input={state.input}
            onChange={setInput}
            onNewKey={() =>
              setState((current) => ({
                ...current,
                step: 0,
                seed: (current.seed + 1) >>> 0,
              }))
            }
            shareable={share.shareable}
          />
        ) : null
      }
      inspector={
        <>
          <StepInspector event={event} />
          <PhaseStepper
            phases={result.phases}
            currentIndex={view.phaseIndex}
            onSeek={(time) => view.store.getState().seek(time)}
          />
        </>
      }
      timeline={<TimelineBar store={view.store} result={result} />}
    >
      <StepCaption
        index={view.index}
        count={result.events.length}
        group={event?.group}
        label={event?.label}
      />
      {event ? <XorEventView event={event} format={format} /> : null}
      {mode === 'walkthrough' && view.atEnd && !lastChapter ? (
        <button
          type="button"
          className={`${BUTTON} self-start`}
          onClick={() => selectChapter(XOR_CHAPTER_LIST[chapterIndex + 1].id)}
        >
          Next chapter: {XOR_CHAPTER_LIST[chapterIndex + 1].title}
          <ChevronRight aria-hidden="true" className="size-4" />
        </button>
      ) : null}
      {mode === 'walkthrough' && view.atEnd && lastChapter ? (
        <p className="border-ok rounded-md border px-3 py-2 text-sm">
          Walkthrough complete. Try your own messages in Free play.
        </p>
      ) : null}
    </ModuleLayout>
  );
}

function FreePlayInputs({
  chapter,
  input,
  onChange,
  onNewKey,
  shareable,
}: {
  chapter: XorChapter;
  input: typeof DEFAULTS;
  onChange: (patch: Partial<typeof DEFAULTS>) => void;
  onNewKey: () => void;
  shareable: boolean;
}) {
  const id = useId();
  const field =
    'border-border bg-surface focus-visible:outline-focus w-full rounded-md border px-2 py-1.5 font-mono focus-visible:outline-2';
  const fits = (text: string) => utf8Encode(text).length <= MAX_TEXT_BYTES;

  return (
    <div className="border-border bg-surface grid gap-3 rounded-lg border p-3 sm:grid-cols-2">
      <label className="flex flex-col gap-1 text-sm" htmlFor={`${id}-a`}>
        {chapter === 'ttp' ? 'Message 1' : 'Your text'} (up to {MAX_TEXT_BYTES} bytes)
        <input
          id={`${id}-a`}
          className={field}
          value={input.a}
          onChange={(e) => fits(e.target.value) && onChange({ a: e.target.value })}
        />
      </label>
      {chapter === 'ttp' ? (
        <>
          <label className="flex flex-col gap-1 text-sm" htmlFor={`${id}-b`}>
            Message 2, encrypted with the same key
            <input
              id={`${id}-b`}
              className={field}
              value={input.b}
              onChange={(e) => fits(e.target.value) && onChange({ b: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm" htmlFor={`${id}-crib`}>
            Crib: a word you guess is in one message
            <input
              id={`${id}-crib`}
              className={field}
              value={input.crib}
              maxLength={16}
              onChange={(e) => onChange({ crib: e.target.value })}
            />
          </label>
        </>
      ) : null}
      {chapter === 'xor' || chapter === 'otp' || chapter === 'ttp' ? (
        <div className="flex items-end">
          <button type="button" className={BUTTON} onClick={onNewKey}>
            <RefreshCw aria-hidden="true" className="size-4" />
            New random key
          </button>
        </div>
      ) : null}
      {!shareable ? (
        <p className="text-warn text-sm sm:col-span-2">
          This state is too large to fit in a share link.
        </p>
      ) : null}
    </div>
  );
}
