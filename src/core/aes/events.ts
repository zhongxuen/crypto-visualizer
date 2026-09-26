import type { EventBase } from '../events/types';

/**
 * PLACEHOLDER from phase 02. The aes core prompt replaces this with the real
 * discriminated union of `aes.*` events (each variant's `kind` decides its `state`).
 * Keep the exported name `AesEvent`: `src/core/events/types.ts` joins it into
 * `CryptoEvent` and must not be edited.
 */
export type AesEvent = EventBase & { kind: 'aes.placeholder' };
