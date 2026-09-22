# Crypto Visualizer — Implementation Plan

Written: 2026-09-22
Status: **[planned]**
Series: Visualizer Series (Security)
Repo: new, `crypto-visualizer`. Hosting: its own Vercel project. **No database**

---

## 1. Pitch

The actual maths behind the padlock icon, one step at a time. You watch AES change a 16-byte block round by round, do RSA with numbers small enough to check on paper, run Diffie-Hellman as the colour-mixing demo and then as real modular arithmetic, and see why salted, slow hashes beat fast ones.

**Portfolio gap it fills:** Internet Visualizer's disclaimer says *"There is no cryptography anywhere in the TLS layer — the handshake is modelled, not performed."* This project is the answer. Internet Visualizer's TLS lessons can link here ("see what this step actually computes").

---

## 2. Modules

| Module | What you step through | Reference |
|---|---|---|
| **1. Bits and XOR** | XOR as a reversible mask, one-time pad, why reusing a key breaks it (two-time pad demo) | — |
| **2. Hashing** | SHA-256: padding, message schedule, 64 compression rounds with the working variables a–h shown. The avalanche effect: flip 1 input bit and see about 50% of output bits change | FIPS 180-4 |
| **3. Passwords and salts** | Same password → same unsalted hash → a rainbow-table lookup succeeds. Add a salt → the lookup fails. Then cost: PBKDF2 iterations, bcrypt and Argon2 as tunable work, with a "guesses per second" slider | RFC 8018, RFC 9106 |
| **4. AES** | One block through AES-128: key expansion, then each round's SubBytes / ShiftRows / MixColumns / AddRoundKey on a 4×4 state grid. Modes: ECB (show the "ECB penguin" pattern leak on a small bitmap), CBC, CTR, GCM (the tag at a high level) | FIPS 197, SP 800-38A/D |
| **5. RSA** | Pick small primes → n, φ(n), e, d (extended Euclid shown step by step) → encrypt/decrypt a small number → sign/verify. Then why textbook RSA is unsafe (malleability demo) and what OAEP/PSS padding fixes | RFC 8017 |
| **6. Diffie-Hellman** | Paint-mixing analogy → real modular exponentiation with small p, g → how an eavesdropper sees only g^a, g^b → a man-in-the-middle attack when nothing is authenticated | RFC 2631, RFC 7748 (X25519, described only) |
| **7. Putting it together: TLS 1.3** | The handshake with **real values**: ECDHE key share → HKDF key schedule → AEAD-encrypted records. This is the "missing layer" from Internet Visualizer | RFC 8446, RFC 5869 |

v1 = modules 1–6. Module 7 is phase 2.

---

## 3. Architecture

Uses the kernel pattern from Internet Visualizer: copy its timeline and event stream into `src/vendor/`.

```
src/core/          pure TS, no React, no DOM, no crypto.subtle
  aes/             step-emitting AES-128 (state after each sub-step)
  sha256/          step-emitting SHA-256
  rsa/             bigint RSA with step events (gcd, modinv, modpow)
  dh/              modpow with square-and-multiply steps shown
  kdf/             PBKDF2 over the step SHA-256 (iteration count capped for display)
  events.ts        CryptoEvent = { kind, label, state, citation }
src/modules/<n>/   React UI that renders the events
```

- **Determinism:** randomness (keys, salts, nonces) comes from an injected seeded RNG, never `crypto.getRandomValues` inside core. "New random key" in the UI creates a new *seed*, so every state can be shared through the URL.
- **BigInt** for RSA/DH. Keep display sizes small (primes under 10⁶ in the "paper" mode, up to 512-bit in a "realistic" mode that shows digit counts, not every step).
- **Visual building blocks:** a byte grid (4×4 AES state, hex/binary toggle), a bit-diff strip (for avalanche), and a number-line or clock for modular arithmetic.

---

## 4. Correctness (the main quality claim)

These are **differential tests** against real implementations. Core never uses them, but the tests do:

| Simulation | Checked against |
|---|---|
| Step AES-128 (ECB/CBC/CTR) | FIPS 197 Appendix C test vectors, and Node `crypto.createCipheriv` on 1,000 seeded random blocks |
| Step SHA-256 | FIPS 180-4 examples ("abc", the 448-bit message), plus Node `crypto.createHash` on seeded random inputs |
| PBKDF2 | RFC 6070-style vectors (SHA-256 variants) and Node `crypto.pbkdf2Sync` |
| RSA | Encrypt∘decrypt identity for all generated keypairs, and `d·e ≡ 1 (mod φ)` |
| DH | Both sides derive the same secret for every seed |

Plus the usual determinism test (every scenario runs twice and the results are deep-equal) and a citations test (every event has a citation that resolves).

---

## 5. Data and state

- No server. Everything runs in the browser.
- Settings and "completed module" ticks go in `localStorage` (`cv:v1`).
- Share links: `?m=aes&seed=...&step=17`.

---

## 6. Honest disclaimers (draft)

- "Built for teaching, not for security. The step implementations are deliberately slow, have no constant-time behaviour, and must never protect real data. The test suite checks their *output* against Node's crypto library."
- "RSA and Diffie-Hellman use toy-sized numbers by default so every step can be checked by hand. Real key sizes appear only as digit counts."
- "Elliptic curves are described, not stepped through. X25519 is shown as a black box in v1."

---

## 7. Testing and quality

Vitest (core + differential), Playwright (step through AES fully by keyboard), axe on every route, and a colour-blind-safe diff palette (flipped bits need a pattern or shape as well as colour).

---

## 8. Phases

| Phase | Deliverable | Estimate |
|---|---|---|
| 0 | Scaffold + vendored timeline + byte-grid component | 2 days |
| 1 | Modules 1–2 (XOR, SHA-256) + differential tests | 1 week |
| 2 | Modules 3–4 (salts/KDF, AES + modes) | 1–1.5 weeks |
| 3 | Modules 5–6 (RSA, DH) | 1 week |
| 4 | Lessons, polish, portfolio entry, link from Internet Visualizer's TLS module | 3–4 days |
| 5 (later) | Module 7: TLS 1.3 with real values | 1–2 weeks |

---

## 9. Portfolio entry (draft)

- technologies: Next.js, TypeScript, React, Tailwind CSS, Zustand, Vitest, Playwright
- keyFeatures to highlight: step-emitting AES/SHA-256 checked against Node crypto by differential tests, shareable deterministic states, the ECB-penguin demo, textbook-RSA malleability demo
- Also update Internet Visualizer's disclaimer, or its entry here, to point to this project.
