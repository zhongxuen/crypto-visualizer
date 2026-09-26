'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  encodeShareState,
  SHARE_PARAM,
  shareStateFromSearch,
  type ModuleShareState,
  type ShareStateBase,
} from '@/core/state';

/**
 * `useShareState(definition)`: a module's `?s=` state, read on load and written back.
 *
 * Reading: the server render and the first client render use the module's defaults (a
 * static page has no query string), and the link's state is applied right after
 * hydration. Decoding never throws; a bad link opens the defaults.
 *
 * Writing: debounced, with `history.replaceState`, which the App Router keeps in step
 * with its own state. Replacing rather than pushing means scrubbing through a 300-step
 * run doesn't leave 300 history entries behind.
 *
 * The codec refuses password-like keys, so a module can't write one by mistake.
 */

export interface UseShareState<S extends ShareStateBase> {
  state: S;
  /** Replace the state. The URL follows after the debounce delay. */
  setState(next: S | ((current: S) => S)): void;
  /** True once the URL has been read. Before that `state` is the defaults. */
  ready: boolean;
  /** False when the current state is too large for a link (over 2 KB encoded). */
  shareable: boolean;
}

export function useShareState<S extends ShareStateBase>(
  definition: ModuleShareState<S>,
  { delayMs = 300 }: { delayMs?: number } = {},
): UseShareState<S> {
  const [state, setStateRaw] = useState<S>(definition.defaults);
  const [ready, setReady] = useState(false);
  const [shareable, setShareable] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // The URL is only readable after hydration; this effect is the sync from it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStateRaw(shareStateFromSearch(definition, window.location.search));
    setReady(true);
  }, [definition]);

  useEffect(() => {
    if (!ready) return;
    timer.current = setTimeout(() => {
      const encoded = encodeShareState(definition, state);
      setShareable(encoded !== null);
      const url = new URL(window.location.href);
      if (encoded === null) url.searchParams.delete(SHARE_PARAM);
      else url.searchParams.set(SHARE_PARAM, encoded);
      if (url.href !== window.location.href) {
        window.history.replaceState(window.history.state, '', url.href);
      }
    }, delayMs);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [definition, state, ready, delayMs]);

  const setState = useCallback((next: S | ((current: S) => S)) => {
    setStateRaw((current) =>
      typeof next === 'function' ? (next as (current: S) => S)(current) : next,
    );
  }, []);

  return { state, setState, ready, shareable };
}
