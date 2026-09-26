'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * Whether a media query matches, read through `useSyncExternalStore`.
 *
 * VENDORED from Internet Visualizer `src/components/viz/hooks/useMediaQuery.ts` at
 * 59ae4ad, with `useReducedMotion` added (see VENDORED.md).
 *
 * `serverValue` is what the server render and hydration assume.
 */
export function useMediaQuery(query: string, serverValue: boolean): boolean {
  const subscribe = useCallback(
    (listener: () => void) => {
      if (typeof window.matchMedia !== 'function') return () => {};
      const list = window.matchMedia(query);
      list.addEventListener('change', listener);
      return () => list.removeEventListener('change', listener);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () =>
      typeof window.matchMedia === 'function'
        ? window.matchMedia(query).matches
        : serverValue,
    () => serverValue,
  );
}

/**
 * The viewer asked for less motion. Assumed on the server, so nothing starts moving
 * before the client knows.
 */
export function useReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)', true);
}
