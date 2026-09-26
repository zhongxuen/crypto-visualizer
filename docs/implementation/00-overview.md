# Crypto Visualizer — Implementation Roadmap

Written: 2026-09-22
Status: **[planned]**
Series: Visualizer Series (Security)
Repo: `crypto-visualizer`. Hosting: its own Vercel project. **No database.**
Shared decisions for all five portfolio projects: [../README.md](../README.md)

This folder replaces the single `docs/crypto-visualizer-plan.md`. The content is the same
plan, reviewed against the project aims and split into phases that can be run as separate
Claude Code prompts. The changes made during that review are listed in
[§6](#6-changes-from-the-original-plan).

Each numbered file is **one self-contained phase** with the same shape:

1. **Goal** — what exists at the end of the phase
2. **Prerequisites** — which phases must be done first
3. **Deliverables** — files created or changed
4. **Steps** — the work, in order
5. **Acceptance criteria** — how you know the phase is done
6. **Prompts to execute** — copy-paste prompts for Claude Code, one per chunk of work

---

## 1. Pitch

The actual maths behind the padlock icon, one step at a time. You watch AES change a
16-byte block round by round, do RSA with numbers small enough to check on paper, run
Diffie-Hellman as the colour-mixing demo and then as real modular arithmetic, and see why
salted, slow hashes beat fast ones.

**Portfolio gap it fills:** Internet Visualizer's disclaimer says *"There is no
cryptography anywhere in the TLS layer — the handshake is modelled, not performed."* This
project is the answer. Internet Visualizer's TLS lessons link here ("see what this step
actually computes").

## 2. Project aims

Every phase is judged against these. If a task doesn't serve one of them, it's out of scope.

1. **Teach by stepping.** Every algorithm runs one visible step at a time, forwards and
   backwards, on the shared timeline.
2. **Be provably correct.** The step implementations are checked against Node's `crypto`
   and the published test vectors. This is the project's main quality claim.
3. **Be deterministic and shareable.** Same input + same seed = the same run, and any
   state can be shared as a URL.
4. **Be honest.** Say plainly what is simplified, what is only described, and that none of
   it may protect real data.
5. **Match the portfolio's quality bar.** Pure core, boundary lint rules, axe on every
   route, keyboard-only operation, reduced motion, a JS budget per route.
6. **Close the Internet Visualizer gap.** Link both ways, and (phase 2) perform the TLS 1.3
   handshake with real values.

## 3. Modules

| # | Module | What you step through | Reference |
|---|---|---|---|
| 1 | **Bits, bytes and XOR** | Text → UTF-8 bytes → hex/binary. XOR as a reversible mask, the one-time pad, and why reusing a key breaks it (two-time pad demo) | — |
| 2 | **Hashing and MACs** | SHA-256: padding, message schedule, 64 compression rounds with working variables a–h. The avalanche effect. Why `SHA-256(key ‖ msg)` isn't a MAC (length extension, explained) and how HMAC fixes it | FIPS 180-4, RFC 2104 |
| 3 | **Passwords and salts** | Same password → same unsalted hash → a precomputed-table lookup succeeds. Add a salt → it fails. Then cost: PBKDF2 iterations stepped for real; bcrypt and Argon2 described as tunable work (Argon2 also memory-hard), with an illustrative "guesses per second" slider | RFC 8018, RFC 9106 |
| 4 | **AES** | One block through AES-128: key expansion, then SubBytes / ShiftRows / MixColumns / AddRoundKey on a 4×4 state grid. Modes: ECB (the "ECB penguin" leak on a small bitmap), CBC (with PKCS#7 padding), CTR. GCM explained at a high level (tag = authenticity) | FIPS 197, SP 800-38A/D |
| 5 | **RSA** | Small primes → n, φ(n), e, d (extended Euclid step by step) → encrypt/decrypt → hash-then-sign/verify. Textbook-RSA malleability demo, and what OAEP/PSS padding fix (described) | RFC 8017 |
| 6 | **Diffie-Hellman** | Paint-mixing analogy → modular exponentiation (square-and-multiply) with small p, g → what an eavesdropper sees → a man-in-the-middle when nothing is authenticated | RFC 2631, RFC 7748 (described) |
| 7 | **Putting it together: TLS 1.3** *(phase 2)* | The RFC 8448 example handshake with **real values**: X25519 key share → HKDF key schedule → AES-128-GCM records | RFC 8446, RFC 8448, RFC 5869, RFC 7748 |

v1 = modules 1–6. Module 7 is phase 2.

## 4. Phase index and waves

| File | Phase | Depends on | Wave |
|---|---|---|---|
| [01](./01-scaffolding-and-tooling.md) | Scaffolding, tooling, boundary rules | — | W0 |
| [02](./02-core-kernel.md) | Core kernel: vendored timeline, events, citations, bytes, URL state | 01 | W1 |
| [03](./03-ui-shell-and-visual-blocks.md) | UI shell, timeline UI, byte grid, bit-diff strip, modular clock | 02 | W2 |
| [04](./04-module-1-bits-and-xor.md) | Module 1: Bits, bytes and XOR | 02 (core), 03 (UI) | W2 / W3 |
| [05](./05-module-2-sha256-and-hmac.md) | Module 2: SHA-256 and HMAC | 02 (core), 03 (UI) | W2 / W3 |
| [06](./06-module-3-passwords-and-kdf.md) | Module 3: Passwords, salts, PBKDF2 | 05 core (HMAC), 03 | W3 / W4 |
| [07](./07-module-4-aes.md) | Module 4: AES-128 and modes | 02 (core), 03 (UI) | W2 / W3 |
| [08](./08-module-5-rsa.md) | Module 5: RSA | 02 (core), 03 (UI) | W2 / W3 |
| [09](./09-module-6-diffie-hellman.md) | Module 6: Diffie-Hellman | 02 (core), 03 (UI) | W2 / W3 |
| [10](./10-quality-and-release.md) | Lessons, quality, deploy, portfolio + Internet Visualizer links | 04–09 | W4 / W5 |
| [11](./11-module-7-tls13.md) | Module 7: TLS 1.3 with real values *(phase 2)* | 05, 07, 10 | later |

Each module file has **two prompts**: a `core` prompt (pure TypeScript + differential
tests, no UI) and a `ui` prompt (React module + route). Cores only need phase 02, so they
can run long before the UI exists.

### Running in waves

| Wave | Prompts (run the ones in one row in parallel) | Notes |
|---|---|---|
| **W0** | 1.1 → 1.2 | Sequential. Nothing else can start. |
| **W1** | 2.1 → 2.2 | Sequential. Defines the event and citation contracts everything else uses. |
| **W2** | 3.1, 4.core, 5.core, 7.core, 8.core, 9.core | Six parallel agents. Each core lives in its own `src/core/<algo>/` folder, so they don't collide. 3.1 is the only UI work. |
| **W3** | 3.2, then 4.ui, 5.ui, 6.core, 7.ui, 8.ui, 9.ui | 3.2 first (it adds the shared components the UIs use), then the rest in parallel. |
| **W4** | 6.ui, 10.1 | 10.1 writes lessons for modules that exist. |
| **W5** | 10.2 → 10.3 → 10.4 | Quality pass, deploy, portfolio entry. |
| **later** | 11.core → 11.ui | Phase 2. |

**Sequential alternative:** run the files in number order, core prompt then UI prompt.
That's the lowest-risk option for one person and takes about the same total effort.

### Rules for parallel agents

- Give each parallel agent its own git worktree and branch (`claude --worktree` or
  `git worktree add ../cv-<name> -b feat/<name>`). Merge one branch at a time at the end
  of the wave and run `npm run verify` after each merge.
- An agent only touches its own folders: `src/core/<algo>/`, `src/modules/<name>/`,
  `src/app/(modules)/<route>/`, and `tests/differential/<algo>.test.ts`.
- The only shared files a module agent may edit are **append-only**:
  `src/core/citations/index.ts`, `src/core/scenarios.ts` and `src/core/state/index.ts`
  (one line each), `src/modules/registry.ts` (flip its own entry's `status`) and
  `docs/ACCURACY.md` (its own section, once it exists). Merge conflicts there are one-line
  and resolved by keeping both sides.
- W2 core agents work in parallel, so two small overlaps are expected and resolved at
  merge: RSA signing wants the SHA-256 fast path, and DH wants RSA's `modPow`. Both
  prompts say how to work without the other and leave a TODO.
- If an agent needs to change a shared contract (event types, the timeline, a shared
  component), it stops and reports instead of changing it.

## 5. Architecture summary

Full detail is in phase 01 and 02.

```
src/core/            pure TS. No React, no DOM, no crypto / node:crypto / crypto.subtle,
                     no Math.random, no Date.now. Enforced by ESLint.
  sim/               vendored from Internet Visualizer (playback, rng, result)
  events/            CryptoEvent union, step builder
  citations/         citation registry + per-algorithm citation files
  bytes/             hex/binary/UTF-8/base64url, bit ops, constant tables
  state/             URL share-state codec (Zod)
  xor/ sha256/ hmac/ kdf/ aes/ rsa/ dh/     one folder per algorithm
src/components/      shared UI: timeline, byte grid, bit-diff strip, modular clock
src/modules/<name>/  one folder per module; renders events, never computes crypto itself
src/app/             routes: /, /xor, /hashing, /passwords, /aes, /rsa, /dh, /about, /learn
tests/differential/  step implementations vs node:crypto and published vectors
```

Two kinds of test: **vector/differential tests** (correctness) and **determinism +
citation tests** (every scenario runs twice deep-equal; every event cites something that
resolves).

## 6. Changes from the original plan

The review against the aims above changed these things:

1. **HMAC added (module 2, `src/core/hmac/`).** PBKDF2 is defined over HMAC, and TLS 1.3's
   HKDF is too. The original plan had PBKDF2 "over the step SHA-256", which skips a layer.
   HMAC is also the natural answer to "why not just hash key + message?".
2. **PBKDF2 test vectors fixed.** RFC 6070 only has PBKDF2-HMAC-**SHA1** vectors. The
   SHA-256 vectors come from RFC 7914 §11. HMAC-SHA-256 is checked against RFC 4231.
3. **"Rainbow table" wording corrected.** The demo is a precomputed lookup table. A real
   rainbow table uses hash/reduce chains to trade time for space. The module says so in
   one line rather than mislabelling the demo.
4. **bcrypt and Argon2 are described, not implemented**, and the "guesses per second"
   numbers are labelled as illustrative orders of magnitude with a source. Only PBKDF2 is
   stepped for real.
5. **Module 1 now starts with bytes** (text → UTF-8 → hex/binary). Every later module
   shows hex, so the encoding has to be taught once.
6. **CBC includes PKCS#7 padding**, and GCM is explicitly "explained, not computed" in v1.
   Phase 2 adds real GCM because TLS 1.3 needs it.
7. **Module 7 was internally inconsistent.** It promised real ECDHE values while the
   disclaimers said X25519 is a black box. Phase 2 now implements X25519 (RFC 7748) and
   AES-GCM, and checks the whole handshake against the **RFC 8448 example trace**, which
   publishes every intermediate value.
8. **RSA "realistic mode" needs prime generation**, so the RSA core includes seeded
   Miller-Rabin. Signing is hash-then-sign using the step SHA-256. OAEP/PSS are described,
   not implemented.
9. **Share links carry inputs, not just a seed.** A seed can't reproduce a plaintext the
   user typed. The URL state is `?s=<base64url JSON>` validated by Zod, as the shared
   decisions doc already specifies. Typed passwords are **never** put in a URL or in
   `localStorage`; the passwords module shares only built-in example passwords.
10. **Core bans `crypto` imports mechanically.** The ESLint rule forbids `crypto`,
    `node:crypto` and `globalThis.crypto` in `src/core/**` (tests excepted), so the
    "differential test" claim can't be undermined by core quietly calling the real thing.
11. **Events are a discriminated union** (`kind` decides the shape of `state`) rather than
    a loose `{ kind, label, state, citation }`, so the UI is type-checked per module.
12. **The timeline is step-indexed.** Internet Visualizer's playback runs on virtual time.
    Rather than changing vendored code, each crypto step gets a fixed virtual duration.
13. **Accuracy doc added** (`docs/ACCURACY.md`), in the same form as Internet Visualizer's:
    every standard cited, and a test that keeps it a superset of what the product cites.
14. **"Lessons" defined.** Each module has a guided walkthrough (MDX, about 150 words
    between visuals) plus a free-play mode. The `/learn` index tracks completion.
15. **The cross-repo work is its own prompt** (10.4), run inside the Internet Visualizer
    and portfolio repos, not this one.
