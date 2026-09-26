# 11 — Module 7: TLS 1.3 with real values (phase 2)

Wave: **later** · Estimate: 1.5–2 weeks · Original plan: phase 5
Route: `/tls`

## Goal

The "missing layer" from Internet Visualizer. The learner steps through a real TLS 1.3
handshake where every number is computed, not modelled: the X25519 key share, the HKDF
key schedule, and AES-128-GCM record protection. The whole run is checked against the
**RFC 8448 "Simple 1-RTT Handshake"** trace, which publishes every private key, shared
secret, derived key and encrypted record.

## Prerequisites

05 (SHA-256, HMAC), 07 (AES), 10 (v1 shipped).

## Scope decisions

- **Replay RFC 8448, don't run a live handshake.** Using the published trace means the
  run is deterministic, checkable against a standard, and needs no network. A "new seed"
  mode generates fresh key shares and derives everything again, checked against
  `node:crypto`.
- **Certificates and the signature are shown, not verified.** CertificateVerify uses
  RSA-PSS in RFC 8448. The module shows the transcript hash being signed and verifies the
  signature in the tests with `node:crypto`, but doesn't step RSA-PSS (module 5 explains
  why PSS exists). Say this in the disclaimer.
- **This changes a v1 disclaimer.** "X25519 is described, not stepped" and "AES-GCM is
  explained, not computed" no longer hold once this ships. Update `/about`, the module
  banners and the portfolio entry in the same release.

---

## Deliverables

```
src/core/x25519/   events.ts  citations.ts  field.ts  ladder.ts  x25519.ts
src/core/gcm/      events.ts  citations.ts  ghash.ts  gcm.ts
src/core/hkdf/     events.ts  citations.ts  hkdf.ts  tls13Schedule.ts
src/core/tls13/    events.ts  citations.ts  rfc8448.ts (trace data)  transcript.ts  handshake.ts  records.ts  scenarios.ts
tests/differential/{x25519,gcm,hkdf,tls13}.test.ts
src/modules/tls/   TlsModule.tsx  components/  walkthrough.mdx  meta.ts  shareState.ts  README.md
src/app/(modules)/tls/page.tsx
```

---

## Steps

### Core — primitives

1. **X25519** [RFC 7748 §5]: field arithmetic mod 2²⁵⁵ − 19 on `bigint`, scalar clamping,
   the Montgomery ladder with one event per bit in summary groups (255 steps collapsed into
   ~16 groups; expandable). Not constant-time; the disclaimer says so.
2. **GCM** [SP 800-38D]: GF(2¹²⁸) multiply, GHASH, GCTR over the existing AES
   `encryptBlock`, tag generation and verification. Events per block, one per GHASH
   multiply in the stepped view.
3. **HKDF** [RFC 5869]: Extract and Expand over the existing HMAC; `HKDF-Expand-Label` and
   `Derive-Secret` [RFC 8446 §7.1].

### Core — handshake

4. `transcript.ts`: running SHA-256 over handshake messages, with the message bytes from
   RFC 8448.
5. `tls13Schedule.ts`: early secret → handshake secret (from the X25519 shared secret) →
   master secret, with every derived traffic secret, key and IV as events [RFC 8446 §7.1,
   §7.3].
6. `records.ts`: per-record nonce = IV ⊕ sequence number, AES-128-GCM seal/open with the
   record header as AAD [RFC 8446 §5.2, §5.3].
7. `handshake.ts`: ClientHello → ServerHello → {EncryptedExtensions, Certificate,
   CertificateVerify, Finished} → client Finished → application data, as one run grouped
   by flight.

### Differential tests

- X25519: RFC 7748 §5.2 vectors, the 1 / 1,000 iteration test (1,000,000 is optional and
  skipped by default), §6.1 Diffie-Hellman example; `crypto.diffieHellman` with X25519
  KeyObjects on 200 seeded keys.
- GCM: the SP 800-38D / McGrew-Viega AES-128 test cases, and `createCipheriv('aes-128-gcm')`
  on 500 seeded cases including empty plaintext and non-block-aligned AAD.
- HKDF: RFC 5869 Appendix A test cases 1–3, and `crypto.hkdfSync`.
- TLS 1.3: every value in RFC 8448 §3 (shared secret, each secret, key, IV, Finished
  values, and every encrypted record byte for byte). CertificateVerify's RSA-PSS
  signature verified with `crypto.verify`.

### UI

- A flight-by-flight ladder (client / server), with the key schedule as a vertical
  "staircase" beside it that fills in as secrets are derived.
- Records panel: plaintext → nonce → ciphertext + tag, with the AAD highlighted.
- Links back into modules 2, 4 and 6 at the exact step ("this is the HMAC you stepped
  through in module 2").
- Trace mode (RFC 8448) and new-seed mode.

---

## Acceptance criteria

- [ ] Every RFC 8448 §3 value matches, byte for byte
- [ ] X25519, GCM and HKDF differential tests pass
- [ ] v1 disclaimers updated in `/about`, the banners, README and the portfolio entry
- [ ] Internet Visualizer's TLS module links to `/tls`
- [ ] `/tls` keyboard walkthrough + axe; within the JS budget; registry entry `ready`

---

## Prompts to execute

### Prompt 11.core — X25519, GCM, HKDF, TLS 1.3 schedule

```
Read docs/implementation/00-overview.md and docs/implementation/11-module-7-tls13.md.
Use src/core/sha256, src/core/hmac and src/core/aes as they are; don't change their
behaviour.

Implement src/core/x25519, src/core/gcm, src/core/hkdf and src/core/tls13 per the "Core"
steps, with the RFC 8448 §3 "Simple 1-RTT Handshake" transcribed into rfc8448.ts (cite
it). Every event cites RFC 7748 / SP 800-38D / RFC 5869 / RFC 8446 / RFC 8448 sections.
Add the events and citations the same append-only way as v1.

Write the four differential test files listed under "Differential tests". The run must
reproduce every RFC 8448 value byte for byte. Done when `npm run verify` passes. Commit.
If a value doesn't match, find the cause and report it; never adjust the expected data.
```

### Prompt 11.ui — TLS 1.3 module UI and disclaimer update

```
Read docs/implementation/11-module-7-tls13.md.

Build src/modules/tls and /tls per the "UI" steps: flight ladder, key-schedule staircase,
records panel, deep links back into modules 2, 4 and 6, trace and new-seed modes, share
state. Keyboard-only Playwright walkthrough with axe; keep within the JS budget. Flip the
registry entry to 'ready', add /tls to /learn, and update the disclaimers in /about, the
module banners, README and docs/ACCURACY.md so they no longer say X25519 and GCM are only
described.

Done when `npm run verify`, `npm run test:e2e` and `node perf/bundles.mjs` pass. Commit,
then remind me to update the portfolio entry and Internet Visualizer link (prompt 10.4).
```
