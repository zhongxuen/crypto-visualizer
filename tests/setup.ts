import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
});

/**
 * jsdom does not implement matchMedia. Every module reads `prefers-reduced-motion`, so
 * stub it here rather than in each test.
 */
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
});

/**
 * `cn` is a plain class join with no tailwind-merge (src/lib/cn.ts), so a call that
 * mixes two classes for one property (`border` and `border-2`) would render whichever
 * Tailwind happens to emit last. In the UI tests, every `cn` call is checked against
 * tailwind-merge (a dev dependency only) and throws if merging would have dropped
 * anything.
 */
vi.mock('@/lib/cn', async () => {
  const { clsx } = await import('clsx');
  const { twMerge } = await import('tailwind-merge');
  return {
    cn: (...inputs: Parameters<typeof clsx>) => {
      const joined = clsx(inputs);
      const kept = new Set(twMerge(joined).split(/\s+/));
      const dropped = joined.split(/\s+/).filter((name) => name && !kept.has(name));
      if (dropped.length > 0) {
        throw new Error(`cn: conflicting classes ${dropped.join(' ')} in "${joined}"`);
      }
      return joined;
    },
  };
});
