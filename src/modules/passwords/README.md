# Module 3: Passwords and salts (`/passwords`)

Renders the runs in `src/core/kdf`; computes nothing itself.

- `PasswordsModule.tsx`: the page. Chapters: unsalted hashes and the lookup table →
  salts → PBKDF2 → guessing cost.
- `components/UsersView.tsx`: the users table (shared hashes marked in words), the
  attacker's table, lookups filled in as the run reaches them. Each lookup's hash
  travels (`<Travel>`) from the user's row into the table: a hit lights the matched row
  and stamps "cracked" on the user, a miss shakes once. `PairView` compares the two users
  who share a password; salted, each salt chip drops onto the password and the hashes'
  differing characters are marked.
- `components/Pbkdf2View.tsx`: U1–U3 and the running XOR (T pulses on each fold), an
  iteration odometer (`Odometer.tsx`), then the rest in a Worker, whose progress drives
  the odometer with this device's measured time per guess.
- `components/useStepKeyframes.ts`: the stamp, shake and salt drop, as one-shot Web
  Animations that follow the motion rules (single step only; a seek or reduced motion
  shows the end state at once).
- `components/Phase.tsx`: the walkthrough's prose is one paragraph per run phase
  (`<Phase id>`); the current phase's paragraph is marked in the lesson rail.
- `components/Pbkdf2Chapter.tsx`: the PBKDF2 view plus its Worker job. It comes with
  `runs.ts` after hydration, so the Worker code is not in the route's first load.
- `components/Inputs.tsx`: the free-play inputs (also from `runs.ts`).
- `components/CostView.tsx`: GPU and iteration sliders, scheme parameters and log-scale
  time-to-crack bars on a labelled axis (the bars ease to new widths, the time labels
  change visibly), every rate with its source (`src/core/kdf/costModel.ts`).
- `pbkdf2.worker.ts` + `usePbkdf2Worker.ts`: the full iteration count off the main
  thread, with progress and cancel (`terminate()`). Progress re-renders the page at most
  10 times a second (`PROGRESS_INTERVAL_MS`).
- `shareState.ts`: `{ m: 'passwords', v: 1, seed, step, input: { chapter, exampleId,
iterations, gpus, bcryptCost, argon2MemoryMiB, space } }`.

## Privacy

The free-play password box's value lives only in component state. It is never written to
the share link, `localStorage` or analytics; `PasswordsModule.test.tsx` and
`e2e/passwords.spec.ts` check it. Links name built-in examples by id.
