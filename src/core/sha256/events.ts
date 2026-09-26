import type { EventBase } from '../events/types';

/**
 * PLACEHOLDER from phase 02. The sha256 core prompt replaces this with the real
 * discriminated union of `sha256.*` events (each variant's `kind` decides its `state`).
 * Keep the exported name `Sha256Event`: `src/core/events/types.ts` joins it into
 * `CryptoEvent` and must not be edited.
 */
export type Sha256Event = EventBase & { kind: 'sha256.placeholder' };
