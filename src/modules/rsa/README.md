# Module 5: RSA (`/rsa`)

Renders the runs in `src/core/rsa`. It computes nothing itself.

- `RsaModule.tsx`: the page. It has four chapters: keys (primes, n, φ(n), e, extended
  Euclid, d), encrypt and decrypt, sign and verify, and malleability. The walkthrough
  uses the hand-worked p = 61, q = 53, e = 17 (so d = 2753), m = 65 and the message "Pay
  Bob 10". Free play has the paper/realistic toggle. Paper mode takes your p, q and e;
  realistic mode draws 128- to 512-bit primes from the seed.
- `components/Inputs.tsx`: the free-play inputs. The prime pickers say "is it prime?" as
  you type, using core's trial division (for example "p = 91 is not prime: 7 × 13").
- `components/FormulaPanel.tsx`: n = p × q, φ(n), e, d, then c, m or h, s. Each fills in
  when the step that computes it runs, and the value this step added is highlighted.
- `components/EgcdView.tsx`: the extended Euclid table in a `NumberTrace`, one row per
  step. It matches the hand-worked table in `walkthrough.mdx`.
- `components/PowView.tsx`: square-and-multiply in a `NumberTrace`. The exponent's bits
  are shown with the current bit marked, and the running value is on a `ModClock` (a
  number line above 120). Realistic mode shows a single summary step with digit counts.
- `components/MalleabilityStrip.tsx`: sender, attacker and receiver side by side for the
  2ᵉ attack. It also has the small-e cube root, and OAEP and PSS (described only).
- `components/StepView.tsx`: the primes, n, d, the key pair, the message, the hash and
  the tampered-message check.
- `shareState.ts`: `{ m: 'rsa', v: 1, seed, step, input: { chapter, mode, p?, q?, e?, msg, text, bits } }`.
  None of these is a password. The keys are for display only.
