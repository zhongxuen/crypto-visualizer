# Module 5: RSA (`/rsa`)

Renders the runs in `src/core/rsa`. It computes nothing itself.

- `RsaModule.tsx`: the page. It has four chapters: keys (primes, n, φ(n), e, extended
  Euclid, d), encrypt and decrypt, sign and verify, and malleability. The walkthrough
  uses the hand-worked p = 61, q = 53, e = 17 (so d = 2753), m = 65 and the message "Pay
  Bob 10". Free play has the paper/realistic toggle. Paper mode takes your p, q and e;
  realistic mode draws 128- to 512-bit primes from the seed.
- `keysRun.ts` + `keysCitations.ts`: the keys chapter's run and citations, in the first
  load. `runs.ts` brings everything else after hydration: the other chapters' runs and
  views (`components/ChapterViews.tsx`, `MalleabilityStrip.tsx`), the full citation
  registry and free play's form.
- `components/Inputs.tsx`: the free-play inputs. The prime pickers say "is it prime?" as
  you type, using core's trial division (for example "p = 91 is not prime: 7 × 13").
- `components/parts.tsx`: `Value`, a read-only value card (no input-like outline;
  the step's key value gets the highlighter; 🔒 secret / 📡 public tag), and the dashed
  `Placeholder` for values not computed yet.
- `components/FormulaPanel.tsx`: n = p × q, φ(n), e, d, then c, m or h, s. Unknowns are
  dashed placeholders; each fills (digits flip in with `<Morph>`) when the step that
  computes it runs.
- `components/StepView.tsx`: the primes (trial divisors 2, 3, 5, … ⌊√p⌋ tick past with
  a ✗, then a "prime" stamp), n, d and the key pair.
- `components/EgcdView.tsx`: the extended Euclid table writing itself, one row per step;
  the two rows each new row comes from are hatched, with the working spelled out. It
  matches the hand-worked table in `walkthrough.mdx`.
- `components/PowView.tsx`: square-and-multiply as a ladder of the exponent's bits. The
  current rung lights (square, then multiply on a 1 bit), rungs to come are dashed, and
  the running value morphs and turns on a `ModClock`. Signing and verifying show the trip
  h → private key → s and s → public key → check, the result travelling back from the key.
  Realistic mode shows a single summary step with digit counts.
- `components/MalleabilityStrip.tsx`: sender, attacker and receiver side by side for the
  2ᵉ attack, under a "wire" card where multiplying c morphs what it decrypts to, m → 2m.
  It also has the small-e cube root, and OAEP and PSS (described only).
- `components/ChapterViews.tsx`: the message, the hash and the tampered-message check.
- `components/LessonPhase.tsx`: `<Phase group>` in `walkthrough.mdx`, one short paragraph
  per group of the run; the page marks the one for the step on screen.
- `components/LessonTerm.tsx`: the shared `<Term>`, loaded right after hydration, because
  it brings the whole glossary (about 2 KB gzipped) that /rsa's first load can't afford.
- `shareState.ts`: `{ m: 'rsa', v: 1, seed, step, input: { chapter, mode, p?, q?, e?, msg, text, bits } }`.
  None of these is a password. The keys are for display only.
