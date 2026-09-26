'use client';

import { useCallback, useSyncExternalStore } from 'react';

import {
  DEFAULT_PROGRESS,
  parseProgress,
  PROGRESS_KEY,
  type ProgressPrefs,
  type ProgressV1,
} from './progress';

/**
 * `useProgress()`: completion flags and preferences, persisted in `localStorage`.
 *
 * Never read during server render: the server snapshot is the default, and the stored
 * value arrives after hydration through `useSyncExternalStore`. Every storage access is
 * wrapped in try/catch, because private windows and blocked storage throw on access.
 * Other tabs are kept in step through the `storage` event.
 */

const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedValue: ProgressV1 = DEFAULT_PROGRESS;
/** Used when storage is blocked, so a change still lasts for this page view. */
let memoryRaw: string | null = null;

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(PROGRESS_KEY);
  } catch {
    return memoryRaw;
  }
}

function snapshot(): ProgressV1 {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedValue = parseProgress(raw);
  }
  return cachedValue;
}

function serverSnapshot(): ProgressV1 {
  return DEFAULT_PROGRESS;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === PROGRESS_KEY) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

/** Read the current value outside React. The default on the server. */
export function readProgress(): ProgressV1 {
  return typeof window === 'undefined' ? DEFAULT_PROGRESS : snapshot();
}

/** Write a new value and tell every subscriber. Never throws. */
export function writeProgress(update: (current: ProgressV1) => ProgressV1): void {
  const next = update(snapshot());
  const raw = JSON.stringify(next);
  try {
    window.localStorage.setItem(PROGRESS_KEY, raw);
  } catch {
    memoryRaw = raw;
  }
  for (const listener of listeners) listener();
}

export interface UseProgress {
  progress: ProgressV1;
  isComplete(id: string): boolean;
  markComplete(id: string): void;
  setPref<K extends keyof ProgressPrefs>(key: K, value: ProgressPrefs[K]): void;
  reset(): void;
}

export function useProgress(): UseProgress {
  const progress = useSyncExternalStore(subscribe, snapshot, serverSnapshot);

  const markComplete = useCallback((id: string) => {
    writeProgress((current) =>
      current.completed.includes(id)
        ? current
        : { ...current, completed: [...current.completed, id] },
    );
  }, []);

  const setPref = useCallback(
    <K extends keyof ProgressPrefs>(key: K, value: ProgressPrefs[K]) => {
      writeProgress((current) => ({
        ...current,
        prefs: { ...current.prefs, [key]: value },
      }));
    },
    [],
  );

  const reset = useCallback(() => {
    writeProgress(() => ({ v: 1, completed: [], prefs: { ...DEFAULT_PROGRESS.prefs } }));
  }, []);

  return {
    progress,
    isComplete: (id) => progress.completed.includes(id),
    markComplete,
    setPref,
    reset,
  };
}
