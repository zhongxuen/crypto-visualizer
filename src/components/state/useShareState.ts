'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type {
  LazyShareState,
  ModuleShareState,
  ShareStateBase,
} from '@/core/state/schema';
import {
  encodeShareState,
  SHARE_PARAM,
  shareStateFromSearch,
} from '@/core/state/shareState';

/**
 * `useShareState(definition)`: a module's `?s=` state, read on load and written back.
 *
 * Reading: the server render and the first client render use the module's defaults (a
 * static page has no query string), and the link's state is applied right after
 * hydration. Decoding never throws; a bad link opens the defaults. `linked` keeps what
 * the link said, unchanged, so a page can apply its step once.
 *
 * Writing: debounced, with `history.replaceState`, which the App Router keeps in step
 * with its own state. Replacing rather than pushing means scrubbing through a 300-step
 * run doesn't leave 300 history entries behind. While the state equals the module's
 * defaults the URL stays clean, with no `?s=` (UIUX P9): a link only grows once there is
 * something in it to share. `link()` writes and returns the link to the current step, for
 * the "Copy link" button.
 *
 * The codec refuses password-like keys, so a module can't write one by mistake.
 *
 * The definition is a `LazyShareState`: its zod schema is imported only when the link is
 * read, after hydration, so zod stays out of the route's first-load JS. `ready` turns
 * true once it has loaded and the link has been decoded.
 */

export interface UseShareState<S extends ShareStateBase> {
  state: S;
  /** Replace the state. The URL follows after the debounce delay. */
  setState(next: S | ((current: S) => S)): void;
  /** True once the URL has been read. Before that `state` is the defaults. */
  ready: boolean;
  /** The state the link decoded to, once read; `null` before. Never changes after. */
  linked: S | null;
  /** False when the current state is too large for a link (over 2 KB encoded). */
  shareable: boolean;
  /**
   * The link to the current state, also written to the address bar: the bare page while
   * the state is the defaults. `null` before the URL has been read, or when the state is
   * too large for a link.
   */
  link(): string | null;
}

/** The page's URL with `?s=` set to `encoded`, or removed for `null`. */
function urlWith(encoded: string | null): URL {
  const url = new URL(window.location.href);
  if (encoded === null) url.searchParams.delete(SHARE_PARAM);
  else url.searchParams.set(SHARE_PARAM, encoded);
  return url;
}

/** What goes in `?s=` for `state`: nothing at the defaults, `undefined` if too large. */
function linkParam<S extends ShareStateBase>(
  full: ModuleShareState<S>,
  state: S,
): string | null | undefined {
  const encoded = encodeShareState(full, state);
  if (encoded === null) return undefined;
  return encoded === encodeShareState(full, full.defaults) ? null : encoded;
}

export function useShareState<S extends ShareStateBase>(
  definition: LazyShareState<S>,
  { delayMs = 300 }: { delayMs?: number } = {},
): UseShareState<S> {
  const [state, setStateRaw] = useState<S>(definition.defaults);
  const [linked, setLinked] = useState<S | null>(null);
  const [full, setFull] = useState<ModuleShareState<S> | null>(null);
  const [shareable, setShareable] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ready = linked !== null;

  useEffect(() => {
    // The URL is only readable after hydration; this effect is the sync from it.
    let live = true;
    void definition.load().then((loaded) => {
      if (!live) return;
      const fromLink = shareStateFromSearch(loaded, window.location.search);
      setFull(loaded);
      setStateRaw(fromLink);
      setLinked(fromLink);
    });
    return () => {
      live = false;
    };
  }, [definition]);

  useEffect(() => {
    if (!ready || full === null) return;
    timer.current = setTimeout(() => {
      const param = linkParam(full, state);
      setShareable(param !== undefined);
      // Too large for a link: the page drops `?s=` rather than keep a stale one.
      const url = urlWith(param ?? null);
      if (url.href !== window.location.href) {
        window.history.replaceState(window.history.state, '', url.href);
      }
    }, delayMs);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [full, state, ready, delayMs]);

  const setState = useCallback((next: S | ((current: S) => S)) => {
    setStateRaw((current) =>
      typeof next === 'function' ? (next as (current: S) => S)(current) : next,
    );
  }, []);

  const link = useCallback((): string | null => {
    if (full === null) return null;
    const param = linkParam(full, state);
    if (param === undefined) return null;
    const url = urlWith(param);
    if (url.href !== window.location.href) {
      window.history.replaceState(window.history.state, '', url.href);
    }
    return url.href;
  }, [full, state]);

  return { state, setState, ready, linked, shareable, link };
}
