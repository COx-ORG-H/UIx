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
