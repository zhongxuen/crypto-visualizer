'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * The hero's looping demo (docs/UIUX.md §7.1): "Hi" becomes bytes, XOR with a key masks
 * them, the same key unmasks them. Every stage is always on screen, so the picture is a
 * complete diagram on its own; the loop only moves a highlighter along it (`cv-demo` in
 * globals.css, six seconds). Under reduced motion the highlighter never runs, and the
 * loop pauses while the demo is scrolled out of view.
 *
 * The bytes are worked out by core on the server (`page.tsx`); this only shows them.
 */
export interface DemoStage {
  /** What the stage is, e.g. "XOR with the key". */
  label: string;
  /** What it holds, e.g. "48 69". */
  value: string;
  /** A row of hex bytes, or text. */
  kind: 'text' | 'bytes' | 'key';
}

export function XorDemo({
  stages,
  caption,
}: {
  stages: DemoStage[];
  caption: ReactNode;
}) {
  const root = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const node = root.current;
    if (!node || typeof IntersectionObserver !== 'function') return;
    const observer = new IntersectionObserver(([entry]) =>
      setVisible(entry.isIntersecting),
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <figure
      ref={root}
      data-paused={visible ? undefined : ''}
      className="xor-demo border-border bg-paper flex flex-col gap-4 rounded-(--radius) border p-4 shadow-sm md:p-6"
    >
      <ol className="flex flex-col gap-2">
        {stages.map((stage, i) => (
          <li
            key={i}
            style={{ '--i': i } as React.CSSProperties}
            className="xor-demo-stage border-border bg-surface grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-md border px-3 py-2"
          >
            <span className="text-fg-secondary text-sm">{stage.label}</span>
            <span
              className={
                stage.kind === 'text'
                  ? 'font-display text-2xl'
                  : stage.kind === 'key'
                    ? 'text-secret font-mono text-lg'
                    : 'font-mono text-lg'
              }
            >
              {stage.value}
            </span>
          </li>
        ))}
      </ol>
      <figcaption className="text-fg-muted text-sm">{caption}</figcaption>
    </figure>
  );
}
