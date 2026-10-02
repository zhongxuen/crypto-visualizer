'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { Pbkdf2Message, Pbkdf2Request } from './pbkdf2.worker';

export type Pbkdf2JobStatus =
  'idle' | 'running' | 'done' | 'cancelled' | 'error' | 'unsupported';

export interface Pbkdf2Job {
  status: Pbkdf2JobStatus;
  done: number;
  total: number;
  /**
   * Wall-clock milliseconds since the job started, as of the last progress report: with
   * `done`, the page's own measured speed (time per iteration, and so per guess).
   */
  elapsed: number;
  dk: number[] | null;
  ms: number | null;
  error: string | null;
  start(request: Pbkdf2Request): void;
  cancel(): void;
  /** Stop anything running and forget the last result. */
  reset(): void;
}

/**
 * The page re-renders for progress at most this often (10 Hz). The Worker reports every
 * 5,000 iterations, which on a fast machine is hundreds of messages a second; the latest
 * one is kept and shown on the next tick, so the odometer moves smoothly without a
 * render per message.
 */
export const PROGRESS_INTERVAL_MS = 100;

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/**
 * One cancellable PBKDF2 computation in a Web Worker. Starting again cancels the one
 * running. The worker is terminated on cancel, on restart and on unmount.
 */
export function usePbkdf2Worker(): Pbkdf2Job {
  const worker = useRef<Worker | null>(null);
  const started = useRef(0);
  const latest = useRef<{ done: number; total: number; elapsed: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [status, setStatus] = useState<Pbkdf2JobStatus>('idle');
  const [progress, setProgress] = useState({ done: 0, total: 0, elapsed: 0 });
  const [dk, setDk] = useState<number[] | null>(null);
  const [ms, setMs] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clearTimer = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    latest.current = null;
  }, []);

  const stop = useCallback(() => {
    worker.current?.terminate();
    worker.current = null;
    clearTimer();
  }, [clearTimer]);

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
    setProgress({ done: 0, total: 0, elapsed: 0 });
  }, [stop]);

  const start = useCallback(
    (request: Pbkdf2Request) => {
      stop();
      setDk(null);
      setMs(null);
      setError(null);
      const total = request.iterations * Math.ceil(request.dkLen / 32);
      setProgress({ done: 0, total, elapsed: 0 });
      if (typeof Worker === 'undefined') {
        setStatus('unsupported');
        return;
      }
      const next = new Worker(new URL('./pbkdf2.worker.ts', import.meta.url), {
        type: 'module',
      });
      worker.current = next;
      started.current = now();
      next.onmessage = (event: MessageEvent<Pbkdf2Message>) => {
        const message = event.data;
        if (message.type === 'progress') {
          latest.current = {
            done: message.done,
            total: message.total,
            elapsed: now() - started.current,
          };
          timer.current ??= setTimeout(() => {
            timer.current = null;
            if (latest.current) setProgress(latest.current);
          }, PROGRESS_INTERVAL_MS);
        } else if (message.type === 'done') {
          stop();
          setProgress({ done: total, total, elapsed: message.ms });
          setDk(message.dk);
          setMs(message.ms);
          setStatus('done');
        } else {
          stop();
          setError(message.message);
          setStatus('error');
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
