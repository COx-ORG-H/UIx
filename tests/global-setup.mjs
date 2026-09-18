/* Playwright globalSetup: bundle every React harness once per run (never per worker, so
 * parallel workers never load a half-written bundle). */
import { buildHarness } from './rich-text/build.mjs';
import { buildOperatorHarness } from './operator-primitives/build.mjs';

export default async function globalSetup() {
  await Promise.all([buildHarness(), buildOperatorHarness()]);
}
