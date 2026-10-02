import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { createRun, STEP_MS } from '@/core/events/builder';
import type { EventBase } from '@/core/events/types';
import { timelineFrom } from '@/core/sim/playback';

import { ChapterTabs } from '../lesson/Chapters';
import { ShareLinkContext } from '../state/ShareLinkContext';
import { expectNoAxeViolations } from '../testing/axe';
import { CopyLinkButton, ShortcutSheet } from './DockExtras';
import { matchPlaybackKey, shouldIgnoreKey } from './keymap';
import { groupPhases, PhaseStepper } from './PhaseStepper';
import { StepCaption } from './StepCaption';
import { timeLeft, TimelineBar } from './TimelineBar';
import { createPlaybackStore, usePlayback, useStepIndex } from './usePlayback';
import { usePlaybackKeys } from './usePlaybackKeys';

type E = EventBase & { kind: 't' };

function sample() {
  const run = createRun<E>();
  run.group('A', () => {
    run.step({ kind: 't', id: 'a0', label: 'First', citation: 'rfc3629.3' });
    run.step({ kind: 't', id: 'a1', label: 'Second', citation: 'rfc3629.3' });
  });
  run.group('B', () => {
    run.step({ kind: 't', id: 'b0', label: 'Third', citation: 'rfc3629.3' });
    run.step({ kind: 't', id: 'b1', label: 'Fourth', citation: 'rfc3629.3' });
  });
  return run.finish();
}

describe('keymap', () => {
  it('maps arrows to steps and Shift + arrows to groups', () => {
    expect(matchPlaybackKey({ key: 'ArrowRight' })).toEqual({
      type: 'step-event',
      direction: 1,
    });
    expect(matchPlaybackKey({ key: 'ArrowLeft', shiftKey: true })).toEqual({
      type: 'step-phase',
      direction: -1,
    });
    expect(matchPlaybackKey({ key: ' ' })).toEqual({ type: 'toggle' });
    expect(matchPlaybackKey({ key: 'End' })).toEqual({ type: 'jump', to: 'end' });
    expect(matchPlaybackKey({ key: '5' })).toEqual({ type: 'speed', speed: 4 });
    expect(matchPlaybackKey({ key: 'ArrowRight', ctrlKey: true })).toBeNull();
    expect(matchPlaybackKey({ key: 'x' })).toBeNull();
  });

  it('leaves keys to text fields, sliders, buttons and grids', () => {
    const input = document.createElement('input');
    expect(shouldIgnoreKey(input, { type: 'toggle' })).toBe(true);
    const range = document.createElement('input');
    range.type = 'range';
    expect(shouldIgnoreKey(range, { type: 'step-event', direction: 1 })).toBe(true);
    expect(shouldIgnoreKey(range, { type: 'toggle' })).toBe(false);
    const button = document.createElement('button');
    expect(shouldIgnoreKey(button, { type: 'toggle' })).toBe(true);
    expect(shouldIgnoreKey(button, { type: 'step-event', direction: 1 })).toBe(false);
    const grid = document.createElement('div');
    grid.setAttribute('data-own-arrows', '');
    const cell = document.createElement('div');
    grid.append(cell);
    expect(shouldIgnoreKey(cell, { type: 'step-event', direction: 1 })).toBe(true);
    expect(shouldIgnoreKey(null, { type: 'toggle' })).toBe(false);
  });
});

describe('playback store', () => {
  it('steps one event, one group, jumps and seeks steps', () => {
    const result = sample();
    const store = createPlaybackStore(timelineFrom(result));
    const at = () => store.getState().virtualTime / STEP_MS;

    store.getState().stepEvent(1);
    expect(at()).toBe(1);
    store.getState().stepPhase(1);
    expect(at()).toBe(2);
    store.getState().stepEvent(-1);
    expect(at()).toBe(1);
    store.getState().jumpTo('end');
    expect(at()).toBe(3);
    expect(store.getState().status).toBe('paused');
    store.getState().seekStep(1);
    expect(at()).toBe(1);
    store.getState().jumpTo('start');
    expect(at()).toBe(0);
    store.getState().run({ type: 'speed', speed: 2 });
    expect(store.getState().speed).toBe(2);
    store.getState().run({ type: 'toggle' });
    expect(store.getState().status).toBe('playing');
    store.getState().tick(STEP_MS / 2);
    expect(at()).toBe(1);
  });

  it('resets when the run changes, and opens on an initial step', () => {
    const first = sample();
    const { result: hook, rerender } = renderHook(
      ({ result, initialStep }) => {
        const store = usePlayback({ result, initialStep });
        return { store, index: useStepIndex(store, result) };
      },
      { initialProps: { result: first, initialStep: 2 } },
    );
    expect(hook.current.index).toBe(2);
    rerender({ result: blocks(), initialStep: 0 });
    expect(hook.current.index).toBe(0);
  });

  it('keeps the playhead when an identical run is rebuilt', () => {
    // A module rebuilds its run when later chapters' code arrives; a share link's step
    // that has already landed must survive it.
    const { result: hook, rerender } = renderHook(
      ({ result }) => {
        const store = usePlayback({ result, initialStep: 2 });
        return { store, index: useStepIndex(store, result) };
      },
      { initialProps: { result: sample() } },
    );
    expect(hook.current.index).toBe(2);
    act(() => hook.current.store.getState().seekStep(3));
    rerender({ result: sample() });
    expect(hook.current.index).toBe(3);
  });
});

describe('TimelineBar and keys', () => {
  const RESULT = sample();

  function Harness() {
    const store = usePlayback({ result: RESULT });
    usePlaybackKeys(store);
    const index = useStepIndex(store, RESULT);
    return (
      <>
        <StepCaption index={index} count={4} label={RESULT.events[index].label} />
        <TimelineBar store={store} result={RESULT} />
      </>
    );
  }

  it('moves by keyboard and by button', () => {
    render(<Harness />);
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Step 1 of 4');
    act(() => {
      fireEvent.keyDown(window, { key: 'ArrowRight' });
    });
    expect(status).toHaveTextContent('Second');
    act(() => {
      fireEvent.keyDown(window, { key: 'ArrowRight', shiftKey: true });
    });
    expect(status).toHaveTextContent('Third');
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(status).toHaveTextContent('Second');
    fireEvent.click(screen.getByRole('button', { name: 'Next group' }));
    expect(status).toHaveTextContent('Third');
    act(() => {
      fireEvent.keyDown(window, { key: 'End' });
    });
    expect(status).toHaveTextContent('Fourth');
    expect(screen.getByRole('button', { name: 'Play again' })).toBeInTheDocument();
    fireEvent.change(screen.getByRole('slider', { name: 'Step' }), {
      target: { value: '0' },
    });
    expect(status).toHaveTextContent('First');
  });

  it('marks the buttons that cannot move as aria-disabled, but keeps them focusable', () => {
    render(<Harness />);
    const status = screen.getByRole('status');
    const back = screen.getByRole('button', { name: 'Back' });
    const previous = screen.getByRole('button', { name: 'Previous group' });
    const next = screen.getByRole('button', { name: 'Next' });
    const nextGroup = screen.getByRole('button', { name: 'Next group' });

    // Step 0: Back and ⏮ are inert; Next and ⏭ are live.
    for (const button of [back, previous]) {
      expect(button).toHaveAttribute('aria-disabled', 'true');
      expect(button).not.toBeDisabled();
      button.focus();
      expect(button).toHaveFocus();
    }
    for (const button of [next, nextGroup]) {
      expect(button).not.toHaveAttribute('aria-disabled');
    }
    fireEvent.click(back);
    fireEvent.click(previous);
    expect(status).toHaveTextContent('Step 1 of 4');

    // The last step: the other way round.
    act(() => {
      fireEvent.keyDown(window, { key: 'End' });
    });
    expect(status).toHaveTextContent('Fourth');
    for (const button of [next, nextGroup]) {
      expect(button).toHaveAttribute('aria-disabled', 'true');
      expect(button).not.toBeDisabled();
      button.focus();
      expect(button).toHaveFocus();
    }
    for (const button of [back, previous]) {
      expect(button).not.toHaveAttribute('aria-disabled');
    }
    fireEvent.click(next);
    fireEvent.click(nextGroup);
    expect(status).toHaveTextContent('Fourth');
  });

  it('is axe clean', async () => {
    const { container } = render(<Harness />);
    await expectNoAxeViolations(container);
  });
});

describe('PhaseStepper', () => {
  it('seeks to a group and marks the current one in words', () => {
    const result = sample();
    let seeked = -1;
    render(
      <PhaseStepper
        phases={result.phases}
        currentIndex={1}
        onSeek={(time) => (seeked = time)}
      />,
    );
    const buttons = screen.getAllByRole('button');
    expect(buttons[1]).toHaveAttribute('aria-current', 'step');
    expect(buttons[1]).toHaveTextContent('Now');
    fireEvent.click(buttons[0]);
    expect(seeked).toBe(0);
  });

  it('is axe clean', async () => {
    const { container } = render(
      <PhaseStepper phases={sample().phases} currentIndex={0} onSeek={() => {}} />,
    );
    await expectNoAxeViolations(container);
  });
});

/** Phases named the way SHA-256 names its long runs. */
function blocks() {
  const run = createRun<E>();
  const step = (id: string) =>
    run.step({ kind: 't', id, label: id, citation: 'rfc3629.3' });
  run.group('Padding', () => step('p'));
  for (const part of ['Schedule', 'Rounds 1–32', 'Rounds 33–64', 'Add']) {
    run.group(`Block 1 · ${part}`, () => step(part));
  }
  run.group('Digest', () => step('d'));
  return run.finish();
}

describe('PhaseStepper on a long run (B10)', () => {
  it('groups phases under a shared prefix', () => {
    const groups = groupPhases(blocks().phases);
    expect(groups.map((g) => [g.name, g.phases.length])).toEqual([
      [null, 1],
      ['Block 1', 4],
      [null, 1],
    ]);
  });

  it('leaves a short run of a prefix ungrouped', () => {
    const run = createRun<E>();
    const step = (id: string) =>
      run.step({ kind: 't', id, label: id, citation: 'rfc3629.3' });
    run.group('X · a', () => step('a'));
    run.group('X · b', () => step('b'));
    expect(groupPhases(run.finish().phases).every((g) => g.name === null)).toBe(true);
  });

  it('opens only the group holding the current phase, with ticks for finished ones', () => {
    const { phases } = blocks();
    const { rerender } = render(
      <PhaseStepper phases={phases} currentIndex={0} onSeek={() => {}} />,
    );
    expect(
      screen.getByRole('button', { name: /Block 1 · 4 phases/ }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Schedule/ })).not.toBeInTheDocument();

    rerender(<PhaseStepper phases={phases} currentIndex={2} onSeek={() => {}} />);
    expect(screen.getByText('Block 1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Rounds 1–32/ })).toHaveAttribute(
      'aria-current',
      'step',
    );
    expect(screen.getByRole('button', { name: /Schedule/ })).toHaveTextContent(
      'Finished',
    );

    rerender(<PhaseStepper phases={phases} currentIndex={5} onSeek={() => {}} />);
    expect(screen.getByRole('button', { name: /Block 1 · 4 phases/ })).toHaveTextContent(
      'Finished',
    );
  });

  it('keeps the current phase in view inside its own scroll box', () => {
    const { phases } = blocks();
    const ui = (current: number) => (
      <div style={{ overflowY: 'auto' }} data-testid="box">
        <PhaseStepper phases={phases} currentIndex={current} onSeek={() => {}} />
      </div>
    );
    const { rerender } = render(ui(0));
    const box = screen.getByTestId('box');
    Object.defineProperty(box, 'scrollHeight', { value: 500 });
    Object.defineProperty(box, 'clientHeight', { value: 100 });
    const rect = vi
      .spyOn(Element.prototype, 'getBoundingClientRect')
      .mockImplementation(function (this: Element) {
        const top = this.getAttribute('aria-current') === 'step' ? 300 : 0;
        return { top, left: 0, right: 0, bottom: top, width: 0, height: 0 } as DOMRect;
      });
    rerender(ui(5));
    expect(box.scrollTop).toBeGreaterThan(0);
    rect.mockRestore();
  });
});

describe('The dock (UIUX §4.2)', () => {
  it('prints the time left at the current speed', () => {
    expect(timeLeft(1, 1)).toBeUndefined();
    const many = Math.ceil(120_000 / STEP_MS);
    expect(timeLeft(many, 1)).toBe('about 2 min left');
    expect(timeLeft(many, 4)).toBe('about 30 s left');
  });

  it('opens the shortcut sheet from its button and from the ? key', () => {
    render(<ShortcutSheet />);
    const dialog = document.querySelector('dialog')!;
    expect(dialog.open).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Keyboard shortcuts' }));
    expect(dialog.open).toBe(true);
    expect(screen.getByText('Play or pause')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(dialog.open).toBe(false);
    act(() => {
      fireEvent.keyDown(window, { key: '?' });
    });
    expect(dialog.open).toBe(true);
  });

  it('copies the link to this step', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.assign(navigator, { clipboard: { writeText } });
    const link = vi.fn(() => 'https://cv.example/xor?s=abc');
    render(
      <ShareLinkContext.Provider value={{ link }}>
        <CopyLinkButton />
      </ShareLinkContext.Provider>,
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy link to this step' }));
    });
    expect(writeText).toHaveBeenCalledWith('https://cv.example/xor?s=abc');
    expect(screen.getByText('Link copied.')).toBeInTheDocument();
  });

  it('says so when the state is too large for a link', () => {
    render(
      <ShareLinkContext.Provider value={{ link: () => null }}>
        <CopyLinkButton />
      </ShareLinkContext.Provider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Copy link to this step' }));
    expect(screen.getByText('This state is too large for a link.')).toBeInTheDocument();
  });

  it('has no link button on a page without share state', () => {
    const { container } = render(<CopyLinkButton />);
    expect(container).toBeEmptyDOMElement();
  });

  it('opens "More playback options" (phones) with Skip this phase', () => {
    const RESULT = sample();
    function Bar() {
      const store = usePlayback({ result: RESULT });
      const index = useStepIndex(store, RESULT);
      return (
        <>
          <StepCaption index={index} count={4} label={RESULT.events[index].label} />
          <TimelineBar store={store} result={RESULT} />
        </>
      );
    }
    render(<Bar />);
    const more = screen.getByRole('button', { name: 'More playback options' });
    fireEvent.click(more);
    expect(more).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Skip this phase' }));
    expect(screen.getByRole('status')).toHaveTextContent('Third');
    expect(more).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('ChapterTabs', () => {
  it('marks the current chapter and ticks finished ones', async () => {
    const chapters = [
      { id: 'a', title: 'Alpha' },
      { id: 'b', title: 'Beta' },
    ] as const;
    let picked = '';
    const { container } = render(
      <ChapterTabs
        chapters={chapters}
        current="b"
        done={['a']}
        onSelect={(id) => (picked = id)}
      />,
    );
    expect(screen.getByRole('button', { name: /Beta/ })).toHaveAttribute(
      'aria-current',
      'step',
    );
    expect(screen.getByRole('button', { name: /Alpha/ })).toHaveTextContent('(done)');
    fireEvent.click(screen.getByRole('button', { name: /Alpha/ }));
    expect(picked).toBe('a');
    await expectNoAxeViolations(container);
  });
});
