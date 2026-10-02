/**
 * What a learner can explain after this module's walkthrough: the completion card's
 * three bullets (`CompletionCard`, UIUX §2.1 P11), also listed on the learning path.
 */
export const HASHING_LEARNED: readonly string[] = [
  'SHA-256 pads a message into 64-byte blocks, stretches each into 64 words and mixes them through 64 rounds into a 256-bit digest.',
  'Flipping one input bit changes about half of the digest’s bits (the avalanche effect), so similar inputs give unrelated hashes.',
  'Hashing key ‖ message can be extended without the key; HMAC’s inner and outer hashes close that hole.',
];
