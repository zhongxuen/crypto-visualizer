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
