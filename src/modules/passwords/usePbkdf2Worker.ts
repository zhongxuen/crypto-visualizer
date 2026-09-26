'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { Pbkdf2Message, Pbkdf2Request } from './pbkdf2.worker';

export type Pbkdf2JobStatus =
  'idle' | 'running' | 'done' | 'cancelled' | 'error' | 'unsupported';

export interface Pbkdf2Job {
  status: Pbkdf2JobStatus;
  done: number;
  total: number;
  dk: number[] | null;
  ms: number | null;
  error: string | null;
  start(request: Pbkdf2Request): void;
  cancel(): void;
  /** Stop anything running and forget the last result. */
  reset(): void;
}

/**
 * One cancellable PBKDF2 computation in a Web Worker. Starting again cancels the one
 * running. The worker is terminated on cancel, on restart and on unmount.
 */
export function usePbkdf2Worker(): Pbkdf2Job {
  const worker = useRef<Worker | null>(null);
  const [status, setStatus] = useState<Pbkdf2JobStatus>('idle');
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [dk, setDk] = useState<number[] | null>(null);
  const [ms, setMs] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    worker.current?.terminate();
    worker.current = null;
  }, []);

  const cancel = useCallback(() => {
    if (!worker.current) return;
    stop();
    setStatus('cancelled');
  }, [stop]);

  const reset = useCallback(() => {
    stop();
    setStatus('idle');
    setDk(null);
    setMs(null);
    setError(null);
    setProgress({ done: 0, total: 0 });
  }, [stop]);

  const start = useCallback(
    (request: Pbkdf2Request) => {
      stop();
      setDk(null);
      setMs(null);
      setError(null);
      setProgress({ done: 0, total: request.iterations * Math.ceil(request.dkLen / 32) });
      if (typeof Worker === 'undefined') {
        setStatus('unsupported');
        return;
      }
      const next = new Worker(new URL('./pbkdf2.worker.ts', import.meta.url), {
        type: 'module',
      });
      worker.current = next;
      next.onmessage = (event: MessageEvent<Pbkdf2Message>) => {
        const message = event.data;
        if (message.type === 'progress') {
          setProgress({ done: message.done, total: message.total });
        } else if (message.type === 'done') {
          setDk(message.dk);
          setMs(message.ms);
          setStatus('done');
          stop();
        } else {
          setError(message.message);
          setStatus('error');
          stop();
        }
      };
      next.postMessage(request);
      setStatus('running');
    },
    [stop],
  );

  useEffect(() => stop, [stop]);

  return { status, ...progress, dk, ms, error, start, cancel, reset };
}
