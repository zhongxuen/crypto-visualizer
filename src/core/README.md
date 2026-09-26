# src/core

Framework-free, deterministic step logic. Every algorithm is implemented here by hand and
emits an ordered list of `CryptoEvent`s. The UI only renders those events.

## What belongs here

- `sim/` — the playback kernel and seeded rng, vendored from Internet Visualizer (see
  `VENDORED.md`: `playback.ts` and `rng.ts` are byte-identical and not edited; `result.ts`
  is adapted).
- `events/` — the `CryptoEvent` union (`types.ts`, frozen after phase 02) and `createRun`,
  which gives step `n` the virtual time `n * STEP_MS` and turns `group(...)` calls into
  phases.
- `citations/` — the citation registry. Each algorithm's own citations live in
  `<algo>/citations.ts`; `general.ts` holds shared ones (UTF-8, hex, base64url).
- `bytes/` — hex, UTF-8, base64url and bit helpers on `Uint8Array`, implemented by hand
  and tested against `TextEncoder`/`TextDecoder`/`Buffer`.
- `state/` — the URL share-state codec: `?s=<base64url(JSON)>`, one Zod branch per
  module (`defineShareState` in `<algo>/state.ts`, registered in `state/index.ts`), a
  2 KB limit, a fallback to the module default that never throws, and no free-text
  passwords.
- `scenarios.ts` — the scenario catalogue the determinism and citation tests run.
- `<algo>/` (xor, sha256, hmac, kdf, aes, rsa, dh) — one folder per algorithm: its
  implementation, its `events.ts` and its `citations.ts`.

## What may not be imported or used here

Enforced by `eslint.config.mjs` and proved by `tests/boundaries.test.ts`. Core test files
(`*.test.ts`) are exempt.

- No `react`, `react-dom`, `next`, `motion`, `zustand`, and nothing from `src/app`,
  `src/components` or `src/modules`. Core must run in plain node.
- **No crypto of any kind:** no `crypto` / `node:crypto`, no crypto package, no
  `globalThis.crypto` / `window.crypto` / `crypto.subtle`. The differential tests compare
  core against `node:crypto`, so core calling it would make them prove nothing.
- No `TextEncoder`, `TextDecoder`, `Buffer`, `atob` or `btoa`. Encodings are implemented in
  `bytes/`, and tests use the platform versions as oracles.
- No `Math.random`, `Date.now`, `performance.now`, `new Date()` or `Date()`. Use the seeded
  rng from `sim/rng.ts` and the virtual timeline.

32-bit words are `number`s kept unsigned with `>>> 0`. Big integers (RSA, DH) use `bigint`.
