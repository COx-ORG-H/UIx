/* Playwright globalSetup, first in the list: the stylesheet under test is the shipped bundle,
 * which is built and not committed. With no bundle the harness pages render unstyled and the docs
 * quietly fall back to the authored sources; with one left over from another branch (git no
 * longer swaps it on checkout) every page shows that branch's CSS. Either way the run would test
 * something other than this tree, so it stops here and says to build.
 * (Its own file, not a line in global-setup.mjs: every PR that adds a harness edits that one.) */
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const TOKENS = fileURLToPath(new URL('../packages/tokens/', import.meta.url));
const BUNDLE = join(TOKENS, 'build', 'css', 'styles.css');

const stylesheets = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const path = join(dir, entry.name);
  return entry.isDirectory() ? stylesheets(path) : entry.name.endsWith('.css') ? [path] : [];
});

export default function requireBundle() {
  if (!existsSync(BUNDLE)) {
    throw new Error('packages/tokens/build/css/styles.css is missing — run `npm run build` before the Playwright suites.');
  }
  const built = statSync(BUNDLE).mtimeMs;
  const newer = [...stylesheets(join(TOKENS, 'styles')), join(TOKENS, 'build', 'css', 'tokens.css')]
    .filter((path) => statSync(path).mtimeMs > built);
  if (newer.length) {
    throw new Error(
      `packages/tokens/build/css/styles.css is older than ${newer.length} of its sources (e.g. ${relative(TOKENS, newer[0]).split(sep).join('/')}) — ` +
        'run `npm run build` before the Playwright suites.',
    );
  }
}
