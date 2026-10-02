/**
 * What a learner can explain after this module's walkthrough: the completion card's
 * three bullets (`CompletionCard`, UIUX §2.1 P11), also listed on the learning path.
 */
export const DH_LEARNED: readonly string[] = [
  'Two people can agree on a secret in public: each keeps a private number and sends only g to that power, mod p.',
  'An eavesdropper sees p, g and both public values, but undoing them is a discrete logarithm, infeasible at real sizes.',
  'With nothing authenticated, a man in the middle runs one exchange with each side, which is why TLS signs the exchange.',
];
