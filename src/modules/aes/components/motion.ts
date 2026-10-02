import { useStepTransition } from '@/components/motion/useStepTransition';

/**
 * Whether this view plays its step's operation (UIUX §6.1): `play` on a single step
 * forward with motion allowed; `fade` (a 120 ms crossfade) on a step back or a seek,
 * which land on the end frame without choreography. Under reduced motion both are false
 * and the end frame, which the DOM always holds, shows at once.
 */
export function useStepPlay(): { play: boolean; fade: boolean } {
  const { animate, motion, direction } = useStepTransition();
  const play = animate && direction === 'forward';
  return { play, fade: motion && !play };
}
