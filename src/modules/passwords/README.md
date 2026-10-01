# Module 3: Passwords and salts (`/passwords`)

Renders the runs in `src/core/kdf`; computes nothing itself.

- `PasswordsModule.tsx`: the page. Chapters: unsalted hashes and the lookup table →
  salts → PBKDF2 → guessing cost.
- `components/UsersView.tsx`: the users table (shared hashes marked in words), the
  attacker's table, lookups filled in as the run reaches them.
- `components/Pbkdf2View.tsx`: U1–U3 and the running XOR, then the rest in a Worker.
- `components/Pbkdf2Chapter.tsx`: the PBKDF2 view plus its Worker job. It comes with
  `runs.ts` after hydration, so the Worker code is not in the route's first load.
- `components/Inputs.tsx`: the free-play inputs (also from `runs.ts`).
- `components/CostView.tsx`: GPU slider, scheme parameters and log-scale bars, every rate
  with its source (`src/core/kdf/costModel.ts`).
- `pbkdf2.worker.ts` + `usePbkdf2Worker.ts`: the full iteration count off the main
  thread, with progress and cancel (`terminate()`).
- `shareState.ts`: `{ m: 'passwords', v: 1, seed, step, input: { chapter, exampleId,
  iterations, gpus, bcryptCost, argon2MemoryMiB, space } }`.

## Privacy

The free-play password box's value lives only in component state. It is never written to
the share link, `localStorage` or analytics; `PasswordsModule.test.tsx` and
`e2e/passwords.spec.ts` check it. Links name built-in examples by id.
