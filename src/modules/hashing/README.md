# Module 2: Hashing and MACs (`/hashing`)

Renders the runs in `src/core/sha256` and `src/core/hmac`; computes nothing itself.

- `HashingModule.tsx`: the page. Walkthrough (`"abc"`, a one-bit flip of `"hello"`, and
  RFC 4231 case 2 for HMAC) and free play (message, flipped bit, MAC key).
- `components/PipelineMap.tsx`: the zoomed-out SHA-256 (message → padded blocks → 64
  words → 64 rounds → digest) above the picture, each stage a button to its first step,
  with the round slider during the rounds.
- `components/PaddingView.tsx`: the first step, in the first load (only `<Reveal>`): the
  message, `0x80`, zeros and length fill the block in order.
- `components/Sha256View.tsx`: the later steps, loaded with `runs.ts`: the block as
  sixteen words, the schedule (four inputs converging into the new word, the 64-word
  column), the round (a–h shifting right with `<Flip>`, T1/T2), the add, the digest.
- `components/AvalancheView.tsx`: the input bits with the flipped one pulsing, the two
  digests with their differing hex characters marked, the output bits filling in a
  `<Wave>`.
- `components/HmacView.tsx` + `HmacLanes.tsx`: the two lanes (the inner hash travels into
  the outer one), the length-extension explanation, K0, both pads, the collapsed inner and
  outer hashes (expandable), the tag.
- `Lesson.tsx`: `<Phase on="...">` paragraphs in `walkthrough.mdx`; the one for the step
  on screen is marked and kept in view, so the lesson follows the timeline.
- `phases.ts`: the rail lists each block's 64 rounds as one phase.
- `sha256Run.ts` + `sha256Citations.ts`: the SHA-256 chapter's run and citations, in the
  first load. `runs.ts` brings the later views, the avalanche and HMAC runs, the full
  citation registry and free play's form (`components/Inputs.tsx`) after hydration.
- `shareState.ts`: `{ m: 'hashing', v: 1, seed, step, input: { chapter, message, bit, key } }`.

Only the current step's view is rendered, so scrubbing across 64 rounds per block stays
smooth.
