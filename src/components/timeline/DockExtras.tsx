'use client';

import { Check, Keyboard, Link2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { useShareLink } from '@/components/state/ShareLinkContext';

import { isTypingTarget, PLAYBACK_SHORTCUTS } from './keymap';

/**
 * The keyboard map, printed (UIUX §2.1 P6). A `?` button in the dock, or the `?` key,
 * opens it as a modal `<dialog>`, which brings its own focus trap and Escape to close.
 * The table is `PLAYBACK_SHORTCUTS`, the same one the key handler reads.
 */
export function ShortcutSheet({ buttonClassName }: { buttonClassName?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);

  const open = () => {
    const node = dialog.current;
    if (!node || node.open) return;
    if (typeof node.showModal === 'function') node.showModal();
    else node.setAttribute('open', '');
  };
  const close = () => {
    const node = dialog.current;
    if (!node) return;
    if (typeof node.close === 'function') node.close();
    else node.removeAttribute('open');
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== '?' || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.defaultPrevented || isTypingTarget(event.target)) return;
      event.preventDefault();
      const node = dialog.current;
      if (!node || node.open) return;
      if (typeof node.showModal === 'function') node.showModal();
      else node.setAttribute('open', '');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={open}
        title="Keyboard shortcuts (?)"
        className={buttonClassName}
      >
        <Keyboard aria-hidden="true" className="size-4" />
        <span className="md:sr-only">Keyboard shortcuts</span>
      </button>
      <dialog
        ref={dialog}
        aria-labelledby="shortcut-sheet-title"
        onClick={(event) => {
          // A press on the backdrop (the dialog itself, outside its content) closes it.
          if (event.target === dialog.current) close();
        }}
        className="border-border bg-surface text-fg m-auto w-[min(28rem,calc(100vw-2rem))] rounded-xl border p-0 shadow-xl backdrop:bg-black/40"
      >
        <div className="flex flex-col gap-3 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 id="shortcut-sheet-title" className="font-display text-xl">
              Keyboard shortcuts
            </h2>
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="hover:bg-surface-overlay focus-visible:outline-focus inline-flex size-11 items-center justify-center rounded-md focus-visible:outline-2 md:size-9"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>
          <table className="w-full text-sm">
            <caption className="sr-only">Playback keys</caption>
            <thead className="sr-only">
              <tr>
                <th scope="col">Keys</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {PLAYBACK_SHORTCUTS.map((shortcut) => (
                <tr
                  key={shortcut.action}
                  className="border-border border-b last:border-0"
                >
                  <td className="py-2 pr-4 align-top whitespace-nowrap">
                    {shortcut.chords.map((chord, i) => (
                      <span key={i}>
                        {i > 0 ? <span className="text-fg-muted"> or </span> : null}
                        {chord.map((key, j) => (
                          <span key={j}>
                            {j > 0 ? '+' : null}
                            <kbd className="border-border bg-surface-overlay rounded border px-1.5 py-0.5 font-mono text-xs">
                              {key}
                            </kbd>
                          </span>
                        ))}
                      </span>
                    ))}
                  </td>
                  <td className="text-fg-secondary py-2">{shortcut.action}</td>
                </tr>
              ))}
              <tr>
                <td className="py-2 pr-4">
                  <kbd className="border-border bg-surface-overlay rounded border px-1.5 py-0.5 font-mono text-xs">
                    ?
                  </kbd>
                </td>
                <td className="text-fg-secondary py-2">Show this list</td>
              </tr>
            </tbody>
          </table>
        </div>
      </dialog>
    </>
  );
}

/**
 * "Copy link to this step" (UIUX §2.1 P9): writes `?s=` for the current state to the
 * address bar and copies it. Sharing is a deliberate act; the page doesn't grow a long
 * link by itself while it is at its defaults. Only shown on a page with share state.
 */
export function CopyLinkButton({ className }: { className?: string }) {
  const share = useShareLink();
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (note === null) return;
    const timer = setTimeout(() => setNote(null), 2500);
    return () => clearTimeout(timer);
  }, [note]);

  if (!share) return null;

  const copy = () => {
    const href = share.link();
    if (href === null) {
      setNote('This state is too large for a link.');
      return;
    }
    const clipboard = typeof navigator === 'undefined' ? undefined : navigator.clipboard;
    if (!clipboard) {
      setNote('The link is in the address bar.');
      return;
    }
    clipboard.writeText(href).then(
      () => setNote('Link copied.'),
      () => setNote('The link is in the address bar.'),
    );
  };

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={copy}
        title="Copy link to this step"
        className={className}
      >
        {note === 'Link copied.' ? (
          <Check aria-hidden="true" className="text-ok size-4" />
        ) : (
          <Link2 aria-hidden="true" className="size-4" />
        )}
        <span className="md:sr-only">Copy link to this step</span>
      </button>
      <span
        aria-live="polite"
        className={
          note
            ? 'border-border bg-surface absolute right-0 bottom-full mb-2 rounded-md border px-2 py-1 text-xs whitespace-nowrap shadow-md'
            : 'sr-only'
        }
      >
        {note}
      </span>
    </span>
  );
}
