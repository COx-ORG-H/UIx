/* Docs-site frames of the state-feedback specimens and their live demo (WP2 review aid).
 *   node tests/feedback-kit/docs-frames.mjs <out-dir> [base-url] */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import handler from 'serve-handler';

const [out, given] = process.argv.slice(2);
// without a base URL, serve the repo root on a free port for this run
const root = fileURLToPath(new URL('../..', import.meta.url));
const server = given ? null : createServer((req, res) => handler(req, res, { public: root }));
if (server) await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = given ?? `http://localhost:${server.address().port}`;
mkdirSync(out, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch();
for (const theme of ['light', 'dark']) {
  for (const width of [1280, 320]) {
    for (const reducedMotion of ['no-preference', 'reduce']) {
      const tag = `${theme}-${width}-${reducedMotion === 'reduce' ? 'rm' : 'motion'}`;
      const context = await browser.newContext({ viewport: { width, height: 1000 }, colorScheme: theme, reducedMotion, deviceScaleFactor: 1.5 });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
      await page.addInitScript((t) => { try { localStorage.setItem('uix-theme', t); } catch { /* */ } }, theme);
      await page.goto(`${base}/packages/tokens/docs/index.html#examples-motion`, { waitUntil: 'networkidle' });
      const block = page.locator('[data-feedback-buttons]');
      await block.scrollIntoViewIfNeeded();
      for (const sel of ['[data-feedback-buttons]', '[data-feedback-save-status]', '[data-feedback-busy]', '[data-feedback-change]', '[data-feedback-demo]']) {
        await page.locator(sel).screenshot({ path: join(out, `docs-${tag}-${sel.slice(15, -1)}.png`) });
      }
      const demo = page.locator('[data-feedback-demo]');
      await demo.getByRole('button', { name: 'Answers in 1.2 s' }).click();
      await wait(600); await demo.screenshot({ path: join(out, `docs-${tag}-demo-1-spinner.png`) });
      await wait(900); await demo.screenshot({ path: join(out, `docs-${tag}-demo-2-result.png`) });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      console.log(tag, 'overflow', overflow, 'errors', errors.length ? errors : 'none');
      await context.close();
    }
  }
}
await browser.close();
server?.close();
