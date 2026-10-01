'use client';

import { ChevronRight, Eye } from 'lucide-react';
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
import type { DhEvent } from '@/core/dh/events';
import { DH_SHARE, type DhScene } from '@/core/dh/share';
import { createRun } from '@/core/events/builder';
import { cn } from '@/lib/cn';

import { buildBoard, shortNumber, type LaneId } from './board';
import { Lanes } from './components/Lanes';
import {
  AgreeView,
  InterceptView,
  MitmFixView,
  MitmKeysView,
  MitmMessageView,
  PaintEveView,
  PaintLimitView,
  PaintSharedView,
  ParamsView,
  PrivateView,
  RealGroupsView,
  ValidateView,
  X25519View,
} from './components/StepView';
import { DH_CHAPTER_LIST, DH_META } from './meta';
import { paintRun } from './paintRun';

// Not on the first screen (the paint scene, walkthrough mode), so they load when first
// shown rather than in the route's first load (phase 10's 170 KB budget).
const EveFoundView = dynamic(() =>
  import('./components/EveView').then((m) => m.EveFoundView),
);
const EveGrowthView = dynamic(() =>
  import('./components/EveView').then((m) => m.EveGrowthView),
);
const EveSearchView = dynamic(() =>
  import('./components/EveView').then((m) => m.EveSearchView),
);
const FreePlayInputs = dynamic(() =>
  import('./components/Inputs').then((m) => m.FreePlayInputs),
);
const PowResultView = dynamic(() =>
  import('./components/PowView').then((m) => m.PowResultView),
);
const PowStepView = dynamic(() =>
  import('./components/PowView').then((m) => m.PowStepView),
);

type DhState = typeof DH_SHARE.defaults;
type DhInput = DhState['input'];

const DEFAULTS = DH_SHARE.defaults;
const EMPTY_RUN = createRun<DhEvent>().finish();

/** Every scene's run builder, loaded right after hydration (paint's is static). */
const loadRuns = () => import('./runs');

const THREE_LANES: readonly LaneId[] = ['alice', 'public', 'bob'];
const WITH_EVE: readonly LaneId[] = ['alice', 'public', 'bob', 'eve'];
const FOUR_LANES: readonly LaneId[] = ['alice', 'malloryA', 'malloryB', 'bob'];

function isDefaultInput(state: DhState): boolean {
  const d = DEFAULTS.input;
  const i = state.input;
  return (
    state.seed === DEFAULTS.seed &&
    i.group === d.group &&
    i.a === undefined &&
    i.b === undefined &&
    i.msg === undefined
  );
}

/** The picture for one step, below the lanes. */
function StepPicture({
  event,
  events,
  index,
  groupName,
}: {
  event: DhEvent;
  events: readonly DhEvent[];
  index: number;
  groupName?: string;
}) {
  switch (event.kind) {
    case 'dh.paintShared':
      return <PaintSharedView event={event} />;
    case 'dh.paintEve':
      return <PaintEveView event={event} />;
    case 'dh.paintLimit':
      return <PaintLimitView />;
    case 'dh.params':
      return <ParamsView event={event} />;
    case 'dh.private':
      return <PrivateView event={event} />;
    case 'dh.powStep':
      return <PowStepView event={event} />;
    case 'dh.publicKey':
    case 'dh.shared':
      return <PowResultView event={event} />;
    case 'dh.validate':
      return <ValidateView event={event} />;
    case 'dh.agree':
      return <AgreeView event={event} />;
    case 'dh.realGroups':
      return <RealGroupsView event={event} />;
    case 'dh.x25519':
      return <X25519View />;
    case 'dh.eveTry':
    case 'dh.eveSkip':
      return <EveSearchView events={events} index={index} />;
    case 'dh.eveFound':
      return <EveFoundView event={event} />;
    case 'dh.eveGrowth':
      return <EveGrowthView event={event} groupName={groupName} />;
    case 'dh.mitmIntercept':
      return <InterceptView event={event} />;
    case 'dh.mitmKeys':
      return <MitmKeysView event={event} />;
    case 'dh.mitmMessage':
      return <MitmMessageView event={event} />;
    case 'dh.mitmFix':
      return <MitmFixView />;
    default:
      return null;
  }
}

/** Eve's overlay switch for the exchange: hide what she can't see. */
function EveToggle({ on, onChange }: { on: boolean; onChange: (on: boolean) => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => onChange(!on)}
      className={cn(BUTTON, 'self-start', on && 'border-warn')}
    >
      <Eye aria-hidden="true" className="size-4" />
      Eve’s view
    </button>
  );
}

/**
 * Module 6. Renders `src/core/dh` runs; computes no crypto itself. The lanes show who
 * holds what so far; the picture below them shows the current step.
 */
export function DhModule({ walkthrough }: { walkthrough?: ReactNode }) {
  const share = useShareState(DH_SHARE);
  const { state, setState, linked } = share;
  const [modeChoice, setModeChoice] = useState<ModuleMode | null>(null);
  const [eveOverlay, setEveOverlay] = useState(false);
  const mode: ModuleMode =
    modeChoice ?? (linked && !isDefaultInput(linked) ? 'free' : 'walkthrough');
  const scene = state.input.scene;
  const { markComplete, progress } = useProgress();

  const { seed } = state;
  const { group, a, b, msg } = state.input;
  const runs = useDeferredImport(loadRuns);
  const loading = scene !== 'paint' && runs === null;
  const { result, problem } = useMemo(
    () => {
      const run =
        scene === 'paint'
          ? paintRun()
          : runs
            ? runs.dhRunFor(scene, mode, state)
            : { result: null, problem: null };
      return { result: run.result ?? EMPTY_RUN, problem: run.problem };
    },
    // `state.step` changes on every step and must not rebuild the run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scene, mode, group, a, b, msg, seed, runs],
  );

  const view = useRunView(result, {
    // Held back until the run exists, or a link's step would land on an empty run.
    initialStep: loading ? undefined : linked?.step,
    onStep: (step) =>
      setState((current) => (current.step === step ? current : { ...current, step })),
  });

  const chapterIndex = DH_CHAPTER_LIST.findIndex((c) => c.id === scene);
  const lastChapter = chapterIndex === DH_CHAPTER_LIST.length - 1;

  useEffect(() => {
    if (mode === 'walkthrough' && lastChapter && view.atEnd) markComplete(DH_META.slug);
  }, [mode, lastChapter, view.atEnd, markComplete]);

  const selectScene = (id: DhScene) =>
    setState((current) => ({
      ...current,
      step: 0,
      input: { ...current.input, scene: id },
    }));
  const setInput = (patch: Partial<DhInput>) =>
    setState((current) => ({
      ...current,
      step: 0,
      input: { ...current.input, ...patch },
    }));
  const setSeed = (next: number) =>
    setState((current) => ({ ...current, step: 0, seed: next }));

  const event = view.event;
  const events = result.events;
  const board = useMemo(() => buildBoard(events, view.index), [events, view.index]);
  const params = events.find((e) => e.kind === 'dh.params');
  // A params event only exists in the deferred scenes, so `runs` is always there for it.
  const groupName =
    params && runs?.isGroupId(params.groupId)
      ? runs.getGroup(params.groupId).name
      : undefined;
  const eve = scene === 'eve' || (scene === 'exchange' && eveOverlay);
  // Eve's own lane: always in her chapter, and in the paint chapter once she mixes.
  const showEveLane = scene === 'eve' || (scene === 'paint' && board.eve.length > 0);

  return (
    <ModuleLayout
      title={DH_META.title}
      intro={DH_META.intro}
      mode={mode}
      onModeChange={setModeChoice}
      controls={
        <>
          <ChapterTabs
            chapters={DH_CHAPTER_LIST}
            current={scene}
            onSelect={selectScene}
            done={
              progress.completed.includes(DH_META.slug)
                ? DH_CHAPTER_LIST.map((c) => c.id)
                : []
            }
          />
          {mode === 'walkthrough' ? (
            <ChapterContext.Provider value={scene}>{walkthrough}</ChapterContext.Provider>
          ) : (
            <FreePlayInputs
              key={`${String(share.ready)}-${scene}`}
              scene={scene}
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
      ) : (
        <>
          {scene === 'exchange' ? (
            <EveToggle on={eveOverlay} onChange={setEveOverlay} />
          ) : null}
          {scene === 'mitm' ? (
            <>
              <p className="text-fg-secondary text-sm">
                Public:{' '}
                {board.public
                  .map((i) => `${i.name} = ${shortNumber(i.value ?? '')}`)
                  .join(', ') || 'nothing yet'}
                .
              </p>
              <Lanes
                board={board}
                lanes={FOUR_LANES}
                index={view.index}
                label="Alice, Mallory in the middle, and Bob"
              />
            </>
          ) : (
            <div
              className={cn(
                'flex flex-col gap-2',
                eve && 'border-warn rounded-lg border-2 border-dashed p-2',
              )}
            >
              {eve ? (
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <Eye aria-hidden="true" className="size-4" />
                  Eve’s view: only the public channel
                </p>
              ) : null}
              <Lanes
                board={board}
                lanes={showEveLane ? WITH_EVE : THREE_LANES}
                index={view.index}
                eve={eve}
                label={
                  showEveLane
                    ? 'Alice, the public channel, Bob and Eve'
                    : 'Alice, the public channel and Bob'
                }
              />
            </div>
          )}
          <StepPicture
            event={event}
            events={events}
            index={view.index}
            groupName={groupName}
          />
        </>
      )}
      {mode === 'walkthrough' && view.atEnd && !lastChapter ? (
        <button
          type="button"
          className={`${BUTTON} self-start`}
          onClick={() => selectScene(DH_CHAPTER_LIST[chapterIndex + 1].id)}
        >
          Next chapter: {DH_CHAPTER_LIST[chapterIndex + 1].title}
          <ChevronRight aria-hidden="true" className="size-4" />
        </button>
      ) : null}
      {mode === 'walkthrough' && view.atEnd && lastChapter ? (
        <p className="border-ok rounded-md border px-3 py-2 text-sm">
          Walkthrough complete. Pick your own p and private keys in Free play.
        </p>
      ) : null}
    </ModuleLayout>
  );
}
