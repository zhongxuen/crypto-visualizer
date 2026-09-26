/**
 * Runs the full PBKDF2 iteration count off the main thread, so the page stays
 * responsive during 600,000 iterations. The maths is `pbkdf2` from `src/core/kdf`: the
 * same function the differential tests check against node:crypto. Cancelling is
 * `worker.terminate()` on the page side.
 */

import { pbkdf2 } from '@/core/kdf/pbkdf2';

export interface Pbkdf2Request {
  password: number[];
  salt: number[];
  iterations: number;
  dkLen: number;
}

export type Pbkdf2Message =
  | { type: 'progress'; done: number; total: number }
  | { type: 'done'; dk: number[]; ms: number }
  | { type: 'error'; message: string };

/** `self` is typed as a Window by the DOM lib; in a Worker, postMessage takes one argument. */
const scope = self as unknown as { postMessage(message: Pbkdf2Message): void };
const post = (message: Pbkdf2Message) => scope.postMessage(message);

self.onmessage = (event: MessageEvent<Pbkdf2Request>) => {
  const { password, salt, iterations, dkLen } = event.data;
  const started = performance.now();
  try {
    const dk = pbkdf2(
      Uint8Array.from(password),
      Uint8Array.from(salt),
      iterations,
      dkLen,
      {
        onProgress: (done, total) => post({ type: 'progress', done, total }),
        progressEvery: 5_000,
      },
    );
    post({
      type: 'done',
      dk: Array.from(dk),
      ms: Math.round(performance.now() - started),
    });
  } catch (error) {
    post({
      type: 'error',
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
