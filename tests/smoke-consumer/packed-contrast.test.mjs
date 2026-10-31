import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from '@playwright/test';

const root = process.env.UIX_PACKED_TOKENS;
if (!root) throw new Error('Set UIX_PACKED_TOKENS to the installed packed tokens package');
const css = await readFile(join(root, 'build/css/styles.css'), 'utf8');
const themes = (await readdir(join(root, 'themes'))).filter((file) => file.endsWith('.css'));
assert.ok(themes.length > 0, 'the packed package contains themes');

test('packed primary buttons meet contrast in Chromium at rest and hover', async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    for (const theme of [null, ...themes]) for (const mode of ['light', 'dark']) {
      const override = theme ? await readFile(join(root, 'themes', theme), 'utf8') : '';
      await page.setContent(`<html data-theme="${mode}"><body><button class="uix-btn uix-btn--primary">Action</button></body></html>`);
      await page.addStyleTag({ content: `${css}\n${override}\n*{transition:none!important}` });
      await page.mouse.move(0, 0);
      const contrast = () => page.locator('button').evaluate((el) => {
        const rgb = (value) => { const values = value.match(/[\d.]+/g).map(Number); return value.startsWith('color(') ? values.slice(0, 3) : values.slice(0, 3).map((n) => n / 255); };
        const lum = (c) => c.map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4).reduce((sum, n, i) => sum + n * [0.2126, 0.7152, 0.0722][i], 0);
        const s = getComputedStyle(el); const pair = [lum(rgb(s.color)), lum(rgb(s.backgroundColor))].sort((a, b) => b - a);
        return (pair[0] + 0.05) / (pair[1] + 0.05);
      });
      assert.ok(await contrast() >= 4.5, `${theme ?? 'default'} ${mode} rest`);
      const rest = await page.locator('button').evaluate((el) => getComputedStyle(el).backgroundColor);
      await page.locator('button').hover();
      assert.notEqual(await page.locator('button').evaluate((el) => getComputedStyle(el).backgroundColor), rest, 'hover changes the fill');
      assert.ok(await contrast() >= 4.5, `${theme ?? 'default'} ${mode} hover`);
    }
  } finally { await browser.close(); }
});
