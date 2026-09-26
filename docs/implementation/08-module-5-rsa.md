# 08 — Module 5: RSA

Wave: **W2** (core) / **W3** (UI) · Estimate: 3 days · Original plan: phase 3 (part)
Route: `/rsa`

## Goal

RSA with numbers small enough to check on paper: pick two primes, compute n and φ(n),
choose e, find d with the extended Euclidean algorithm shown row by row, encrypt and
decrypt a number, then hash-then-sign and verify. Then why textbook RSA is unsafe
(malleability) and what OAEP and PSS padding fix.

## Prerequisites

Core: 02 (and `src/core/sha256` fast path for signing, which lands in the same wave; if
it isn't merged yet, sign a fixed digest and wire SHA-256 in at merge time). UI: 03.

---

## Deliverables

```
src/core/rsa/   events.ts  citations.ts  bigmath.ts  primes.ts  keygen.ts  rsa.ts  sign.ts  malleability.ts  scenarios.ts
tests/rsa.test.ts
tests/differential/rsa.test.ts
src/modules/rsa/   RsaModule.tsx  components/  walkthrough.mdx  meta.ts  shareState.ts  README.md
src/app/(modules)/rsa/page.tsx
```

---

## Steps

### Core

1. `bigmath.ts` on `bigint`: `gcd`, `egcd` (emitting one event per row: q, r, s, t),
   `modInverse`, `modPow` (square-and-multiply, emitting one event per bit).
2. `primes.ts`: trial division for "paper" mode (primes < 10⁶), seeded **Miller-Rabin**
   for "realistic" mode, with the rounds chosen per FIPS 186-5 Appendix B.3 guidance.
   Candidates come from the seeded rng, so a seed reproduces the key.
3. `keygen` [RFC 8017 §3]: p, q → n = pq, φ(n) = (p−1)(q−1) (and mention λ(n), which
   RFC 8017 actually uses, in a `detail`), e = 65537 or a small e the user picks when
   gcd(e, φ) = 1, d = e⁻¹ mod φ via `egcd`.
4. Encrypt / decrypt: `c = mᵉ mod n`, `m = cᵈ mod n` [§5.1.1, §5.1.2], with `m < n`
   enforced. Paper mode steps every square-and-multiply; realistic mode (up to 512-bit n)
   emits **one summary event** showing digit counts, not every step.
5. Sign / verify: `s = H(m)ᵈ mod n` where H is SHA-256 reduced mod n in paper mode
   (the reduction is stated plainly as a toy shortcut), `sᵉ mod n = H(m)` to verify
   [§5.2].
6. **Malleability:** the attacker multiplies c by `2ᵉ mod n`; the victim decrypts to `2m`.
   Then a `detail` on the small-e / small-m cube-root problem. OAEP [§7.1] and PSS [§8.1]
   are described as "randomised, structured padding that breaks both". Not implemented.

### Tests

- `d·e ≡ 1 (mod φ)` and `decrypt(encrypt(m)) = m` for every generated keypair across 500
  seeds, both modes.
- Miller-Rabin agrees with trial division on all n < 10⁶ and rejects known Carmichael
  numbers (561, 1105, 1729, …).
- Differential: for realistic-mode keys, build a Node `KeyObject` from (n, e, d, p, q, CRT
  params) via JWK and check `crypto.publicEncrypt(..., RSA_NO_PADDING)` and
  `privateDecrypt` agree with the core on seeded m.

### UI

- Prime pickers (with "is it prime?" feedback), a formula panel that fills in as steps
  run, `NumberTrace` for extended Euclid and square-and-multiply, `ModClock` for small n.
- Paper / realistic toggle.
- Malleability demo as a three-actor strip (sender, attacker, receiver).
- Share state: `{ m: 'rsa', v: 1, seed, step, input: { p?, q?, e?, msg, mode } }`.

---

## Acceptance criteria

- [ ] Keypair identities hold for 500 seeds in both modes
- [ ] Miller-Rabin tests pass including Carmichael numbers
- [ ] Node raw-RSA differential passes
- [ ] The extended Euclid table on screen matches a hand-worked example in the walkthrough
      (p = 61, q = 53, e = 17 → d = 2753)
- [ ] `/rsa` keyboard walkthrough + axe; registry entry `ready`

---

## Prompts to execute

### Prompt 8.core — RSA core (wave W2)

```
Read docs/implementation/00-overview.md (§4 "Rules for parallel agents") and
docs/implementation/08-module-5-rsa.md.

Implement src/core/rsa per the "Core" steps on bigint: gcd/egcd/modInverse/modPow with
per-row and per-bit events, trial division and seeded Miller-Rabin, keygen, encrypt/
decrypt with paper (fully stepped) and realistic (summarised, up to 512-bit) modes,
hash-then-sign/verify, and the malleability demo. Cite RFC 8017 sections. Replace the
placeholder events.ts and citations.ts. If src/core/sha256 isn't merged in your worktree
yet, put hashing behind a small interface and use a fixed digest in tests; note it for
the merge.

Write tests/rsa.test.ts (identities over 500 seeds, Miller-Rabin vs trial division,
Carmichael numbers, the 61/53/17 → 2753 worked example) and tests/differential/rsa.test.ts
(Node KeyObject from JWK, RSA_NO_PADDING publicEncrypt/privateDecrypt).

Only touch src/core/rsa, those two test files and the append-only index files. No UI.
Done when `npm run verify` passes. Commit.
```

### Prompt 8.ui — RSA module UI (wave W3)

```
Read docs/implementation/08-module-5-rsa.md and the shared components.

Build src/modules/rsa and /rsa per the "UI" steps: prime pickers with feedback, the
formula panel, NumberTrace for extended Euclid and square-and-multiply, ModClock for
small n, the paper/realistic toggle, and the three-actor malleability strip. Walkthrough
(MDX) uses p=61, q=53, e=17. Share state. Keyboard-only Playwright walkthrough with axe.
Flip the registry entry to 'ready'.

Do not change src/core or other modules. Done when `npm run verify` and
`npm run test:e2e` pass. Commit.
```
