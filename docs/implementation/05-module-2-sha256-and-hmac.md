# 05 — Module 2: SHA-256 and HMAC

Wave: **W2** (core) / **W3** (UI) · Estimate: 3–4 days · Original plan: phase 1 (part)
Route: `/hashing`

## Goal

A message goes through SHA-256 one visible step at a time: padding, the message schedule,
and the 64 compression rounds with the working variables a–h. The avalanche demo flips
one input bit and shows about half the output bits change. Then HMAC: why
`SHA-256(key ‖ message)` isn't a safe MAC, and how HMAC's two nested hashes fix it.

HMAC lives here because module 3 (PBKDF2) and module 7 (HKDF) both need it.

## Prerequisites

Core: 02. UI: 03.

---

## Deliverables

```
src/core/sha256/   events.ts  citations.ts  constants.ts  pad.ts  schedule.ts  compress.ts  sha256.ts  scenarios.ts
src/core/hmac/     events.ts  citations.ts  hmac.ts  scenarios.ts
tests/differential/sha256.test.ts
tests/differential/hmac.test.ts
src/modules/hashing/   HashingModule.tsx  components/  walkthrough.mdx  meta.ts  shareState.ts  README.md
src/app/(modules)/hashing/page.tsx
```

---

## Steps

### Core — SHA-256

1. `sha256(bytes, { emit })`: one implementation with an `emit` flag. With `emit: false`
   it returns the digest without building events. PBKDF2 uses that fast path, and it
   guarantees the stepped and fast versions are the same code.
2. Events (FIPS 180-4 section in brackets):
   - `sha256.pad`: append `0x80`, zero bytes, the 64-bit length [§5.1.1]
   - `sha256.block`: split into 512-bit blocks [§5.2.1]
   - `sha256.schedule`: W0–W15 from the block, then each W16–W63 with σ0/σ1 shown [§6.2.2 step 1]
   - `sha256.round`: one event per round with a–h before/after, T1, T2, Ch, Maj, Σ0, Σ1, Kt, Wt [§6.2.2 step 3]
   - `sha256.add`: add working variables into H0–H7 [§6.2.2 step 4]
   - `sha256.digest` [§6.2.2]
3. Rounds are grouped (`group: 'Block 1 · Round 12'`) so the phase stepper can jump.
4. Input capped at 3 blocks in stepped mode (≤ 183 bytes). One block is about 115 steps
   (48 schedule + 64 rounds + block/add), so a run stays under ~350 steps. Unlimited with
   `emit: false`.
5. **Avalanche run:** hash `m` and `m` with one bit flipped, emit the bit diff.

### Core — HMAC

6. `hmac(key, message, { emit })` over the step SHA-256 [RFC 2104 §2]: key longer than
   64 bytes is hashed, shorter is zero-padded; `K ⊕ ipad`, inner hash, `K ⊕ opad`, outer
   hash. Each is an event; the inner and outer hashes are **collapsed** to one event each
   (the full SHA-256 steps are already taught above), with a link to expand.
7. Length extension is **explained, not attacked**: one event describing why
   `H(key ‖ msg)` lets an attacker append data knowing only the digest [FIPS 180-4 §5.1
   padding], and why HMAC's outer hash stops it. (A working length-extension demo is a
   stretch goal, not v1.)

### Differential tests

- FIPS 180-4 examples: `"abc"`, the 448-bit message, and the million-`a` message
  (fast path only).
- `node:crypto` `createHash('sha256')` on 1,000 seeded random inputs of length 0–300
  (covers the 55/56/64-byte padding edge cases explicitly).
- Stepped and fast paths produce identical digests.
- HMAC-SHA-256: RFC 4231 test cases 1–7 (case 5 truncates), plus `createHmac` on
  seeded random keys and messages, including keys longer than 64 bytes.

### UI

- `ByteGrid` for the padded block, a 64-row schedule table, a round view with the eight
  working variables as boxes and the T1/T2 dataflow, `BitDiffStrip` for the avalanche.
- Walkthrough: padding → schedule → a few rounds (then "skip to digest") → avalanche →
  HMAC.
- Free play: type a message, flip any bit, see the digest diff.

---

## Acceptance criteria

- [ ] All differential tests pass
- [ ] A stepped run's final event digest equals `createHash('sha256')`
- [ ] Every event cites a FIPS 180-4 or RFC 2104 section
- [ ] `/hashing` walkthrough completes by keyboard; axe clean; the 64-round run stays
      responsive (no dropped frames when scrubbing on a mid-range laptop)
- [ ] Registry entry flipped to `ready`

---

## Prompts to execute

### Prompt 5.core — SHA-256 and HMAC cores (wave W2)

```
Read docs/implementation/00-overview.md (especially §4 "Rules for parallel agents") and
docs/implementation/05-module-2-sha256-and-hmac.md.

Implement src/core/sha256 and src/core/hmac per the "Core" steps: one implementation with
an emit flag (stepped and fast paths share code), events that cite FIPS 180-4 / RFC 2104
sections, grouped rounds, the avalanche run, and registered scenarios. Replace the
placeholder events.ts and citations.ts in both folders.

Write tests/differential/sha256.test.ts and hmac.test.ts exactly as listed under
"Differential tests" (FIPS examples, RFC 4231 cases, node:crypto on 1,000 seeded inputs,
padding edge cases, stepped == fast). node:crypto may only be imported in tests/differential.

Only touch src/core/sha256, src/core/hmac, tests/differential, and append-only lines in
src/core/citations/index.ts and src/core/scenarios.ts. No UI. Done when
`npm run verify` passes. Commit.
```

### Prompt 5.ui — Hashing module UI (wave W3)

```
Read docs/implementation/05-module-2-sha256-and-hmac.md and the shared components in
src/components.

Build src/modules/hashing and the /hashing route per the "UI" steps: padded-block grid,
schedule table, round view with a-h and the T1/T2 dataflow, avalanche strip, HMAC view,
walkthrough (MDX) and free play, share state. Scrubbing the timeline across all rounds
must stay smooth: render only the current round's detail. Add a keyboard-only Playwright
walkthrough with axe. Flip the hashing entry in the registry to 'ready'.

Do not change src/core or other modules. Done when `npm run verify` and
`npm run test:e2e` pass. Commit.
```
