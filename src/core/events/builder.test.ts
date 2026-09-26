import { describe, expect, it } from 'vitest';

import {
  createPlayback,
  jumpToEnd,
  stepBack,
  stepEventBack,
  stepEventForward,
  stepForward,
  timelineFrom,
} from '../sim/playback';
import { createRun, STEP_MS, stepIndexAt, timeOfStep } from './builder';
import type { EventBase } from './types';

type TestEvent = EventBase & { kind: 'test.step'; value: number };

function event(id: string, value = 0): TestEvent {
  return { kind: 'test.step', id, label: `step ${id}`, citation: 'rfc3629.3', value };
}

/** Two groups of 2 and 3 steps, with one ungrouped step between them. */
function buildSample() {
  const run = createRun<TestEvent>();
  run.group(
    'Setup',
    () => {
      run.step(event('t.setup.0', 1));
      run.step(event('t.setup.1', 2));
    },
    { id: 'setup', description: 'Prepare.' },
  );
  run.step(event('t.loose.0'));
  run.group('Rounds', () => {
    run.step(event('t.round.0'));
    run.step(event('t.round.1'));
    run.step({ ...event('t.round.2'), group: 'Custom' });
  });
  return run.finish();
}

describe('createRun', () => {
  it('places step n at n * STEP_MS and ends one step after the last', () => {
    const result = buildSample();
    expect(result.events.map((e) => e.at)).toEqual(
      [0, 1, 2, 3, 4, 5].map((n) => n * STEP_MS),
    );
    expect(result.durationMs).toBe(6 * STEP_MS);
  });

  it('turns groups into phases, ungrouped steps belonging to the one before', () => {
    const result = buildSample();
    expect(result.phases).toStrictEqual([
      {
        index: 0,
        id: 'setup',
        title: 'Setup',
        description: 'Prepare.',
        startMs: 0,
        endMs: 3 * STEP_MS,
      },
      {
        index: 1,
        id: 'Rounds',
        title: 'Rounds',
        description: '',
        startMs: 3 * STEP_MS,
        endMs: 6 * STEP_MS,
      },
    ]);
  });

  it('tags events with their group unless they set one', () => {
    const groups = buildSample().events.map((e) => e.group);
    expect(groups).toEqual(['Setup', 'Setup', undefined, 'Rounds', 'Rounds', 'Custom']);
    expect('group' in buildSample().events[2]).toBe(false);
  });

  it('keeps the event fields it was given', () => {
    expect(buildSample().events[1]).toStrictEqual({
      ...event('t.setup.1', 2),
      group: 'Setup',
      at: STEP_MS,
    });
  });

  it('does not keep a reference to the caller’s event object', () => {
    const run = createRun<TestEvent>();
    const original = event('a');
    run.step(original);
    const result = run.finish();
    original.label = 'changed';
    expect(result.events[0].label).toBe('step a');
  });

  it('adds no phase for an empty group', () => {
    const run = createRun<TestEvent>();
    run.group('Empty', () => {});
    run.step(event('a'));
    expect(run.finish().phases).toEqual([]);
  });

  it('produces an empty run', () => {
    expect(createRun<TestEvent>().finish()).toStrictEqual({
      events: [],
      phases: [],
      durationMs: 0,
    });
  });

  it('is deterministic', () => {
    expect(buildSample()).toStrictEqual(buildSample());
  });

  it.each([
    [
      'a duplicate event id',
      () => {
        const run = createRun<TestEvent>();
        run.step(event('a'));
        run.step(event('a'));
      },
    ],
    [
      'a duplicate group id',
      () => {
        const run = createRun<TestEvent>();
        run.group('A', () => run.step(event('a')));
        run.group('A', () => run.step(event('b')));
      },
    ],
    [
      'a nested group',
      () => {
        const run = createRun<TestEvent>();
        run.group('Outer', () => run.group('Inner', () => run.step(event('a'))));
      },
    ],
    [
      'a step after finish',
      () => {
        const run = createRun<TestEvent>();
        run.finish();
        run.step(event('a'));
      },
    ],
  ])('rejects %s', (_name, build) => {
    expect(build).toThrow();
  });

  it('can start a new group after one threw', () => {
    const run = createRun<TestEvent>();
    expect(() =>
      run.group('Broken', () => {
        throw new Error('boom');
      }),
    ).toThrow('boom');
    run.group('Next', () => run.step(event('a')));
    expect(run.finish().phases.map((p) => p.id)).toEqual(['Next']);
  });
});

describe('createRun with the vendored playback', () => {
  const result = buildSample();
  const timeline = timelineFrom(result);

  it('produces a timeline playback accepts', () => {
    expect(timeline).toEqual({
      durationMs: 6 * STEP_MS,
      phaseStarts: [0, 3 * STEP_MS],
      eventTimes: [0, 1, 2, 3, 4, 5].map((n) => n * STEP_MS),
    });
  });

  it('steps forward one step at a time and back again', () => {
    let state = createPlayback();
    const visited: number[] = [];
    for (let i = 0; i < 5; i += 1) {
      state = stepEventForward(state, timeline);
      visited.push(stepIndexAt(result, state.virtualTime));
    }
    expect(visited).toEqual([1, 2, 3, 4, 5]);

    state = stepEventBack(state, timeline);
    expect(stepIndexAt(result, state.virtualTime)).toBe(4);
  });

  it('steps by group with stepForward and stepBack', () => {
    const atSecondGroup = stepForward(createPlayback(), timeline);
    expect(stepIndexAt(result, atSecondGroup.virtualTime)).toBe(3);
    expect(stepIndexAt(result, stepBack(atSecondGroup, timeline).virtualTime)).toBe(0);
  });

  it('shows the last step at the end of the run', () => {
    const end = jumpToEnd(createPlayback(), timeline);
    expect(stepIndexAt(result, end.virtualTime)).toBe(5);
  });
});

describe('stepIndexAt and timeOfStep', () => {
  const result = buildSample();

  it('maps a time to the step that has started', () => {
    expect(stepIndexAt(result, 0)).toBe(0);
    expect(stepIndexAt(result, STEP_MS - 1)).toBe(0);
    expect(stepIndexAt(result, STEP_MS)).toBe(1);
    expect(stepIndexAt(result, 99 * STEP_MS)).toBe(5);
    expect(stepIndexAt(result, -5)).toBe(0);
    expect(stepIndexAt(result, Number.NaN)).toBe(0);
  });

  it('returns -1 for an empty run', () => {
    expect(stepIndexAt(createRun<TestEvent>().finish(), 0)).toBe(-1);
  });

  it('inverts timeOfStep', () => {
    for (let i = 0; i < 6; i += 1) expect(stepIndexAt(result, timeOfStep(i))).toBe(i);
  });
});
