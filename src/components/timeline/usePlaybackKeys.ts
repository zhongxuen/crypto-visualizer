'use client';

import { useEffect } from 'react';

import { matchPlaybackKey, shouldIgnoreKey } from './keymap';
import type { PlaybackStore } from './usePlayback';

/**
 * Bind the playback keyboard map.
 *
 * VENDORED from Internet Visualizer `src/components/viz/hooks/usePlaybackKeys.ts` at
 * 59ae4ad; only the import paths changed (see VENDORED.md).
 *
 * Bound to the window, so the shortcuts work when nothing in particular is focused.
 * `shouldIgnoreKey` hands a key back to the focused element when it owns it (a text
 * field, the scrubber's own arrows, `Space` on a button). `preventDefault` is called
 * only for a press this actually handles.
 *
 * Call it once per page. Two bound views would both respond to one key press.
 */
export function usePlaybackKeys(store: PlaybackStore, enabled = true): void {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;

      const command = matchPlaybackKey(event);
      if (!command || shouldIgnoreKey(event.target, command)) return;

      event.preventDefault();
      store.getState().run(command);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [store, enabled]);
}
