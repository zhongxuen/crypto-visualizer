/**
 * What a learner can explain after this module's walkthrough: the completion card's
 * three bullets (`CompletionCard`, UIUX §2.1 P11), also listed on the learning path.
 */
export const AES_LEARNED: readonly string[] = [
  'AES-128 scrambles a 16-byte block on a 4×4 grid: ten rounds of SubBytes, ShiftRows, MixColumns and AddRoundKey.',
  'The key schedule stretches one 16-byte key into eleven round keys, and a single changed bit spreads through the whole block.',
  'A block cipher needs a mode: ECB leaks repeated blocks (the penguin), CBC and CTR hide them, and GCM adds a tag.',
];
