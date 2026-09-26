/**
 * `CryptoEvent` -- the shared contract between every algorithm core and the UI.
 *
 * A discriminated union: each variant's `kind` decides the shape of the rest of the
 * event, so a module's renderer is type-checked against exactly the events its algorithm
 * emits. Each algorithm declares its own variants in `src/core/<algo>/events.ts`, and they
 * are joined here.
 *
 * DO NOT EDIT after phase 02. Algorithms change their own `events.ts`, never this file.
 * If a change here seems necessary, stop and report it (CLAUDE.md, parallel-agent rules).
 */

import type { AesEvent } from '../aes/events';
import type { CitationId } from '../citations/types';
import type { DhEvent } from '../dh/events';
import type { HmacEvent } from '../hmac/events';
import type { KdfEvent } from '../kdf/events';
import type { RsaEvent } from '../rsa/events';
import type { Sha256Event } from '../sha256/events';
import type { XorEvent } from '../xor/events';

/** Fields every event carries, whatever its algorithm. */
export interface EventBase {
  /** Stable within a run: `${algo}.${phase}.${index}`. Safe to use in a test or a URL. */
  id: string;
  /** One short sentence, plain language. */
  label: string;
  /** Optional longer explanation. */
  detail?: string;
  /** Must resolve in the citation registry (`tests/citations.test.ts`). */
  citation: CitationId;
  /** For the phase stepper, e.g. `'Round 3'`. Set by `createRun().group(...)`. */
  group?: string;
}

export type CryptoEvent =
  XorEvent | Sha256Event | HmacEvent | KdfEvent | AesEvent | RsaEvent | DhEvent;

export type CryptoEventKind = CryptoEvent['kind'];

/** The events of one kind, e.g. `EventOfKind<'aes.subBytes'>`. */
export type EventOfKind<K extends CryptoEventKind> = Extract<CryptoEvent, { kind: K }>;
