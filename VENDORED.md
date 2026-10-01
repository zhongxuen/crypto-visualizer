# Vendored code

Code copied from other repositories, rather than shared as a package (see
`docs/README.md` §1, "Reusing code between repos").

## Internet Visualizer playback kernel

- **Source:** https://github.com/zhongxuen/internet-visualizer, `src/core/sim/`
- **Commit:** `59ae4ad`
- **Why:** the timeline behaviour (play / pause / step / step back / scrub / speed, and
  pause-at-phase-end) is already written and tested there. Both projects stay consistent
  by sharing the same state machine.

| File here | Upstream file | Status |
| --- | --- | --- |
| `src/core/sim/playback.ts` | `src/core/sim/playback.ts` | **Byte-identical.** Do not edit. |
| `src/core/sim/rng.ts` | `src/core/sim/rng.ts` | **Byte-identical.** Do not edit. |
| `src/core/sim/__tests__/playback.test.ts` | `src/core/sim/__tests__/playback.test.ts` | **Byte-identical.** Do not edit. |
| `src/core/sim/__tests__/rng.test.ts` | `src/core/sim/__tests__/rng.test.ts` | **Byte-identical.** Do not edit. |
| `src/core/sim/result.ts` | `src/core/sim/result.ts` | **Adapted.** See below. |
| `src/core/sim/toyRun.ts` | `src/core/sim/toyRun.ts` | **Replaced.** See below. |

"Byte-identical" was checked by comparing git blob hashes
(`git hash-object --no-filters <file>` against `git rev-parse 59ae4ad:<path>`).

### Why `result.ts` is adapted

Upstream `result.ts` imports `PDU` and `SimEvent` from Internet Visualizer's
`src/core/types/`, which describe network packets and don't exist here. It can't compile
unchanged. The adapted file:

- makes `SimResult<E>` generic over the event type, with `events: (E & { at: number })[]`;
- drops the `pdus` map;
- makes `summarizePhases` take a list of phase starts instead of filtering `kind: 'phase'`
  events out of the stream, because here phases come from `createRun().group(...)`.

`PhaseSummary` and the three fields `playback.ts` reads (`events[].at`,
`phases[].startMs`, `durationMs`) keep the same names, types and meaning, which is why
`playback.ts` compiles unchanged against it.

### Why `toyRun.ts` is replaced

The vendored `playback.test.ts` imports `buildToyRun` from `../toyRun`. Upstream builds a
two-hop ping with networking types. The local file produces the same timeline (phases at
0, 10 and 60, the same event times, a duration of 120) from plain labelled events, so the
vendored test runs unchanged.

### Not cryptographic

`rng.ts` is mulberry32: a small, fast, reproducible generator with 32 bits of state. It
is **not** cryptographic. That's acceptable here because every key and nonce this project
generates is for display, and the UI says so. Never use it to protect anything.

### Updating

To take a newer upstream version, copy the files again, re-check the hashes, update the
commit above, and run `npm run verify`.

## Internet Visualizer timeline UI

- **Source:** https://github.com/zhongxuen/internet-visualizer, `src/components/viz/`
- **Commit:** `59ae4ad`
- **Why:** the playback store, the one `requestAnimationFrame` loop, the keyboard map and
  the transport controls are already written and accessibility-tested there. Sharing
  them keeps the two sites' timelines behaving the same way.

Upstream's views are built around a React Flow canvas, packets, a glossary and a
preferences system that this project doesn't have, so only two files are close to
verbatim. Every file carries a header saying what changed.

| File here | Upstream file | Status |
| --- | --- | --- |
| `src/components/timeline/usePlaybackKeys.ts` | `hooks/usePlaybackKeys.ts` | **Vendored.** Import paths only. |
| `src/components/timeline/useMediaQuery.ts` | `hooks/useMediaQuery.ts` | **Vendored**, plus `useReducedMotion`. |
| `src/components/timeline/keymap.ts` | `keymap.ts` | **Adapted.** Arrows move one step and Shift + arrow one group (upstream is the reverse: a network run is hundreds of events, a crypto run is read step by step). Grids that own their arrow keys (`data-own-arrows`) are respected. |
| `src/components/timeline/usePlayback.ts` | `hooks/usePlayback.ts` | **Adapted.** Same store and rAF loop; the preference and frame-clock plumbing is dropped; `seekStep`, `useStepIndex` and `usePhaseIndex` are added. `End` rests on the last step rather than past it. |
| `src/components/timeline/Timeline.tsx` | `Timeline.tsx` | **Adapted.** The slider's value is the step index, not virtual ms, and group marks are decorative (a SHA-256 run has 130 groups; the phase stepper is the keyboard route to them). |
| `src/components/timeline/PlaybackControls.tsx` | `PlaybackControls.tsx` | **Adapted.** Same command-emitting buttons; speed is a native `<select>` instead of the upstream popover, and group buttons are added. |
| `src/components/timeline/PhaseStepper.tsx` | `PhaseStepper.tsx` | **Adapted.** Same ordered list with "Now" in words; glossary and detail voices dropped. |
| `src/components/timeline/StepCaption.tsx` | `StepCaption.tsx` | **Adapted.** Same single polite `role="status"`; stage-moment logic dropped. |

Not taken: `frameClock.ts`, `time.ts`, `KeyboardLegend.tsx` and everything canvas- or
packet-related.

## Internet Visualizer bundle measurement

- **Source:** https://github.com/zhongxuen/internet-visualizer, `perf/bundles.mjs`
- **Commit:** `dd615cd`
- **Why:** Next 16 prints no per-route size table; this reads each prerendered route's
  script and preload tags and sums the gzipped chunks, the same way both projects state
  their budgets.

| File here | Upstream file | Status |
| --- | --- | --- |
| `perf/bundles.mjs` | `perf/bundles.mjs` | **Adapted.** The measurement is unchanged; the header comment is local, and the end enforces phase 10's 170 KB budget on every folder in `src/app/(modules)` and exits 1 when a route is over or missing. |
