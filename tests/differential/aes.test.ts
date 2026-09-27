import { createCipheriv, createDecipheriv } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  avalancheRun,
  cbcDecrypt,
  cbcEncrypt,
  cbcRun,
  ctrCrypt,
  ctrRun,
  decryptBlock,
  ecbDecrypt,
  ecbEncrypt,
  ecbRun,
  encryptBlock,
  expandKey,
  gcmExplanationRun,
  gfInverse,
  gmul,
  INV_SBOX,
  incrementCounter,
  keyExpansionRun,
  PaddingError,
  penguinBytes,
  penguinImages,
  penguinRun,
  pkcs7Pad,
  pkcs7Unpad,
  SBOX,
  seededCounter,
  seededIv,
  xtime,
  type AesEvent,
} from '@/core/aes';
import { bytesToHex, hexToBytes } from '@/core/bytes/hex';
import { createRng } from '@/core/sim/rng';

/**
 * AES-128 in src/core/aes against FIPS 197, SP 800-38A and node:crypto.
 *
 * FIPS 197 values are from NIST FIPS 197-upd1 (2023): Table 4 (SBOX), Table 6 (INVSBOX),
 * Appendix A.1 and Appendix B. Appendix C.1 is from the 2001 edition of FIPS 197 (the 2023
 * update moved it to NIST's "examples with intermediate values"). SP 800-38A vectors are
 * from its Appendix F.
 */

const hex = (bytes: Uint8Array | number[]) => bytesToHex(Uint8Array.from(bytes));
const bytes = hexToBytes;

function randomBytes(rng: ReturnType<typeof createRng>, length: number): Uint8Array {
  return Uint8Array.from({ length }, () => rng.int(256));
}

function node(
  algorithm: 'aes-128-ecb' | 'aes-128-cbc' | 'aes-128-ctr',
  key: Uint8Array,
  iv: Uint8Array | null,
  data: Uint8Array,
  autoPadding: boolean,
): Uint8Array {
  const cipher = createCipheriv(algorithm, key, iv);
  cipher.setAutoPadding(autoPadding);
  return new Uint8Array(Buffer.concat([cipher.update(data), cipher.final()]));
}

// FIPS 197 Table 4 and Table 6, row by row (x = high nibble).
const SBOX_TABLE = [
  '637c777bf26b6fc53001672bfed7ab76',
  'ca82c97dfa5947f0add4a2af9ca472c0',
  'b7fd9326363ff7cc34a5e5f171d83115',
  '04c723c31896059a071280e2eb27b275',
  '09832c1a1b6e5aa0523bd6b329e32f84',
  '53d100ed20fcb15b6acbbe394a4c58cf',
  'd0efaafb434d338545f9027f503c9fa8',
  '51a3408f929d38f5bcb6da2110fff3d2',
  'cd0c13ec5f974417c4a77e3d645d1973',
  '60814fdc222a908846eeb814de5e0bdb',
  'e0323a0a4906245cc2d3ac629195e479',
  'e7c8376d8dd54ea96c56f4ea657aae08',
  'ba78252e1ca6b4c6e8dd741f4bbd8b8a',
  '703eb5664803f60e613557b986c11d9e',
  'e1f8981169d98e949b1e87e9ce5528df',
  '8ca1890dbfe6426841992d0fb054bb16',
].join('');

const INV_SBOX_TABLE = [
  '52096ad53036a538bf40a39e81f3d7fb',
  '7ce339829b2fff87348e4344c4dee9cb',
  '547b9432a6c2233dee4c950b42fac34e',
  '082ea16628d924b2765ba2496d8bd125',
  '72f8f66486689816d4a45ccc5d65b692',
  '6c704850fdedb9da5e154657a78d9d84',
  '90d8ab008cbcd30af7e45805b8b34506',
  'd02c1e8fca3f0f02c1afbd0301138a6b',
  '3a9111414f67dcea97f2cfcef0b4e673',
  '96ac7422e7ad3585e2f937e81c75df6e',
  '47f11a711d29c5896fb7620eaa18be1b',
  'fc563e4bc6d279209adbc0fe78cd5af4',
  '1fdda8338807c731b11210592780ec5f',
  '60517fa919b54a0d2de57a9f93c99cef',
  'a0e03b4dae2af5b0c8ebbb3c83539961',
  '172b047eba77d626e169146355210c7d',
].join('');

describe('GF(2^8) and the S-box (FIPS 197 §4, §5.1.1)', () => {
  it('xtime and multiplication match the §4.2 example: {57} • {13} = {fe}', () => {
    expect([xtime(0x57), xtime(0xae), xtime(0x47), xtime(0x8e)]).toEqual([
      0xae, 0x47, 0x8e, 0x07,
    ]);
    expect(gmul(0x57, 0x13)).toBe(0xfe);
    expect(gmul(0x57, 0x83)).toBe(0xc1);
  });

  it('every nonzero byte times its inverse is 1 (§4.4)', () => {
    for (let a = 1; a < 256; a += 1) expect(gmul(a, gfInverse(a))).toBe(1);
    expect(gfInverse(0)).toBe(0);
  });

  it('the computed S-box equals Table 4', () => {
    expect(hex(SBOX)).toBe(SBOX_TABLE);
  });

  it('the computed inverse S-box equals Table 6', () => {
    expect(hex(INV_SBOX)).toBe(INV_SBOX_TABLE);
  });
});

// FIPS 197 Appendix A.1: w[i] for i = 0..43.
const A1_KEY = '2b7e151628aed2a6abf7158809cf4f3c';
const A1_WORDS = [
  '2b7e1516', '28aed2a6', 'abf71588', '09cf4f3c', 'a0fafe17', '88542cb1', '23a33939',
  '2a6c7605', 'f2c295f2', '7a96b943', '5935807a', '7359f67f', '3d80477d', '4716fe3e',
  '1e237e44', '6d7a883b', 'ef44a541', 'a8525b7f', 'b671253b', 'db0bad00', 'd4d1c6f8',
  '7c839d87', 'caf2b8bc', '11f915bc', '6d88a37a', '110b3efd', 'dbf98641', 'ca0093fd',
  '4e54f70e', '5f5fc9f3', '84a64fb2', '4ea6dc4f', 'ead27321', 'b58dbad2', '312bf560',
  '7f8d292f', 'ac7766f3', '19fadc21', '28d12941', '575c006e', 'd014f9a8', 'c9ee2589',
  'e13f0cc8', 'b6630ca6',
]; // prettier-ignore

// Appendix A.1, the rows with i mod 4 = 0: After RotWord, After SubWord, Rcon, After XOR.
const A1_TWISTS: Record<number, [string, string, string, string]> = {
  4: ['cf4f3c09', '8a84eb01', '01000000', '8b84eb01'],
  8: ['6c76052a', '50386be5', '02000000', '52386be5'],
  12: ['59f67f73', 'cb42d28f', '04000000', 'cf42d28f'],
  16: ['7a883b6d', 'dac4e23c', '08000000', 'd2c4e23c'],
  20: ['0bad00db', '2b9563b9', '10000000', '3b9563b9'],
  24: ['f915bc11', '99596582', '20000000', 'b9596582'],
  28: ['0093fdca', '63dc5474', '40000000', '23dc5474'],
  32: ['a6dc4f4e', '2486842f', '80000000', 'a486842f'],
  36: ['8d292f7f', '5da515d2', '1b000000', '46a515d2'],
  40: ['5c006e57', '4a639f5b', '36000000', '7c639f5b'],
};

const word = (w: number) => w.toString(16).padStart(8, '0');

describe('FIPS 197 Appendix A.1: key expansion', () => {
  it('expandKey produces w0..w43', () => {
    expect(Array.from(expandKey(bytes(A1_KEY)), word)).toEqual(A1_WORDS);
  });

  it('the stepped run matches every word and every RotWord / SubWord / Rcon step', () => {
    const events = keyExpansionRun(bytes(A1_KEY)).events;
    expect(events).toHaveLength(44);
    for (const event of events) {
      if (event.kind !== 'aes.keyWord') throw new Error(`unexpected ${event.kind}`);
      expect(word(event.word)).toBe(A1_WORDS[event.i]);
      expect(event.words.map(word)).toEqual(A1_WORDS.slice(0, event.i + 1));
      if (event.i >= 4) {
        expect(word(event.temp)).toBe(A1_WORDS[event.i - 1]);
        expect(word(event.back)).toBe(A1_WORDS[event.i - 4]);
      }
      const twist = A1_TWISTS[event.i];
      if (twist) {
        expect(
          [event.rot, event.sub, event.rcon, event.afterRcon].map((w) => word(w ?? -1)),
        ).toEqual(twist);
      } else {
        expect(event.rot).toBeUndefined();
      }
    }
  });
});

interface RoundValues {
  start: string;
  subBytes: string;
  shiftRows: string;
  mixColumns?: string;
  roundKey: string;
}

// FIPS 197 Appendix B, transcribed from the 4×4 grids column by column (state order).
const B_KEY = A1_KEY;
const B_INPUT = '3243f6a8885a308d313198a2e0370734';
const B_ROUND0_KEY = A1_KEY;
const B_ROUNDS: RoundValues[] = [
  { start: '193de3bea0f4e22b9ac68d2ae9f84808', subBytes: 'd42711aee0bf98f1b8b45de51e415230', shiftRows: 'd4bf5d30e0b452aeb84111f11e2798e5', mixColumns: '046681e5e0cb199a48f8d37a2806264c', roundKey: 'a0fafe1788542cb123a339392a6c7605' },
  { start: 'a49c7ff2689f352b6b5bea43026a5049', subBytes: '49ded28945db96f17f39871a7702533b', shiftRows: '49db873b453953897f02d2f177de961a', mixColumns: '584dcaf11b4b5aacdbe7caa81b6bb0e5', roundKey: 'f2c295f27a96b9435935807a7359f67f' },
  { start: 'aa8f5f0361dde3ef82d24ad26832469a', subBytes: 'ac73cf7befc111df13b5d6b545235ab8', shiftRows: 'acc1d6b8efb55a7b1323cfdf457311b5', mixColumns: '75ec0993200b633353c0cf7cbb25d0dc', roundKey: '3d80477d4716fe3e1e237e446d7a883b' },
  { start: '486c4eee671d9d0d4de3b138d65f58e7', subBytes: '52502f2885a45ed7e311c807f6cf6a94', shiftRows: '52a4c89485116a28e3cf2fd7f6505e07', mixColumns: '0fd6daa9603138bf6fc0106b5eb31301', roundKey: 'ef44a541a8525b7fb671253bdb0bad00' },
  { start: 'e0927fe8c86363c0d9b1355085b8be01', subBytes: 'e14fd29be8fbfbba35c89653976cae7c', shiftRows: 'e1fb967ce8c8ae9b356cd2ba974ffb53', mixColumns: '25d1a9adbd11d168b63a338e4c4cc0b0', roundKey: 'd4d1c6f87c839d87caf2b8bc11f915bc' },
  { start: 'f1006f55c1924cef7cc88b325db5d50c', subBytes: 'a163a8fc784f29df10e83d234cd503fe', shiftRows: 'a14f3dfe78e803fc10d5a8df4c632923', mixColumns: '4b868d6d2c4a8980339df4e837d218d8', roundKey: '6d88a37a110b3efddbf98641ca0093fd' },
  { start: '260e2e173d41b77de86472a9fdd28b25', subBytes: 'f7ab31f02783a9ff9b4340d354b53d3f', shiftRows: 'f783403f27433df09bb531ff54aba9d3', mixColumns: '1415b5bf461615ec274656d7342ad843', roundKey: '4e54f70e5f5fc9f384a64fb24ea6dc4f' },
  { start: '5a4142b11949dc1fa3e019657a8c040c', subBytes: 'be832cc8d43b86c00ae1d44dda64f2fe', shiftRows: 'be3bd4fed4e1f2c80a642cc0da83864d', mixColumns: '00512fd1b1c889ff54766dcdfa1b99ea', roundKey: 'ead27321b58dbad2312bf5607f8d292f' },
  { start: 'ea835cf00445332d655d98ad8596b0c5', subBytes: '87ec4a8cf26ec3d84d4c46959790e7a6', shiftRows: '876e46a6f24ce78c4d904ad897ecc395', mixColumns: '473794ed40d4e4a5a3703aa64c9f42bc', roundKey: 'ac7766f319fadc2128d12941575c006e' },
  { start: 'eb40f21e592e38848ba113e71bc342d2', subBytes: 'e9098972cb31075f3d327d94af2e2cb5', shiftRows: 'e9317db5cb322c723d2e895faf090794', roundKey: 'd014f9a8c9ee2589e13f0cc8b6630ca6' },
]; // prettier-ignore
const B_OUTPUT = '3925841d02dc09fbdc118597196a0b32';

// FIPS 197 (2001) Appendix C.1, round[r].start / s_box / s_row / m_col / k_sch.
const C1_KEY = '000102030405060708090a0b0c0d0e0f';
const C1_INPUT = '00112233445566778899aabbccddeeff';
const C1_ROUND0_KEY = C1_KEY;
const C1_ROUNDS: RoundValues[] = [
  { start: '00102030405060708090a0b0c0d0e0f0', subBytes: '63cab7040953d051cd60e0e7ba70e18c', shiftRows: '6353e08c0960e104cd70b751bacad0e7', mixColumns: '5f72641557f5bc92f7be3b291db9f91a', roundKey: 'd6aa74fdd2af72fadaa678f1d6ab76fe' },
  { start: '89d810e8855ace682d1843d8cb128fe4', subBytes: 'a761ca9b97be8b45d8ad1a611fc97369', shiftRows: 'a7be1a6997ad739bd8c9ca451f618b61', mixColumns: 'ff87968431d86a51645151fa773ad009', roundKey: 'b692cf0b643dbdf1be9bc5006830b3fe' },
  { start: '4915598f55e5d7a0daca94fa1f0a63f7', subBytes: '3b59cb73fcd90ee05774222dc067fb68', shiftRows: '3bd92268fc74fb735767cbe0c0590e2d', mixColumns: '4c9c1e66f771f0762c3f868e534df256', roundKey: 'b6ff744ed2c2c9bf6c590cbf0469bf41' },
  { start: 'fa636a2825b339c940668a3157244d17', subBytes: '2dfb02343f6d12dd09337ec75b36e3f0', shiftRows: '2d6d7ef03f33e334093602dd5bfb12c7', mixColumns: '6385b79ffc538df997be478e7547d691', roundKey: '47f7f7bc95353e03f96c32bcfd058dfd' },
  { start: '247240236966b3fa6ed2753288425b6c', subBytes: '36400926f9336d2d9fb59d23c42c3950', shiftRows: '36339d50f9b539269f2c092dc4406d23', mixColumns: 'f4bcd45432e554d075f1d6c51dd03b3c', roundKey: '3caaa3e8a99f9deb50f3af57adf622aa' },
  { start: 'c81677bc9b7ac93b25027992b0261996', subBytes: 'e847f56514dadde23f77b64fe7f7d490', shiftRows: 'e8dab6901477d4653ff7f5e2e747dd4f', mixColumns: '9816ee7400f87f556b2c049c8e5ad036', roundKey: '5e390f7df7a69296a7553dc10aa31f6b' },
  { start: 'c62fe109f75eedc3cc79395d84f9cf5d', subBytes: 'b415f8016858552e4bb6124c5f998a4c', shiftRows: 'b458124c68b68a014b99f82e5f15554c', mixColumns: 'c57e1c159a9bd286f05f4be098c63439', roundKey: '14f9701ae35fe28c440adf4d4ea9c026' },
  { start: 'd1876c0f79c4300ab45594add66ff41f', subBytes: '3e175076b61c04678dfc2295f6a8bfc0', shiftRows: '3e1c22c0b6fcbf768da85067f6170495', mixColumns: 'baa03de7a1f9b56ed5512cba5f414d23', roundKey: '47438735a41c65b9e016baf4aebf7ad2' },
  { start: 'fde3bad205e5d0d73547964ef1fe37f1', subBytes: '5411f4b56bd9700e96a0902fa1bb9aa1', shiftRows: '54d990a16ba09ab596bbf40ea111702f', mixColumns: 'e9f74eec023020f61bf2ccf2353c21c7', roundKey: '549932d1f08557681093ed9cbe2c974e' },
  { start: 'bd6e7c3df2b5779e0b61216e8b10b689', subBytes: '7a9f102789d5f50b2beffd9f3dca4ea7', shiftRows: '7ad5fda789ef4e272bca100b3d9ff59f', roundKey: '13111d7fe3944a17f307a78b4d2b30c5' },
]; // prettier-ignore
const C1_OUTPUT = '69c4e0d86a7b0430d8cdb78070b4c55a';

/** Check a stepped run against a published round-by-round table, step by step. */
function expectMatchesTable(
  events: readonly AesEvent[],
  input: string,
  round0Key: string,
  rounds: RoundValues[],
  output: string,
): void {
  const expected: [AesEvent['kind'], string, string, string?][] = [];
  const ark0After = hex(bytes(input).map((b, i) => b ^ bytes(round0Key)[i]));
  expected.push(['aes.addRoundKey', input, ark0After, round0Key]);
  rounds.forEach((r, index) => {
    const round = index + 1;
    const after = round < rounds.length ? rounds[round].start : output;
    expected.push(['aes.subBytes', r.start, r.subBytes]);
    expected.push(['aes.shiftRows', r.subBytes, r.shiftRows]);
    if (r.mixColumns) {
      expected.push(['aes.mixColumns', r.shiftRows, r.mixColumns]);
      expected.push(['aes.addRoundKey', r.mixColumns, after, r.roundKey]);
    } else {
      expected.push(['aes.addRoundKey', r.shiftRows, after, r.roundKey]);
    }
  });
  expect(ark0After).toBe(rounds[0].start);

  const [first, ...rest] = events;
  const last = rest.pop();
  expect(first.kind).toBe('aes.input');
  expect(last?.kind).toBe('aes.output');
  if (last?.kind === 'aes.output') expect(hex(last.ciphertext)).toBe(output);

  expect(rest).toHaveLength(40);
  rest.forEach((event, i) => {
    const [kind, before, after, roundKey] = expected[i];
    expect(event.kind, `step ${i}`).toBe(kind);
    if (!('before' in event)) throw new Error(`step ${i} has no state`);
    expect(hex(event.before), `${event.id} before`).toBe(before);
    expect(hex(event.after), `${event.id} after`).toBe(after);
    const changed = event.before.flatMap((b, j) => (b === event.after[j] ? [] : [j]));
    expect(event.changed).toEqual(changed);
    if (event.kind === 'aes.addRoundKey') expect(hex(event.roundKey)).toBe(roundKey);
    if (event.kind === 'aes.mixColumns') {
      // The GF(2^8) working XORs to each output byte.
      event.terms.forEach((terms, j) => {
        expect(terms.reduce((x, t) => x ^ t.product, 0)).toBe(event.after[j]);
        for (const t of terms) expect(t.product).toBe(gmul(t.coefficient, t.input));
      });
    }
  });
}

describe('FIPS 197 cipher examples, compared per step', () => {
  it('Appendix B', () => {
    const { ciphertext, result } = encryptBlock(bytes(B_KEY), bytes(B_INPUT), {
      emit: true,
    });
    expect(hex(ciphertext)).toBe(B_OUTPUT);
    expectMatchesTable(result.events, B_INPUT, B_ROUND0_KEY, B_ROUNDS, B_OUTPUT);
  });

  it('Appendix C.1 (AES-128)', () => {
    const { ciphertext, result } = encryptBlock(bytes(C1_KEY), bytes(C1_INPUT), {
      emit: true,
    });
    expect(hex(ciphertext)).toBe(C1_OUTPUT);
    expectMatchesTable(result.events, C1_INPUT, C1_ROUND0_KEY, C1_ROUNDS, C1_OUTPUT);
  });

  it('the fast path and the inverse cipher agree with C.1', () => {
    expect(hex(encryptBlock(bytes(C1_KEY), bytes(C1_INPUT)))).toBe(C1_OUTPUT);
    expect(hex(decryptBlock(bytes(C1_KEY), bytes(C1_OUTPUT)))).toBe(C1_INPUT);
    expect(hex(decryptBlock(bytes(B_KEY), bytes(B_OUTPUT)))).toBe(B_INPUT);
  });

  it('the stepped run is grouped by round', () => {
    const { result } = encryptBlock(bytes(C1_KEY), bytes(C1_INPUT), { emit: true });
    expect(result.phases.map((p) => p.id)).toEqual([
      'input',
      ...Array.from({ length: 11 }, (_, r) => `round-${r}`),
      'output',
    ]);
    expect(result.events).toHaveLength(42);
  });
});

// SP 800-38A Appendix F: AES-128, four blocks.
const F_KEY = '2b7e151628aed2a6abf7158809cf4f3c';
const F_PLAINTEXT =
  '6bc1bee22e409f96e93d7e117393172a' +
  'ae2d8a571e03ac9c9eb76fac45af8e51' +
  '30c81c46a35ce411e5fbc1191a0a52ef' +
  'f69f2445df4f9b17ad2b417be66c3710';

describe('SP 800-38A Appendix F', () => {
  it('F.1.1 ECB-AES128.Encrypt', () => {
    const expected =
      '3ad77bb40d7a3660a89ecaf32466ef97' +
      'f5d3d58503b9699de785895a96fdbaaf' +
      '43b1cd7f598ece23881b00e3ed030688' +
      '7b0c785e27e8ad3f8223207104725dd4';
    const c = ecbEncrypt(bytes(F_KEY), bytes(F_PLAINTEXT), { padding: false });
    expect(hex(c)).toBe(expected);
    expect(hex(ecbDecrypt(bytes(F_KEY), c, { padding: false }))).toBe(F_PLAINTEXT);
  });

  it('F.2.1 CBC-AES128.Encrypt', () => {
    const iv = bytes('000102030405060708090a0b0c0d0e0f');
    const expected =
      '7649abac8119b246cee98e9b12e9197d' +
      '5086cb9b507219ee95db113a917678b2' +
      '73bed6b8e3c1743b7116e69e22229516' +
      '3ff1caa1681fac09120eca307586e1a7';
    const inputBlocks: string[] = [];
    const c = cbcEncrypt(bytes(F_KEY), iv, bytes(F_PLAINTEXT), { padding: false }, (b) =>
      inputBlocks.push(hex(b.cipherInput)),
    );
    expect(hex(c)).toBe(expected);
    // The "Input Block" lines of F.2.1: P_j ⊕ C_(j−1).
    expect(inputBlocks.slice(0, 3)).toEqual([
      '6bc0bce12a459991e134741a7f9e1925',
      'd86421fb9f1a1eda505ee1375746972c',
      '604ed7ddf32efdff7020d0238b7c2a5d',
    ]);
    expect(hex(cbcDecrypt(bytes(F_KEY), iv, c, { padding: false }))).toBe(F_PLAINTEXT);
  });

  it('F.5.1 CTR-AES128.Encrypt', () => {
    const counter = bytes('f0f1f2f3f4f5f6f7f8f9fafbfcfdfeff');
    const expected =
      '874d6191b620e3261bef6864990db6ce' +
      '9806f66b7970fdff8617187bb9fffdff' +
      '5ae4df3edbd5d35e5b4f09020db03eab' +
      '1e031dda2fbe03d1792170a0f3009cee';
    const counters: string[] = [];
    const outputs: string[] = [];
    const c = ctrCrypt(bytes(F_KEY), counter, bytes(F_PLAINTEXT), (b) => {
      counters.push(hex(b.counter ?? []));
      outputs.push(hex(b.cipherOutput));
    });
    expect(hex(c)).toBe(expected);
    expect(counters).toEqual([
      'f0f1f2f3f4f5f6f7f8f9fafbfcfdfeff',
      'f0f1f2f3f4f5f6f7f8f9fafbfcfdff00',
      'f0f1f2f3f4f5f6f7f8f9fafbfcfdff01',
      'f0f1f2f3f4f5f6f7f8f9fafbfcfdff02',
    ]);
    expect(outputs[0]).toBe('ec8cdf7398607cb0f2d21675ea9ea1e4');
    expect(outputs[3]).toBe('e89c399ff0f198c6d40a31db156cabfe');
    expect(hex(ctrCrypt(bytes(F_KEY), counter, c))).toBe(F_PLAINTEXT);
  });
});

describe('node:crypto createCipheriv on 1,000 seeded cases', () => {
  const rng = createRng('aes-differential');
  const cases = Array.from({ length: 1000 }, () => ({
    key: randomBytes(rng, 16),
    iv: randomBytes(rng, 16),
    blocks: randomBytes(rng, 16 * (1 + rng.int(4))),
    message: randomBytes(rng, rng.int(70)),
  }));

  it('aes-128-ecb, one block and several (auto-padding off)', () => {
    for (const { key, blocks } of cases) {
      const block = blocks.subarray(0, 16);
      expect(hex(encryptBlock(key, block))).toBe(
        hex(node('aes-128-ecb', key, null, block, false)),
      );
      expect(hex(ecbEncrypt(key, blocks, { padding: false }))).toBe(
        hex(node('aes-128-ecb', key, null, blocks, false)),
      );
    }
  });

  it('aes-128-cbc (auto-padding off)', () => {
    for (const { key, iv, blocks } of cases) {
      expect(hex(cbcEncrypt(key, iv, blocks, { padding: false }))).toBe(
        hex(node('aes-128-cbc', key, iv, blocks, false)),
      );
    }
  });

  it('aes-128-ctr, any length, including a counter that wraps', () => {
    for (const { key, iv, message } of cases) {
      expect(hex(ctrCrypt(key, iv, message))).toBe(
        hex(node('aes-128-ctr', key, iv, message, false)),
      );
    }
    const key = cases[0].key;
    const wrap = bytes('ffffffffffffffffffffffffffffffff');
    const data = new Uint8Array(48);
    expect(hex(ctrCrypt(key, wrap, data))).toBe(
      hex(node('aes-128-ctr', key, wrap, data, false)),
    );
  });

  it('PKCS#7: ECB and CBC with padding match auto-padding on', () => {
    for (const { key, iv, message } of cases) {
      expect(hex(ecbEncrypt(key, message))).toBe(
        hex(node('aes-128-ecb', key, null, message, true)),
      );
      expect(hex(cbcEncrypt(key, iv, message))).toBe(
        hex(node('aes-128-cbc', key, iv, message, true)),
      );
    }
  });

  it('decryption matches createDecipheriv', () => {
    for (const { key, iv, message } of cases.slice(0, 200)) {
      const c = node('aes-128-cbc', key, iv, message, true);
      const decipher = createDecipheriv('aes-128-cbc', key, iv);
      const expected = Buffer.concat([decipher.update(c), decipher.final()]);
      expect(hex(cbcDecrypt(key, iv, c))).toBe(hex(new Uint8Array(expected)));
    }
  });
});

describe('encrypt then decrypt is the identity', () => {
  const rng = createRng('aes-identity');
  const cases = Array.from({ length: 100 }, () => ({
    key: randomBytes(rng, 16),
    iv: randomBytes(rng, 16),
    message: randomBytes(rng, rng.int(100)),
  }));

  it('the block cipher', () => {
    for (const { key, iv } of cases)
      expect(hex(decryptBlock(key, encryptBlock(key, iv)))).toBe(hex(iv));
  });

  it('ECB', () => {
    for (const { key, message } of cases) {
      expect(hex(ecbDecrypt(key, ecbEncrypt(key, message)))).toBe(hex(message));
    }
  });

  it('CBC', () => {
    for (const { key, iv, message } of cases) {
      expect(hex(cbcDecrypt(key, iv, cbcEncrypt(key, iv, message)))).toBe(hex(message));
    }
  });

  it('CTR', () => {
    for (const { key, iv, message } of cases) {
      expect(hex(ctrCrypt(key, iv, ctrCrypt(key, iv, message)))).toBe(hex(message));
    }
  });

  it('the stepped mode runs produce the fast-path ciphertext', () => {
    const { key, message } = cases[1];
    const short = message.subarray(0, 60);
    const resultOf = (events: readonly AesEvent[]) => {
      const last = events[events.length - 1];
      if (last.kind !== 'aes.modeResult') throw new Error('no result');
      return hex(last.ciphertext);
    };
    expect(resultOf(ecbRun(key, short).events)).toBe(hex(ecbEncrypt(key, short)));
    expect(resultOf(cbcRun(key, short, 3).events)).toBe(
      hex(cbcEncrypt(key, seededIv(3), short)),
    );
    expect(resultOf(ctrRun(key, short, 3).events)).toBe(
      hex(ctrCrypt(key, seededCounter(3), short)),
    );
  });
});

describe('PKCS#7 (RFC 5652 §6.3)', () => {
  it('pads 1 to 16 bytes and removes them', () => {
    for (let n = 0; n <= 33; n += 1) {
      const m = new Uint8Array(n).fill(0xaa);
      const padded = pkcs7Pad(m);
      const added = 16 - (n % 16);
      expect(padded.length).toBe(n + added);
      expect(Array.from(padded.subarray(n))).toEqual(new Array(added).fill(added));
      expect(hex(pkcs7Unpad(padded))).toBe(hex(m));
    }
  });

  it('rejects bad padding', () => {
    const bad = [
      new Uint8Array(0),
      new Uint8Array(15).fill(1),
      new Uint8Array(16),
      new Uint8Array(16).fill(17),
      Uint8Array.from([...new Array(13).fill(0), 2, 3, 3]),
    ];
    for (const b of bad) expect(() => pkcs7Unpad(b)).toThrow(PaddingError);
  });
});

describe('avalanche, penguin, GCM and counters', () => {
  it('one plaintext bit reaches about half the state by round 3', () => {
    const events = avalancheRun(bytes(C1_KEY), bytes(C1_INPUT), 0).events;
    const rounds = events.filter(
      (e) => e.kind === 'aes.avalanche' && e.stage === 'round',
    );
    const flipped = rounds.map((e) => (e.kind === 'aes.avalanche' ? e.flipped : -1));
    expect(flipped[0]).toBe(1);
    expect(flipped[3]).toBeGreaterThan(40);
    expect(flipped[10]).toBeGreaterThan(40);
    const last = rounds[10];
    if (last.kind === 'aes.avalanche') {
      expect(hex(last.stateA)).toBe(C1_OUTPUT);
    }
  });

  it('ECB keeps the penguin (repeated blocks); CBC does not', () => {
    const key = bytes(C1_KEY);
    const images = penguinImages(key, 1);
    const blocks = penguinBytes().length / 16;
    const distinct = (b: Uint8Array) =>
      new Set(
        Array.from({ length: b.length / 16 }, (_, i) =>
          hex(b.subarray(16 * i, 16 * i + 16)),
        ),
      ).size;
    expect(distinct(images.ecbCiphertext)).toBe(distinct(penguinBytes()));
    expect(distinct(images.ecbCiphertext)).toBeLessThan(blocks / 4);
    expect(distinct(images.cbcCiphertext)).toBe(blocks);
    expect(images.ecb.length).toBe(64 * 64 * 4);
    expect(penguinRun(key, 1).events.map((e) => e.kind)).toEqual([
      'aes.penguin',
      'aes.penguin',
      'aes.penguin',
    ]);
  });

  it('ECB runs flag the repeated block', () => {
    const text = new Uint8Array(32).fill(0x41);
    const events = ecbRun(bytes(C1_KEY), text).events;
    const second = events.find((e) => e.id === 'aes.ecb.b1');
    expect(second?.kind === 'aes.modeBlock' && second.repeatOf).toBe(0);
  });

  it('the GCM explanation is steps without values', () => {
    const events = gcmExplanationRun().events;
    expect(events.map((e) => (e.kind === 'aes.gcm' ? e.stage : ''))).toEqual([
      'overview',
      'ctr',
      'ghash',
      'tag',
      'nonce',
    ]);
  });

  it('the counter increments as a 128-bit big-endian integer', () => {
    expect(hex(incrementCounter(bytes('000000000000000000000000000000ff')))).toBe(
      '00000000000000000000000000000100',
    );
    expect(hex(incrementCounter(bytes('ffffffffffffffffffffffffffffffff')))).toBe(
      '00000000000000000000000000000000',
    );
  });
});
