import type { AesMode } from '@/core/aes/events';

/** On its own so free play's mode picker doesn't pull in the whole mode diagram. */
export const MODE_NAMES: Record<AesMode, string> = {
  ecb: 'ECB',
  cbc: 'CBC',
  ctr: 'CTR',
};
