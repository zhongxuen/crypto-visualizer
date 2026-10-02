'use client';

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  type LucideIcon,
} from 'lucide-react';
import { useCallback, useId, useRef, useState, type ReactNode } from 'react';

import { useDismiss } from '@/components/shell/useDismiss';
import { PLAYBACK_SPEEDS, type PlaybackStatus } from '@/core/sim/playback';
import { cn } from '@/lib/cn';

import { CopyLinkButton, ShortcutSheet } from './DockExtras';
import type { PlaybackCommand } from './keymap';

/**
 * The dock's buttons (docs/UIUX.md §4.2): ⏮ ◀ ▶/⏸ ▶ ⏭, the scrubber in the middle
 * (`children`), then speed, the keyboard shortcuts and "Copy link".
 *
 * One row at every width (B8). Below `md` the transport is ◀ ▶ ▶ only, with icons, and
 * the rest moves into a "More playback options" panel that opens above the dock; from
 * `md` it is all inline. Each control is rendered once, so nothing is duplicated for
 * assistive technology.
 *
 * At the ends of the run, the buttons that can't move further are `aria-disabled` and
 * dimmed rather than `disabled`, so they keep keyboard focus and stay in the tab order.
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
  /** Whether the playhead is on the first step (Back and Previous group do nothing). */
  atStart?: boolean;
  /** Whether the playhead is on the last step (Play then restarts). */
  atEnd?: boolean;
  /** The scrubber. */
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

/** The shared button look. At least 44 px tall below `md` (B7), 36 px above. */
export const BUTTON =
  'inline-flex min-h-target md:min-h-9 items-center justify-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm text-fg hover:bg-surface-overlay focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:bg-surface';

/** A square transport button. Its label is its accessible name and its tooltip. */
const SQUARE =
  'inline-flex size-11 md:size-9 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-fg hover:bg-surface-overlay focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:bg-surface';

function IconButton({
  icon: Icon,
  label,
  shortcut,
  inert = false,
  onClick,
  className,
  children,
}: {
  icon?: LucideIcon;
  label: string;
  shortcut: string;
  inert?: boolean;
  onClick: () => void;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={inert ? undefined : onClick}
      aria-disabled={inert || undefined}
      aria-label={label}
      title={`${label} (${shortcut})`}
      className={className ?? SQUARE}
    >
      {children ?? (Icon ? <Icon aria-hidden="true" className="size-4" /> : null)}
    </button>
  );
}

export function PlaybackControls({
  status,
  speed,
  onCommand,
  atStart = false,
  atEnd = false,
  children,
  className,
}: PlaybackControlsProps) {
  const action = playbackAction(status, atEnd);
  const speedId = useId();
  const panelId = useId();
  const [more, setMore] = useState(false);
  const extras = useRef<HTMLDivElement>(null);
  const moreButton = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setMore(false), []);
  useDismiss(more, close, extras, moreButton);

  return (
    <div className={cn('flex h-15 items-center gap-1.5 md:gap-3', className)}>
      <div
        role="group"
        aria-label="Playback"
        className="flex items-center gap-1 md:gap-1.5"
      >
        <IconButton
          icon={ChevronsLeft}
          label="Previous group"
          shortcut="Shift+Left arrow"
          inert={atStart}
          onClick={() => onCommand({ type: 'step-phase', direction: -1 })}
          className={cn(SQUARE, 'max-md:hidden')}
        />
        <IconButton
          label="Back"
          shortcut="Left arrow"
          inert={atStart}
          onClick={() => onCommand({ type: 'step-event', direction: -1 })}
          className={cn(SQUARE, 'md:w-auto md:px-2.5')}
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
          <span aria-hidden="true" className="text-sm max-md:hidden">
            Back
          </span>
        </IconButton>
        <button
          type="button"
          onClick={() =>
            atEnd && status !== 'playing'
              ? (onCommand({ type: 'jump', to: 'start' }), onCommand({ type: 'toggle' }))
              : onCommand({ type: 'toggle' })
          }
          aria-label={action.label}
          title={`${action.label} (Space)`}
          className="bg-accent text-accent-fg focus-visible:outline-focus inline-flex size-11 shrink-0 items-center justify-center gap-1.5 rounded-md text-sm font-medium hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 md:h-9 md:w-auto md:min-w-28 md:px-3"
        >
          <action.icon
            key={action.label}
            aria-hidden="true"
            className="motion-fade size-4"
          />
          <span aria-hidden="true" className="max-md:hidden">
            {action.label}
          </span>
        </button>
        <IconButton
          label="Next"
          shortcut="Right arrow"
          inert={atEnd}
          onClick={() => onCommand({ type: 'step-event', direction: 1 })}
          className={cn(SQUARE, 'md:w-auto md:px-2.5')}
        >
          <span aria-hidden="true" className="text-sm max-md:hidden">
            Next
          </span>
          <ChevronRight aria-hidden="true" className="size-4" />
        </IconButton>
        <IconButton
          icon={ChevronsRight}
          label="Next group"
          shortcut="Shift+Right arrow"
          inert={atEnd}
          onClick={() => onCommand({ type: 'step-phase', direction: 1 })}
          className={cn(SQUARE, 'max-md:hidden')}
        />
      </div>

      <div className="flex min-w-0 flex-1 items-center">{children}</div>

      <div ref={extras} className="relative flex items-center">
        <button
          ref={moreButton}
          type="button"
          aria-expanded={more}
          aria-controls={panelId}
          aria-label="More playback options"
          title="More playback options"
          onClick={() => setMore((value) => !value)}
          className={cn(SQUARE, 'md:hidden')}
        >
          <MoreHorizontal aria-hidden="true" className="size-4" />
        </button>
        <div
          id={panelId}
          className={cn(
            'gap-1.5 md:flex md:items-center',
            more
              ? 'border-border bg-surface absolute right-0 bottom-full mb-2 flex w-64 flex-col items-stretch rounded-lg border p-2 shadow-lg md:static md:mb-0 md:w-auto md:flex-row md:border-0 md:bg-transparent md:p-0 md:shadow-none'
              : 'hidden',
          )}
        >
          <button
            type="button"
            onClick={
              atEnd
                ? undefined
                : () => {
                    onCommand({ type: 'step-phase', direction: 1 });
                    close();
                  }
            }
            aria-disabled={atEnd || undefined}
            className={cn(BUTTON, 'md:hidden')}
          >
            <SkipForward aria-hidden="true" className="size-4" />
            Skip this phase
          </button>
          <div className="flex items-center justify-between gap-1.5 text-sm max-md:px-1">
            <label htmlFor={speedId} className="text-fg-muted">
              Speed
            </label>
            <select
              id={speedId}
              value={speed}
              onChange={(event) =>
                onCommand({ type: 'speed', speed: Number(event.target.value) })
              }
              className="border-border bg-surface text-fg focus-visible:outline-focus min-h-target rounded-md border px-2 font-mono focus-visible:outline-2 md:min-h-9"
            >
              {PLAYBACK_SPEEDS.map((option) => (
                <option key={option} value={option}>
                  {option}x
                </option>
              ))}
            </select>
          </div>
          <ShortcutSheet buttonClassName={cn(BUTTON, 'md:size-9 md:px-0')} />
          <CopyLinkButton className={cn(BUTTON, 'md:size-9 md:px-0')} />
        </div>
      </div>
    </div>
  );
}
