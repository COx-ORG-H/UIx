/* Default link policy for the Markdown viewer and RichTextEditor (RTE-01). No DOM, no React. */

const ALLOWED_START = /^(https?:|mailto:|\/|#|\.\/|\.\.\/)/i;
const CONTROL_OR_BACKSLASH = /[\x00-\x1f\x7f\\]/;
const PROTOCOL_RELATIVE = /^[/\\]{2}/;

/**
 * Allows http(s), mailto and same-app references (`/path`, `#anchor`, `./x`, `../x`).
 * Browsers drop tabs and newlines inside URLs and read `\` as `/`, so those are removed
 * or refused first: `//evil.test`, `/\evil.test` and `/<TAB>/evil.test` are not
 * same-app paths.
 */
export function defaultIsSafeUrl(url: string): boolean {
  const candidate = url.replace(/[\t\n\r]/g, '').trim();
  if (CONTROL_OR_BACKSLASH.test(candidate) || PROTOCOL_RELATIVE.test(candidate)) return false;
  return ALLOWED_START.test(candidate);
}

const SCHEME = /^([a-z][a-z0-9+.-]*):/i;

/**
 * The link policy for AI sources and disclosure links (`SourceList`, `AiLabel`): only `http:`,
 * `https:` and relative references (`/kb/204`, `kb/204`, `?q=1`, `#notes`). Source data often comes
 * from a model or a search index, so `javascript:`, `data:`, `vbscript:` and every other scheme is
 * refused, after the browser's own clean-up (case, surrounding space, tabs and newlines inside),
 * as are control characters, backslashes and protocol-relative `//host` references.
 */
export function isSafeSourceHref(url: unknown): url is string {
  if (typeof url !== 'string') return false;
  const candidate = url.replace(/[\t\n\r]/g, '').trim();
  if (!candidate || CONTROL_OR_BACKSLASH.test(candidate) || PROTOCOL_RELATIVE.test(candidate)) return false;
  const scheme = SCHEME.exec(candidate)?.[1]?.toLowerCase();
  return scheme === undefined || scheme === 'http' || scheme === 'https';
}
