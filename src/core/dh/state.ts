import * as z from 'zod/mini';

import { defineShareState, type ShareStateBase } from '../state/schema';
import { privateProblem } from './dh';
import { mitmMessageProblem } from './mitm';
import { DH_GROUP_IDS, getGroup } from './params';
import { DH_SCENES, DH_SHARE } from './share';

export { DH_SCENES, DH_SHARE, type DhScene } from './share';

const DH_INPUT = z
  .object({
    scene: z.enum(DH_SCENES),
    group: z.enum(DH_GROUP_IDS),
    a: z.optional(z.int()),
    b: z.optional(z.int()),
    msg: z.optional(z.int()),
  })
  .check(
    z.superRefine((input, ctx) => {
      const group = getGroup(input.group);
      for (const key of ['a', 'b'] as const) {
        const x = input[key];
        if (x === undefined) continue;
        const problem =
          group.kind === 'toy'
            ? privateProblem(BigInt(x), group)
            : 'The 2048-bit group draws its private keys from the seed.';
        if (problem) ctx.addIssue({ code: 'custom', path: [key], message: problem });
      }
      if (input.msg !== undefined) {
        const problem = mitmMessageProblem(BigInt(input.msg), group);
        if (problem) ctx.addIssue({ code: 'custom', path: ['msg'], message: problem });
      }
    }),
  );

export type DhShareState = ShareStateBase<'dh', z.output<typeof DH_INPUT>>;

/**
 * `?s=` for /dh: `{ m: 'dh', v: 1, seed, step, input: { scene, group, a?, b?, msg? } }`.
 *
 * `group` names p and g together (a toy safe prime or RFC 3526 group 14), since a
 * 2048-bit p doesn't fit a JSON number. `a` and `b` are the user's private exponents for
 * a toy group; the seed draws them otherwise. `msg` is the MITM chapter's toy message.
 * None of these is a password, and the keys are for display only.
 */
export const DH_SHARE_STATE = defineShareState({
  m: DH_SHARE.m,
  v: DH_SHARE.v,
  input: DH_INPUT,
  defaults: DH_SHARE.defaults,
});
