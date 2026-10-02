'use client';

import {
  createContext,
  createElement,
  useContext,
  useState,
  type ReactNode,
} from 'react';

import { useReducedMotion } from '../timeline/useMediaQuery';

/**
 * What the last step change was, for the motion primitives (docs/UIUX.md §6.1).
 *
 * - **forward** / **back**: one step, so the operation plays (or plays in reverse).
 * - **seek**: more than one step at once (the scrubber, Home/End, a share link), so
 *   everything jumps to its end frame with at most a short crossfade.
 * - **none**: nothing has changed since the first render.
 *
 * `animate` is the one flag a primitive needs: a single step, and the viewer hasn't asked
 * for reduced motion. It is a pure function of (previous step, step, preference), so the
 * same step always lands in the same final frame.
 */

export type StepDirection = 'forward' | 'back' | 'none';

export interface StepTransition {
  from: number;
  to: number;
  direction: StepDirection;
  /** More than one step at once. */
  isSeek: boolean;
  /** Play the operation: a single step, and motion is allowed. */
  animate: boolean;
  /** Motion is allowed at all (a seek may still crossfade). */
  motion: boolean;
}

/** The pure part: what changed between two steps. */
export function describeStep(from: number, to: number, reduced: boolean): StepTransition {
  const delta = to - from;
  const isSeek = Math.abs(delta) > 1;
  return {
    from,
    to,
    direction: delta > 0 ? 'forward' : delta < 0 ? 'back' : 'none',
    isSeek,
    animate: !reduced && delta !== 0 && !isSeek,
    motion: !reduced && delta !== 0,
  };
}

/** Track `step` and report how it last changed. */
export function useStepChange(step: number): StepTransition {
  const reduced = useReducedMotion();
  const [pair, setPair] = useState({ from: step, to: step });
  let current = pair;
  // Adjusting state while rendering (React's "storing information from previous renders").
  if (pair.to !== step) {
    current = { from: pair.to, to: step };
    setPair(current);
  }
  return describeStep(current.from, current.to, reduced);
}

const StepContext = createContext<StepTransition>(describeStep(0, 0, true));

/** Gives every primitive under it the current step change. `ModuleLayout` renders one. */
export function StepTransitionProvider({
  step,
  children,
}: {
  step: number;
  children: ReactNode;
}) {
  const transition = useStepChange(step);
  return createElement(StepContext.Provider, { value: transition }, children);
}

/** The step change from the nearest `StepTransitionProvider`. Outside one, nothing animates. */
export function useStepTransition(): StepTransition {
  return useContext(StepContext);
}
