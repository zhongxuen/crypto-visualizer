# Module 6: Diffie-Hellman (`/dh`)

Renders the runs in `src/core/dh`. It computes nothing itself.

- `DhModule.tsx`: the page. Four chapters: paint, the exchange, Eve listens, and man in
  the middle. The walkthrough uses p = 23, g = 2 and seed 1 (a = 6, b = 8, secret 16)
  for the exchange and for Eve, so Eve attacks the exchange just shown, and p = 467 with
  the message 42 for the MITM. Free play picks the group (five toy safe primes or RFC
  3526 group 14), a, b, the seed and the MITM message.
- `board.ts`: who holds what after each step, read from the run's events. Nothing in it
  computes.
- `components/Lanes.tsx`: the lanes, Alice / public channel / Bob side by side at every
  width, with Eve's lane sliding in under the channel. A value that crosses lanes flies
  there with `<Travel>` (its source is looked up in `board.ts`); a new one rises in with
  `<Reveal>`; values a step is about (both secrets agreeing) pulse together. With Eve's
  view on (a toggle in the exchange, always on in Eve's chapter) private numbers and
  secrets show as "?". `components/SplitLanes.tsx` (deferred) is the MITM layout: the
  channel cut in two around Mallory, each secret pair in its own colour and glyph.
- `components/Pot.tsx`, `components/PaintViews.tsx` (first step, static) and
  `components/PaintLater.tsx` (later paint steps, deferred with `runs.ts`): paint pots.
  Mixing pours the two pots in from the lanes and fades core's OKLab colour in over them;
  the final pots turn to face each other and a check draws. Every colour comes from core.
- `components/Phase.tsx`: `<Phase id>` in `walkthrough.mdx`, one paragraph per run group,
  so the lesson rail marks the paragraph for the current phase.
- `components/PowView.tsx`: square-and-multiply in a `NumberTrace`, with the running
  value on a `ModClock` when p ≤ 60. The 2048-bit group shows one summary step.
- `components/EveView.tsx`: Eve's guesses as a `NumberTrace` and the growth table (how
  many guesses each group needs).
- `components/StepView.tsx`: parameters and the subgroup, private keys, validation,
  agreement, real groups, X25519, the MITM steps, the fix (links to `/rsa` and the TLS
  1.3 card) and the paint comparisons.
- `shareState.ts`: `{ m: 'dh', v: 1, seed, step, input: { scene, group, a?, b?, msg? } }`.
  None of these is a password. The keys are for display only.
