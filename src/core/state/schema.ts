/**
 * Share-state schemas: what a module may put in its `?s=` link.
 *
 * Every module's state has the same envelope, `{ m, v, seed, step, input }`, where `m`
 * is the module slug (the discriminator), `v` the schema version, `seed` the rng seed,
 * `step` the step on screen, and `input` whatever that module needs to reproduce the run.
 * A module declares its own branch with `defineShareState` in its own folder
 * (`src/core/<algo>/state.ts`) and registers it with one line in `./index.ts`.
 *
 * Together the branches form a discriminated union on `m`. It's stored as a registry
 * rather than one `z.discriminatedUnion` so each module owns its branch, the registry can
 * be empty, and a page decodes against only its own branch: a link for one module pasted
 * into another falls back to that module's default instead of decoding.
 *
 * RULE: free-text password inputs are never encoded. A module that shares a password
 * shares the id of a built-in example (`exampleId: 'common-1'`), never the text a user
 * typed. `findSecretKeys` enforces this mechanically: a state with a key that looks like a
 * password field can't be defined, encoded or decoded.
 */

import { z } from 'zod';

/** A 32-bit unsigned seed, as `createRng` reduces it to. */
export const SEED_SCHEMA = z.number().int().min(0).max(0xffffffff);

/** The step on screen. Clamped to the run's length by the page, not here. */
export const STEP_SCHEMA = z.number().int().min(0).max(100_000);

export interface ShareStateBase<M extends string = string, I = unknown> {
  /** Module slug, as in `src/modules/registry.ts`. */
  m: M;
  /** Schema version. Bump it when `input` changes shape; old links then fall back. */
  v: number;
  seed: number;
  step: number;
  input: I;
}

/** One module's branch of the share-state union. */
export interface ModuleShareState<S extends ShareStateBase = ShareStateBase> {
  readonly m: S['m'];
  readonly v: number;
  readonly schema: z.ZodType<S>;
  /** What a missing, invalid or oversized link decodes to. */
  readonly defaults: S;
}

/** Keys that look like a free-text secret. Matched case-insensitively, anywhere in a key. */
const SECRET_KEY = /password|passphrase|passwd|secret/i;

/** Paths of keys in `value` that look like free-text secrets, e.g. `['input.password']`. */
export function findSecretKeys(value: unknown, path = ''): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => findSecretKeys(item, `${path}[${index}]`));
  }
  if (value === null || typeof value !== 'object') return [];

  return Object.entries(value).flatMap(([key, child]) => {
    const childPath = path ? `${path}.${key}` : key;
    return [
      ...(SECRET_KEY.test(key) ? [childPath] : []),
      ...findSecretKeys(child, childPath),
    ];
  });
}

/**
 * Declare a module's share state.
 *
 * Throws if `defaults` don't satisfy the schema, or if they contain a key that looks
 * like a password field. Both are authoring mistakes, caught when the module loads.
 */
export function defineShareState<const M extends string, I extends z.ZodType>(spec: {
  m: M;
  v: number;
  input: I;
  defaults: { seed: number; step: number; input: z.output<I> };
}): ModuleShareState<ShareStateBase<M, z.output<I>>> {
  type State = ShareStateBase<M, z.output<I>>;

  const schema = z.object({
    m: z.literal(spec.m),
    v: z.literal(spec.v),
    seed: SEED_SCHEMA,
    step: STEP_SCHEMA,
    input: spec.input,
  }) as unknown as z.ZodType<State>;

  const defaults: State = { m: spec.m, v: spec.v, ...spec.defaults };

  const secrets = findSecretKeys(defaults);
  if (secrets.length > 0) {
    throw new Error(
      `Share state "${spec.m}" has password-like keys (${secrets.join(', ')}). Free-text passwords are never encoded; share a built-in example id instead.`,
    );
  }
  const parsed = schema.safeParse(defaults);
  if (!parsed.success) {
    throw new Error(
      `Share state "${spec.m}" defaults are invalid: ${parsed.error.message}`,
    );
  }

  return { m: spec.m, v: spec.v, schema, defaults };
}
