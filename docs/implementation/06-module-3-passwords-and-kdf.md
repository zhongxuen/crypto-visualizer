# 06 — Module 3: Passwords, salts and slow hashing

Wave: **W3** (core) / **W4** (UI) · Estimate: 3 days · Original plan: phase 2 (part)
Route: `/passwords`

## Goal

Three ideas, in order:

1. **Unsalted hashes leak.** Two users with the same password have the same hash, and a
   precomputed table of common-password hashes finds it instantly.
2. **Salts defeat precomputation.** A random per-user salt makes equal passwords hash
   differently and makes the precomputed table useless.
3. **Slowness defeats guessing.** Salts don't stop an attacker who guesses one user at a
   time. PBKDF2 iterations, bcrypt cost and Argon2 memory make every guess expensive.

## Prerequisites

Core: 05 core (`src/core/hmac`). UI: 03.

---

## Deliverables

```
src/core/kdf/        events.ts  citations.ts  pbkdf2.ts  lookupTable.ts  costModel.ts  scenarios.ts
src/core/kdf/data/   commonPasswords.ts   (≈200 entries, a public list, cited)
tests/differential/pbkdf2.test.ts
src/modules/passwords/   PasswordsModule.tsx  components/  walkthrough.mdx  meta.ts  shareState.ts  README.md
src/app/(modules)/passwords/page.tsx
```

---

## Steps

### Core

1. **Lookup table:** hash the ~200 common passwords with the fast SHA-256 path, build a
   `digest → password` map. Events: a small "users" table (4–6 fictional users, some
   sharing a password), then the lookup hitting.
   One `detail` line says what a real rainbow table is (hash/reduce chains trading time
   for space) and that this demo is the simpler precomputed table.
2. **Salted:** same users, each with a seeded 16-byte salt, stored as `salt ‖ hash`. The
   lookup misses; equal passwords now have different hashes.
3. **PBKDF2-HMAC-SHA-256** [RFC 8018 §5.2]: stepped for the first block and the first
   **3 iterations** (U1, U2, U3 and the running XOR), then one summary event for the
   remaining iterations computed on the fast path. The iteration count is the real one
   (default 600,000, the OWASP 2023 recommendation for PBKDF2-HMAC-SHA-256, cited).
   Computing 600k iterations in JS takes seconds: run it in a Web Worker in the UI,
   with the core function itself staying synchronous and pure.
4. **Cost model** (`costModel.ts`, pure, no hashing): given hash rate and password space,
   estimate time to exhaust. Rates for fast SHA-256, PBKDF2 at N iterations, bcrypt at
   cost c and Argon2id at a given memory are **illustrative orders of magnitude** from a
   cited public benchmark, shown with "≈" and the source. bcrypt and Argon2 are
   described: bcrypt as `2^cost` rounds of a Blowfish key setup, Argon2id as time + memory
   + parallelism [RFC 9106 §3, §4], with why memory-hardness hurts GPU attackers.

### Differential tests

- RFC 7914 §11 PBKDF2-HMAC-SHA-256 vectors (the `c = 80000` case is fine on the fast path).
- `node:crypto` `pbkdf2Sync(..., 'sha256')` on 200 seeded (password, salt, iterations ≤
  2,000, dkLen 1–64) cases, including dkLen > 32 (multiple blocks).
- The stepped run's final key equals the fast result.

### UI

- Users table with hashes; a highlighted collision; the lookup animation.
- Salt toggle; the table goes dark.
- PBKDF2 chain for U1–U3, then a progress bar for the rest (Worker, cancellable).
- "Guesses per second" slider driving the cost model, with log-scale time-to-crack bars.
- **Privacy:** a free-text password box exists in free play, with the note "don't type a
  real password". Its value is never put in the URL, `localStorage` or analytics.
  Share links only carry the built-in example passwords.

---

## Acceptance criteria

- [ ] RFC 7914 vectors and the node:crypto differential pass
- [ ] The lookup hits for unsalted and misses for salted, in a test
- [ ] Every cost-model number in the UI shows its source
- [ ] A test proves a typed password never reaches `?s=` or `localStorage`
- [ ] The Worker can be cancelled and the page stays responsive during 600k iterations
- [ ] `/passwords` keyboard walkthrough + axe pass; registry entry `ready`

---

## Prompts to execute

### Prompt 6.core — lookup table, salts, PBKDF2, cost model (wave W3)

```
Read docs/implementation/00-overview.md (§4 "Rules for parallel agents") and
docs/implementation/06-module-3-passwords-and-kdf.md. Use the existing src/core/hmac and
src/core/sha256 (fast path) — do not modify them.

Implement src/core/kdf per the "Core" steps: the common-password list (cite its source),
the unsalted lookup and salted runs, PBKDF2-HMAC-SHA-256 stepped for three iterations then
summarised, and the pure cost model with sourced, clearly illustrative rates. Replace the
placeholder events.ts and citations.ts.

Write tests/differential/pbkdf2.test.ts with the RFC 7914 §11 vectors and node:crypto
pbkdf2Sync on 200 seeded cases including dkLen > 32. Register the scenarios.

Only touch src/core/kdf, tests/differential/pbkdf2.test.ts and the append-only index
files. Done when `npm run verify` passes. Commit.
```

### Prompt 6.ui — Passwords module UI (wave W4)

```
Read docs/implementation/06-module-3-passwords-and-kdf.md and the shared components.

Build src/modules/passwords and /passwords per the "UI" steps: users table, lookup hit,
salt toggle, PBKDF2 chain view, a cancellable Web Worker for the full iteration count, and
the guesses-per-second slider with log-scale bars and visible sources. The free-text
password must never reach the URL, localStorage or analytics — add a test that proves it.
Keyboard-only Playwright walkthrough with axe. Flip the registry entry to 'ready'.

Do not change src/core or other modules. Done when `npm run verify` and
`npm run test:e2e` pass. Commit.
```
