'use client';

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Pause,
  Play,
  RotateCcw,
  type LucideIcon,
} from 'lucide-react';
import { useId, type ReactNode } from 'react';

import { PLAYBACK_SPEEDS, type PlaybackStatus } from '@/core/sim/playback';
import { cn } from '@/lib/cn';

import type { PlaybackCommand } from './keymap';

/**
 * The transport bar's buttons.
 *
 * ADAPTED from Internet Visualizer `src/components/viz/PlaybackControls.tsx` at 59ae4ad
 * (see VENDORED.md). Kept: every button emits the same `PlaybackCommand` the keyboard
 * map produces, so a shortcut that works is a button that works; the play button's
 * label is the action it will take. Dropped: the popover speed menu and the preference
 * switch, which depend on Internet Visualizer's UI kit; speed is a native `<select>`.
 */

export interface PlaybackControlsProps {
  status: PlaybackStatus;
  speed: number;
  onCommand: (command: PlaybackCommand) => void;
  /** Whether the playhead is on the last step (Play then restarts). */
  atEnd?: boolean;
  children?: ReactNode;
  className?: string;
}

export function playbackAction(
  status: PlaybackStatus,
  atEnd = false,
): { icon: LucideIcon; label: string } {
  if (status === 'playing') return { icon: Pause, label: 'Pause' };
  if (status === 'ended' || atEnd) return { icon: RotateCcw, label: 'Play again' };
  return { icon: Play, label: 'Play' };
}

export const BUTTON =
  'inline-flex min-h-target-floor items-center justify-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm text-fg hover:bg-surface-overlay focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50';

function IconButton({
  icon: Icon,
  label,
  shortcut,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  shortcut: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={`${label} (${shortcut})`}
      className={cn(BUTTON, 'size-9 px-0')}
    >
      <Icon aria-hidden="true" className="size-4" />
    </button>
  );
}

export function PlaybackControls({
  status,
  speed,
  onCommand,
  atEnd = false,
  children,
  className,
}: PlaybackControlsProps) {
  const action = playbackAction(status, atEnd);
  const speedId = useId();

  return (
    <div className={cn('flex flex-wrap items-center gap-x-3 gap-y-2', className)}>
      <div role="group" aria-label="Playback" className="flex items-center gap-1.5">
        <IconButton
          icon={ChevronsLeft}
          label="Previous group"
          shortcut="Shift+Left arrow"
          onClick={() => onCommand({ type: 'step-phase', direction: -1 })}
        />
        <button
          type="button"
          onClick={() => onCommand({ type: 'step-event', direction: -1 })}
          title="Back one step (Left arrow)"
          className={BUTTON}
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
          Back
        </button>
        <button
          type="button"
          onClick={() =>
            atEnd && status !== 'playing'
              ? (onCommand({ type: 'jump', to: 'start' }), onCommand({ type: 'toggle' }))
              : onCommand({ type: 'toggle' })
          }
          aria-label={action.label}
          title={`${action.label} (Space)`}
          className={cn(
            BUTTON,
            'bg-accent text-accent-fg hover:bg-accent min-w-28 border-transparent font-medium hover:opacity-90',
          )}
        >
          <action.icon aria-hidden="true" className="size-4" />
          {action.label}
        </button>
        <button
          type="button"
          onClick={() => onCommand({ type: 'step-event', direction: 1 })}
          title="Next step (Right arrow)"
          className={BUTTON}
        >
          Next
          <ChevronRight aria-hidden="true" className="size-4" />
        </button>
        <IconButton
          icon={ChevronsRight}
          label="Next group"
          shortcut="Shift+Right arrow"
          onClick={() => onCommand({ type: 'step-phase', direction: 1 })}
        />
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-3">{children}</div>

      <div className="flex items-center gap-1.5 text-sm">
        <label htmlFor={speedId} className="text-fg-muted">
          Speed
        </label>
        <select
          id={speedId}
          value={speed}
          onChange={(event) =>
            onCommand({ type: 'speed', speed: Number(event.target.value) })
          }
          className="border-border bg-surface text-fg focus-visible:outline-focus rounded-md border px-2 py-1 font-mono focus-visible:outline-2"
        >
          {PLAYBACK_SPEEDS.map((option) => (
            <option key={option} value={option}>
              {option}x
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
