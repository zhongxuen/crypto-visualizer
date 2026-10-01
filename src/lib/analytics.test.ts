import { describe, expect, it } from 'vitest';

import { pathOnly, scrubAnalyticsEvent } from './analytics';

describe('pathOnly', () => {
  it('drops the share state and any fragment', () => {
    expect(pathOnly('https://cv.example/aes?s=eyJrZXkiOiIwMDAxIn0#step-3')).toBe(
      'https://cv.example/aes',
    );
  });

  it('leaves a bare path alone', () => {
    expect(pathOnly('https://cv.example/')).toBe('https://cv.example/');
  });

  it('handles a relative URL', () => {
    expect(pathOnly('/rsa?s=abc')).toBe('/rsa');
    expect(pathOnly('/rsa#x')).toBe('/rsa');
  });
});

describe('scrubAnalyticsEvent', () => {
  it('keeps page views, without their query string', () => {
    expect(
      scrubAnalyticsEvent({ type: 'pageview', url: 'https://cv.example/xor?s=secret' }),
    ).toEqual({ type: 'pageview', url: 'https://cv.example/xor' });
  });

  it('refuses custom events', () => {
    expect(scrubAnalyticsEvent({ type: 'event', url: 'https://cv.example/xor' })).toBe(
      null,
    );
  });
});
