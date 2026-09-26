# 07 — Module 4: AES-128 and block cipher modes

Wave: **W2** (core) / **W3** (UI) · Estimate: 4–5 days · Original plan: phase 2 (part)
Route: `/aes`

## Goal

One 16-byte block goes through AES-128 on a 4×4 state grid: key expansion, then every
round's SubBytes, ShiftRows, MixColumns and AddRoundKey. Then modes: ECB leaks patterns
(the "ECB penguin" on a small bitmap), CBC chains blocks (with PKCS#7 padding), CTR turns
the cipher into a keystream. GCM is explained at a high level.

## Prerequisites

Core: 02. UI: 03.

---

## Deliverables

```
src/core/aes/   events.ts  citations.ts  sbox.ts  gf256.ts  keyExpansion.ts  round.ts  aes128.ts
                modes/ecb.ts  modes/cbc.ts  modes/ctr.ts  padding.ts  penguin.ts  scenarios.ts
src/core/aes/data/penguin.ts        small 1-bit or 4-colour bitmap (≈64×64), own artwork or a licensed one, cited
tests/differential/aes.test.ts
src/modules/aes/   AesModule.tsx  components/  walkthrough.mdx  meta.ts  shareState.ts  README.md
src/app/(modules)/aes/page.tsx
```

---

## Steps

### Core — the block cipher

1. `gf256.ts`: `xtime`, `gmul`, shown as events only in the MixColumns detail
   [FIPS 197 §4.2]. `sbox.ts`: the S-box **computed** from the GF(2⁸) inverse + affine
   transform [§5.1.1], with a test that it equals the published table.
2. `keyExpansion` [§5.2]: 44 words, one event per word, marking RotWord / SubWord / Rcon
   when `i mod 4 = 0`.
3. `encryptBlock(key, block, { emit })`: initial AddRoundKey, rounds 1–9 with all four
   steps, round 10 without MixColumns [§5.1]. One event per sub-step with the full 16-byte
   state before and after and the changed cells. Grouped by round. About 40 steps.
4. `decryptBlock` (inverse cipher, §5.3) with the fast path only. It's needed for CBC/ECB
   decryption tests, and the UI shows decryption as "the same steps backwards" in prose.
5. **Avalanche run:** flip one plaintext bit, show the state diff after each round
   (≈50% by round 2–3).

### Core — modes [SP 800-38A]

6. `padding.ts`: PKCS#7 pad/unpad with validation (RFC 5652 §6.3).
7. ECB [§6.1], CBC [§6.2] with a seeded IV, CTR [§6.5] with a seeded nonce + counter.
   Mode runs emit one event per **block** (the per-block cipher is collapsed), showing the
   chaining value / counter.
8. `penguin.ts`: encrypt the bitmap's bytes with ECB and with CBC; return both
   ciphertexts mapped back to pixels. ECB keeps the outline visible; CBC looks like noise.
9. GCM [SP 800-38D] is one explanatory event group: CTR for confidentiality + GHASH tag
   for authenticity, and "never reuse a nonce". No computation in v1 (phase 2 adds it).

### Differential tests

- FIPS 197 Appendix A.1 (key expansion) and Appendix C.1 (AES-128 example) including the
  intermediate round values from Appendix B, compared **per step**.
- SP 800-38A F.1.1 (ECB), F.2.1 (CBC), F.5.1 (CTR) AES-128 vectors.
- `node:crypto` `createCipheriv('aes-128-ecb' | 'aes-128-cbc' | 'aes-128-ctr')` on 1,000
  seeded random keys/blocks/IVs, with Node's auto-padding off for ECB/CBC block tests and
  on for a PKCS#7 test.
- Encrypt then decrypt is identity for every mode.

### UI

- `ByteGrid` in 4×4 column-major mode with arrows for ShiftRows, a column highlight for
  MixColumns, the S-box lookup shown as row/column in a 16×16 table for SubBytes, and the
  round key grid beside the state for AddRoundKey.
- Key schedule view (44 words).
- Mode diagrams for ECB / CBC / CTR with the block chain.
- The penguin: original, ECB, CBC side by side as `<canvas>`, with alt text.
- Share state: `{ m: 'aes', v: 1, seed, step, input: { keyHex?, ptHex?, mode } }`.

---

## Acceptance criteria

- [ ] Every intermediate state in the stepped run matches FIPS 197 Appendix B
- [ ] SP 800-38A and node:crypto differential tests pass
- [ ] The S-box is computed, not pasted, and matches the table
- [ ] The ECB penguin is recognisable and the CBC one is not (checked visually, plus a
      test that ECB ciphertext has repeated blocks and CBC doesn't)
- [ ] The full AES walkthrough works by keyboard only (this is the project's main e2e test)
- [ ] Registry entry `ready`

---

## Prompts to execute

### Prompt 7.core — AES-128 and modes core (wave W2)

```
Read docs/implementation/00-overview.md (§4 "Rules for parallel agents") and
docs/implementation/07-module-4-aes.md.

Implement src/core/aes per the "Core" steps: GF(2^8) helpers, the S-box computed from the
field inverse and affine transform, key expansion, stepped encryptBlock with an emit flag
(state before/after and changed cells per sub-step, grouped by round), fast decryptBlock,
the avalanche run, PKCS#7 padding, ECB/CBC/CTR, the penguin encryption, and the GCM
explanation events. Cite FIPS 197 / SP 800-38A / SP 800-38D sections on every event.
Replace the placeholder events.ts and citations.ts. Use a penguin bitmap you draw yourself
as data (or a clearly licensed one, cited).

Write tests/differential/aes.test.ts: FIPS 197 Appendix A.1, B and C.1 compared per step,
SP 800-38A F.1.1/F.2.1/F.5.1, node:crypto createCipheriv on 1,000 seeded cases, and
encrypt/decrypt identity for every mode.

Only touch src/core/aes, tests/differential/aes.test.ts and the append-only index files.
No UI. Done when `npm run verify` passes. Commit.
```

### Prompt 7.ui — AES module UI (wave W3)

```
Read docs/implementation/07-module-4-aes.md and the shared components.

Build src/modules/aes and /aes per the "UI" steps: the 4x4 state grid with per-step
visuals (S-box lookup table, ShiftRows arrows, MixColumns column highlight, round-key
grid), the key schedule view, mode diagrams, and the ECB/CBC penguin on canvas with alt
text. Walkthrough (MDX) and free play; share state.

Write the project's main Playwright test: step through the whole AES block by keyboard
only, asserting the final ciphertext shown equals the FIPS 197 C.1 value, then run axe.
Flip the registry entry to 'ready'.

Do not change src/core or other modules. Done when `npm run verify` and
`npm run test:e2e` pass. Commit.
```
