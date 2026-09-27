/**
 * Arithmetic in GF(2^8), the field AES works in (FIPS 197 §4).
 *
 * A byte is a polynomial of degree below 8 with coefficients in GF(2). Adding two is XOR
 * (§4.1). Multiplying is polynomial multiplication reduced modulo the irreducible
 * m(x) = x^8 + x^4 + x^3 + x + 1, written 0x11b (§4.2). `xtime` multiplies by x, and any
 * product is built from repeated `xtime` and XOR, which is how the MixColumns detail
 * shows it.
 */

/** The AES reduction polynomial m(x) = x^8 + x^4 + x^3 + x + 1 (§4.2). */
export const AES_POLYNOMIAL = 0x11b;

/** Multiply by x: shift left, and reduce by 0x1b if a bit fell off the top (§4.2). */
export function xtime(a: number): number {
  const shifted = (a & 0xff) << 1;
  return (shifted & 0x100 ? shifted ^ AES_POLYNOMIAL : shifted) & 0xff;
}

/** a • b in GF(2^8): add `a · x^i` for every set bit `i` of `b` (§4.2). */
export function gmul(a: number, b: number): number {
  let product = 0;
  let power = a & 0xff;
  let rest = b & 0xff;
  while (rest) {
    if (rest & 1) product ^= power;
    power = xtime(power);
    rest >>= 1;
  }
  return product;
}

/** One line of a product worked by `xtime`: `a · x^i`, and whether bit `i` of `b` is set. */
export interface XtimeStep {
  power: number;
  value: number;
  used: boolean;
}

/**
 * `a • b` written out the way §4.2 illustrates it: the powers `a, xtime(a),
 * xtime(xtime(a)), ...` up to the top set bit of `b`, and which of them are XORed.
 */
export function gmulSteps(a: number, b: number): { steps: XtimeStep[]; product: number } {
  const steps: XtimeStep[] = [];
  let value = a & 0xff;
  for (let power = 0; b >> power; power += 1) {
    steps.push({ power, value, used: ((b >> power) & 1) === 1 });
    value = xtime(value);
  }
  return { steps, product: gmul(a, b) };
}

/**
 * The multiplicative inverse (§4.4). The nonzero bytes form a group of order 255, so
 * a^254 = a^-1. By convention the inverse of 0 is 0.
 */
export function gfInverse(a: number): number {
  let result = 1;
  let base = a & 0xff;
  let exponent = 254;
  if (base === 0) return 0;
  while (exponent) {
    if (exponent & 1) result = gmul(result, base);
    base = gmul(base, base);
    exponent >>= 1;
  }
  return result;
}
