# 04 — Module 1: Bits, bytes and XOR

Wave: **W2** (core) / **W3** (UI) · Estimate: 1.5 days · Original plan: phase 1 (part)
Route: `/xor`

## Goal

The learner turns text into bytes, sees XOR as a reversible mask, encrypts with a
one-time pad, and watches a reused pad leak: XORing two ciphertexts made with the same
key cancels the key and leaves `p1 ⊕ p2`.

## Prerequisites

Core: 02. UI: 03.

---

## Deliverables

```
src/core/xor/        events.ts  citations.ts  encode.ts  xor.ts  otp.ts  twoTimePad.ts  scenarios.ts  *.test.ts
src/modules/xor/     XorModule.tsx  components/  walkthrough.mdx  meta.ts  shareState.ts  README.md
src/app/(modules)/xor/page.tsx
```

---

## Steps

### Core

1. **Encode run:** text → UTF-8 bytes, one event per character, showing multi-byte
   characters (é, 🔐) splitting into several bytes.
2. **XOR run:** two byte arrays, one event per byte with the bit columns (a, b, a⊕b).
   Then a second pass that applies the same key again and gets the original back
   (reversibility).
3. **One-time pad:** key from the seeded rng, same length as the message.
4. **Two-time pad:** two messages, one key. Events: c1, c2, `c1 ⊕ c2 = p1 ⊕ p2`, then a
   crib-drag of a guessed word (e.g. " the ") along `p1 ⊕ p2` revealing readable text in
   the other message. Messages are fixed built-in examples so the crib always works.
5. Citations: this module has no standard to cite; use `general.ts` entries (Shannon 1949
   for perfect secrecy, and the Venona project as the historical two-time-pad failure).

### UI

- Text input (max 64 bytes), `ByteGrid` rows for plaintext / key / ciphertext,
  `BitDiffStrip` for the per-bit view.
- Walkthrough: bytes → XOR → OTP → two-time pad.
- Free play: type both messages, reuse the key, drag a crib.
- Share state: `{ m: 'xor', v: 1, seed, step, input: { a, b } }`.

---

## Acceptance criteria

- [ ] UTF-8 encoding matches `TextEncoder` on seeded random strings (including astral
      characters)
- [ ] `xor(xor(p, k), k) = p` for 1,000 seeded inputs
- [ ] The two-time-pad scenario recovers the expected crib text
- [ ] Scenarios registered in `src/core/scenarios.ts`; determinism and citation tests cover them
- [ ] `/xor` is keyboard operable end to end and axe clean
- [ ] Registry entry flipped to `ready`

---

## Prompts to execute

### Prompt 4.core — XOR core (wave W2)

```
Read docs/implementation/00-overview.md (especially §4 "Rules for parallel agents") and
docs/implementation/04-module-1-bits-and-xor.md.

Implement src/core/xor per the "Core" steps: replace the placeholder events.ts with the
XorEvent variants, fill citations.ts, write the encode / xor / otp / twoTimePad runs using
the phase-02 run builder and seeded rng, and register the scenarios. Tests: UTF-8 vs
TextEncoder, XOR reversibility on 1,000 seeded inputs, and the two-time-pad crib result.

Only touch src/core/xor, plus one append-only line each in src/core/citations/index.ts
and src/core/scenarios.ts. No UI. Done when `npm run verify` passes. Commit.
```

### Prompt 4.ui — XOR module UI (wave W3)

```
Read docs/implementation/04-module-1-bits-and-xor.md and the components in
src/components (ByteGrid, BitDiffStrip, timeline, ModuleLayout).

Build src/modules/xor and the /xor route per the "UI" steps: walkthrough (MDX) and free
play modes, share state registered through the phase-02 codec, keyboard access. Add a
Playwright test that steps through the walkthrough by keyboard only and runs axe. Flip the
xor entry in src/modules/registry.ts to 'ready'.

Do not change src/core or other modules. Done when `npm run verify` and
`npm run test:e2e` pass. Commit.
```
