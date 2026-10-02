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
import type { AesAvalancheEvent, AesEvent, AesModeBlockEvent } from '@/core/aes/events';
import { AES_SHARE, type AesChapter } from '@/core/aes/share';
import { createRun } from '@/core/events/builder';

import { BlockView } from './components/BlockView';
import { AES_BLOCK_CITATIONS } from './blockCitations';
import { AES_CHAPTER_LIST, AES_META } from './meta';
import { aesInputs, blockProblem, blockRunFor } from './blockRun';
import { AesLessonContext, lessonTags } from './lesson';

type AesState = typeof AES_SHARE.defaults;
type AesInput = AesState['input'];

const DEFAULTS = AES_SHARE.defaults;
const EMPTY_RUN = createRun<AesEvent>().finish();

/**
 * Every chapter's run builder, loaded right after hydration (the block's is static).
 * Free play's inputs come with it too: not through `next/dynamic`, whose loader alone
 * costs more first-load JS than any of the forms (phase 10's budget).
 */
const loadRuns = () => import('./runs');

function isDefaultInput(state: AesState): boolean {
  const d = DEFAULTS.input;
  return (
    state.seed === DEFAULTS.seed &&
    state.input.keyHex === d.keyHex &&
    state.input.ptHex === d.ptHex &&
    state.input.bit === d.bit
  );
}

/**
 * Module 4. Renders `src/core/aes` runs; computes no crypto itself. Only the current
 * step's view is rendered.
 */
export function AesModule({ walkthrough }: { walkthrough?: ReactNode }) {
  const share = useShareState(AES_SHARE);
  const { state, setState, linked } = share;
  const [modeChoice, setModeChoice] = useState<ModuleMode | null>(null);
  const mode: ModuleMode =
    modeChoice ?? (linked && !isDefaultInput(linked) ? 'free' : 'walkthrough');
  const chapter = state.input.chapter;
  const [format, setFormat] = useByteFormat();

  const { seed } = state;
  const { mode: cipherMode, keyHex, ptHex, bit } = state.input;
  const runs = useDeferredImport(loadRuns);
  // The full check (with the modes' length limit) arrives with the other chapters.
  const inputProblem = runs?.inputProblem ?? blockProblem;
  const loading = chapter !== 'block' && runs === null;
  const result = useMemo(
    () =>
      (chapter === 'block'
        ? blockRunFor(mode, state)
        : runs
          ? runs.aesRunFor(chapter, mode, state)
          : null) ?? EMPTY_RUN,
    // `state.step` changes on every step and must not rebuild the run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chapter, mode, cipherMode, keyHex, ptHex, bit, seed, runs],
  );

  const images = useMemo(() => {
    if (chapter !== 'penguin' || (mode === 'free' && inputProblem(chapter, state.input)))
      return null;
    const { key, seed: ivSeed } = aesInputs(chapter, mode, state);
    return runs ? runs.penguinImages(key, ivSeed) : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapter, mode, keyHex, seed, runs]);

  const modeBlocks = useMemo(
    () =>
      result.events.filter(
        (e): e is AesModeBlockEvent & (typeof result.events)[number] =>
          e.kind === 'aes.modeBlock',
      ),
    [result],
  );

  const view = useRunView(result, {
    // Held back until the run exists, or a link's step would land on an empty run.
    initialStep: loading ? undefined : linked?.step,
    onStep: (step) =>
      setState((current) => (current.step === step ? current : { ...current, step })),
  });

  const chapterIndex = AES_CHAPTER_LIST.findIndex((c) => c.id === chapter);
  const lastChapter = chapterIndex === AES_CHAPTER_LIST.length - 1;

  const doneChapters = useLessonProgress({
    slug: AES_META.slug,
    chapters: AES_CHAPTER_LIST,
    chapter: chapter,
    walkthrough: mode === 'walkthrough',
    finished: view.atEnd,
  });

  const selectChapter = (id: AesChapter) =>
    setState((current) => ({
      ...current,
      step: 0,
      input: { ...current.input, chapter: id },
    }));
  const setInput = (patch: Partial<AesInput>) =>
    setState((current) => ({
      ...current,
      step: 0,
      input: { ...current.input, ...patch },
    }));
  const setSeed = (next: number) =>
    setState((current) => ({ ...current, step: 0, seed: next }));

  const event = view.event;
  const tags = useMemo(() => lessonTags(event), [event]);
  const lastIndex = result.events.length - 1;

  const avalancheHistory = useMemo(
    () =>
      result.events
        .slice(0, view.index + 1)
        .filter(
          (e): e is AesAvalancheEvent & (typeof result.events)[number] =>
            e.kind === 'aes.avalanche',
        ),
    [result, view.index],
  );

  return (
    <ModuleLayout
      citations={runs?.AES_PAGE_CITATIONS ?? AES_BLOCK_CITATIONS}
      title={AES_META.title}
      intro={AES_META.intro}
      slug={AES_META.slug}
      step={view.index}
      share={share}
      mode={mode}
      onModeChange={setModeChoice}
      chapters={
        <ChapterTabs
          chapters={AES_CHAPTER_LIST}
          current={chapter}
          onSelect={selectChapter}
          done={doneChapters}
        />
      }
      tools={<HexBinToggle value={format} onChange={setFormat} />}
      lesson={
        <ChapterContext.Provider value={chapter}>
          <AesLessonContext.Provider value={tags}>
            {walkthrough}
          </AesLessonContext.Provider>
        </ChapterContext.Provider>
      }
      controls={
        chapter === 'modes' || (mode === 'free' && runs) ? (
          <>
            {chapter === 'modes' && runs ? (
              <runs.ModePicker
                value={cipherMode}
                onChange={(m) => setInput({ mode: m })}
              />
            ) : null}
            {mode === 'walkthrough' ? null : runs ? (
              <runs.FreePlayInputs
                key={String(share.ready)}
                chapter={chapter}
                input={state.input}
                seed={state.seed}
                onChange={setInput}
                onSeed={setSeed}
                shareable={share.shareable}
              />
            ) : null}
          </>
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
        {chapter === 'block' && lastIndex > 0 && view.index < lastIndex ? (
          <button
            type="button"
            className={BUTTON}
            onClick={() => view.store.getState().seekStep(lastIndex)}
          >
            <SkipForward aria-hidden="true" className="size-4" />
            Skip to ciphertext
          </button>
        ) : null}
      </div>
      {!event ? (
        <p className="text-fg-muted">
          {loading
            ? 'Loading this chapter…'
            : (mode === 'free' && inputProblem(chapter, state.input)) ||
              'Nothing to encrypt: type a message.'}
        </p>
      ) : runs && event.kind === 'aes.keyWord' ? (
        <runs.KeyScheduleView event={event} />
      ) : runs && event.kind === 'aes.avalanche' ? (
        <runs.AvalancheView event={event} history={avalancheHistory} format={format} />
      ) : runs && event.kind === 'aes.penguin' ? (
        images ? (
          <runs.PenguinView event={event} images={images} />
        ) : null
      ) : runs && event.kind === 'aes.gcm' ? (
        <runs.GcmView event={event} />
      ) : runs && chapter === 'modes' ? (
        <runs.ModeView event={event} blocks={modeBlocks} format={format} />
      ) : (
        <BlockView event={event} format={format} />
      )}
      {mode === 'walkthrough' && view.atEnd && !lastChapter ? (
        <button
          type="button"
          className={`${BUTTON} self-start`}
          onClick={() => selectChapter(AES_CHAPTER_LIST[chapterIndex + 1].id)}
        >
          Next chapter: {AES_CHAPTER_LIST[chapterIndex + 1].title}
          <ChevronRight aria-hidden="true" className="size-4" />
        </button>
      ) : null}
      {mode === 'walkthrough' && view.atEnd && lastChapter && runs ? (
        <runs.CompletionCard slug={AES_META.slug} learned={runs.LEARNED}>
          Encrypt your own block in Free play.
        </runs.CompletionCard>
      ) : null}
    </ModuleLayout>
  );
}
