import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { expectNoAxeViolations } from '@/components/testing/axe';
import { PASSWORDS_SHARE } from '@/core/kdf/share';
import { SHARE_PARAM } from '@/core/state';

import { PasswordsModule } from './PasswordsModule';

const SECRET = 'Tr0ub4dor&3-not-real';

function everythingStored(): string {
  const parts = [window.location.href, decodeURIComponent(window.location.href)];
  const encoded = new URL(window.location.href).searchParams.get(SHARE_PARAM);
  if (encoded) parts.push(atob(encoded.replace(/-/g, '+').replace(/_/g, '/')));
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i)!;
    parts.push(key, localStorage.getItem(key) ?? '');
  }
  for (let i = 0; i < sessionStorage.length; i += 1) {
    const key = sessionStorage.key(i)!;
    parts.push(key, sessionStorage.getItem(key) ?? '');
  }
  return parts.join('\n');
}

// Each test waits for code the page loads after hydration; under a loaded parallel run
// (`npm run verify` with coverage) that can pass the 5 s default.
describe('PasswordsModule privacy', { timeout: 20_000 }, () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    sessionStorage.clear();
    window.history.replaceState(null, '', '/passwords');
  });
  afterEach(() => vi.useRealTimers());

  it('never puts a typed password in the URL or in storage', async () => {
    render(<PasswordsModule />);
    // The share-state schema and `./runs` (the PBKDF2 chapter and free play's inputs) load
    // after hydration; wait for both.
    await act(async () => {
      await Promise.all([PASSWORDS_SHARE.load(), import('./runs')]);
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Free play' }));
    const box = screen.getByLabelText('Try your own password');
    fireEvent.change(box, { target: { value: SECRET } });

    // Use the page with the password in it: every chapter, salting, stepping.
    for (const chapter of ['Salts', 'PBKDF2', 'Unsalted hashes']) {
      fireEvent.click(
        within(screen.getByRole('navigation', { name: 'Chapters' })).getByRole('button', {
          name: new RegExp(chapter),
        }),
      );
      fireEvent.click(screen.getByRole('button', { name: 'Next' }));
      act(() => {
        vi.advanceTimersByTime(1000);
      });
    }
    // The typed password was used: it's in the users table.
    expect(screen.getAllByText(SECRET).length).toBeGreaterThan(0);

    const stored = everythingStored();
    expect(window.location.search).toContain(`${SHARE_PARAM}=`);
    expect(stored).not.toContain(SECRET);
    expect(stored).not.toContain('Tr0ub4dor');
    // About 3.5 s alone (three chapters, two lazy imports); over 5 s in a loaded run.
  }, 30_000);

  it('is axe clean in free play', async () => {
    vi.useRealTimers();
    const { container } = render(<PasswordsModule />);
    fireEvent.click(screen.getByRole('button', { name: 'Free play' }));
    // Free play's inputs come with `./runs`, loaded after hydration.
    await screen.findByLabelText('Try your own password');
    await expectNoAxeViolations(container);
  });
});
