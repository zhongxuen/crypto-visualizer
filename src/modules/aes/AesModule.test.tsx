import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { expectNoAxeViolations } from '@/components/testing/axe';

import { AesModule } from './AesModule';

const C1_CIPHERTEXT = '69c4e0d86a7b0430d8cdb78070b4c55a';

function chapter(name: string) {
  fireEvent.click(
    within(screen.getByRole('navigation', { name: 'Chapters' })).getByRole('button', {
      name: new RegExp(name),
    }),
  );
}

describe('AesModule', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState(null, '', '/aes');
  });

  it('skips to the FIPS 197 C.1 ciphertext', () => {
    render(<AesModule />);
    fireEvent.click(screen.getByRole('button', { name: 'Skip to ciphertext' }));
    expect(screen.getByTestId('aes-ciphertext')).toHaveTextContent(C1_CIPHERTEXT);
  });

  it('shows the S-box lookup, the ShiftRows arrows and a MixColumns column', () => {
    render(<AesModule />);
    const next = () => act(() => fireEvent.keyDown(window, { key: 'ArrowRight' }));
    next();
    next();
    // Round 1 SubBytes: byte 0 of FIPS 197 C.1 round[1].start is 0x00, S(0x00) = 0x63.
    expect(screen.getByRole('region', { name: 'S-box table' })).toHaveTextContent(
      'column 0 (low nibble) gives 0x63',
    );
    next();
    expect(screen.getByRole('list', { name: 'ShiftRows, row by row' })).toBeVisible();
    next();
    fireEvent.click(screen.getByRole('button', { name: 'Column 2' }));
    expect(screen.getByRole('button', { name: 'Column 2' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('refuses a short key in free play without breaking the run', () => {
    render(<AesModule />);
    fireEvent.click(screen.getByRole('button', { name: 'Free play' }));
    fireEvent.change(screen.getByLabelText(/^Key \(16 bytes/), {
      target: { value: '0011' },
    });
    expect(screen.getByRole('alert')).toHaveTextContent('The key must be 16 bytes');
    expect(screen.getByRole('status')).toHaveTextContent('Step 1 of 42');
  });

  it('is axe clean in every chapter', async () => {
    const { container } = render(<AesModule />);
    for (const name of ['One block', 'Key schedule', 'Avalanche', 'Modes', 'GCM']) {
      chapter(name);
      await expectNoAxeViolations(container);
    }
    fireEvent.click(screen.getByRole('button', { name: 'Free play' }));
    await expectNoAxeViolations(container);
  }, 30_000);
});
