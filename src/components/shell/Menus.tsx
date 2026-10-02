'use client';

import { ChevronDown, MoreHorizontal, type LucideIcon } from 'lucide-react';
import { useCallback, useId, useRef, useState, type ReactNode } from 'react';

import { cn } from '@/lib/cn';

import { useDismiss } from './useDismiss';

/**
 * A disclosure menu: a button that shows and hides a small panel under it. Not an ARIA
 * `menu` (whose arrow-key contract the contents wouldn't keep): a labelled button with
 * `aria-expanded`, a panel in normal tab order after it, closed by Escape, by a press
 * outside, or by `close` from inside.
 */
export function Disclosure({
  label,
  icon: Icon,
  showLabel = true,
  align = 'end',
  bare = false,
  panel = 'dropdown',
  className,
  children,
}: {
  label: string;
  icon?: LucideIcon;
  /** Print the label beside the icon (it is always the accessible name). */
  showLabel?: boolean;
  align?: 'start' | 'end';
  /** A borderless button, for the header. */
  bare?: boolean;
  /**
   * `dropdown`: under the button. `wide`: the same, wider. `sheet`: across the viewport
   * under the 56 px header (the phone menu).
   */
  panel?: 'dropdown' | 'wide' | 'sheet';
  className?: string;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const id = useId();
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, root, button);

  return (
    <div ref={root} className={cn('relative', className)}>
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        aria-label={showLabel ? undefined : label}
        title={showLabel ? undefined : label}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'text-fg hover:bg-surface-overlay focus-visible:outline-focus min-h-target min-w-target inline-flex items-center justify-center gap-1.5 rounded-md border px-2.5 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 md:min-h-9 md:min-w-9',
          bare ? 'border-transparent' : 'border-border bg-surface',
        )}
      >
        {Icon ? <Icon aria-hidden="true" className="size-4" /> : null}
        {showLabel ? (
          <>
            {label}
            <ChevronDown
              aria-hidden="true"
              className={cn('size-3.5 transition-transform', open && 'rotate-180')}
            />
          </>
        ) : null}
      </button>
      <div
        id={id}
        hidden={!open}
        className={cn(
          'border-border bg-surface motion-reveal z-40 rounded-lg border p-2 shadow-lg',
          panel === 'sheet'
            ? 'fixed inset-x-2 top-14 max-h-[calc(100vh-4rem)] overflow-y-auto'
            : 'absolute top-full mt-1.5',
          panel === 'dropdown' && 'min-w-56',
          panel === 'wide' && 'min-w-72',
          panel !== 'sheet' && (align === 'end' ? 'right-0' : 'left-0'),
        )}
      >
        {open ? children(close) : null}
      </div>
    </div>
  );
}

/** The module header's "More" menu: display options such as hex or binary. */
export function MoreMenu({ children }: { children: ReactNode }) {
  return (
    <Disclosure label="More options" icon={MoreHorizontal} showLabel={false}>
      {() => <div className="flex flex-col gap-2 p-1">{children}</div>}
    </Disclosure>
  );
}
