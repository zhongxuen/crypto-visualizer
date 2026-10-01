import { describe, expect, it } from 'vitest';

import { EMPTY_TIMELINE, play, seek, timelineFrom } from '../playback';
import { buildToyRun } from '../toyRun';

/**
 * Local additions to the vendored kernel's tests. `playback.test.ts` is vendored with
 * `playback.ts` and must stay byte-for-byte upstream (`tests/vendored.test.ts`), so the
 * two edge cases it doesn't reach live here instead.
 */

const TIMELINE = timelineFrom(buildToyRun());

describe('playback edge cases', () => {
  it('play on an ended, empty run returns the same state', () => {
    const ended = { status: 'ended', virtualTime: 0, speed: 1 } as const;
    expect(play(ended, EMPTY_TIMELINE)).toBe(ended);
  });

  it('seek to a time that is not a finite number goes to the start', () => {
    const paused = { status: 'paused', virtualTime: 40, speed: 1 } as const;
    expect(seek(paused, TIMELINE, Number.NaN).virtualTime).toBe(0);
    expect(seek(paused, TIMELINE, Number.POSITIVE_INFINITY).virtualTime).toBe(0);
  });
});
