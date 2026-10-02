/**
 * What a learner can explain after this module's walkthrough: the completion card's
 * three bullets (`CompletionCard`, UIUX §2.1 P11), also listed on the learning path.
 */
export const RSA_LEARNED: readonly string[] = [
  'An RSA key starts as two primes: n = p·q is public, and d, found from e and φ(n) by extended Euclid, is private.',
  'Encrypting is m^e mod n and decrypting is c^d mod n, both computed quickly by square-and-multiply.',
  'A signature is the private operation on a hash, and unpadded “textbook” RSA is malleable, which is why real systems use OAEP and PSS.',
];
