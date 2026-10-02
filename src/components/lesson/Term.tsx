'use client';

import Link from 'next/link';
import { useId, useRef, useState, type ReactNode } from 'react';

import { GLOSSARY, type GlossaryId } from './glossary';

/**
 * A word a beginner may not know, with its definition one press away (UIUX §2.1 P3).
 *
 * A toggletip, not a hover tooltip: a real button (dotted underline) that opens a small
 * card with the definition and a link to the module that teaches it. It works by touch
 * and keyboard alike, and closes on Escape or when focus leaves it. The definition sits
 * in an `aria-live` region, so it is read out when it opens.
 *
 * Modules wrap the *first* use of a term in their walkthrough: `<Term id="utf-8" />`, or
 * `<Term id="utf-8">UTF-8 bytes</Term>` to keep their own wording.
 */
export function Term({ id, children }: { id: GlossaryId; children?: ReactNode }) {
  const entry = GLOSSARY[id];
  const [open, setOpen] = useState(false);
  const popup = useId();
  const root = useRef<HTMLSpanElement>(null);

  return (
    <span
      ref={root}
      className="relative inline"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          event.stopPropagation();
          setOpen(false);
        }
      }}
      onBlur={(event) => {
        if (!root.current?.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={popup}
        onClick={() => setOpen((value) => !value)}
        className="decoration-fg-muted focus-visible:outline-focus cursor-help rounded-sm underline decoration-dotted decoration-1 underline-offset-[3px] focus-visible:outline-2"
      >
        {children ?? entry.term}
      </button>
      <span id={popup} aria-live="polite" className="contents">
        {open ? (
          <span className="border-border bg-surface text-fg absolute top-full left-0 z-30 mt-1 block w-72 max-w-[80vw] rounded-lg border p-3 text-sm leading-relaxed font-normal shadow-md">
            <strong className="block font-semibold">{entry.term}</strong>
            <span className="text-fg-secondary block">{entry.definition}</span>
            {'module' in entry ? (
              <Link
                href={entry.module.route}
                className="text-accent mt-1 inline-block underline underline-offset-2"
              >
                Learn more in module {entry.module.number}
              </Link>
            ) : null}
          </span>
        ) : null}
      </span>
    </span>
  );
}
