# Module 4: AES (`/aes`)

Renders the runs in `src/core/aes`; computes nothing itself.

- `AesModule.tsx`: the page. Six chapters: one block (FIPS 197 Appendix C.1), the key
  schedule (Appendix A.1's key), avalanche, modes (ECB / CBC / CTR, picked above the
  lesson), the ECB penguin and GCM (described only). Free play takes a hex key, a hex
  block or a message, the bit to flip and the IV/nonce seed.
- `blockRun.ts` + `blockCitations.ts`: the block chapter's run and citations, in the
  first load. `runs.ts` brings the other chapters' runs and views, the full citation
  registry and free play's form (`components/Inputs.tsx`) after hydration.
- `walkthrough.mdx` + `lesson.tsx`: one short `<Phase on="...">` paragraph per phase;
  the page publishes the step's tags (`lessonTags`) and the matching paragraph is marked
  current and scrolled into view in the lesson rail.
- `components/BlockView.tsx`: the 4×4 state per sub-step, keyed by step so each forward
  step plays its operation (UIUX §7.2). SubBytes: before/after with the 16×16 S-box
  beside them (`SboxTable.tsx`); the new bytes flip in cell by cell while the S-box
  entries they come from glow in turn. ShiftRows: each row slides left with the shared
  FLIP helper and the bytes that fall off wrap in from the right (`Rotate.tsx`).
  MixColumns: the columns flip in one at a time, with the matrix times the chosen column
  and its GF(2⁸) products beside. AddRoundKey: the round key drops onto the state and the
  changed cells pulse.
- `components/aes.module.css` + `components/motion.ts`: the animations, on a single
  forward step only (`useStepPlay`). A step back or a seek crossfades to the end frame;
  reduced motion shows it at once. The DOM always holds the end frame.
- `components/KeyScheduleView.tsx`: the working for w[i] (RotWord slides, SubWord flips,
  Rcon pulses) and all 44 words as 11 round keys.
- `components/AvalancheView.tsx`: both states, a bit-diff strip and the running count.
- `components/ModeView.tsx`: padding, the IV or counter, a per-block mode diagram with
  real values, and the chain of blocks with ECB repeats marked. In CBC the previous
  ciphertext travels from the chain into the XOR; in CTR the counter's changed digits
  flip. `ModePicker.tsx` loads with it.
- `components/PenguinView.tsx`: original, ECB and CBC bitmaps on `<canvas>`, with alt
  text, side by side at every width (tap one to see it large). Each ciphertext sweeps
  over the picture on its step; one not reached yet is a hatched "locked until step N"
  card.
- `inputProblem.ts`: free play's full input check. The modes' length limit lives in
  core's modes file, so it loads after hydration; the first load has `blockProblem`.
- `components/GcmView.tsx`: GCM's parts, no values.
- `shareState.ts`: `{ m: 'aes', v: 1, seed, step, input: { chapter, mode, keyHex, ptHex, bit } }`.
  Keys are display-only hex, never passwords.
