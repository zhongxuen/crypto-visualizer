import type { Citation } from '../citations/types';

const RFC2631 = 'https://www.rfc-editor.org/rfc/rfc2631';
const RFC7748 = 'https://www.rfc-editor.org/rfc/rfc7748';
const HAC = 'https://cacr.uwaterloo.ca/hac/about';

/**
 * RFC 2631 for finite-field Diffie-Hellman (the exchange, the group and key validation),
 * RFC 3526 and RFC 7919 for the real 2048-bit groups, RFC 7748 for X25519, RFC 8446 for
 * how TLS 1.3 authenticates the key shares, the Handbook of Applied Cryptography for the
 * discrete log and the toy cipher, and Ottosson's OKLab for the paint model.
 *
 * Square-and-multiply cites `hac.14.6.1`, which RSA registers.
 */
export const DH_CITATIONS: readonly Citation[] = [
  {
    id: 'rfc2631.2.1.1',
    doc: 'RFC 2631',
    section: '2.1.1',
    title: 'Generation of ZZ: the shared secret (yb)^xa mod p',
    url: `${RFC2631}#section-2.1.1`,
  },
  {
    id: 'rfc2631.2.1.5',
    doc: 'RFC 2631',
    section: '2.1.5',
    title: 'Public key validation: y^q mod p = 1',
    url: `${RFC2631}#section-2.1.5`,
  },
  {
    id: 'rfc2631.2.2.1',
    doc: 'RFC 2631',
    section: '2.2.1',
    title: 'Group parameters: p = jq + 1 and a generator of the order-q subgroup',
    url: `${RFC2631}#section-2.2.1`,
  },
  {
    id: 'rfc3526.3',
    doc: 'RFC 3526',
    section: '3',
    title: 'The 2048-bit MODP group (group 14)',
    url: 'https://www.rfc-editor.org/rfc/rfc3526#section-3',
  },
  {
    id: 'rfc7919.a.1',
    doc: 'RFC 7919',
    section: 'Appendix A.1',
    title: 'ffdhe2048: the 2048-bit finite-field group for TLS',
    url: 'https://www.rfc-editor.org/rfc/rfc7919#appendix-A.1',
  },
  {
    id: 'rfc7748.5',
    doc: 'RFC 7748',
    section: '5',
    title: 'The X25519 and X448 functions',
    url: `${RFC7748}#section-5`,
  },
  {
    id: 'rfc7748.6.1',
    doc: 'RFC 7748',
    section: '6.1',
    title: 'Diffie-Hellman with Curve25519',
    url: `${RFC7748}#section-6.1`,
  },
  {
    id: 'rfc8446.4.4.3',
    doc: 'RFC 8446',
    section: '4.4.3',
    title: 'CertificateVerify: the server signs the handshake, key shares included',
    url: 'https://www.rfc-editor.org/rfc/rfc8446#section-4.4.3',
  },
  {
    id: 'hac.3.6.1',
    doc: 'Handbook of Applied Cryptography',
    section: '3.6.1',
    title: 'The discrete logarithm problem: exhaustive search',
    url: `${HAC}/chap3.pdf`,
  },
  {
    id: 'hac.8.4.1',
    doc: 'Handbook of Applied Cryptography',
    section: '8.4.1',
    title: 'ElGamal encryption: multiply the message by a Diffie-Hellman secret',
    url: `${HAC}/chap8.pdf`,
  },
  {
    id: 'ottosson2020.oklab',
    doc: 'Ottosson, A perceptual color space for image processing (2020)',
    title: 'OKLab: a perceptual colour space, used here to mix paint',
    url: 'https://bottosson.github.io/posts/oklab/',
  },
];
