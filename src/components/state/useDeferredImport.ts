'use client';

import { useEffect, useState } from 'react';

/**
 * `useDeferredImport(load)`: a module that isn't on the first screen, imported once right
 * after hydration. `null` until it arrives.
 *
 * Modules use it for the chapters a page doesn't open on: the first chapter's run is in
 * the route's first-load JS (the server rendered it, and hydration needs it), the rest
 * load straight after, normally long before anyone picks another chapter. That keeps each
 * module route inside phase 10's 170 KB budget without leaving any chapter slow to open.
 *
 * `load` must be stable (declare it at module scope): it runs once per mount.
 */
export function useDeferredImport<T>(load: () => Promise<T>): T | null {
  // Held in an object so a module namespace is never mistaken for a state updater.
  const [loaded, setLoaded] = useState<{ value: T } | null>(null);

  useEffect(() => {
    let live = true;
    void load().then((value) => {
      if (live) setLoaded({ value });
    });
    return () => {
      live = false;
    };
  }, [load]);

  return loaded?.value ?? null;
}
