/* Playwright globalSetup: bundle the rich-text harness once per run (never per worker, so
 * parallel workers never load a half-written bundle). */
import { buildHarness } from './build.mjs';

export default async function globalSetup() {
  await buildHarness();
}
