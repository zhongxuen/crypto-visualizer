import type { EventBase } from '../events/types';

/**
 * PLACEHOLDER from phase 02. The kdf core prompt replaces this with the real
 * discriminated union of `kdf.*` events (each variant's `kind` decides its `state`).
 * Keep the exported name `KdfEvent`: `src/core/events/types.ts` joins it into
 * `CryptoEvent` and must not be edited.
 */
export type KdfEvent = EventBase & { kind: 'kdf.placeholder' };
