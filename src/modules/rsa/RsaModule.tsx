'use client';

import { ChevronRight } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

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
import { createRun } from '@/core/events/builder';
import type { RsaEvent } from '@/core/rsa/events';
import { RSA_SHARE, type RsaChapter } from '@/core/rsa/share';

import { EgcdView } from './components/EgcdView';
import { FormulaPanel } from './components/FormulaPanel';
import { MalleabilityStrip, PaddingView } from './components/MalleabilityStrip';
import { PowResultView, PowStepView } from './components/PowView';
import {
  HashView,
  KeyPairView,
  MessageView,
  ModulusView,
  PrimeView,
  PrivateView,
  TamperView,
} from './components/StepView';
import { Value } from './components/parts';
import { RSA_PAGE_CITATIONS } from './citations';
import { RSA_CHAPTER_LIST, RSA_META } from './meta';
import { keysRunFor } from './keysRun';

type RsaState = typeof RSA_SHARE.defaults;
type RsaInput = RsaState['input'];

const DEFAULTS = RSA_SHARE.defaults;
const EMPTY_RUN = createRun<RsaEvent>().finish();

/** Every chapter's run builder, loaded right after hydration (keys' is static). */
const loadRuns = () => import('./runs');

// Free play's inputs load when free play is first opened, not in the route's first load
// (phase 10's 170 KB budget). Walkthrough views stay static: a view that suspends while
// a learner steps through can swallow an arrow-key press.
const FreePlayInputs = dynamic(() =>
  import('./components/Inputs').then((m) => m.FreePlayInputs),
);

function isDefaultInput(state: RsaState): boolean {
  const d = DEFAULTS.input;
  const i = state.input;
  return (
    state.seed === DEFAULTS.seed &&
    i.mode === d.mode &&
    i.p === d.p &&
    i.q === d.q &&
    i.e === d.e &&
    i.msg === d.msg &&
    i.text === d.text
  );
}

/** The picture for one step. */
function StepPicture({ event }: { event: RsaEvent }) {
  switch (event.kind) {
    case 'rsa.prime':
      return <PrimeView event={event} />;
    case 'rsa.modulus':
      return <ModulusView event={event} />;
    case 'rsa.totient':
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <Value label="φ(n) = (p − 1)(q − 1)" value={event.phi} emphasis />
          <Value
            label="λ(n) = lcm(p − 1, q − 1), used by RFC 8017"
            value={event.lambda}
          />
        </div>
      );
    case 'rsa.chooseE':
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <Value label="e" value={event.e} emphasis />
          <Value label="gcd(e, φ(n))" value={event.gcd} />
        </div>
      );
    case 'rsa.egcdRow':
      return <EgcdView event={event} />;
    case 'rsa.private':
      return <PrivateView event={event} />;
    case 'rsa.keyPair':
      return <KeyPairView event={event} />;
    case 'rsa.message':
      return <MessageView event={event} />;
    case 'rsa.powStep':
      return <PowStepView event={event} />;
    case 'rsa.powResult':
      return <PowResultView event={event} />;
    case 'rsa.hash':
      return <HashView event={event} />;
    case 'rsa.tamper':
      return <TamperView event={event} />;
    case 'rsa.padding':
      return <PaddingView scheme={event.scheme} />;
    default:
      return null;
  }
}

/**
 * Module 5. Renders `src/core/rsa` runs; computes no crypto itself. Only the current
 * step's view is rendered.
 */
export function RsaModule({ walkthrough }: { walkthrough?: ReactNode }) {
  const share = useShareState(RSA_SHARE);
  const { state, setState, linked } = share;
  const [modeChoice, setModeChoice] = useState<ModuleMode | null>(null);
  const mode: ModuleMode =
    modeChoice ?? (linked && !isDefaultInput(linked) ? 'free' : 'walkthrough');
  const chapter = state.input.chapter;
  const { markComplete, progress } = useProgress();

  const { seed } = state;
  const { mode: size, p, q, e, msg, text, bits } = state.input;
  const runs = useDeferredImport(loadRuns);
  const loading = chapter !== 'keys' && runs === null;
  const { result, problem } = useMemo(
    () => {
      const run =
        chapter === 'keys'
          ? keysRunFor(mode, state)
          : runs
            ? runs.rsaRunFor(chapter, mode, state)
            : { result: null, problem: null };
      return { result: run.result ?? EMPTY_RUN, problem: run.problem };
    },
    // `state.step` changes on every step and must not rebuild the run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chapter, mode, size, p, q, e, msg, text, bits, seed, runs],
  );

  const view = useRunView(result, {
    // Held back until the run exists, or a link's step would land on an empty run.
    initialStep: loading ? undefined : linked?.step,
    onStep: (step) =>
      setState((current) => (current.step === step ? current : { ...current, step })),
  });

  const chapterIndex = RSA_CHAPTER_LIST.findIndex((c) => c.id === chapter);
  const lastChapter = chapterIndex === RSA_CHAPTER_LIST.length - 1;

  useEffect(() => {
    if (mode === 'walkthrough' && lastChapter && view.atEnd) markComplete(RSA_META.slug);
  }, [mode, lastChapter, view.atEnd, markComplete]);

  const selectChapter = (id: RsaChapter) =>
    setState((current) => ({
      ...current,
      step: 0,
      input: { ...current.input, chapter: id },
    }));
  const setInput = (patch: Partial<RsaInput>) =>
    setState((current) => ({
      ...current,
      step: 0,
      input: { ...current.input, ...patch },
    }));
  const setSeed = (next: number) =>
    setState((current) => ({ ...current, step: 0, seed: next }));

  const event = view.event;
  const events = result.events;

  return (
    <ModuleLayout
      citations={RSA_PAGE_CITATIONS}
      title={RSA_META.title}
      intro={RSA_META.intro}
      mode={mode}
      onModeChange={setModeChoice}
      controls={
        <>
          <ChapterTabs
            chapters={RSA_CHAPTER_LIST}
            current={chapter}
            onSelect={selectChapter}
            done={
              progress.completed.includes(RSA_META.slug)
                ? RSA_CHAPTER_LIST.map((c) => c.id)
                : []
            }
          />
          {mode === 'walkthrough' ? (
            <ChapterContext.Provider value={chapter}>
              {walkthrough}
            </ChapterContext.Provider>
          ) : (
            <FreePlayInputs
              key={`${String(share.ready)}-${state.input.mode}`}
              chapter={chapter}
              input={state.input}
              seed={state.seed}
              problem={problem}
              shareable={share.shareable}
              onChange={setInput}
              onSeed={setSeed}
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
      <StepCaption
        index={view.index}
        count={events.length}
        group={event?.group}
        label={event?.label}
      />
      {!event ? (
        <p className="text-fg-muted">
          {loading ? 'Loading this chapter…' : (problem ?? 'Nothing to show.')}
        </p>
      ) : chapter === 'malleability' ? (
        <>
          <MalleabilityStrip events={events} index={view.index} />
          {event.kind === 'rsa.keyPair' || event.kind === 'rsa.padding' ? (
            <StepPicture event={event} />
          ) : null}
        </>
      ) : (
        <>
          <StepPicture event={event} />
          <FormulaPanel chapter={chapter} events={events} index={view.index} />
        </>
      )}
      {mode === 'walkthrough' && view.atEnd && !lastChapter ? (
        <button
          type="button"
          className={`${BUTTON} self-start`}
          onClick={() => selectChapter(RSA_CHAPTER_LIST[chapterIndex + 1].id)}
        >
          Next chapter: {RSA_CHAPTER_LIST[chapterIndex + 1].title}
          <ChevronRight aria-hidden="true" className="size-4" />
        </button>
      ) : null}
      {mode === 'walkthrough' && view.atEnd && lastChapter ? (
        <p className="border-ok rounded-md border px-3 py-2 text-sm">
          Walkthrough complete. Pick your own primes in Free play.
        </p>
      ) : null}
    </ModuleLayout>
  );
}
