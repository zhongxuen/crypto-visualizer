'use client';

import { ChevronRight, SkipForward } from 'lucide-react';
import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';

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
import type { AesAvalancheEvent, AesEvent, AesModeBlockEvent } from '@/core/aes/events';
import { MAX_MODE_BYTES } from '@/core/aes/modes/common';
import { AES_MODES, AES_SHARE, type AesChapter } from '@/core/aes/share';
import { bytesToHex, hexToBytes } from '@/core/bytes/hex';
import { utf8Decode, utf8Encode } from '@/core/bytes/utf8';
import { createRun } from '@/core/events/builder';
import { cn } from '@/lib/cn';

import { BlockView } from './components/BlockView';
import { MODE_NAMES } from './components/modeNames';
import { AES_PAGE_CITATIONS } from './citations';
import { AES_CHAPTER_LIST, AES_META } from './meta';
import { aesInputs, blockRunFor, inputProblem } from './blockRun';

type AesState = typeof AES_SHARE.defaults;
type AesInput = AesState['input'];

const DEFAULTS = AES_SHARE.defaults;
const EMPTY_RUN = createRun<AesEvent>().finish();

/** Every chapter's run builder, loaded right after hydration (the block's is static). */
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
  const { markComplete, progress } = useProgress();

  const { seed } = state;
  const { mode: cipherMode, keyHex, ptHex, bit } = state.input;
  const runs = useDeferredImport(loadRuns);
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

  useEffect(() => {
    if (mode === 'walkthrough' && lastChapter && view.atEnd) markComplete(AES_META.slug);
  }, [mode, lastChapter, view.atEnd, markComplete]);

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
      citations={AES_PAGE_CITATIONS}
      title={AES_META.title}
      intro={AES_META.intro}
      mode={mode}
      onModeChange={setModeChoice}
      controls={
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <ChapterTabs
              chapters={AES_CHAPTER_LIST}
              current={chapter}
              onSelect={selectChapter}
              done={
                progress.completed.includes(AES_META.slug)
                  ? AES_CHAPTER_LIST.map((c) => c.id)
                  : []
              }
            />
            <HexBinToggle value={format} onChange={setFormat} />
          </div>
          {chapter === 'modes' ? (
            <ModePicker value={cipherMode} onChange={(m) => setInput({ mode: m })} />
          ) : null}
          {mode === 'walkthrough' ? (
            <ChapterContext.Provider value={chapter}>
              {walkthrough}
            </ChapterContext.Provider>
          ) : (
            <FreePlayInputs
              key={String(share.ready)}
              chapter={chapter}
              input={state.input}
              seed={state.seed}
              onChange={setInput}
              onSeed={setSeed}
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
      {mode === 'walkthrough' && view.atEnd && lastChapter ? (
        <p className="border-ok rounded-md border px-3 py-2 text-sm">
          Walkthrough complete. Encrypt your own block in Free play.
        </p>
      ) : null}
    </ModuleLayout>
  );
}

function ModePicker({
  value,
  onChange,
}: {
  value: AesInput['mode'];
  onChange: (mode: AesInput['mode']) => void;
}) {
  return (
    <div role="group" aria-label="Block cipher mode" className="flex flex-wrap gap-1.5">
      {AES_MODES.map((m) => (
        <button
          key={m}
          type="button"
          aria-pressed={m === value}
          onClick={() => onChange(m)}
          className={cn(
            'focus-visible:outline-focus rounded-md border px-3 py-1 text-sm focus-visible:outline-2',
            m === value
              ? 'border-accent bg-accent text-accent-fg font-medium'
              : 'border-border bg-surface text-fg-secondary hover:text-fg',
          )}
        >
          {MODE_NAMES[m]}
        </button>
      ))}
    </div>
  );
}

/** Lowercase hex without spaces, or `null` if it isn't whole bytes of hex. */
function normalizeHex(text: string): string | null {
  const clean = text.replace(/\s+/g, '').toLowerCase();
  return /^(?:[0-9a-f]{2})*$/.test(clean) ? clean : null;
}

function decodeText(hex: string | undefined): string {
  if (!hex) return '';
  const text = utf8Decode(hexToBytes(hex));
  return text.includes('�') ? '' : text;
}

function FreePlayInputs({
  chapter,
  input,
  seed,
  onChange,
  onSeed,
  shareable,
}: {
  chapter: AesChapter;
  input: AesInput;
  seed: number;
  onChange: (patch: Partial<AesInput>) => void;
  onSeed: (seed: number) => void;
  shareable: boolean;
}) {
  const id = useId();
  const [keyDraft, setKeyDraft] = useState(input.keyHex ?? '');
  const [ptDraft, setPtDraft] = useState(input.ptHex ?? '');
  const [textDraft, setTextDraft] = useState(() => decodeText(input.ptHex));
  const field =
    'border-border bg-surface focus-visible:outline-focus w-full rounded-md border px-2 py-1.5 font-mono focus-visible:outline-2';
  const keyValid = normalizeHex(keyDraft)?.length === 32;
  const blockSized = chapter === 'block' || chapter === 'avalanche';
  const ptValid = !blockSized || normalizeHex(ptDraft)?.length === 32;
  const problem = !keyValid
    ? 'The key must be 16 bytes (32 hex digits).'
    : !ptValid
      ? 'The block must be 16 bytes (32 hex digits).'
      : inputProblem(chapter, input);
  const keyed = chapter !== 'gcm';
  const seeded = chapter === 'modes' || chapter === 'penguin';

  const commitPt = (hex: string) => {
    if (hex.length / 2 <= MAX_MODE_BYTES) onChange({ ptHex: hex });
  };

  if (!keyed) {
    return (
      <p className="border-border bg-surface text-fg-muted rounded-lg border p-3 text-sm">
        GCM is described, not computed, so there is nothing to type here.
      </p>
    );
  }

  return (
    <div className="border-border bg-surface grid gap-3 rounded-lg border p-3 sm:grid-cols-2">
      <label className="flex flex-col gap-1 text-sm" htmlFor={`${id}-key`}>
        Key (16 bytes as hex; display only, never a real key)
        <input
          id={`${id}-key`}
          className={field}
          value={keyDraft}
          spellCheck={false}
          autoComplete="off"
          onChange={(e) => {
            setKeyDraft(e.target.value);
            const hex = normalizeHex(e.target.value);
            if (hex?.length === 32) onChange({ keyHex: hex });
          }}
        />
      </label>
      {chapter === 'modes' ? (
        <label className="flex flex-col gap-1 text-sm" htmlFor={`${id}-text`}>
          Message as text (up to {MAX_MODE_BYTES} bytes)
          <input
            id={`${id}-text`}
            className={field}
            value={textDraft}
            onChange={(e) => {
              const hex = bytesToHex(utf8Encode(e.target.value));
              if (hex.length / 2 > MAX_MODE_BYTES) return;
              setTextDraft(e.target.value);
              setPtDraft(hex);
              commitPt(hex);
            }}
          />
        </label>
      ) : null}
      {chapter !== 'penguin' ? (
        <label className="flex flex-col gap-1 text-sm" htmlFor={`${id}-pt`}>
          {blockSized ? 'Plaintext block (16 bytes as hex)' : 'Message as hex'}
          <input
            id={`${id}-pt`}
            className={field}
            value={ptDraft}
            spellCheck={false}
            autoComplete="off"
            onChange={(e) => {
              setPtDraft(e.target.value);
              const hex = normalizeHex(e.target.value);
              if (hex === null || (blockSized && hex.length !== 32)) return;
              setTextDraft(decodeText(hex));
              commitPt(hex);
            }}
          />
        </label>
      ) : null}
      {chapter === 'avalanche' ? (
        <label className="flex flex-col gap-1 text-sm" htmlFor={`${id}-bit`}>
          Bit to flip (0 to 127, from the left)
          <input
            id={`${id}-bit`}
            type="number"
            min={0}
            max={127}
            className={field}
            value={input.bit}
            onChange={(e) => {
              const next = Number(e.target.value);
              if (Number.isInteger(next) && next >= 0 && next <= 127)
                onChange({ bit: next });
            }}
          />
        </label>
      ) : null}
      {seeded ? (
        <label className="flex flex-col gap-1 text-sm" htmlFor={`${id}-seed`}>
          Seed for the IV and nonce (not cryptographic)
          <input
            id={`${id}-seed`}
            type="number"
            min={0}
            max={4294967295}
            className={field}
            value={seed}
            onChange={(e) => {
              const next = Number(e.target.value);
              if (Number.isInteger(next) && next >= 0 && next <= 0xffffffff) onSeed(next);
            }}
          />
        </label>
      ) : null}
      {problem ? (
        <p className="text-warn text-sm sm:col-span-2" role="alert">
          {problem}
        </p>
      ) : null}
      {!shareable ? (
        <p className="text-warn text-sm sm:col-span-2">
          This state is too large for a share link.
        </p>
      ) : null}
    </div>
  );
}
