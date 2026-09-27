import type { EventBase } from '../events/types';
import type { MixTerm } from './round';

/**
 * The events of AES-128 and its modes (FIPS 197, SP 800-38A, SP 800-38D). Byte arrays
 * are `number[]`. A 16-byte state is in input order, which is column-major: byte
 * `r + 4c` is row r, column c (FIPS 197 §3.4). Words are unsigned 32-bit numbers, first
 * byte most significant, as the standard prints them.
 */

/** The block and key going in; the state starts as the plaintext (§3.4). */
export type AesInputEvent = EventBase & {
  kind: 'aes.input';
  plaintext: number[];
  key: number[];
  state: number[];
};

/** One word of the key schedule, w[i] (§5.2). */
export type AesKeyWordEvent = EventBase & {
  kind: 'aes.keyWord';
  i: number;
  word: number;
  /** w[i−1]; 0 for i < 4. */
  temp: number;
  /** w[i−4]; 0 for i < 4. */
  back: number;
  /** Only when i mod 4 = 0 and i ≥ 4: ROTWORD, SUBWORD, Rcon and their XOR. */
  rot?: number;
  sub?: number;
  rcon?: number;
  afterRcon?: number;
  /** w[0] to w[i]: the schedule so far. */
  words: number[];
};

/** Fields every in-round transformation shares. */
type StateChange = {
  /** 0 for the initial AddRoundKey, 1–10 for the rounds. */
  round: number;
  before: number[];
  after: number[];
  /** State indices whose byte changed. */
  changed: number[];
};

/** SUBBYTES() (§5.1.1). */
export type AesSubBytesEvent = EventBase & StateChange & { kind: 'aes.subBytes' };

/** SHIFTROWS() (§5.1.2). */
export type AesShiftRowsEvent = EventBase & StateChange & { kind: 'aes.shiftRows' };

/** MIXCOLUMNS() (§5.1.3). `terms[i]` are the four products XORed into output byte i. */
export type AesMixColumnsEvent = EventBase &
  StateChange & { kind: 'aes.mixColumns'; terms: MixTerm[][] };

/** ADDROUNDKEY() (§5.1.4), with the 16 round-key bytes. */
export type AesAddRoundKeyEvent = EventBase &
  StateChange & { kind: 'aes.addRoundKey'; roundKey: number[] };

/** The final state, read out as the ciphertext (§5.1). */
export type AesOutputEvent = EventBase & {
  kind: 'aes.output';
  state: number[];
  ciphertext: number[];
};

/** Two plaintexts one bit apart, compared after each round. */
export type AesAvalancheEvent = EventBase & {
  kind: 'aes.avalanche';
  stage: 'flip' | 'round';
  /** −1 for the flip, 0 after the initial AddRoundKey, then 1–10. */
  round: number;
  /** The flipped bit, numbered from the most significant bit of byte 0. */
  bit: number;
  stateA: number[];
  stateB: number[];
  /** State indices whose bytes differ. */
  changed: number[];
  /** How many of the 128 state bits differ. */
  flipped: number;
};

/** PKCS#7 padding (RFC 5652 §6.3). */
export type AesPadEvent = EventBase & {
  kind: 'aes.pad';
  message: number[];
  padded: number[];
  /** The number of bytes added, which is also their value. */
  padLength: number;
};

export type AesMode = 'ecb' | 'cbc' | 'ctr';

/** Choosing the IV or initial counter block before the first block (SP 800-38A). */
export type AesModeSetupEvent = EventBase & {
  kind: 'aes.modeSetup';
  mode: AesMode;
  /** The CBC IV or the CTR initial counter block; absent for ECB. */
  iv?: number[];
  blocks: number;
};

/** One block through a mode; the block cipher itself is collapsed into one call. */
export type AesModeBlockEvent = EventBase & {
  kind: 'aes.modeBlock';
  mode: AesMode;
  block: number;
  blocks: number;
  plaintext: number[];
  /** What went into CIPH_K: the plaintext (ECB), plaintext ⊕ chain (CBC), counter (CTR). */
  cipherInput: number[];
  cipherOutput: number[];
  ciphertext: number[];
  /** CBC: the IV or previous ciphertext block XORed in. */
  chain?: number[];
  /** CTR: the counter block, T_j. */
  counter?: number[];
  /** ECB: an earlier block with the same ciphertext, if any (the leak). */
  repeatOf?: number;
};

/** The whole ciphertext of a mode run. */
export type AesModeResultEvent = EventBase & {
  kind: 'aes.modeResult';
  mode: AesMode;
  ciphertext: number[];
  /** Distinct ciphertext blocks, out of `blocks`. */
  distinctBlocks: number;
  blocks: number;
};

/** The penguin bitmap encrypted with ECB and CBC. Pixels come from `penguinImages()`. */
export type AesPenguinEvent = EventBase & {
  kind: 'aes.penguin';
  stage: 'original' | 'ecb' | 'cbc';
  width: number;
  height: number;
  blocks: number;
  distinctBlocks: number;
};

/** GCM, explained but not computed in v1 (SP 800-38D). */
export type AesGcmEvent = EventBase & {
  kind: 'aes.gcm';
  stage: 'overview' | 'ctr' | 'ghash' | 'tag' | 'nonce';
};

export type AesEvent =
  | AesInputEvent
  | AesKeyWordEvent
  | AesSubBytesEvent
  | AesShiftRowsEvent
  | AesMixColumnsEvent
  | AesAddRoundKeyEvent
  | AesOutputEvent
  | AesAvalancheEvent
  | AesPadEvent
  | AesModeSetupEvent
  | AesModeBlockEvent
  | AesModeResultEvent
  | AesPenguinEvent
  | AesGcmEvent;
