# Module 1: Bits, bytes and XOR (`/xor`)

Renders the runs in `src/core/xor`; computes nothing itself.

- `XorModule.tsx`: the page. Walkthrough (built-in examples, prose from
  `walkthrough.mdx`) and free play (the learner's text, key seed and crib).
- `runs.ts`: which core run each chapter shows.
- `components/XorEventView.tsx`: one view per `XorEvent` kind.
- `shareState.ts`: re-exports the `?s=` schema from `src/core/xor/state.ts`:
  `{ m: 'xor', v: 1, seed, step, input: { chapter, a, b, crib } }`.

Chapters: text to bytes → XOR → one-time pad → two-time pad (with a crib drag).
