/**
 * Integer arithmetic for RSA on `bigint`, each with a trace the runs turn into events:
 * one row per step of the extended Euclidean algorithm and one row per exponent bit of
 * square-and-multiply.
 *
 * The functions return plain data; `keygen.ts` and `rsa.ts` decide what becomes a step.
 */

/** `a mod m` in `[0, m)`, also for negative `a`. */
export function mod(a: bigint, m: bigint): bigint {
  const r = a % m;
  return r < 0n ? r + m : r;
}

export function gcd(a: bigint, b: bigint): bigint {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y !== 0n) [x, y] = [y, x % y];
  return x;
}

export function lcm(a: bigint, b: bigint): bigint {
  return a === 0n || b === 0n ? 0n : (a / gcd(a, b)) * b;
}

/**
 * One row of the extended Euclid table. Every row keeps `r = s·a + t·b`. `q` is the
 * quotient that makes the next row (`r_next = r_prev − q·r`); the first and last rows
 * have none.
 */
export interface EgcdRow {
  q?: bigint;
  r: bigint;
  s: bigint;
  t: bigint;
}

export interface EgcdResult {
  /** gcd(a, b): the last non-zero `r`. */
  g: bigint;
  /** Bézout coefficients: `s·a + t·b = g`. */
  s: bigint;
  t: bigint;
  /** Every row, including the two starting rows and the final `r = 0`. */
  rows: EgcdRow[];
}

/**
 * The extended Euclidean algorithm (HAC §2.4.2) as a table. Starts from
 * `(r, s, t) = (a, 1, 0)` and `(b, 0, 1)`, and each new row is the row two above minus `q`
 * times the row above, until `r = 0`. For a = φ(n), b = e, `t` in the gcd row is e⁻¹
 * modulo φ(n), perhaps negative.
 */
export function egcd(a: bigint, b: bigint): EgcdResult {
  if (a < 0n || b < 0n) throw new RangeError('egcd takes non-negative integers');
  const rows: EgcdRow[] = [
    { r: a, s: 1n, t: 0n },
    { r: b, s: 0n, t: 1n },
  ];
  while (rows[rows.length - 1].r !== 0n) {
    const prev = rows[rows.length - 2];
    const cur = rows[rows.length - 1];
    const q = prev.r / cur.r;
    cur.q = q;
    rows.push({ r: prev.r - q * cur.r, s: prev.s - q * cur.s, t: prev.t - q * cur.t });
  }
  const last = rows[rows.length - 2];
  return { g: last.r, s: last.s, t: last.t, rows };
}

/** `a⁻¹ mod m`. Throws when gcd(a, m) ≠ 1, when there is no inverse. */
export function modInverse(a: bigint, m: bigint): bigint {
  if (m <= 1n) throw new RangeError('modInverse needs a modulus above 1');
  const { g, t } = egcd(m, mod(a, m));
  if (g !== 1n) throw new RangeError(`${a} has no inverse modulo ${m} (gcd ${g})`);
  return mod(t, m);
}

/** One exponent bit of left-to-right square-and-multiply. */
export interface PowRow {
  /** The bit, most significant first. */
  bit: 0 | 1;
  /** The running value before this bit. */
  before: bigint;
  /** `before² mod n`. */
  squared: bigint;
  /** `squared · base mod n` when the bit is 1, else `squared`. */
  after: bigint;
}

/**
 * `base^exp mod n`, fast path: the same left-to-right method as `modPowTrace`, four
 * exponent bits at a time (HAC §14.6.1, fixed-window exponentiation), which saves most
 * of the multiplications. Tested equal to the traced version.
 */
export function modPow(base: bigint, exp: bigint, n: bigint): bigint {
  if (n <= 0n) throw new RangeError('modPow needs a positive modulus');
  if (exp < 0n) throw new RangeError('modPow needs a non-negative exponent');
  if (n === 1n) return 0n;
  const b = mod(base, n);
  if (exp < 1n << 32n) {
    // A short exponent doesn't repay building the window table.
    let result = 1n;
    for (const bit of exp.toString(2)) {
      result = (result * result) % n;
      if (bit === '1') result = (result * b) % n;
    }
    return result;
  }
  const table = [1n, b];
  for (let i = 2; i < 16; i += 1) table.push((table[i - 1] * b) % n);
  let hex = exp.toString(16);
  let result = table[parseInt(hex[0], 16)];
  hex = hex.slice(1);
  for (const digit of hex) {
    result = (result * result) % n;
    result = (result * result) % n;
    result = (result * result) % n;
    result = (result * result) % n;
    const d = parseInt(digit, 16);
    if (d !== 0) result = (result * table[d]) % n;
  }
  return result;
}

/**
 * `base^exp mod n` by left-to-right binary exponentiation (HAC §14.6.1): for each bit of
 * the exponent from the top, square the running value, then multiply by the base if the
 * bit is 1. One row per bit. The result is the last row's `after` (1 for exp = 0).
 */
export function modPowTrace(
  base: bigint,
  exp: bigint,
  n: bigint,
): { result: bigint; rows: PowRow[] } {
  if (n <= 0n) throw new RangeError('modPow needs a positive modulus');
  if (exp < 0n) throw new RangeError('modPow needs a non-negative exponent');
  const b = mod(base, n);
  const rows: PowRow[] = [];
  let acc = mod(1n, n);
  for (const char of exp.toString(2)) {
    if (exp === 0n) break;
    const bit = char === '1' ? 1 : 0;
    const squared = (acc * acc) % n;
    const after = bit ? (squared * b) % n : squared;
    rows.push({ bit, before: acc, squared, after });
    acc = after;
  }
  return { result: acc, rows };
}

/** Number of bits in a non-negative integer (0 for 0). */
export function bitLength(x: bigint): number {
  return x === 0n ? 0 : x.toString(2).length;
}

/** The integer k-th root, rounded down: the largest r with r^k ≤ x. */
export function iroot(x: bigint, k: number): bigint {
  if (x < 0n || k < 1) throw new RangeError('iroot takes x ≥ 0 and k ≥ 1');
  if (x < 2n) return x;
  const big = BigInt(k);
  // Newton's method from above: start at a power of two over the root.
  let r = 1n << BigInt(Math.ceil(bitLength(x) / k));
  for (;;) {
    const next = ((big - 1n) * r + x / r ** (big - 1n)) / big;
    if (next >= r) return r;
    r = next;
  }
}

/** Big-endian bytes of a non-negative integer, left-padded to `length` if given. */
export function toBytes(x: bigint, length?: number): Uint8Array {
  if (x < 0n) throw new RangeError('toBytes takes a non-negative integer');
  const hex = x.toString(16);
  const bytes = Math.ceil(hex.length / 2);
  const size = length ?? Math.max(1, bytes);
  if (bytes > size) throw new RangeError(`${x} does not fit in ${size} bytes`);
  const out = new Uint8Array(size);
  const padded = hex.padStart(2 * bytes, '0');
  for (let i = 0; i < bytes; i += 1) {
    out[size - bytes + i] = parseInt(padded.slice(2 * i, 2 * i + 2), 16);
  }
  return out;
}

/** The integer a big-endian byte string stands for (OS2IP, RFC 8017 §4.2). */
export function fromBytes(bytes: Uint8Array): bigint {
  let x = 0n;
  for (const byte of bytes) x = (x << 8n) | BigInt(byte);
  return x;
}
