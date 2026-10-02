'use client';

import { useEffect, useLayoutEffect, type RefObject } from 'react';

import { useStepTransition } from '@/components/motion';

const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect;

/** `--ease-out` from the motion tokens. */
const EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)';

/**
 * A one-shot keyframe for this module's own operations (the stamp, the shake, the salt
 * drop), through the Web Animations API so no shared stylesheet changes.
 *
 * It follows the motion rules (UIUX §6.1) like the shared primitives: it plays only on a
 * single step with motion allowed (`useStepTransition().animate`), so a seek, a share
 * link and reduced motion all show the end frame at once. The element's own styles are
 * that end frame; the keyframes only lead into it (`fill: 'backwards'`). Durations scale
 * with the playback speed (`--speed`, set by the timeline).
 */
export function useStepKeyframes(
  ref: RefObject<HTMLElement | null>,
  trigger: string | number | null,
  keyframes: Keyframe[],
  { duration, delay = 0 }: { duration: number; delay?: number },
): void {
  const { animate } = useStepTransition();
  useIsomorphicLayoutEffect(() => {
    const node = ref.current;
    if (!animate || trigger === null || !node || typeof node.animate !== 'function') {
      return;
    }
    const speed = Number(getComputedStyle(node).getPropertyValue('--speed').trim()) || 1;
    const animation = node.animate(keyframes, {
      duration: duration / speed,
      delay: delay / speed,
      easing: EASE_OUT,
      fill: 'backwards',
    });
    return () => animation.cancel();
  }, [trigger, animate]);
}

/** A miss: one short shake, 4 px, two cycles (UIUX §7.2). */
export const SHAKE: Keyframe[] = [
  { transform: 'translateX(0)' },
  { transform: 'translateX(-4px)' },
  { transform: 'translateX(4px)' },
  { transform: 'translateX(-4px)' },
  { transform: 'translateX(4px)' },
  { transform: 'translateX(0)' },
];

/** A hit: the "cracked" stamp lands. Its resting tilt is the element's own class. */
export const STAMP: Keyframe[] = [
  { opacity: 0, transform: 'rotate(-14deg) scale(1.8)' },
  { opacity: 1, transform: 'rotate(-6deg) scale(1)' },
];

/** The salt chip drops onto the password. */
export const DROP: Keyframe[] = [
  { opacity: 0, transform: 'translateY(-14px)' },
  { opacity: 1, transform: 'translateY(0)' },
];
