/* Playwright globalSetup: bundle every React harness once per run (never per worker, so
 * parallel workers never load a half-written bundle).
 *
 * The stylesheet under test is the shipped bundle, which is built and not committed. Without it
 * the harness pages would render unstyled and the docs would quietly fall back to the authored
 * sources, so a run with no build stops here instead of testing something else. */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildHarness } from './rich-text/build.mjs';
import { buildOperatorHarness } from './operator-primitives/build.mjs';
import { buildDiffViewerHarness } from './diff-viewer/build.mjs';
import { buildViewMenuHarness } from './view-menu/build.mjs';
import { buildInfoTipHarness } from './info-tip/build.mjs';
import { buildSearchSuggestHarness } from './search-suggest/build.mjs';
import { buildDrawerHarness } from './drawer/build.mjs';
import { buildTextDiffHarness } from './text-diff/build.mjs';

const BUNDLE = fileURLToPath(new URL('../packages/tokens/build/css/styles.css', import.meta.url));

export default async function globalSetup() {
  if (!existsSync(BUNDLE)) {
    throw new Error('packages/tokens/build/css/styles.css is missing — run `npm run build` before the Playwright suites.');
  }
  await Promise.all([buildHarness(), buildOperatorHarness(), buildDiffViewerHarness(), buildViewMenuHarness(), buildInfoTipHarness(), buildSearchSuggestHarness(), buildDrawerHarness(), buildTextDiffHarness()]);
}
