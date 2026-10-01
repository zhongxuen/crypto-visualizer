import { dhPaintRun } from '@/core/dh/paint';

import type { DhRun } from './runs';

/**
 * The paint scene's run. It's the first screen, so it's in the route's first load; the
 * other scenes' runs (`./runs`) load right after hydration (`useDeferredImport`).
 */
export function paintRun(): DhRun {
  return { result: dhPaintRun(), problem: null };
}
