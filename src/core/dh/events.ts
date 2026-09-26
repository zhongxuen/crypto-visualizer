import type { EventBase } from '../events/types';

/**
 * PLACEHOLDER from phase 02. The dh core prompt replaces this with the real
 * discriminated union of `dh.*` events (each variant's `kind` decides its `state`).
 * Keep the exported name `DhEvent`: `src/core/events/types.ts` joins it into
 * `CryptoEvent` and must not be edited.
 */
export type DhEvent = EventBase & { kind: 'dh.placeholder' };
