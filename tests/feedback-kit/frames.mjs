/* Frame series and recordings of the state-feedback kit for review (motion rollout WP2): each
 * scenario in light and dark, with and without reduced motion, at 1280 and 320 px.
 *   node tests/feedback-kit/frames.mjs <out-dir> [base-url]   (without a base URL it serves the repo root itself)
 * Not a test: the assertions live in tests/a11y/feedback-kit.spec.mjs. */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import handler from 'serve-handler';

const out = process.argv[2];
// without a base URL, serve the repo root on a free port for this run
const root = fileURLToPath(new URL('../..', import.meta.url));
const server = process.argv[3] ? null : createServer((req, res) => handler(req, res, { public: root }));
if (server) await new Promise((r) => server.listen(0, r));
const base = process.argv[3] ?? `http://localhost:${server.address().port}`;
const page_ = process.env.FRAMES_PAGE ?? `/tests/feedback-kit/harness.html${process.env.FRAMES_QUERY ? `?${process.env.FRAMES_QUERY}` : ''}`;
const suffix = process.env.FRAMES_QUERY ? `-${process.env.FRAMES_QUERY.replace(/[^a-z0-9]+/gi, '_')}` : '';
const widths = (process.env.FRAMES_WIDTHS ?? '1280,320').split(',').map(Number);
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
  async changes(page, shot) {
    const table = page.locator('#changes table');
    await table.scrollIntoViewIfNeeded();
    await shot(table, '0-rest');
    await page.getByTestId('live-update').click();
    for (const [ms, at] of [[60, 60], [340, 400], [500, 900], [400, 1300], [500, 1800], [800, 2600]]) {
      await wait(ms); await shot(table, `1-update-${at}ms`);
    }
    const counts = page.locator('#changes .uix-cluster').nth(1);
    await page.getByTestId('unread-up').click(); await page.getByTestId('open-up').click();
    await wait(40); await shot(counts, '2-count-40ms');
    await wait(60); await shot(counts, '3-count-100ms');
    await wait(300); await shot(counts, '4-count-400ms');
  },
  async optimistic(page, shot) {
    const section = page.locator('#optimistic');
    await section.scrollIntoViewIfNeeded();
    await page.locator('#latency input[type=checkbox]').check();
    await section.getByRole('button').click();
    await wait(100); await shot(section, '1-optimistic-100ms');
    await wait(1250); await shot(section, '2-rolled-back-1350ms');
    await wait(500); await shot(section, '3-1850ms');
    await page.locator('#latency input[type=checkbox]').uncheck();
  },
  async list(page, shot) {
    const list = page.getByTestId('queue');
    await list.scrollIntoViewIfNeeded();
    await page.mouse.move(0, 0);
    await shot(list, '0-rest');
    await page.getByTestId('add').click(); await page.mouse.move(0, 0);
    await wait(60); await shot(list, '1-add-60ms');
    await wait(300); await shot(list, '2-add-360ms');
    await page.getByTestId('resolve').click(); await page.mouse.move(0, 0);
    await wait(50); await shot(list, '3-resolve-50ms');
    await wait(120); await shot(list, '4-resolve-170ms');
    await wait(200); await shot(list, '5-resolve-370ms');
    await page.getByTestId('shuffle').click(); await page.mouse.move(0, 0);
    await wait(80); await shot(list, '6-shuffle-80ms');
    await wait(400); await shot(list, '7-shuffle-480ms');
  },
  async tabs(page, shot) {
    const section = page.locator('#tabs');
    await section.scrollIntoViewIfNeeded();
    await shot(section, '0-rest');
    await page.getByRole('tab', { name: 'About to breach' }).click();
    await page.getByRole('tab', { name: 'Month' }).click();
    await page.getByRole('button', { name: 'Compact' }).click();
    await wait(50); await shot(section, '1-50ms');
    await wait(400); await shot(section, '2-450ms');
    await page.getByText('SLA details').click();
    await wait(40); await shot(section, '3-open-40ms');
    await wait(300); await shot(section, '4-open-340ms');
  },
  async success(page, shot) {
    const section = page.locator('#success');
    await section.scrollIntoViewIfNeeded();
    await page.getByTestId('submit').click();
    for (const ms of [30, 120, 250, 450, 800]) { await wait(ms === 30 ? 30 : ms - [30, 120, 250, 450, 800][[30, 120, 250, 450, 800].indexOf(ms) - 1]); await shot(section, `1-${ms}ms`); }
  },
  // mid-motion frames for review: CSS animations at 1/5 speed (CDP), so a 160 ms slide spans 800 ms
  async indicator(page, shot) {
    const section = page.locator('#tabs');
    await section.scrollIntoViewIfNeeded();
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Animation.enable');
    await cdp.send('Animation.setPlaybackRate', { playbackRate: 0.2 });
    await page.getByRole('tab', { name: 'All open' }).click();
    await page.getByRole('tab', { name: 'Day' }).click();
    await page.getByRole('button', { name: 'Comfortable' }).click();
    await wait(1200);
    await page.getByRole('tab', { name: 'Closed' }).click();
    await page.getByRole('tab', { name: 'Month' }).click();
    await page.getByRole('button', { name: 'Spacious' }).click();
    for (const [ms, label] of [[0, '0'], [150, '20pct'], [250, '50pct'], [300, '80pct'], [500, 'end']]) { await wait(ms); await shot(section, `slow-${label}`); }
    await page.getByTestId('submit').scrollIntoViewIfNeeded();
    await page.getByTestId('submit').click();
    const success = page.locator('#success');
    for (const [ms, label] of [[0, '0'], [300, '1'], [400, '2'], [500, '3'], [800, '4']]) { await wait(ms); await shot(success, `success-slow-${label}`); }
    await cdp.send('Animation.setPlaybackRate', { playbackRate: 1 });
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
    for (const width of widths) {
      const tag = `${theme}-${reducedMotion === 'reduce' ? 'rm' : 'motion'}-${width}${suffix}`;
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
server?.close();
console.log(`frames in ${out}`);
