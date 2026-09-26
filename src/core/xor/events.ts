import type { EventBase } from '../events/types';

/**
 * PLACEHOLDER from phase 02. The xor core prompt replaces this with the real
 * discriminated union of `xor.*` events (each variant's `kind` decides its `state`).
 * Keep the exported name `XorEvent`: `src/core/events/types.ts` joins it into
 * `CryptoEvent` and must not be edited.
 */
export type XorEvent = EventBase & { kind: 'xor.placeholder' };
