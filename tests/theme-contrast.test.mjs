import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const base = new URL('../packages/tokens/', import.meta.url);
const read = (path) => readFile(new URL(path, base), 'utf8');
const darkSource = JSON.parse(await read('tokens/dark/color.json'));
const built = await read('build/css/tokens.css');
const oldHover = /(--uix-accent-hover:\s*)color-mix\(in srgb, var\(--uix-accent\) \d+%, #FFFFFF\)/;
assert.match(built, oldHover, 'test must replace the current generated dark hover with the authored value');
const tokens = built.replace(oldHover, `$1${darkSource['accent-hover'].$value}`);
const button = await read('styles/components/button.css');
const themes = (await readdir(new URL('themes/', base))).filter((name) => name.endsWith('.tokens.json'));

test('authored colors render legible buttons and visible focus in Chromium', async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    for (const file of [null, ...themes]) for (const mode of ['light', 'dark']) {
      const values = file ? JSON.parse(await read(`themes/${file}`)) : {};
      const declarations = (which) => Object.entries(values).filter(([name, value]) => !name.startsWith('__') && value[which] != null).map(([name, value]) => `--uix-${name}:${value[which]};`).join('');
      const css = `${tokens}\n:root{${declarations('light')}} :root[data-theme="dark"]{${declarations('dark')}}\n${button}\nbody{background:var(--uix-surface)} *{transition:none!important}`;
      await page.setContent(`<html data-theme="${mode}"><head></head><body><button class="uix-btn uix-btn--primary">Action</button></body></html>`);
      await page.addStyleTag({ content: css });
      await page.mouse.move(0, 0);
      const measure = async (focus = false) => page.locator('button').evaluate((el, focus) => {
        const color = (value) => {
          const values = value.match(/[\d.]+/g).map(Number);
          return value.startsWith('color(') ? values.slice(0, 3) : values.slice(0, 3).map((n) => n / 255);
        };
        const lum = (c) => c.map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4).reduce((sum, n, i) => sum + n * [0.2126, 0.7152, 0.0722][i], 0);
        const s = getComputedStyle(el);
        const pair = [lum(color(focus ? s.outlineColor : s.color)), lum(color(focus ? getComputedStyle(document.body).backgroundColor : s.backgroundColor))].sort((a, b) => b - a);
        return (pair[0] + 0.05) / (pair[1] + 0.05);
      }, focus);
      assert.ok(await measure() >= 4.5, `${file ?? 'default'} ${mode} rest`);
      const rest = await page.locator('button').evaluate((el) => getComputedStyle(el).backgroundColor);
      await page.locator('button').hover();
      assert.notEqual(await page.locator('button').evaluate((el) => getComputedStyle(el).backgroundColor), rest, 'hover changes the fill');
      assert.ok(await measure() >= 4.5, `${file ?? 'default'} ${mode} hover`);
      await page.keyboard.press('Tab');
      assert.equal(await page.locator('button').evaluate((el) => getComputedStyle(el).outlineStyle), 'solid');
      assert.ok(await measure(true) >= 3, `${file ?? 'default'} ${mode} focus ring`);
    }
  } finally { await browser.close(); }
});
