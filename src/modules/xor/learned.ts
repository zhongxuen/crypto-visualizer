/**
 * What a learner can explain after this module's walkthrough: the completion card's
 * three bullets (`CompletionCard`, UIUX §2.1 P11), also listed on the learning path.
 */
export const XOR_LEARNED: readonly string[] = [
  'Text is stored as bytes: UTF-8 turns each character into one to four of them, written in hex or binary.',
  'XOR with a key masks bytes and XOR with the same key unmasks them, because m ⊕ k ⊕ k = m.',
  'A one-time pad is unbreakable only with a random key as long as the message, used once: two messages under one key give both away.',
];
