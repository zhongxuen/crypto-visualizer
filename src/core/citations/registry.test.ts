import { describe, expect, it } from 'vitest';

import { CITATIONS } from './index';
import { createCitationRegistry } from './registry';
import type { Citation } from './types';

const A: Citation = {
  id: 'rfc2104.2',
  doc: 'RFC 2104',
  section: '2',
  title: 'Definition of HMAC',
  url: 'https://www.rfc-editor.org/rfc/rfc2104#section-2',
};

describe('createCitationRegistry', () => {
  it('looks citations up by id across all sources', () => {
    const registry = createCitationRegistry([[A], []]);
    expect(registry.get('rfc2104.2')).toBe(A);
    expect(registry.has('rfc2104.2')).toBe(true);
    expect(registry.has('missing')).toBe(false);
    expect(registry.get('missing')).toBeUndefined();
    expect(registry.all()).toEqual([A]);
  });

  it('rejects a duplicate id, even across sources', () => {
    expect(() => createCitationRegistry([[A], [{ ...A, title: 'Other' }]])).toThrow(
      /Duplicate citation id "rfc2104.2"/,
    );
  });

  it('rejects a citation without an https URL', () => {
    expect(() =>
      createCitationRegistry([[{ ...A, url: 'http://www.rfc-editor.org/rfc/rfc2104' }]]),
    ).toThrow(/https/);
  });
});

describe('CITATIONS', () => {
  it('includes the shared encoding citations', () => {
    expect(CITATIONS.has('rfc3629.3')).toBe(true);
    expect(CITATIONS.has('rfc4648.5')).toBe(true);
  });
});
