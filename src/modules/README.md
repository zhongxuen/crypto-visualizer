# src/modules

One folder per module (`xor/`, `hashing/`, `passwords/`, `aes/`, `rsa/`, `dh/`, and `tls/`
in phase 2). A module runs its algorithm's core, renders the resulting events with shared
components, and holds its own inputs, lesson and module-specific views.

## Rules

- A module **renders events and never computes crypto itself.** The algorithm lives in
  `src/core/<algo>/`. The module calls it and draws what it returns.
- A module may not import another module (rule 4 in `eslint.config.mjs`). Anything two
  modules both need goes in `src/core` or `src/components`.
- A module agent only touches its own folder, its core folder, its route under
  `src/app/(modules)/`, and its differential test. See the parallel-agent rules in
  `CLAUDE.md`.

## `registry.ts`

Not a module. It's the manifest of all seven modules that the home page and navigation
read. A module agent's only edit here is flipping its own entry's `status` from
`'planned'` to `'ready'` once its route exists. `planned` modules are shown as cards
without links.

Tests run in the Vitest `ui` project (jsdom).
