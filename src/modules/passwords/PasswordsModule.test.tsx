import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { expectNoAxeViolations } from '@/components/testing/axe';
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

describe('PasswordsModule privacy', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    sessionStorage.clear();
    window.history.replaceState(null, '', '/passwords');
  });
  afterEach(() => vi.useRealTimers());

  it('never puts a typed password in the URL or in storage', () => {
    render(<PasswordsModule />);
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
  });

  it('is axe clean in free play', async () => {
    vi.useRealTimers();
    const { container } = render(<PasswordsModule />);
    fireEvent.click(screen.getByRole('button', { name: 'Free play' }));
    await expectNoAxeViolations(container);
  });
});
