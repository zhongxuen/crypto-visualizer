import { z } from 'zod';

import { defineShareState } from '../state/schema';
import { privateProblem } from './dh';
import { mitmMessageProblem } from './mitm';
import { DH_GROUP_IDS, getGroup } from './params';
import { DH_DEFAULT_SEED } from './scenarios';

export const DH_SCENES = ['paint', 'exchange', 'eve', 'mitm'] as const;
export type DhScene = (typeof DH_SCENES)[number];

/**
 * `?s=` for /dh: `{ m: 'dh', v: 1, seed, step, input: { scene, group, a?, b?, msg? } }`.
 *
 * `group` names p and g together (a toy safe prime or RFC 3526 group 14), since a
 * 2048-bit p doesn't fit a JSON number. `a` and `b` are the user's private exponents for
 * a toy group; the seed draws them otherwise. `msg` is the MITM chapter's toy message.
 * None of these is a password, and the keys are for display only.
 */
export const DH_SHARE_STATE = defineShareState({
  m: 'dh',
  v: 1,
  input: z
    .object({
      scene: z.enum(DH_SCENES),
      group: z.enum(DH_GROUP_IDS),
      a: z.number().int().optional(),
      b: z.number().int().optional(),
      msg: z.number().int().optional(),
    })
    .superRefine((input, ctx) => {
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
  defaults: {
    seed: DH_DEFAULT_SEED,
    step: 0,
    input: { scene: 'paint', group: 'p23' },
  },
});

export type DhShareState = typeof DH_SHARE_STATE.defaults;
