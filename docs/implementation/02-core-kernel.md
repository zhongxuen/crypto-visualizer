# 02 — Core kernel: timeline, events, citations, bytes, URL state

Wave: **W1** · Estimate: 1–1.5 days · Original plan: phase 0 (second half)

## Goal

The contracts every module builds on: the vendored playback kernel, the `CryptoEvent`
type, the citation registry, byte helpers, and the URL share-state codec. After this
phase, algorithm cores can be written in parallel without talking to each other.

## Prerequisites

01.

---

## Deliverables

```
VENDORED.md
src/core/sim/            playback.ts  rng.ts  result.ts   (vendored, unchanged)
src/core/events/         types.ts  builder.ts  index.ts
src/core/citations/      types.ts  registry.ts  index.ts  general.ts
src/core/bytes/          hex.ts  utf8.ts  base64url.ts  bits.ts  index.ts
src/core/state/          shareState.ts  schema.ts
src/core/scenarios.ts    scenario catalogue (empty list, filled by modules)
tests/determinism.test.ts
tests/citations.test.ts
```

---

## Steps

### 1. Vendor the kernel

Copy `src/core/sim/playback.ts`, `rng.ts` and `result.ts` (and their tests) from
`../internet-visualizer` at commit `59ae4ad`. Don't edit them. Record source path, commit
and reason in `VENDORED.md`. The rng is mulberry32: **not cryptographic**. That's fine
because this project's keys are for display, and the disclaimer says so.

### 2. Step-indexed events

Internet Visualizer's playback runs on virtual time. Instead of changing it,
`builder.ts` gives each step a fixed virtual duration (`STEP_MS = 600`) and produces the
`SimResult` the vendored playback expects. Step *n* starts at `n * STEP_MS`.

### 3. `CryptoEvent` (the shared contract)

A discriminated union. Each algorithm owns its own variants, declared in its own folder
and joined here:

```ts
// src/core/events/types.ts
export interface EventBase {
  id: string;              // stable within a run: `${algo}.${phase}.${index}`
  label: string;           // one short sentence, plain language
  detail?: string;         // optional longer explanation
  citation: CitationId;    // must resolve in the registry
  group?: string;          // for the phase stepper, e.g. "Round 3"
}
export type CryptoEvent =
  | XorEvent | Sha256Event | HmacEvent | KdfEvent | AesEvent | RsaEvent | DhEvent;
```

To let W2 agents work in parallel, phase 02 creates **placeholder** files
`src/core/<algo>/events.ts` for each algorithm that export
`type <Algo>Event = EventBase & { kind: '<algo>.placeholder' }`. Each core prompt
replaces its own placeholder. Nobody edits `types.ts` after this phase.

`builder.ts` exports `createRun<E>()` with `step(event)`, `group(name, fn)` and
`finish(): SimResult<E>`.

### 4. Citations

```ts
export type CitationId = string; // e.g. 'fips197.5.1.1'
export interface Citation { id: CitationId; doc: 'FIPS 197' | 'RFC 8017' | ...; section?: string; title: string; url: string }
```

Each algorithm has its own `src/core/<algo>/citations.ts` exporting a `Citation[]`.
`citations/index.ts` imports them all (one line each, append-only) into one registry.
`general.ts` holds citations shared across modules. Phase 02 adds empty
`citations.ts` placeholders for each algorithm.

### 5. Bytes

`hexToBytes`, `bytesToHex`, `utf8Encode`/`utf8Decode` (implemented by hand in core, then
tested against `TextEncoder`), `toBinary`, `base64url` encode/decode, `xorBytes`,
`rotr32`, `popcount`, `bitDiff(a, b) → number[]` (indices of flipped bits).
All on `Uint8Array`; 32-bit words as `number` with `>>> 0`.

### 6. Share state

`?s=<base64url(JSON)>`. The schema is a Zod discriminated union keyed by module
(`{ m: 'aes', v: 1, seed, step, input: {...} }`). Each module adds its own branch in its
own folder and registers it the same append-only way as citations. Invalid or oversized
(> 2 KB) state falls back to the module default and never throws.

Rule written into `shareState.ts`: **free-text password inputs are never encoded.**

### 7. Scenario catalogue, determinism and citation tests

`src/core/scenarios.ts` lists `{ id, run: () => SimResult }`. Modules append to it.

- `tests/determinism.test.ts`: runs every scenario twice, results must be deep-equal.
- `tests/citations.test.ts`: every event in every scenario has a `citation` that exists in
  the registry, and every citation has a URL.

Both pass on an empty catalogue and gain coverage as modules land.

---

## Acceptance criteria

- [ ] Vendored files are byte-identical to the source commit; `VENDORED.md` says so
- [ ] `createRun` produces a `SimResult` that the vendored `playback.ts` accepts (test)
- [ ] Byte helpers round-trip on 1,000 seeded random inputs; UTF-8 matches `TextEncoder`
- [ ] Share-state encode→decode is identity; garbage input returns the default
- [ ] Placeholder `events.ts` and `citations.ts` exist for xor, sha256, hmac, kdf, aes,
      rsa, dh
- [ ] `npm run verify` passes

---

## Prompts to execute

### Prompt 2.1 — vendor kernel, events, citations

```
Read docs/implementation/00-overview.md and docs/implementation/02-core-kernel.md.

Vendor src/core/sim/{playback,rng,result}.ts and their tests from ../internet-visualizer
(commit 59ae4ad) without edits, and write VENDORED.md. Then build src/core/events and
src/core/citations exactly as specified in steps 2-4, including the placeholder
events.ts and citations.ts files for xor, sha256, hmac, kdf, aes, rsa and dh, so later
agents can work in parallel without touching shared files.

Add the scenario catalogue plus tests/determinism.test.ts and tests/citations.test.ts.
Done when `npm run verify` passes. Commit.
```

### Prompt 2.2 — bytes and share state

```
Read docs/implementation/02-core-kernel.md steps 5-6.

Implement src/core/bytes (all helpers, pure, no TextEncoder or Buffer inside core) and
src/core/state (the Zod share-state codec with a per-module registration pattern, 2 KB
limit, safe fallback, and the rule that free-text passwords are never encoded). Tests
may use TextEncoder/Buffer as oracles. Use seeded random inputs from the vendored rng.

Done when `npm run verify` passes. Commit.
```
