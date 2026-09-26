import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { createRun, STEP_MS } from '@/core/events/builder';
import type { EventBase } from '@/core/events/types';
import { timelineFrom } from '@/core/sim/playback';

import { expectNoAxeViolations } from '../testing/axe';
import { matchPlaybackKey, shouldIgnoreKey } from './keymap';
import { PhaseStepper } from './PhaseStepper';
import { StepCaption } from './StepCaption';
import { TimelineBar } from './TimelineBar';
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
    rerender({ result: sample(), initialStep: 0 });
    expect(hook.current.index).toBe(0);
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
