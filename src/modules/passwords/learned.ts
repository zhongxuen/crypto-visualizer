/**
 * What a learner can explain after this module's walkthrough: the completion card's
 * three bullets (`CompletionCard`, UIUX §2.1 P11), also listed on the learning path.
 */
export const PASSWORDS_LEARNED: readonly string[] = [
  'An unsalted hash gives one password one value, so a precomputed table cracks everyone who chose a common password.',
  'A salt per user makes identical passwords hash differently, so every guess has to be tried against every user separately.',
  'PBKDF2 repeats HMAC hundreds of thousands of times, which makes every single guess slow for an attacker too.',
];
