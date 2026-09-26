import { TriangleAlert } from 'lucide-react';
import Link from 'next/link';

import { cn } from '@/lib/cn';

/** On every module page: this is for learning, not for protecting anything. */
export function DisclaimerBanner({ className }: { className?: string }) {
  return (
    <aside
      aria-label="Disclaimer"
      className={cn(
        'border-warn/50 bg-surface-overlay flex items-start gap-2 rounded-md border px-3 py-2 text-sm',
        className,
      )}
    >
      <TriangleAlert aria-hidden="true" className="text-warn mt-0.5 size-4 shrink-0" />
      <p>
        <strong className="font-semibold">Built for teaching, not for security.</strong>{' '}
        Keys and randomness here are for display only.{' '}
        <Link href="/about" className="text-accent underline underline-offset-2">
          What this means
        </Link>
      </p>
    </aside>
  );
}
