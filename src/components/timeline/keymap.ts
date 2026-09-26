/**
 * The playback keyboard map -- one table, read by both the handler and the legend.
 *
 * ADAPTED from Internet Visualizer `src/components/viz/keymap.ts` at 59ae4ad (see
 * VENDORED.md). Upstream, the arrows move one phase and Shift + arrow one event, because
 * a network run is hundreds of events. A crypto run is a list of steps a learner reads
 * one at a time, so here the arrows move **one step** (event) and Shift + arrow one
 * **group** (phase), as docs/implementation/03 specifies. The commands and
 * `shouldIgnoreKey` are unchanged.
 *
 * Pure and DOM-free: `matchPlaybackKey` takes the fields it needs off a `KeyboardEvent`,
 * so the whole map is unit-testable without a browser.
 */

import { PLAYBACK_SPEEDS } from '@/core/sim/playback';

/** What a key press means. Mapped onto the playback store by `usePlaybackKeys`. */
export type PlaybackCommand =
  | { type: 'toggle' }
  /** One phase boundary: the coarse step, a group such as "Round 12". */
  | { type: 'step-phase'; direction: 1 | -1 }
  /** One event: the fine step. */
  | { type: 'step-event'; direction: 1 | -1 }
  | { type: 'jump'; to: 'start' | 'end' }
  | { type: 'speed'; speed: number }
  | { type: 'replay-phase' };

export interface PlaybackShortcut {
  /** Key caps to print. Each inner array is one chord; several are alternatives. */
  chords: string[][];
  /** What it does, in the words the legend prints. */
  action: string;
}

/** The full map, in the order the legend lists it. */
export const PLAYBACK_SHORTCUTS: readonly PlaybackShortcut[] = [
  { chords: [['Space']], action: 'Play or pause' },
  { chords: [['→'], ['←']], action: 'Next step or back one step' },
  {
    chords: [
      ['Shift', '→'],
      ['Shift', '←'],
    ],
    action: 'Next group or previous group',
  },
  { chords: [['Home'], ['End']], action: 'Jump to the start or the end' },
  {
    chords: [['1'], ['2'], ['3'], ['4'], ['5']],
    action: 'Speed 0.25x, 0.5x, 1x, 2x, 4x',
  },
  { chords: [['.']], action: 'Replay this group' },
];

/** The parts of a `KeyboardEvent` the map reads. */
export interface KeyChord {
  key: string;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
}

/** `'1'`..`'5'` select the five speeds in `PLAYBACK_SPEEDS` order. */
const SPEED_KEYS = PLAYBACK_SPEEDS.map((_, index) => String(index + 1));

/**
 * The command a key press means, or `null` if it means nothing here.
 *
 * Any modifier other than `Shift` disqualifies the press: `Ctrl` + `→` is a word jump,
 * `Cmd` + `←` is browser history, and a visualization has no business shadowing either.
 */
export function matchPlaybackKey(event: KeyChord): PlaybackCommand | null {
  if (event.ctrlKey || event.metaKey || event.altKey) return null;

  const type = event.shiftKey ? 'step-phase' : 'step-event';

  switch (event.key) {
    case ' ':
    case 'Spacebar':
      return { type: 'toggle' };
    case 'ArrowRight':
      return { type, direction: 1 };
    case 'ArrowLeft':
      return { type, direction: -1 };
    case 'Home':
      return { type: 'jump', to: 'start' };
    case 'End':
      return { type: 'jump', to: 'end' };
    case '.':
      return { type: 'replay-phase' };
    default:
      break;
  }

  const speedIndex = SPEED_KEYS.indexOf(event.key);
  return speedIndex === -1 ? null : { type: 'speed', speed: PLAYBACK_SPEEDS[speedIndex] };
}

/** Elements the browser already activates with `Space`. */
const SPACE_ACTIVATES = new Set(['button', 'a', 'summary', 'label', 'option']);

/**
 * Should this command be left to the element the key press landed on?
 *
 * - **Text entry** owns every printable key.
 * - **The scrubber** is a native range input: its arrows and `Home`/`End` already move
 *   the playhead, so those are left to it.
 * - **Buttons and links** are activated by `Space`.
 */
export function shouldIgnoreKey(
  target: EventTarget | null,
  command: PlaybackCommand,
): boolean {
  if (!(target instanceof Element)) return false;

  const tag = target.tagName.toLowerCase();
  if (tag === 'input' && (target as HTMLInputElement).type === 'range') {
    return (
      command.type === 'step-phase' ||
      command.type === 'step-event' ||
      command.type === 'jump'
    );
  }
  if (isTypingTarget(target)) return true;
  // A focused grid cell or radio uses the arrows itself.
  if (
    (command.type === 'step-event' || command.type === 'step-phase') &&
    target.closest('[data-own-arrows]')
  ) {
    return true;
  }

  if (command.type !== 'toggle') return false;
  return SPACE_ACTIVATES.has(tag) || target.getAttribute('role') === 'button';
}

/** Is a key press landing somewhere the viewer types? */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;

  const tag = target.tagName.toLowerCase();
  if (tag === 'textarea' || tag === 'select') return true;
  if (tag === 'input') {
    const type = (target as HTMLInputElement).type;
    return type !== 'range' && type !== 'checkbox' && type !== 'radio';
  }
  if (target.getAttribute('contenteditable') === 'true') return true;
  return target instanceof HTMLElement && target.isContentEditable === true;
}
