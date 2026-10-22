/* Frame series and recordings of the state-feedback kit for review (motion rollout WP2): each
 * scenario in light and dark, with and without reduced motion, at 1280 and 320 px.
 *   node tests/feedback-kit/frames.mjs <out-dir> [base-url]   (serve the repo root first)
 * Not a test: the assertions live in tests/a11y/feedback-kit.spec.mjs. */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const out = process.argv[2];
const base = process.argv[3] ?? 'http://localhost:4191';
const page_ = process.env.FRAMES_PAGE ?? '/tests/feedback-kit/harness.html';
const only = process.env.FRAMES_ONLY?.split(',');
if (!out) throw new Error('usage: node tests/feedback-kit/frames.mjs <out-dir> [base-url]');
mkdirSync(out, { recursive: true });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const SCENARIOS = {
  async button(page, shot) {
    const row = page.getByTestId('row');
    await shot(row, '0-rest');
    await page.getByTestId('save').click();
    await page.getByTestId('assign').click();
    await wait(150); await shot(row, '1-quiet-150ms');
    await wait(450); await shot(row, '2-spinner-600ms');
    await wait(700); await shot(row, '3-result-1300ms');
    await wait(1700); await shot(row, '4-back-3000ms');
    await page.locator('#latency input[type=checkbox]').check();
    await page.getByTestId('save').click();
    await wait(1400); await shot(row, '5-error-1400ms');
    await page.locator('#latency input[type=checkbox]').uncheck();
    await wait(1600);
  },
  async busy(page, shot) {
    const section = page.locator('#busy');
    await shot(section, '0-rest');
    await page.getByTestId('refetch').click();
    await wait(150); await shot(section, '1-quiet-150ms');
    await wait(450); await shot(section, '2-busy-600ms');
    await wait(1400); await shot(section, '3-after-2000ms');
  },
  async savestatus(page, shot) {
    const section = page.locator('#save-status');
    await page.locator('#save-status input').fill('Printer on floor 3 is jammed again');
    await wait(400 + 450); await shot(section, '1-saving');
    await wait(1000); await shot(section, '2-saved');
  },
};

const browser = await chromium.launch();
for (const theme of ['light', 'dark']) {
  for (const reducedMotion of ['no-preference', 'reduce']) {
    for (const width of [1280, 320]) {
      const tag = `${theme}-${reducedMotion === 'reduce' ? 'rm' : 'motion'}-${width}`;
      const video = width === 1280 && reducedMotion === 'no-preference';
      const context = await browser.newContext({
        viewport: { width, height: 900 }, colorScheme: theme, reducedMotion, deviceScaleFactor: 2,
        ...(video ? { recordVideo: { dir: join(out, `video-${tag}`), size: { width: 1280, height: 900 } } } : {}),
      });
      const page = await context.newPage();
      await page.addInitScript((t) => { try { localStorage.setItem('uix-theme', t); } catch { /* */ } }, theme);
      await page.goto(base + page_, { waitUntil: 'networkidle' });
      for (const [name, run] of Object.entries(SCENARIOS)) {
        if (only && !only.includes(name)) continue;
        const shot = (locator, step) => locator.screenshot({ path: join(out, `${name}-${tag}-${step}.png`), animations: 'allow' });
        await run(page, shot);
      }
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (overflow > 0) console.log(`${tag}: page scrolls sideways by ${overflow}px`);
      await context.close();
    }
  }
}
await browser.close();
console.log(`frames in ${out}`);
