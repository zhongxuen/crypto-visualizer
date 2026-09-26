import type { EventBase } from '../events/types';

/**
 * PLACEHOLDER from phase 02. The hmac core prompt replaces this with the real
 * discriminated union of `hmac.*` events (each variant's `kind` decides its `state`).
 * Keep the exported name `HmacEvent`: `src/core/events/types.ts` joins it into
 * `CryptoEvent` and must not be edited.
 */
export type HmacEvent = EventBase & { kind: 'hmac.placeholder' };
