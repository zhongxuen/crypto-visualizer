/** Site-wide copy, kept in one place so the layout, home page and metadata agree. */
export const SITE = {
  name: 'Crypto Visualizer',
  tagline: 'The actual maths behind the padlock icon, one step at a time.',
  description:
    'The actual maths behind the padlock icon, one step at a time: XOR, SHA-256, HMAC, PBKDF2, AES, RSA and Diffie-Hellman.',
  disclaimer:
    'For learning only. Keys and randomness here are for display: nothing on this site may be used to protect real data.',
  repoUrl: 'https://github.com/zhongxuen/crypto-visualizer',
} as const;
