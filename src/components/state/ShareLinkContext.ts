'use client';

import { createContext, useContext } from 'react';

/**
 * The page's share link, handed from `ModuleLayout` to the timeline dock's "Copy link"
 * button without every module threading it through. `null` outside a module page (the
 * dock then has no link button).
 */
export interface ShareLink {
  /** Write the link to the current step to the address bar and return it. */
  link(): string | null;
}

export const ShareLinkContext = createContext<ShareLink | null>(null);

export function useShareLink(): ShareLink | null {
  return useContext(ShareLinkContext);
}
