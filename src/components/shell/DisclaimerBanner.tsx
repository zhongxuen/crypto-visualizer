'use client';

import { Info } from 'lucide-react';
import Link from 'next/link';
import { useId, useState, useSyncExternalStore } from 'react';

import { cn } from '@/lib/cn';

/**
 * "For learning only": aim 4, said once and clearly (UIUX §2.1 P5).
 *
 * A chip in the module header that expands inline into the full sentence and a link to
 * /about. It opens by itself on a learner's first visit and stays closed after; the site
 * footer repeats the sentence on every page, so it is never more than a scroll away.
 *
 * Only a boolean "seen" flag is stored, under its own key, and every storage access is
 * in a try/catch (private windows and blocked storage throw).
 */

export const DISCLAIMER_SEEN_KEY = 'cv:disclaimer-seen';

/** Read once per page load: was this the first visit? Marks the disclaimer seen. */
let firstVisit: boolean | null = null;
function readFirstVisit(): boolean {
  if (firstVisit === null) {
    try {
      firstVisit = window.localStorage.getItem(DISCLAIMER_SEEN_KEY) === null;
      window.localStorage.setItem(DISCLAIMER_SEEN_KEY, '1');
    } catch {
      firstVisit = false;
    }
  }
  return firstVisit;
}

/** For tests: forget the cached first-visit answer. */
export function resetDisclaimerVisit(): void {
  firstVisit = null;
}

const noSubscribe = () => () => {};

export function DisclaimerBanner({ className }: { className?: string }) {
  const first = useSyncExternalStore(noSubscribe, readFirstVisit, () => false);
  const [choice, setChoice] = useState<boolean | null>(null);
  const open = choice ?? first;
  const id = useId();

  return (
    <aside aria-label="Disclaimer" className={cn('flex flex-col gap-1.5', className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setChoice(!open)}
        className="border-warn/60 text-fg-secondary hover:bg-surface-overlay focus-visible:outline-focus min-h-target inline-flex items-center gap-1.5 self-start rounded-full border px-3 text-sm focus-visible:outline-2 md:min-h-8"
      >
        <Info aria-hidden="true" className="text-warn size-4" />
        For learning only
      </button>
      <p
        id={id}
        hidden={!open}
        className="text-fg-secondary max-w-prose text-sm lg:max-w-xs"
      >
        <strong className="text-fg font-semibold">
          Built for teaching, not for security.
        </strong>{' '}
        Keys and randomness here are for display only: nothing on this site may be used to
        protect real data.{' '}
        <Link href="/about" className="text-accent underline underline-offset-2">
          What this means
        </Link>
      </p>
    </aside>
  );
}
