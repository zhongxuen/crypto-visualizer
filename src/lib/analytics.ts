/**
 * What Vercel Web Analytics is allowed to see: the page, never the run on it.
 *
 * Every module page writes its inputs into the URL as `?s=<base64url JSON>` (the share
 * state), and that includes the plaintext, key and message a learner typed. Page views
 * only need the path, so the query string and fragment are dropped from every event
 * before it is sent. Typed passwords never reach the URL in the first place
 * (`findSecretKeys`), but this doesn't rely on that.
 */
export function pathOnly(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    // Not absolute: cut at the first `?` or `#` by hand.
    return url.replace(/[?#].*$/, '');
  }
}

/** The `beforeSend` hook: page views pass with their URL reduced; custom events don't. */
export function scrubAnalyticsEvent<T extends { type: string; url: string }>(
  event: T,
): T | null {
  // Nothing in the site sends custom events; refusing them keeps it page views only.
  if (event.type !== 'pageview') return null;
  return { ...event, url: pathOnly(event.url) };
}
