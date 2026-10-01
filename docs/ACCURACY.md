# Accuracy

Every standard, RFC and paper this site cites, by module, and the tests that back each
module's maths.

An animation is persuasive whether or not it's right. Someone watching SHA-256's rounds
tick past can't tell a faithful implementation from a plausible one, so the site has to be
checkable: every step names the text that defines it, and the step implementations are
compared against the real thing.

## How a claim reaches the screen

Every step a module shows is a `CryptoEvent` from `src/core`, and every event carries a
citation id:

```ts
// src/core/citations/types.ts
export interface Citation {
  id: CitationId; // e.g. 'fips197.5.1.3'
  doc: CitationDoc; // e.g. 'FIPS 197'
  section?: string; // e.g. '5.1.3'
  title: string;
  url: string; // a public https link, anchored where the source allows
}
```

The inspector shows the citation under the step it justifies, so the source is attached to
the individual step, not collected in a bibliography afterwards.

Three tests keep this honest:

- `tests/citations.test.ts`: every event in every scenario cites an id that resolves in the
  registry (`src/core/citations`), and every citation has a title and an https URL.
- `tests/accuracy-doc.test.ts`: runs every scenario in `src/core/scenarios.ts` and fails if
  this file doesn't name a cited id. It also fails if a registered citation or a
  differential test file named here is missing. So the tables can't fall behind the code.
  At the time of writing the 39 scenarios emit 931 events citing 61 distinct ids.
- `tests/determinism.test.ts`: every scenario gives the same result twice.

The tables can run ahead of the scenarios. Some citations are registered for text the
modules show outside a scenario run (the free-play inputs, the cost calculator, the
described-only algorithms), and they're listed too.

## What "correct" means here

**1. The step implementations are real and checked.** `src/core` implements every
algorithm from scratch, with no crypto library (boundary rule 2 in `eslint.config.mjs`,
proved by `tests/boundaries.test.ts`). `tests/differential/` then compares each one with
`node:crypto` and with the published test vectors. If core called `node:crypto` itself,
that comparison would prove nothing, which is why the rule exists.

**2. The inputs are for teaching.** Keys, salts and nonces come from a seeded
mulberry32 generator (`src/core/sim/rng.ts`) so every state can be replayed and shared.
That generator is not cryptographic, and real cryptography must never do this. RSA and
Diffie-Hellman default to toy-sized numbers so each step can be checked by hand; the real
sizes are shown as digit counts, or computed with the fast path and summarised.

**3. The implementations are not safe to use.** They're slow on purpose, not
constant-time, and must never protect real data.

**4. Some things are described, not computed.** bcrypt, Argon2, RSA-OAEP, RSA-PSS and
AES-GCM are explained with their citations but never computed. X25519 is described, not
stepped. The password-cracking speeds are illustrative orders of magnitude from the cited
benchmark, not measurements.

---

## Shared encodings

Every module that displays bytes uses these.

| Claim                                                   | Citation    | Source       |
| ------------------------------------------------------- | ----------- | ------------ |
| Text becomes bytes as UTF-8                             | `rfc3629.3` | RFC 3629 §3  |
| Bytes are shown as lowercase hex, two digits per byte   | `rfc4648.8` | RFC 4648 §8  |
| A share link is base64url JSON (`?s=`), with no padding | `rfc4648.5` | RFC 4648 §5  |

**Backed by:** `src/core/bytes/bytes.test.ts`, which compares the hand-written encoders with
the platform's (`TextEncoder`, `TextDecoder` and `Buffer`) on seeded random input, invalid
UTF-8 included, and `src/core/state/state.test.ts` (the share-link codec).

## 1. Bits, bytes and XOR (`/xor`)

XOR itself has no standard. The module cites where the one-time pad comes from, the proof
that it's perfectly secret, and the best-known failure of reusing it.

| Claim                                                                  | Citation      | Source         |
| ---------------------------------------------------------------------- | ------------- | -------------- |
| XOR with a key stream as a cipher (the one-time pad)                   | `vernam1926`  | Vernam 1926    |
| A truly random pad used once is perfectly secret                       | `shannon1949` | Shannon 1949   |
| Reusing a pad leaks p1 ⊕ p2, which a crib drags into both plaintexts   | `venona`      | Venona project |

**Backed by:** `src/core/xor/xor.test.ts`: the stepped UTF-8 run against `TextEncoder` on
1,000 seeded strings (astral characters and lone surrogates included); XOR undoing itself
on 1,000 seeded inputs; the two-time pad's c1 ⊕ c2 = p1 ⊕ p2 and its crib drag. XOR has no
library implementation to compare against, so there's no file in `tests/differential/`.

## 2. Hashing and MACs (`/hashing`)

| Claim                                                                    | Citation              | Source                  |
| ------------------------------------------------------------------------ | --------------------- | ----------------------- |
| The functions Ch, Maj, Σ0, Σ1, σ0 and σ1                                 | `fips180-4.4.1.2`     | FIPS 180-4 §4.1.2       |
| K0–K63 are the cube roots of the first 64 primes                         | `fips180-4.4.2.2`     | FIPS 180-4 §4.2.2       |
| Padding: a 1 bit, zeros, then the 64-bit length                          | `fips180-4.5.1.1`     | FIPS 180-4 §5.1.1       |
| The padded message is parsed into 512-bit blocks                         | `fips180-4.5.2.1`     | FIPS 180-4 §5.2.1       |
| H(0) is the square roots of the first 8 primes                           | `fips180-4.5.3.3`     | FIPS 180-4 §5.3.3       |
| The message schedule W0–W63                                              | `fips180-4.6.2.2-1`   | FIPS 180-4 §6.2.2 step 1 |
| The 64 compression rounds                                                | `fips180-4.6.2.2-3`   | FIPS 180-4 §6.2.2 step 3 |
| Adding the working variables into the intermediate hash                  | `fips180-4.6.2.2-4`   | FIPS 180-4 §6.2.2 step 4 |
| The digest is H0‖…‖H7                                                    | `fips180-4.6.2.2`     | FIPS 180-4 §6.2.2       |
| One flipped input bit changes about half the output bits                 | `webster-tavares1985` | Webster & Tavares 1985  |
| HMAC(K, m) = H((K0 ⊕ opad) ‖ H((K0 ⊕ ipad) ‖ m))                         | `rfc2104.2`           | RFC 2104 §2             |
| A key longer than a block is hashed first                                | `rfc2104.3`           | RFC 2104 §3             |
| Why the nested construction resists length extension                     | `rfc2104.6`           | RFC 2104 §6             |

Length extension against the naive `H(key ‖ message)` tag cites FIPS 180-4 §5.1.1, because
the attack works by continuing from SHA-256's own padding.

**Backed by:**

- `tests/differential/sha256.test.ts`: the FIPS 180-4 examples ("abc", the two-block
  message, one million "a", the empty message); K and H0 recomputed from the primes;
  `createHash` on 1,000 seeded inputs and every length 0–130 (all padding edge cases);
  the stepped path's intermediate values for "abc".
- `tests/differential/hmac.test.ts`: the RFC 4231 test cases; `createHmac` on 500 seeded
  keys and messages, including keys of exactly 63, 64 and 65 bytes; the stepped path's
  tag against the fast path.

## 3. Passwords and salts (`/passwords`)

| Claim                                                                     | Citation                 | Source                              |
| ------------------------------------------------------------------------- | ------------------------ | ----------------------------------- |
| An unsalted hash is the same for everyone with that password              | `fips180-4.6.2.2`        | FIPS 180-4 §6.2.2                   |
| The lookup list is the most common real passwords                         | `seclists-10k`           | SecLists                            |
| Precomputed tables (rainbow tables) trade memory for time                 | `oechslin2003`           | Oechslin 2003                       |
| A random per-password salt defeats precomputation                         | `rfc8018.4.1`            | RFC 8018 §4.1                       |
| An iteration count makes each guess expensive                             | `rfc8018.4.2`            | RFC 8018 §4.2                       |
| PBKDF2: U1 = PRF(P, S ‖ INT(i)), Uj = PRF(P, Uj−1), T = U1 ⊕ … ⊕ Uc        | `rfc8018.5.2`            | RFC 8018 §5.2                       |
| PBKDF2-HMAC-SHA256 test vectors                                           | `rfc7914.11`             | RFC 7914 §11                        |
| 600,000 iterations is today's PBKDF2-HMAC-SHA256 recommendation           | `owasp-password-storage` | OWASP Password Storage Cheat Sheet  |
| Guesses per second on one GPU (orders of magnitude, not measurements)     | `hashcat-rtx4090`        | hashcat 6.2.6 benchmark, RTX 4090   |
| bcrypt (described, not computed)                                          | `provos-mazieres1999`    | Provos & Mazières 1999              |
| Argon2's time, memory and parallelism (described, not computed)           | `rfc9106.3`              | RFC 9106 §3                         |
| Why memory-hardness hurts GPUs                                            | `rfc9106.4`              | RFC 9106 §4                         |

**Backed by:** `tests/differential/pbkdf2.test.ts`: the RFC 7914 §11 vectors (c = 1 and
c = 80,000); `pbkdf2Sync` on 200 seeded cases with c up to 2,000 and keys of 1–64 bytes,
including multi-block keys; the stepped path and the Worker's pending mode against the fast
path. The Worker itself (`src/modules/passwords/pbkdf2.worker.ts`) runs the same core
function.

## 4. AES (`/aes`)

| Claim                                                                 | Citation              | Source                       |
| --------------------------------------------------------------------- | --------------------- | ---------------------------- |
| The input fills a 4×4 state column by column                          | `fips197.3.4`         | FIPS 197 §3.4                |
| Multiplication in GF(2^8) and xtime                                   | `fips197.4.2`         | FIPS 197 §4.2                |
| Multiplicative inverses in GF(2^8)                                    | `fips197.4.4`         | FIPS 197 §4.4                |
| CIPHER(): ten rounds, the last without MixColumns                     | `fips197.5.1`         | FIPS 197 §5.1                |
| SubBytes and the S-box                                                | `fips197.5.1.1`       | FIPS 197 §5.1.1              |
| ShiftRows                                                             | `fips197.5.1.2`       | FIPS 197 §5.1.2              |
| MixColumns                                                            | `fips197.5.1.3`       | FIPS 197 §5.1.3              |
| AddRoundKey                                                           | `fips197.5.1.4`       | FIPS 197 §5.1.4              |
| Key expansion: RotWord, SubWord and Rcon                              | `fips197.5.2`         | FIPS 197 §5.2                |
| The inverse cipher                                                    | `fips197.5.3`         | FIPS 197 §5.3                |
| One plaintext bit reaches about half the state within a few rounds    | `webster-tavares1985` | Webster & Tavares 1985       |
| ECB encrypts each block alone, so equal blocks stay equal (penguin)   | `sp800-38a.6.1`       | NIST SP 800-38A §6.1         |
| CBC chains each block into the next                                   | `sp800-38a.6.2`       | NIST SP 800-38A §6.2         |
| CTR turns the block cipher into a key stream                          | `sp800-38a.6.5`       | NIST SP 800-38A §6.5         |
| The counter block increments as a big-endian integer                  | `sp800-38a.b`         | NIST SP 800-38A Appendix B   |
| An IV must be unpredictable (CBC) or unique (CTR)                     | `sp800-38a.c`         | NIST SP 800-38A Appendix C   |
| PKCS #7 padding                                                       | `rfc5652.6.3`         | RFC 5652 §6.3                |
| GHASH (described, not computed)                                       | `sp800-38d.6.4`       | NIST SP 800-38D §6.4         |
| GCTR (described, not computed)                                        | `sp800-38d.6.5`       | NIST SP 800-38D §6.5         |
| GCM authenticated encryption (described, not computed)                | `sp800-38d.7.1`       | NIST SP 800-38D §7.1         |
| Never reuse an IV with the same key                                   | `sp800-38d.8`         | NIST SP 800-38D §8           |

**Backed by:** `tests/differential/aes.test.ts`: the §4.2 xtime example, every inverse, the
S-box and inverse S-box against Tables 4 and 6; FIPS 197 Appendix A.1 key expansion word
by word; Appendix B and C.1 compared per step; SP 800-38A Appendix F (ECB, CBC and CTR);
`createCipheriv`/`createDecipheriv` on 1,000 seeded cases for ECB, CBC, CTR (including a
wrapping counter) and PKCS#7; the penguin's repeated blocks.

## 5. RSA (`/rsa`)

| Claim                                                                      | Citation        | Source                                        |
| -------------------------------------------------------------------------- | --------------- | --------------------------------------------- |
| The public key is (n, e)                                                   | `rfc8017.3.1`   | RFC 8017 §3.1                                 |
| The private key: d, λ(n) and the CRT values                                | `rfc8017.3.2`   | RFC 8017 §3.2                                 |
| Encryption: c = mᵉ mod n                                                   | `rfc8017.5.1.1` | RFC 8017 §5.1.1                               |
| Decryption: m = cᵈ mod n                                                   | `rfc8017.5.1.2` | RFC 8017 §5.1.2                               |
| Signing: s = mᵈ mod n                                                      | `rfc8017.5.2.1` | RFC 8017 §5.2.1                               |
| Verifying: m = sᵉ mod n                                                    | `rfc8017.5.2.2` | RFC 8017 §5.2.2                               |
| OAEP: real encryption is randomised (described, not computed)              | `rfc8017.7.1`   | RFC 8017 §7.1                                 |
| PSS: real signatures are randomised (described, not computed)              | `rfc8017.8.1`   | RFC 8017 §8.1                                 |
| How a real signature encodes the hash                                      | `rfc8017.9.2`   | RFC 8017 §9.2                                 |
| Probable primes and the Miller-Rabin test                                  | `fips186-5.b.3` | FIPS 186-5 Appendix B.3                       |
| The extended Euclidean algorithm finds d                                   | `hac.2.4.2`     | Handbook of Applied Cryptography §2.4.2       |
| Trial division                                                             | `hac.3.2.1`     | Handbook of Applied Cryptography §3.2.1       |
| Square-and-multiply                                                        | `hac.14.6.1`    | Handbook of Applied Cryptography §14.6.1      |
| Textbook RSA is malleable: (k·m)ᵉ = kᵉ·mᵉ                                  | `boneh1999`     | Boneh, Twenty Years of Attacks on RSA (1999)  |

**Backed by:** `tests/differential/rsa.test.ts`: raw RSA against OpenSSL with
`RSA_NO_PADDING` at every realistic key size over 8 seeds each; hash-then-sign against OpenSSL's raw
private operation; the core's keys accepted by OpenSSL as consistent. Also
`tests/rsa.test.ts`: the hand-worked p = 61, q = 53, e = 17 example; Miller-Rabin against
trial division for every n < 10⁶ and against Carmichael numbers; the key identities over
500 seeds.

## 6. Diffie-Hellman (`/dh`)

| Claim                                                                           | Citation             | Source                                       |
| ------------------------------------------------------------------------------- | -------------------- | -------------------------------------------- |
| The shared secret ZZ = (yb)^xa mod p                                            | `rfc2631.2.1.1`      | RFC 2631 §2.1.1                              |
| A public key is checked with y^q mod p = 1                                      | `rfc2631.2.1.5`      | RFC 2631 §2.1.5                              |
| p = jq + 1, with g generating the order-q subgroup                              | `rfc2631.2.2.1`      | RFC 2631 §2.2.1                              |
| The 2048-bit MODP group 14                                                      | `rfc3526.3`          | RFC 3526 §3                                  |
| ffdhe2048, the finite-field group TLS uses                                      | `rfc7919.a.1`        | RFC 7919 Appendix A.1                        |
| The X25519 function (described, not stepped)                                    | `rfc7748.5`          | RFC 7748 §5                                  |
| Diffie-Hellman with Curve25519 (described, not stepped)                         | `rfc7748.6.1`        | RFC 7748 §6.1                                |
| TLS 1.3 stops the man in the middle by signing the handshake, key shares included | `rfc8446.4.4.3`    | RFC 8446 §4.4.3                              |
| Square-and-multiply                                                             | `hac.14.6.1`         | Handbook of Applied Cryptography §14.6.1     |
| Eve's only route is the discrete log, by exhaustive search                      | `hac.3.6.1`          | Handbook of Applied Cryptography §3.6.1      |
| The toy cipher multiplies the message by the shared secret (ElGamal-style)      | `hac.8.4.1`          | Handbook of Applied Cryptography §8.4.1      |
| The paint analogy mixes colours in OKLab                                        | `ottosson2020.oklab` | Ottosson 2020                                |

**Backed by:** `tests/differential/dh.test.ts`: group 14's p and g against Node's `modp14`,
and public keys and shared secrets against `createDiffieHellman` for seeded private keys.
OpenSSL refuses toy groups (the test shows it), so those are checked over 200 seeds each
against repeated multiplication, which shares no code with the core. Also `tests/dh.test.ts`: the worked example p = 23, g = 2, a = 6, b = 9; subgroup
validation; Eve's search; the MITM relay; OKLab round trips and reference values.

---

## Differential tests

| File                                 | Oracle                                        |
| ------------------------------------ | --------------------------------------------- |
| `tests/differential/sha256.test.ts`  | FIPS 180-4 examples, `createHash`             |
| `tests/differential/hmac.test.ts`    | RFC 4231, `createHmac`                        |
| `tests/differential/pbkdf2.test.ts`  | RFC 7914 §11, `pbkdf2Sync`                    |
| `tests/differential/aes.test.ts`     | FIPS 197, SP 800-38A Appendix F, `createCipheriv` |
| `tests/differential/rsa.test.ts`     | OpenSSL raw RSA (`RSA_NO_PADDING`)            |
| `tests/differential/dh.test.ts`      | RFC 3526 group 14, `createDiffieHellman`      |

`src/core` also carries a coverage floor of 95% statements, branches, functions and lines
(`vitest.config.mts`), enforced by `npm run verify`.
