'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useEffect } from 'react';

import { type ThemePref } from '@/components/state/progress';
import { useProgress } from '@/components/state/useProgress';
import { cn } from '@/lib/cn';

/**
 * Light / dark / system. The choice is a preference in `cv:v1` and is applied as
 * `data-theme` on `<html>`, which tokens.css reads. `THEME_SCRIPT` applies it before
 * first paint so a dark-mode visitor doesn't see a white flash.
 */

const ORDER: readonly ThemePref[] = ['system', 'light', 'dark'];
const ICONS = { system: Monitor, light: Sun, dark: Moon } as const;
const NAMES = { system: 'system', light: 'light', dark: 'dark' } as const;

export function applyTheme(theme: ThemePref): void {
  const root = document.documentElement;
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
}

/** Runs inline in `<head>`: reads the stored theme and applies it. Never throws. */
export const THEME_SCRIPT = `try{var p=JSON.parse(localStorage.getItem('cv:v1')||'null');var t=p&&p.prefs&&p.prefs.theme;if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}`;

export function ThemeToggle({ className }: { className?: string }) {
  const { progress, setPref } = useProgress();
  const theme = progress.prefs.theme;
  const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
  const Icon = ICONS[theme];

  useEffect(() => applyTheme(theme), [theme]);

  return (
    <button
      type="button"
      onClick={() => setPref('theme', next)}
      aria-label={`Theme: ${NAMES[theme]}. Switch to ${NAMES[next]}.`}
      title={`Theme: ${NAMES[theme]}`}
      className={cn(
        'border-border hover:bg-surface-overlay focus-visible:outline-focus inline-flex size-9 items-center justify-center rounded-md border focus-visible:outline-2',
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-4" />
    </button>
  );
}
