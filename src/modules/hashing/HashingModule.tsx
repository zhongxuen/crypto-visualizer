'use client';

import { ChevronRight, SkipForward } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';

import { HexBinToggle, useByteFormat } from '@/components/blocks';
import { StepInspector } from '@/components/inspector';
import { ChapterContext, ChapterTabs } from '@/components/lesson';
import { ModuleLayout, type ModuleMode } from '@/components/shell';
import { useDeferredImport, useLessonProgress, useShareState } from '@/components/state';
import {
  BUTTON,
  PhaseStepper,
  StepCaption,
  TimelineBar,
  useRunView,
} from '@/components/timeline';
import type { HmacEvent } from '@/core/hmac/events';
import type { Sha256Event } from '@/core/sha256/events';
import { createRun } from '@/core/events/builder';
import { HASHING_SHARE, type HashingChapter } from '@/core/sha256/share';

import { PipelineMap } from './components/PipelineMap';
import { PaddingView } from './components/PaddingView';
import { LessonContext, lessonKey } from './Lesson';
import { HASHING_CHAPTER_LIST, HASHING_META } from './meta';
import { mergeRoundPhases } from './phases';
import { HASHING_SHA256_CITATIONS } from './sha256Citations';
import { sha256RunFor } from './sha256Run';
import type { HashingEvent } from './runs';

const DEFAULTS = HASHING_SHARE.defaults.input;
const EMPTY_RUN = createRun<HashingEvent>().finish();

/**
 * Every chapter's run builder, loaded right after hydration (SHA-256's is static).
 * Free play's inputs come with it too: not through `next/dynamic`, whose loader alone
 * costs more first-load JS than any of the forms (phase 10's budget).
 */
const loadRuns = () => import('./runs');

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

  const runs = useDeferredImport(loadRuns);
  const loading = chapter !== 'sha256' && runs === null;
  const result = useMemo(
    () =>
      (chapter === 'sha256'
        ? sha256RunFor(mode, state.input)
        : runs
          ? runs.hashingRunFor(chapter, mode, state.input)
          : null) ?? EMPTY_RUN,
    // `state.step` changes on every step and must not rebuild the run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chapter, mode, state.input.message, state.input.key, state.input.bit, runs],
  );

  const view = useRunView(result, {
    // Held back until the run exists, or a link's step would land on an empty run.
    initialStep: loading ? undefined : linked?.step,
    onStep: (step) =>
      setState((current) => (current.step === step ? current : { ...current, step })),
  });

  const chapterIndex = HASHING_CHAPTER_LIST.findIndex((c) => c.id === chapter);
  const lastChapter = chapterIndex === HASHING_CHAPTER_LIST.length - 1;

  const doneChapters = useLessonProgress({
    slug: HASHING_META.slug,
    chapters: HASHING_CHAPTER_LIST,
    chapter: chapter,
    walkthrough: mode === 'walkthrough',
    finished: view.atEnd,
  });

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
  const seekStep = (step: number) => view.store.getState().seekStep(step);
  // The rail lists each block's 64 rounds as one entry; the dock still has all phases.
  const phases = useMemo(() => mergeRoundPhases(result.phases), [result.phases]);

  return (
    <ModuleLayout
      citations={runs?.HASHING_PAGE_CITATIONS ?? HASHING_SHA256_CITATIONS}
      title={HASHING_META.title}
      intro={HASHING_META.intro}
      slug={HASHING_META.slug}
      step={view.index}
      share={share}
      mode={mode}
      onModeChange={setModeChoice}
      chapters={
        <ChapterTabs
          chapters={HASHING_CHAPTER_LIST}
          current={chapter}
          onSelect={selectChapter}
          done={doneChapters}
        />
      }
      tools={<HexBinToggle value={format} onChange={setFormat} />}
      lesson={
        <ChapterContext.Provider value={chapter}>
          <LessonContext.Provider value={lessonKey(event)}>
            {walkthrough}
          </LessonContext.Provider>
        </ChapterContext.Provider>
      }
      controls={
        mode === 'free' && runs ? (
          <runs.FreePlayInputs
            chapter={chapter}
            input={state.input}
            onChange={setInput}
            shareable={share.shareable}
          />
        ) : null
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
              phases={phases.phases}
              currentIndex={phases.indexOf[view.phaseIndex] ?? -1}
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
          <button type="button" className={BUTTON} onClick={() => seekStep(lastIndex)}>
            <SkipForward aria-hidden="true" className="size-4" />
            Skip to digest
          </button>
        ) : null}
      </div>
      {chapter === 'sha256' && event ? (
        <PipelineMap
          events={result.events as readonly Sha256Event[]}
          index={view.index}
          onSeek={seekStep}
        />
      ) : null}
      {!event ? (
        <p className="text-fg-muted">
          {loading
            ? 'Loading this chapter…'
            : `Type a message with at least ${Math.floor(state.input.bit / 8) + 1} bytes to flip bit ${state.input.bit}.`}
        </p>
      ) : event.kind === 'sha256.pad' ? (
        <PaddingView event={event} format={format} />
      ) : !runs ? (
        <p className="text-fg-muted">Loading this step…</p>
      ) : event.kind.startsWith('sha256.') && event.kind !== 'sha256.avalanche' ? (
        <runs.Sha256View event={event as Sha256Event} format={format} />
      ) : event.kind === 'sha256.avalanche' ? (
        <runs.AvalancheView event={event} />
      ) : (
        <runs.HmacView
          event={event as HmacEvent}
          format={format}
          events={result.events as readonly HmacEvent[]}
          index={view.index}
        />
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
      {mode === 'walkthrough' && view.atEnd && lastChapter && runs ? (
        <runs.CompletionCard slug={HASHING_META.slug} learned={runs.LEARNED}>
          Hash your own message in Free play.
        </runs.CompletionCard>
      ) : null}
    </ModuleLayout>
  );
}
