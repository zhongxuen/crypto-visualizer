@AGENTS.md

# Crypto Visualizer

The actual maths behind the padlock icon, one step at a time. Each module steps through a
real algorithm (XOR, SHA-256, HMAC, PBKDF2, AES, RSA, Diffie-Hellman; TLS 1.3 in phase 2)
on a shared timeline, and every step implementation is checked against `node:crypto` and
published test vectors.

Plan: `docs/implementation/00-overview.md`, one file per phase. Read the phase file before
starting its work. Next.js 16 App Router, TypeScript, Tailwind v4, Zustand, Zod, Vitest,
Playwright. No database.

## Aims

Every change is judged against these (00-overview §2). If a task doesn't serve one, it's
out of scope.

1. **Teach by stepping.** Every algorithm runs one visible step at a time, forwards and
   backwards, on the shared timeline.
2. **Be provably correct.** Step implementations are checked against `node:crypto` and the
   published test vectors. This is the project's main quality claim.
3. **Be deterministic and shareable.** Same input + same seed = the same run, and any
   state can be shared as a URL (`?s=<base64url JSON>`, validated by Zod).
4. **Be honest.** Say plainly what is simplified, what is only described, and that none of
   it may protect real data.
5. **Match the portfolio's quality bar.** Pure core, boundary lint rules, axe on every
   route, keyboard-only operation, reduced motion, a JS budget per route.
6. **Close the Internet Visualizer gap.** Link both ways, and (phase 2) perform the TLS 1.3
   handshake with real values.

## Layout

```
src/core/            pure TS step logic (see src/core/README.md)
src/components/      shared UI: timeline, byte grid, bit-diff strip, modular clock
src/modules/<name>/  one folder per module; renders events, never computes crypto
src/modules/registry.ts  the module manifest (not a module)
src/app/             routes
tests/differential/  core vs node:crypto and published vectors
e2e/                 Playwright + axe
```

Dependencies point inward: app → modules → components → core.

## Boundary rules (enforced by `eslint.config.mjs`, proved by `tests/boundaries.test.ts`)

1. `src/core/**` may not import `react`, `react-dom`, `next`, `motion`, `zustand`, or
   anything from `src/app`, `src/components` or `src/modules`.
2. **No crypto library in core.** `src/core/**` may not import `crypto` / `node:crypto` or
   any crypto package, nor reach Web Crypto via `crypto`, `globalThis.crypto`,
   `window.crypto` or `crypto.subtle`. Core implements the maths itself; if it called the
   real thing, the differential tests would compare `node:crypto` with itself. For the
   same reason core doesn't use `TextEncoder`/`TextDecoder`/`Buffer`/`atob`/`btoa`: byte
   encodings are implemented in `src/core/bytes`.
3. `src/core/**` may not call `Math.random`, `Date.now`, `performance.now`, `new Date()` or
   `Date()`. Randomness comes from the seeded rng in `src/core/sim/rng.ts`, time from the
   virtual timeline.
4. `src/modules/<a>/**` may not import `src/modules/<b>/**`.
5. `src/components/**` may not import `src/modules/**` (the registry is the exception).

Core test files (`src/core/**/*.test.ts`) and `tests/**` are exempt. `tests/differential/`
is where `node:crypto` belongs. Don't weaken a rule to make code fit: if a rule is in the
way, the code is on the wrong side of a boundary.

Other fixed rules:

- `src/core/sim/playback.ts` and `rng.ts` are vendored from Internet Visualizer
  (`VENDORED.md`). Don't edit them.
- Every `CryptoEvent` cites a `Citation` that resolves in the registry
  (`tests/citations.test.ts`). Every scenario is deterministic (`tests/determinism.test.ts`).
- Typed free-text passwords are **never** put in a URL or in `localStorage`. Share-state
  refuses password-like keys (`findSecretKeys` in `src/core/state/schema.ts`); share a
  built-in example's id instead.
- Each run step gets `STEP_MS` of virtual time (`createRun` in `src/core/events`), and
  `group(...)` calls become the phases the stepper moves between.
- The mulberry32 rng is not cryptographic. Keys are for display only, and the UI says so.
- `/demo` stays, as the test bed for the shared building blocks (`e2e/demo.spec.ts` drives
  the timeline and byte grid there in isolation). It is `noindex, nofollow`, linked from
  nowhere, and must be left out of the sitemap. It is not held to the module JS budget.
- A module page holds its share state as a zod-free `LazyShareState` from
  `src/core/<algo>/share.ts`; the zod schema in `state.ts` loads only when a link is read.
  Import runtime values from `share.ts`, never from `state.ts`, or zod lands back in the
  route's first-load JS.
- `npm run verify` enforces the 95% `src/core` coverage floor and, through
  `perf/bundles.mjs`, 170 KB of gzipped first-load JS per module route.
- To stay in that budget, a module's first chapter is static and the rest load right
  after hydration: `runs.ts` (every chapter's run, the views only those chapters use, and
  free play's form) comes in through `useDeferredImport` and is rendered from the loaded
  module (`runs.FreePlayInputs`, `runs.ChapterPicture`, ...). The first chapter's builder
  lives in its own file (`paintRun.ts`, `keysRun.ts`, `blockRun.ts`, `tableRun.ts`,
  `sha256Run.ts`). Hold `initialStep` back until the run exists. Don't use `next/dynamic`
  on a module page: a walkthrough view that suspends swallows an arrow-key press, and its
  loader alone costs about 2 KB of first-load JS, more than any free-play form.
- Turbopack ships a core file whole, so a later chapter's run builder must not share a
  file with what the first chapter needs (`sha256/run.ts` and `sha256/avalanche.ts` apart
  from the fast path in `sha256.ts`; `aes/keyScheduleRun.ts` and `aes/avalanche.ts` apart
  from `aes128.ts`). Stepped and fast paths still go through one shared loop.
- `CitationLink` reads the page's registry from context. Each module passes its own
  (`src/modules/<name>/citations.ts`) to `ModuleLayout`'s `citations` prop;
  `tests/module-citations.test.ts` checks it covers everything the module's runs cite. A
  page may start with a smaller registry for its first chapter (`keysCitations.ts`,
  `blockCitations.ts`, `sha256Citations.ts`) and switch to the full one when `runs.ts`
  arrives with the later chapters' events; the same test checks the small one covers the
  first chapter.

## Rules for parallel agents (00-overview §4)

- Each parallel agent gets its own git worktree and branch (`claude --worktree` or
  `git worktree add ../cv-<name> -b feat/<name>`). Branches merge one at a time at the end
  of a wave, with `npm run verify` after each merge.
- An agent only touches its own folders: `src/core/<algo>/`, `src/modules/<name>/`,
  `src/app/(modules)/<route>/` and `tests/differential/<algo>.test.ts`.
- The only shared files a module agent may edit are **append-only, one line each**:
  `src/core/citations/index.ts`, `src/core/scenarios.ts`, `src/core/state/index.ts`,
  `src/modules/registry.ts` (flip its own entry's `status` only) and `docs/ACCURACY.md`
  (its own section, once it exists). Conflicts there are resolved by keeping both sides.
- Each algorithm replaces its own placeholder `src/core/<algo>/events.ts` and
  `citations.ts`. Nobody edits `src/core/events/types.ts`.
- Known W2 overlaps: RSA signing wants the SHA-256 fast path and DH wants RSA's `modPow`.
  Work without the other and leave a TODO; they're resolved at merge.
- If an agent needs to change a shared contract (event types, the timeline, a shared
  component), it **stops and reports** instead of changing it.

## Commands

`npm run dev` · `npm run verify` (lint, typecheck, unit tests, build) · `npm run test:e2e`
(Playwright against a production build on port 3100) · `npm run format`
