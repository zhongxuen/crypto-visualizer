/**
 * The URL share-state codec: `?s=<base64url(UTF-8(JSON))>`.
 *
 * A share link carries the inputs, not just a seed, because a seed can't reproduce a
 * plaintext the user typed (00-overview §6, change 9).
 *
 * Decoding never throws. A missing, malformed, oversized (> 2 KB), wrong-module,
 * wrong-version or otherwise invalid value decodes to the module's default, because a
 * broken link should open the module, not an error page.
 *
 * RULE: free-text password inputs are never encoded. See `findSecretKeys` in
 * `./schema.ts`: a state with a password-like key is refused on encode and ignored on
 * decode.
 */

import { base64urlDecode, base64urlEncode } from '../bytes/base64url';
import { utf8Decode, utf8Encode } from '../bytes/utf8';
import type { ModuleShareState, ShareStateBase } from './schema';
import { findSecretKeys } from './secrets';

/** The query parameter that carries the state. */
export const SHARE_PARAM = 's';

/** Longest encoded value accepted or produced, in characters. */
export const MAX_SHARE_STATE_LENGTH = 2048;

function copy<S>(value: S): S {
  return JSON.parse(JSON.stringify(value)) as S;
}

/**
 * Encode `state` for a link. Returns `null` if the result would be longer than
 * `MAX_SHARE_STATE_LENGTH`, so the page can say the state is too large to share.
 *
 * Throws if `state` doesn't match the module's schema or contains a password-like key.
 * Both are programming errors, not user errors.
 */
export function encodeShareState<S extends ShareStateBase>(
  definition: ModuleShareState<S>,
  state: S,
): string | null {
  const secrets = findSecretKeys(state);
  if (secrets.length > 0) {
    throw new Error(
      `Refusing to encode password-like keys (${secrets.join(', ')}): free-text passwords are never put in a URL.`,
    );
  }

  const parsed = definition.schema.safeParse(state);
  if (!parsed.success) {
    throw new Error(
      `Share state for "${definition.m}" is invalid: ${parsed.error.message}`,
    );
  }

  const encoded = base64urlEncode(utf8Encode(JSON.stringify(parsed.data)));
  return encoded.length > MAX_SHARE_STATE_LENGTH ? null : encoded;
}

/** Decode a `?s=` value for one module. Never throws; falls back to the defaults. */
export function decodeShareState<S extends ShareStateBase>(
  definition: ModuleShareState<S>,
  encoded: string | null | undefined,
): S {
  const fallback = () => copy(definition.defaults);

  if (typeof encoded !== 'string' || encoded.length === 0) return fallback();
  if (encoded.length > MAX_SHARE_STATE_LENGTH) return fallback();

  let json: unknown;
  try {
    json = JSON.parse(utf8Decode(base64urlDecode(encoded)));
  } catch {
    return fallback();
  }

  if (findSecretKeys(json).length > 0) return fallback();

  const parsed = definition.schema.safeParse(json);
  return parsed.success ? parsed.data : fallback();
}

/** Read the state from a query string (`'?s=...'`) or `URLSearchParams`. Never throws. */
export function shareStateFromSearch<S extends ShareStateBase>(
  definition: ModuleShareState<S>,
  search: string | URLSearchParams,
): S {
  const params = typeof search === 'string' ? new URLSearchParams(search) : search;
  return decodeShareState(definition, params.get(SHARE_PARAM));
}

/** `'?s=...'` for a link, or `null` if the state is too large to share. */
export function shareStateToSearch<S extends ShareStateBase>(
  definition: ModuleShareState<S>,
  state: S,
): string | null {
  const encoded = encodeShareState(definition, state);
  // base64url needs no percent-encoding.
  return encoded === null ? null : `?${SHARE_PARAM}=${encoded}`;
}
