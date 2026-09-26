import type { EventBase } from '../events/types';

/**
 * PLACEHOLDER from phase 02. The rsa core prompt replaces this with the real
 * discriminated union of `rsa.*` events (each variant's `kind` decides its `state`).
 * Keep the exported name `RsaEvent`: `src/core/events/types.ts` joins it into
 * `CryptoEvent` and must not be edited.
 */
export type RsaEvent = EventBase & { kind: 'rsa.placeholder' };
