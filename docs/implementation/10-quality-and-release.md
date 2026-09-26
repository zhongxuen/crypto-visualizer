# 10 — Lessons, quality pass, release and portfolio links

Wave: **W4** (10.1) / **W5** (10.2 → 10.4) · Estimate: 4–5 days · Original plan: phase 4

## Goal

v1 shipped: a `/learn` index tying the six modules into one path, the quality pass
(tests, accessibility, performance, accuracy doc), the production deploy, the portfolio
entry, and the link from Internet Visualizer's TLS module.

## Prerequisites

04–09 merged.

---

## Deliverables

```
src/app/learn/page.tsx          the learning path with completion ticks
src/app/page.tsx                home: pitch, the path, "why trust this" (differential tests)
src/app/about/page.tsx          final disclaimers + accuracy explanation
src/app/sitemap.ts  robots.ts  opengraph-image.tsx
docs/ACCURACY.md
tests/accuracy-doc.test.ts
perf/bundles.mjs                (vendored from Internet Visualizer)
e2e/*.spec.ts                   axe on every route, reduced motion, share links
README.md                       real README: what, why, how it's tested, screenshots
```

---

## Steps

### 1. Learning path (prompt 10.1)

- `/learn`: the six modules in order, each with the one-sentence "what you'll see",
  estimated minutes, and a completion tick from `useProgress`. A module counts as
  complete when its walkthrough reaches the last step.
- Cross-links between modules where one idea leads to the next (XOR → AES CTR, SHA-256 →
  HMAC → PBKDF2, DH MITM → RSA signatures, everything → TLS 1.3 teaser).
- Walkthrough copy pass: about 150 words between visuals, plain language, same voice as
  Internet Visualizer (`../internet-visualizer/docs/CONTENT-STYLE.md`).

### 2. Disclaimers (final text) (prompt 10.1)

In `/about`, in the module banner (short form) and in the portfolio entry:

- "Built for teaching, not for security. The step implementations are deliberately slow,
  are not constant-time, and must never protect real data. The test suite checks their
  output against Node's crypto library and the published test vectors."
- "Keys, salts and nonces come from a seeded, non-cryptographic random generator so every
  state can be replayed and shared. That is exactly what real cryptography must never do."
- "RSA and Diffie-Hellman use toy-sized numbers by default so every step can be checked by
  hand. Real key sizes appear only as digit counts."
- "bcrypt, Argon2, OAEP, PSS and AES-GCM are explained, not computed. Elliptic curves
  (X25519) are described, not stepped, in v1."
- "Password-cracking speeds are illustrative orders of magnitude from the cited source,
  not measurements."

### 3. Quality pass (prompt 10.2)

- **Accuracy doc:** `docs/ACCURACY.md` lists every standard cited, grouped by module, with
  the differential tests that back each module. `tests/accuracy-doc.test.ts` collects
  citations from every scenario and fails if the doc doesn't list one (doc may be a
  superset), as in Internet Visualizer.
- **Coverage:** `src/core` ≥ 95% lines/branches.
- **e2e:** axe on every route in light and dark; keyboard-only walkthrough per module;
  reduced motion; a share link round-trip per module (open `?s=`, land on the same step
  with the same values); invalid `?s=` falls back cleanly.
- **Colour-blind check:** screenshots of BitDiffStrip and the AES state under simulated
  deuteranopia and protanopia; flipped bits still distinguishable by shape.
- **Performance:** vendor `perf/bundles.mjs`; budget ≤ 170 KB gzipped first-load JS per
  module route. Heavy views (penguin canvas, PBKDF2 Worker) load lazily.
- **Security headers:** copy `src/lib/securityHeaders.ts` from Internet Visualizer (CSP
  with `worker-src 'self'` for the PBKDF2 Worker).
- Delete `/demo` or keep it noindex and out of the sitemap, and say which in CLAUDE.md.

### 4. Release (prompt 10.3)

- New Vercel project linked to the repo, production deploy, `@vercel/analytics`
  (page views only; never module inputs).
- OG image, sitemap, robots.
- README: pitch, module list, the "how correctness is checked" section, screenshots,
  local dev, the disclaimers. Update the root README status from "planned" to "live".

### 5. Portfolio and Internet Visualizer (prompt 10.4, run in the other repos)

**Portfolio repo** (per `../README.md` §4):

- `data/projects.ts` entry: slug `crypto-visualizer`; technologies Next.js, TypeScript,
  React, Tailwind CSS, Zustand, Zod, Vitest, Playwright; `liveUrl`, `githubUrl`/`githubRepo`.
- keyFeatures: step-emitting AES-128 and SHA-256 checked against Node crypto and
  FIPS vectors by differential tests; shareable deterministic states; the ECB penguin;
  textbook-RSA malleability; salted vs unsalted password lookup.
- disclaimers: the short forms from step 2.
- Screenshot in `public/images/projects/`; any new skills in `data/skills.ts`;
  `series: "visualizers"` if that field exists.

**Internet Visualizer repo:**

- In the HTTPS Explorer and the TLS lessons, add "See what this step actually computes →"
  links to `/dh`, `/aes`, `/hashing` (and `/tls` once phase 2 ships).
- Amend the "no cryptography in the TLS layer" disclaimer to point to this project. Do not
  add any real cryptography to Internet Visualizer; its README forbids it.

---

## Acceptance criteria

- [ ] `/learn` shows all six modules with working completion ticks
- [ ] ACCURACY.md test, coverage threshold, all e2e and axe checks pass
- [ ] Every module route is within the JS budget
- [ ] Production URL live; README and root status updated
- [ ] Portfolio entry and Internet Visualizer links merged in their own repos

---

## Prompts to execute

### Prompt 10.1 — learning path, copy, disclaimers (wave W4)

```
Read docs/implementation/00-overview.md and docs/implementation/10-quality-and-release.md
steps 1-2. Also read ../internet-visualizer/docs/CONTENT-STYLE.md for the voice.

Build /learn with completion ticks from useProgress, add the cross-links between modules,
do a copy pass over every walkthrough.mdx (≈150 words between visuals, plain language),
and put the final disclaimer text into /about, the module banner and the home page.
Only edit copy and navigation in the module folders, not their logic.

Done when `npm run verify` and `npm run test:e2e` pass. Commit.
```

### Prompt 10.2 — quality pass (wave W5)

```
Read docs/implementation/10-quality-and-release.md step 3. Use Internet Visualizer's
docs/ACCURACY.md, tests/rfc-references.test.ts, perf/bundles.mjs and
src/lib/securityHeaders.ts as the models.

Write docs/ACCURACY.md and tests/accuracy-doc.test.ts, raise src/core coverage to ≥95%,
add the e2e suite (axe on every route in both themes, keyboard walkthroughs, reduced
motion, share-link round trips, invalid ?s= fallback), the colour-blind screenshots,
vendor perf/bundles.mjs and meet the 170 KB budget per module route, and add security
headers with a CSP that allows the PBKDF2 worker. Decide what happens to /demo and record
it in CLAUDE.md.

Fix what you find, but report rather than weaken any test or budget. Done when
`npm run verify`, `npm run test:e2e` and `node perf/bundles.mjs` all pass. Commit.
```

### Prompt 10.3 — release (wave W5)

```
Read docs/implementation/10-quality-and-release.md step 4.

Write the real README (pitch, modules, how correctness is checked, screenshots, local dev,
disclaimers), add the OG image, sitemap and robots, and wire @vercel/analytics for page
views only. Then deploy a preview to Vercel and give me the URL. Ask before promoting to
production.
```

### Prompt 10.4 — portfolio entry and Internet Visualizer links (run in those repos)

```
(Run in the portfolio repo.)
Read ../visualizers/crypto-visualizer/docs/implementation/10-quality-and-release.md step 5
and docs/README.md §4. Add the crypto-visualizer entry to data/projects.ts with the listed
technologies, keyFeatures and disclaimers, the live and GitHub URLs, a screenshot in
public/images/projects/, and any new skills. If a `series` field exists, set it to
"visualizers". Make sure the admin serializer keeps every field. Run the portfolio's tests.
```

```
(Run in ../internet-visualizer.)
Read ../crypto-visualizer/docs/implementation/10-quality-and-release.md step 5. In the
HTTPS Explorer and the TLS lessons, add "See what this step actually computes →" links to
the Crypto Visualizer's /dh, /aes and /hashing routes, and amend the "no cryptography in
the TLS layer" disclaimer to point there. Add no cryptography to this repo. Follow this
repo's CLAUDE.md rules (one module at a time). Run npm run verify.
```
