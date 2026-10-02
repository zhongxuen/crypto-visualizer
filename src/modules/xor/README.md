# Module 1: Bits, bytes and XOR (`/xor`)

Renders the runs in `src/core/xor`; computes nothing itself.

- `XorModule.tsx`: the page. Walkthrough (built-in examples, prose from
  `walkthrough.mdx`) and free play (the learner's text, key seed and crib).
- `bytesRun.ts`: the first chapter's run, static. `runs.ts` (every chapter's run, the
  views of the later chapters and free play's inputs) loads after hydration through
  `useDeferredImport`, to keep the route inside its JS budget.
- `components/BytesView.tsx`: text to bytes. The character lifts out of the text and its
  UTF-8 bytes fly onto the byte tape.
- `components/ByteTape.tsx`: the tape, a row of bytes with the character above each one
  (a multi-byte character sits over all its bytes) and dashed cells for bytes to come.
- `components/BitColumns.tsx`: one byte of `a ⊕ b`, bit column by column, with a wave of
  flips; unmasking slides the key down and runs the wave the other way.
- `components/CribDrag.tsx`: the two-time pad's crib, a draggable slider along
  `c1 ⊕ c2` (arrow keys, Page Up/Down, Home and End move it). Each offset is a step of
  core's run, so moving the chip seeks the timeline.
- `components/Phase.tsx`: `<Phase id>` in `walkthrough.mdx` marks the paragraph for the
  phase on screen, so the lesson follows the timeline.
- `components/XorEventView.tsx`: one view per `XorEvent` kind.
- `shareState.ts`: re-exports the `?s=` schema from `src/core/xor/state.ts`:
  `{ m: 'xor', v: 1, seed, step, input: { chapter, a, b, crib } }`.

Chapters: text to bytes → XOR → one-time pad → two-time pad (with a crib drag).
