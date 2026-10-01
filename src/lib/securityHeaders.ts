/**
 * The response headers every route carries, and the reasoning behind each one.
 *
 * Adapted from Internet Visualizer's `src/lib/securityHeaders.ts` (phase 10, step 3).
 * It lives here rather than inline in `next.config.ts` so the policy can be asserted:
 * `next.config.ts` returns {@link securityHeaders} verbatim,
 * `tests/security-headers.test.ts` checks what the policy says, and
 * `e2e/security.spec.ts` checks that it arrives on a production response and that no
 * page, the PBKDF2 Worker included, violates it.
 *
 * Dependency-free on purpose: `next.config.ts` is bundled before the app's module
 * resolution exists, so anything imported here would have to be bundled with it.
 */

/**
 * Whether the browser blocks a violation or only reports it. Both are reachable from
 * `CSP_MODE`, so trying a policy change in report-only first is a redeploy, not an edit.
 */
export type CspMode = 'enforce' | 'report-only';

/** One header, in the shape `next.config.ts`'s `headers()` wants it. */
export interface HeaderEntry {
  readonly key: string;
  readonly value: string;
}

export interface SecurityHeaderOptions {
  /** Defaults to `'enforce'`. See {@link cspModeFromEnv}. */
  readonly mode?: CspMode;
  /**
   * Loosens exactly two directives for the dev server: Turbopack evaluates compiled
   * modules and talks to its own websocket for Fast Refresh. Neither reaches a
   * deployment, so the shipped policy doesn't pay for them.
   */
  readonly development?: boolean;
  /** When set, violations are POSTed here as well as surfaced to the console. */
  readonly reportUri?: string;
}

/**
 * The policy, directive by directive.
 *
 * - **`connect-src 'self'`** is the browser-level form of "everything runs in your
 *   browser". Every module is a client-side computation with no server behind it, so a
 *   `fetch`, `WebSocket` or `EventSource` to any other origin is refused whatever the
 *   code asks for. Nothing a learner types can leave the page.
 * - **`worker-src 'self' blob:`** is for the PBKDF2 Worker on /passwords
 *   (`src/modules/passwords/usePbkdf2Worker.ts`), which runs 600,000 iterations off the
 *   main thread. The worker script is a same-origin chunk; `blob:` covers the bootstrap
 *   Turbopack may wrap it in. Without this directive `default-src` would still allow
 *   `'self'`, but naming it keeps the one place a worker is allowed explicit.
 * - **`frame-ancestors 'none'`**: nothing here is meant to be embedded, and a page that
 *   can't be framed can't be clickjacked.
 *
 * `'unsafe-inline'` on scripts is the policy's one real weakness and is stated rather
 * than hidden. The App Router streams its payload through inline `<script>` tags, and
 * the theme is applied by an inline script before first paint. The alternative is a
 * per-request nonce, which would make every page render dynamically instead of being
 * prerendered. There is no user-generated content, no third-party script, and no
 * session or cookie to steal, so the directives that bound the damage of an injected
 * script (`connect-src`, `base-uri`, `form-action`, `object-src`) carry the weight.
 *
 * `style-src 'unsafe-inline'` is required: `motion` animates by writing `style`.
 *
 * There is **no `'unsafe-eval'`**. zod checks whether it may compile a validator with
 * `new Function` by trying `Function("")` in a `try`/`catch`; under this policy that
 * throws, zod runs interpreted, and the browser reports one `script-src` violation on
 * the routes that parse a `?s=` link. `e2e/security.spec.ts` names that one report and
 * fails on anything else. Don't "fix" it with `'unsafe-eval'`.
 */
export function contentSecurityPolicy(options: SecurityHeaderOptions = {}): string {
  const { development = false, reportUri } = options;

  const directives: string[][] = [
    ['default-src', "'self'"],
    // No nonce; see above. 'unsafe-eval' is Turbopack's, and dev-only.
    [
      'script-src',
      "'self'",
      "'unsafe-inline'",
      ...(development ? ["'unsafe-eval'"] : []),
    ],
    ['style-src', "'self'", "'unsafe-inline'"],
    // `data:` for inlined SVG; `blob:` for the penguin canvas readback.
    ['img-src', "'self'", 'data:', 'blob:'],
    // next/font self-hosts both Geist faces, so there is no font origin to allow.
    ['font-src', "'self'"],
    // Everything runs in the browser. `ws:` is the Fast Refresh socket, dev only.
    ['connect-src', "'self'", ...(development ? ['ws:', 'wss:'] : [])],
    ['object-src', "'none'"],
    ['frame-src', "'none'"],
    ['frame-ancestors', "'none'"],
    ['base-uri', "'self'"],
    ['form-action', "'self'"],
    ['manifest-src', "'self'"],
    ['media-src', "'none'"],
    // The PBKDF2 Worker.
    ['worker-src', "'self'", 'blob:'],
  ];

  // Meaningless over http, and on a dev server it would break every asset request.
  if (!development) directives.push(['upgrade-insecure-requests']);
  if (reportUri) directives.push(['report-uri', reportUri]);

  return directives.map((parts) => parts.join(' ')).join('; ');
}

/**
 * `Permissions-Policy`. An empty allowlist denies the feature to this document and every
 * frame in it. Nothing here needs any of these, so the honest value is "no".
 */
export const PERMISSIONS_POLICY = [
  'camera=()',
  'microphone=()',
  'geolocation=()',
  'payment=()',
  'usb=()',
  'interest-cohort=()',
].join(', ');

/** Two years, subdomains included. `max-age` is in seconds. */
export const STRICT_TRANSPORT_SECURITY = 'max-age=63072000; includeSubDomains; preload';

/**
 * Every security header, in one array. `X-Frame-Options` repeats `frame-ancestors` for
 * browsers that predate it.
 */
export function securityHeaders(options: SecurityHeaderOptions = {}): HeaderEntry[] {
  const mode: CspMode = options.mode ?? 'enforce';

  return [
    {
      key:
        mode === 'report-only'
          ? 'Content-Security-Policy-Report-Only'
          : 'Content-Security-Policy',
      value: contentSecurityPolicy(options),
    },
    { key: 'Strict-Transport-Security', value: STRICT_TRANSPORT_SECURITY },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: PERMISSIONS_POLICY },
    { key: 'X-Frame-Options', value: 'DENY' },
  ];
}

/**
 * Read the mode from the environment, treating anything unrecognised as enforcement, so
 * a typo or an unset variable leaves the policy enforcing rather than silently reporting.
 */
export function cspModeFromEnv(
  env: Record<string, string | undefined> = process.env,
): CspMode {
  const raw = (env.CSP_MODE ?? '').trim().toLowerCase();
  return raw === 'report-only' ? 'report-only' : 'enforce';
}
