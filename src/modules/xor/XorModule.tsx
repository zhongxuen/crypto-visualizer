'use client';

import { ChevronRight } from 'lucide-react';
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
import { createRun } from '@/core/events/builder';
import type { XorEvent } from '@/core/xor/events';
import { XOR_SHARE, type XorChapter } from '@/core/xor/share';

import { bytesRunFor } from './bytesRun';
import { BytesView } from './components/BytesView';
import { PhaseContext } from './components/Phase';
import { XOR_PAGE_CITATIONS } from './citations';
import { XOR_CHAPTER_LIST, XOR_META } from './meta';

const DEFAULTS = XOR_SHARE.defaults.input;
const EMPTY_RUN = createRun<XorEvent>().finish();

/**
 * The later chapters' runs and views, and free play's inputs, loaded right after
 * hydration (the first chapter's are static), to keep the route inside its JS budget.
 */
const loadRuns = () => import('./runs');

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

  const runs = useDeferredImport(loadRuns);
  const loading = chapter !== 'bytes' && runs === null;
  const result = useMemo(
    () =>
      chapter === 'bytes'
        ? bytesRunFor(mode, state)
        : runs
          ? runs.xorRunFor(chapter, mode, state)
          : EMPTY_RUN,
    // `state.step` changes on every step and must not rebuild the run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chapter, mode, state.seed, state.input.a, state.input.b, state.input.crib, runs],
  );

  const view = useRunView(result, {
    // Held back until the run exists, or a link's step would land on an empty run.
    initialStep: loading ? undefined : linked?.step,
    onStep: (step) =>
      setState((current) => (current.step === step ? current : { ...current, step })),
  });

  const chapterIndex = XOR_CHAPTER_LIST.findIndex((c) => c.id === chapter);
  const lastChapter = chapterIndex === XOR_CHAPTER_LIST.length - 1;

  const doneChapters = useLessonProgress({
    slug: XOR_META.slug,
    chapters: XOR_CHAPTER_LIST,
    chapter: chapter,
    walkthrough: mode === 'walkthrough',
    finished: view.atEnd,
  });

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
  const phaseId = result.phases[view.phaseIndex]?.id ?? null;

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
          done={doneChapters}
        />
      }
      tools={<HexBinToggle value={format} onChange={setFormat} />}
      lesson={
        <ChapterContext.Provider value={chapter}>
          <PhaseContext.Provider value={phaseId}>{walkthrough}</PhaseContext.Provider>
        </ChapterContext.Provider>
      }
      controls={
        mode === 'free' && runs ? (
          <runs.FreePlayInputs
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
      {event === undefined ? null : event.kind === 'xor.char' ||
        (chapter === 'bytes' && event.kind === 'xor.message') ? (
        <BytesView
          event={event}
          format={format}
          events={result.events}
          index={view.index}
        />
      ) : runs ? (
        <runs.XorEventView
          event={event}
          format={format}
          events={result.events}
          index={view.index}
          onSeekStep={(index) => view.store.getState().seekStep(index)}
        />
      ) : null}
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
      {mode === 'walkthrough' && view.atEnd && lastChapter && runs ? (
        <runs.CompletionCard slug={XOR_META.slug} learned={runs.LEARNED}>
          Try your own messages in Free play.
        </runs.CompletionCard>
      ) : null}
    </ModuleLayout>
  );
}
