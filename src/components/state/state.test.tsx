import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { defineShareState, SHARE_PARAM, shareStateFromSearch } from '@/core/state';

import { migrateProgress, parseProgress, PROGRESS_KEY } from './progress';
import { useProgress } from './useProgress';
import { useShareState } from './useShareState';

describe('progress migration', () => {
  it('reads v1, keeping valid fields and defaulting the rest', () => {
    expect(
      migrateProgress({
        v: 1,
        completed: ['xor', 'xor', 3],
        prefs: { theme: 'dark', bytes: 'nope' },
      }),
    ).toEqual({ v: 1, completed: ['xor'], prefs: { theme: 'dark', bytes: 'hex' } });
  });

  it('upgrades the unversioned array shape', () => {
    expect(migrateProgress(['xor', 'hashing']).completed).toEqual(['xor', 'hashing']);
  });

  it.each([null, 42, 'x', { v: 2 }, {}])('falls back for %j', (raw) => {
    expect(migrateProgress(raw)).toEqual({
      v: 1,
      completed: [],
      prefs: { theme: 'system', bytes: 'hex' },
    });
  });

  it('never throws on bad JSON', () => {
    expect(parseProgress('{not json').completed).toEqual([]);
    expect(parseProgress(null).completed).toEqual([]);
  });
});

describe('useProgress', () => {
  beforeEach(() => localStorage.clear());

  it('marks completion and sets preferences under cv:v1', () => {
    const { result } = renderHook(() => useProgress());
    act(() => result.current.markComplete('xor'));
    act(() => result.current.markComplete('xor'));
    act(() => result.current.setPref('bytes', 'binary'));
    expect(result.current.isComplete('xor')).toBe(true);
    expect(JSON.parse(localStorage.getItem(PROGRESS_KEY)!)).toEqual({
      v: 1,
      completed: ['xor'],
      prefs: { theme: 'system', bytes: 'binary' },
    });
    act(() => result.current.reset());
    expect(result.current.progress.completed).toEqual([]);
  });

  it('keeps working when storage throws', () => {
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { result } = renderHook(() => useProgress());
    act(() => result.current.markComplete('aes'));
    expect(result.current.isComplete('aes')).toBe(true);
    get.mockRestore();
    set.mockRestore();
  });
});

describe('useShareState', () => {
  const DEF = defineShareState({
    m: 'demo',
    v: 1,
    input: z.object({ text: z.string().max(100) }),
    defaults: { seed: 1, step: 0, input: { text: 'hi' } },
  });

  beforeEach(() => {
    vi.useFakeTimers();
    window.history.replaceState(null, '', '/demo');
  });
  afterEach(() => vi.useRealTimers());

  function Probe() {
    const { state, setState, ready } = useShareState(DEF);
    return (
      <>
        <p>
          {ready ? 'ready' : 'loading'}:{state.input.text}:{state.step}
        </p>
        <button
          type="button"
          onClick={() => setState((s) => ({ ...s, step: s.step + 1 }))}
        >
          next
        </button>
      </>
    );
  }

  it('reads the link after hydration', () => {
    const search = `?${SHARE_PARAM}=${btoa(
      JSON.stringify({ ...DEF.defaults, step: 7, input: { text: 'yo' } }),
    )
      .replace(/=+$/, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')}`;
    window.history.replaceState(null, '', `/demo${search}`);
    render(<Probe />);
    expect(screen.getByText('ready:yo:7')).toBeInTheDocument();
  });

  it('falls back to the defaults for a bad link', () => {
    window.history.replaceState(null, '', '/demo?s=garbage!!');
    render(<Probe />);
    expect(screen.getByText('ready:hi:0')).toBeInTheDocument();
  });

  it('writes back with replaceState, debounced, without adding history', () => {
    const lengthBefore = window.history.length;
    render(<Probe />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByRole('button'));
    expect(window.location.search).toBe('');
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(shareStateFromSearch(DEF, window.location.search).step).toBe(2);
    expect(window.history.length).toBe(lengthBefore);
  });
});
