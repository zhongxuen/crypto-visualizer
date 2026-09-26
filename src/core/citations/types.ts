/**
 * Citations: the standard, RFC or paper each step comes from.
 *
 * Every `CryptoEvent` names one by id, and `tests/citations.test.ts` fails if it doesn't
 * resolve. That's how "be honest" and "be provably correct" show up in the data: a
 * learner can always follow a step back to the text that defines it.
 */

/**
 * Stable id, lowercase, `<doc>.<section>` by convention, e.g. `'fips197.5.1.1'` or
 * `'rfc2104.2'`. Ids are shared across runs and may appear in URLs, so never rename one.
 */
export type CitationId = string;

/** Documents the plan already cites (00-overview §3, §6). */
export type KnownCitationDoc =
  | 'FIPS 180-4'
  | 'FIPS 197'
  | 'NIST SP 800-38A'
  | 'NIST SP 800-38D'
  | 'RFC 2104'
  | 'RFC 2631'
  | 'RFC 3629'
  | 'RFC 4231'
  | 'RFC 4648'
  | 'RFC 5869'
  | 'RFC 7748'
  | 'RFC 7914'
  | 'RFC 8017'
  | 'RFC 8018'
  | 'RFC 8446'
  | 'RFC 8448'
  | 'RFC 9106';

/**
 * The cited document. The known list is for autocomplete; any other document name is
 * allowed, so an algorithm can cite a new source without editing this shared file.
 */
export type CitationDoc = KnownCitationDoc | (string & {});

export interface Citation {
  id: CitationId;
  doc: CitationDoc;
  /** Section, table or figure number within `doc`, e.g. `'5.1.1'`. */
  section?: string;
  /** What the cited text is about, in a few words. */
  title: string;
  /** A public https link, as specific as the source allows (anchor to the section). */
  url: string;
}
