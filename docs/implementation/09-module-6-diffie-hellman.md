# 09 — Module 6: Diffie-Hellman

Wave: **W2** (core) / **W3** (UI) · Estimate: 2–3 days · Original plan: phase 3 (part)
Route: `/dh`

## Goal

Two people agree on a secret over a channel everyone can read. First the paint-mixing
analogy, then the same thing as modular exponentiation with small p and g, then what an
eavesdropper actually sees (p, g, gᵃ, gᵇ, and why getting a from gᵃ is the discrete
log problem), and finally a man-in-the-middle when nothing is authenticated. It ends by
pointing to RSA signatures (module 5) as the fix, and to TLS 1.3 (module 7) as the place
it all comes together.

## Prerequisites

Core: 02. `modPow` comes from `src/core/rsa/bigmath.ts` if merged; otherwise implement it
in `src/core/dh/` and deduplicate at merge time (move to `src/core/bytes/` or a new
`src/core/math/`). UI: 03.

---

## Deliverables

```
src/core/dh/    events.ts  citations.ts  params.ts  dh.ts  paint.ts  eavesdropper.ts  mitm.ts  scenarios.ts
tests/dh.test.ts
tests/differential/dh.test.ts
src/modules/dh/   DhModule.tsx  components/  walkthrough.mdx  meta.ts  shareState.ts  README.md
src/app/(modules)/dh/page.tsx
```

---

## Steps

### Core

1. **Paint:** a pure colour-mixing model (mix = average in a perceptual space such as
   OKLab), so "public colour + secret colour" is easy to do and hard to undo *visually*.
   A `detail` says where the analogy breaks: real mixing can be un-mixed; modular
   exponentiation is what's hard to reverse.
2. **Params:** small safe primes p = 2q + 1 (e.g. 23, 467, 2039) with a generator g of
   the order-q subgroup. A `detail` explains why the subgroup matters (small-subgroup
   confinement). Realistic mode names the RFC 3526 / RFC 7919 2048-bit groups by digit
   count only.
3. **Exchange** [RFC 2631 §2.1.1]: seeded private a, b; `A = gᵃ mod p`,
   `B = gᵇ mod p` with square-and-multiply steps; both sides compute the shared secret.
4. **Eavesdropper:** Eve's view contains only public values. For toy p, Eve brute-forces
   the discrete log step by step (and succeeds, which is the point of "why real p is
   huge"). Show how the number of steps grows with p.
5. **MITM:** Mallory swaps A and B for her own; Alice and Bob each share a different
   secret with Mallory, who reads and re-encrypts. The fix: sign the key shares (module 5
   RSA) or use certificates, which is what TLS does.
6. X25519 [RFC 7748] is one described event: same idea on an elliptic curve, 32-byte keys,
   "stepped in phase 2".

### Tests

- Both sides derive the same secret for 1,000 seeds across all toy params.
- Each generator really generates the order-q subgroup (`g^q ≡ 1`, `g ≠ 1`).
- In the MITM scenario, Alice's and Bob's secrets differ and each equals one of
  Mallory's.
- Differential: `crypto.createDiffieHellman(p, g)` with `setPrivateKey` agrees with the
  core on the toy params and on RFC 3526 group 14 (fast path, seeded private keys).

### UI

- Three lanes (Alice / public channel / Bob), Eve's view as an overlay, paint pots for the
  analogy, `NumberTrace` for square-and-multiply, `ModClock` for p ≤ 60.
- MITM as a four-lane view with Mallory in the middle.
- Share state: `{ m: 'dh', v: 1, seed, step, input: { p, g, a?, b?, scene } }`.

---

## Acceptance criteria

- [ ] Shared-secret agreement over 1,000 seeds; subgroup checks pass
- [ ] Node `createDiffieHellman` differential passes
- [ ] Eve's brute force succeeds for toy p and the UI shows how the step count grows
- [ ] `/dh` keyboard walkthrough + axe; registry entry `ready`

---

## Prompts to execute

### Prompt 9.core — Diffie-Hellman core (wave W2)

```
Read docs/implementation/00-overview.md (§4 "Rules for parallel agents") and
docs/implementation/09-module-6-diffie-hellman.md.

Implement src/core/dh per the "Core" steps: the OKLab paint model, toy safe-prime params
with order-q generators, the stepped exchange, Eve's step-by-step brute-force discrete
log, the MITM scenario, and the described X25519 event. Cite RFC 2631 / RFC 3526 /
RFC 7919 / RFC 7748. Replace the placeholder events.ts and citations.ts. If rsa/bigmath
isn't in your worktree, implement modPow locally and leave a TODO to deduplicate at merge.

Write tests/dh.test.ts and tests/differential/dh.test.ts as listed under "Tests".

Only touch src/core/dh, those two test files and the append-only index files. No UI.
Done when `npm run verify` passes. Commit.
```

### Prompt 9.ui — Diffie-Hellman module UI (wave W3)

```
Read docs/implementation/09-module-6-diffie-hellman.md and the shared components.

Build src/modules/dh and /dh per the "UI" steps: paint analogy, three-lane exchange with
Eve's overlay, NumberTrace and ModClock, and the four-lane MITM view. The walkthrough
(MDX) ends by linking to /rsa (signatures fix MITM) and to the TLS 1.3 card. Share state.
Keyboard-only Playwright walkthrough with axe. Flip the registry entry to 'ready'.

Do not change src/core or other modules. Done when `npm run verify` and
`npm run test:e2e` pass. Commit.
```
