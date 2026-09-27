# Module 4: AES (`/aes`)

Renders the runs in `src/core/aes`; computes nothing itself.

- `AesModule.tsx`: the page. Six chapters: one block (FIPS 197 Appendix C.1), the key
  schedule (Appendix A.1's key), avalanche, modes (ECB / CBC / CTR, picked above the
  lesson), the ECB penguin and GCM (described only). Free play takes a hex key, a hex
  block or a message, the bit to flip and the IV/nonce seed.
- `components/BlockView.tsx`: the 4×4 state per sub-step. SubBytes with the 16×16
  S-box table (`SboxTable.tsx`) and the field-inverse/affine working for a chosen byte,
  ShiftRows as row-by-row rotations with arrows, MixColumns with a chosen column
  highlighted and its GF(2⁸) products, AddRoundKey with the round-key grid beside the
  state.
- `components/KeyScheduleView.tsx`: the working for w[i] and all 44 words as 11 round
  keys.
- `components/AvalancheView.tsx`: both states, a bit-diff strip and the running count.
- `components/ModeView.tsx`: padding, the IV or counter, a per-block mode diagram with
  real values, and the chain of blocks with ECB repeats marked.
- `components/PenguinView.tsx`: original, ECB and CBC bitmaps on `<canvas>`, with alt
  text.
- `components/GcmView.tsx`: GCM's parts, no values.
- `shareState.ts`: `{ m: 'aes', v: 1, seed, step, input: { chapter, mode, keyHex, ptHex, bit } }`.
  Keys are display-only hex, never passwords.
