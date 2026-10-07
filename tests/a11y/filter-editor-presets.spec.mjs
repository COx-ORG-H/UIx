/* FilterEditor enum presets in a real browser (HAR-1505; TENSOR R8 AC5, component half).
 * The data-display specimen renders the State editor with a pressed and two unpressed preset
 * chips at load, so both chip states are measured, not only the one axe happens to see.
 * The contrast check paints every computed colour through a canvas (so color-mix() and oklch
 * values resolve to sRGB), composites the backgrounds up the tree, and needs 4.5:1 for preset
 * and option text in both themes at 320 px. Behaviour is in packages/react/src/filter-presets-dom.test.mjs. */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { settleAnimations } from './settle.mjs';

const ROUTE = 'docs/explorer.html#examples-data-display';
const EDITOR = '.uix-filter-editor[data-kind="enum"]';

test.beforeEach(async ({ page }, testInfo) => {
  const theme = testInfo.project.name;
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, theme);
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto(ROUTE, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await page.evaluate(() => document.fonts.ready);
  await page.locator(EDITOR).scrollIntoViewIfNeeded();
  await settleAnimations(page);
});

/** Contrast of each matched element's text against what is painted behind it. */
const contrasts = (page, selector) => page.locator(selector).evaluateAll((els) => {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const rgba = (css) => {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = '#000';
    ctx.fillStyle = css;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    return { r, g, b, a: a / 255 };
  };
  const over = (top, under) => ({
    r: top.r * top.a + under.r * (1 - top.a),
    g: top.g * top.a + under.g * (1 - top.a),
    b: top.b * top.a + under.b * (1 - top.a),
    a: 1,
  });
  const backdrop = (el) => {
    const layers = [];
    for (let node = el; node; node = node.parentElement) {
      const bg = rgba(getComputedStyle(node).backgroundColor);
      if (bg.a > 0) layers.push(bg);
      if (bg.a >= 1) break;
    }
    return layers.reverse().reduce((under, top) => over(top, under), { r: 255, g: 255, b: 255, a: 1 });
  };
  const lum = ({ r, g, b }) => {
    const ch = (v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
  };
  return els.map((el) => {
    const bg = backdrop(el);
    const fg = over(rgba(getComputedStyle(el).color), bg);
    const [hi, lo] = [lum(fg), lum(bg)].sort((x, y) => y - x);
    const owner = el.closest('button');
    return { text: el.textContent.trim(), pressed: owner?.getAttribute('aria-pressed') ?? null, ratio: Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100 };
  });
});

test('preset and option text reach 4.5:1, pressed and unpressed', async ({ page }) => {
  const presets = await contrasts(page, `${EDITOR} .uix-filter-editor__presets .uix-chip__label`);
  expect(presets.map((p) => `${p.text}:${p.pressed}`)).toEqual(['Open work:true', 'Done:false', 'All:false']);
  const options = await contrasts(page, `${EDITOR} .uix-filter-editor__list .uix-checkbox`);
  expect(options.map((o) => o.text)).toEqual(['New', 'Open', 'Pending', 'Resolved']);
  const low = [...presets, ...options].filter((c) => c.ratio < 4.5);
  expect(low, JSON.stringify([...presets, ...options])).toEqual([]);
});

test('no serious or critical axe violations in the enum editor and its chip summary', async ({ page }) => {
  const { violations } = await new AxeBuilder({ page })
    .include(EDITOR)
    .include('[aria-label="Active filters"]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
});

test('at 320 px the presets wrap inside the editor and nothing scrolls sideways', async ({ page }) => {
  const editor = page.locator(EDITOR);
  const box = await editor.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return { left: r.left + parseFloat(cs.paddingLeft), right: r.right - parseFloat(cs.paddingRight), overflow: el.scrollWidth - el.clientWidth };
  });
  expect(box.overflow).toBe(0);
  for (const chip of await editor.locator('.uix-filter-editor__presets .uix-chip').all()) {
    const r = await chip.boundingBox();
    expect(r.x).toBeGreaterThanOrEqual(box.left - 0.5);
    expect(r.x + r.width).toBeLessThanOrEqual(box.right + 0.5);
  }
  const presets = await editor.locator('.uix-filter-editor__presets').boundingBox();
  const list = await editor.locator('.uix-filter-editor__list').boundingBox();
  expect(presets.y + presets.height).toBeLessThanOrEqual(list.y);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
});
