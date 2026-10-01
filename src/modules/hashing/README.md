# Module 2: Hashing and MACs (`/hashing`)

Renders the runs in `src/core/sha256` and `src/core/hmac`; computes nothing itself.

- `HashingModule.tsx`: the page. Walkthrough (`"abc"`, a one-bit flip of `"hello"`, and
  RFC 4231 case 2 for HMAC) and free play (message, flipped bit, MAC key).
- `components/Sha256View.tsx`: padded block grid, block words, schedule table, the
  round view (a–h before and after, the T1/T2 dataflow), the add, the digest.
- `components/AvalancheView.tsx`: input and output bit-diff strips.
- `components/HmacView.tsx`: the length-extension explanation, K0, both pads, the
  collapsed inner and outer hashes (expandable), the tag.
- `sha256Run.ts` + `sha256Citations.ts`: the SHA-256 chapter's run and citations, in the
  first load. `runs.ts` brings the avalanche and HMAC runs and views, the full citation
  registry and free play's form (`components/Inputs.tsx`) after hydration.
- `shareState.ts`: `{ m: 'hashing', v: 1, seed, step, input: { chapter, message, bit, key } }`.

Only the current step's view is rendered, so scrubbing across 64 rounds per block stays
smooth.
