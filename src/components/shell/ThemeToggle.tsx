'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useEffect } from 'react';

import { type ThemePref } from '@/components/state/progress';
import { useProgress } from '@/components/state/useProgress';
import { cn } from '@/lib/cn';

/**
 * Light · System · Dark, as a labelled segmented control (UIUX §2.1 P10). The choice is
 * a preference in `cv:v1` and is applied as `data-theme` on `<html>`, which tokens.css
 * reads. `THEME_SCRIPT` applies it before first paint so a dark-mode visitor doesn't see
 * a white flash. Where the browser has view transitions the switch crossfades, except
 * under reduced motion.
 */

const OPTIONS: readonly { id: ThemePref; label: string; icon: typeof Sun }[] = [
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'system', label: 'System', icon: Monitor },
  { id: 'dark', label: 'Dark', icon: Moon },
];

export function applyTheme(theme: ThemePref): void {
  const root = document.documentElement;
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
}

/** Runs inline in `<head>`: reads the stored theme and applies it. Never throws. */
export const THEME_SCRIPT = `try{var p=JSON.parse(localStorage.getItem('cv:v1')||'null');var t=p&&p.prefs&&p.prefs.theme;if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}`;

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => unknown;
};

export function ThemeToggle({ className }: { className?: string }) {
  const { progress, setPref } = useProgress();
  const theme = progress.prefs.theme;

  useEffect(() => applyTheme(theme), [theme]);

  const choose = (next: ThemePref) => {
    const update = () => {
      applyTheme(next);
      setPref('theme', next);
    };
    const doc = document as ViewTransitionDocument;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (doc.startViewTransition && !reduced) doc.startViewTransition(update);
    else update();
  };

  return (
    <div
      role="group"
      aria-label="Theme"
      className={cn('flex flex-col gap-1.5', className)}
    >
      <span
        aria-hidden="true"
        className="text-fg-muted text-xs font-semibold tracking-wide uppercase"
      >
        Theme
      </span>
      <div className="border-border bg-surface-overlay grid grid-cols-3 rounded-md border p-0.5">
        {OPTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            aria-pressed={theme === id}
            onClick={() => choose(id)}
            className={cn(
              'focus-visible:outline-focus min-h-target inline-flex items-center justify-center gap-1.5 rounded-[5px] px-2.5 text-sm focus-visible:outline-2 md:min-h-8',
              theme === id
                ? 'bg-surface text-fg font-medium shadow-sm'
                : 'text-fg-secondary hover:text-fg',
            )}
          >
            <Icon aria-hidden="true" className="size-4" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
