import { it } from 'vitest';
import { sha256RunFor } from '@/modules/hashing/sha256Run';
import { HASHING_SHARE } from '@/core/sha256/share';
it('x', () => {
  const r = sha256RunFor('walkthrough', HASHING_SHARE.defaults.input as never)!;
  console.log(r.phases.length, r.phases.map((p) => p.title).join(' | '));
});
