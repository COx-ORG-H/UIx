import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { probeCase } from '../pseudo-locale/probe.mjs';
import { COMPOUNDS, EXPANSION, accent, pseudoLabels, rtl } from '../pseudo-locale/pseudo.mjs';

/* Pseudo-locale lane (enterprise UX study, roadmap #20). German runs about 30 % longer than English and
 * short strings up to two or three times (W3C/IBM), and German compounds do not wrap without a
 * hyphenation dictionary. tests/pseudo-locale/harness.tsx renders 14 key components at the widths a
 * product gives them, with every kit default label (the English source in english.ts) and the product's
 * own words run through en-XA (accented, ~35 % longer, bracketed) and German compounds where a product
 * puts its titles, tabs and buttons.
 *
 * Gates (en-XA and the English control): no box past its case, no clipped text without an ellipsis or
 * a line clamp, no text spilling out of the block that holds it, no horizontal page scroll, and no
 * English default left on screen (a component that ignores its labels). en-XB (right to left) runs the
 * same probe and only reports: RTL is Tier 3 (study item #35).
 *
 * Geometry does not depend on the theme, so only the light project runs it. Screenshots of four cases
 * per locale are attached to the report (a11y-report artifact), not compared as goldens. */

const HARNESS = '/tests/pseudo-locale/harness.html';
const CASES = ['page-header', 'buttons', 'tabs', 'segmented', 'data-workspace', 'pagination', 'search-bar', 'alert', 'empty', 'chips', 'steps', 'breadcrumbs', 'card', 'select'];
const SHOTS = ['page-header', 'tabs', 'data-workspace', 'steps'];

test.beforeEach(async ({}, testInfo) => {
  test.skip(testInfo.project.name === 'dark', 'layout does not depend on the theme');
});

async function open(page, locale) {
  await page.addInitScript(() => { try { localStorage.setItem('uix-theme', 'light'); } catch { /* private mode */ } });
  await page.goto(`${HARNESS}?locale=${locale}`, { waitUntil: 'networkidle' });
  await page.locator('[data-case="select"]').waitFor();
  await page.evaluate(() => document.fonts.ready);
}

/** Every case's problems, plus the page's horizontal scroll. */
async function measure(page) {
  const cases = {};
  for (const name of CASES) cases[name] = await page.evaluate(probeCase, name);
  const pageScroll = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  return { cases, pageScroll };
}

/** Visible text and accessible names inside the cases that equal an English default. */
const englishLeft = () => {
  const english = new Set(window.__pseudo.english);
  const hits = [];
  for (const sec of document.querySelectorAll('[data-case]')) {
    const walker = document.createTreeWalker(sec, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const text = n.textContent.trim();
      if (text && english.has(text)) hits.push(`${sec.dataset.case}: "${text}"`);
    }
    for (const el of sec.querySelectorAll('[aria-label], [placeholder], [title]')) {
      for (const attr of ['aria-label', 'placeholder', 'title']) {
        const v = el.getAttribute(attr)?.trim();
        if (v && english.has(v)) hits.push(`${sec.dataset.case} @${attr}: "${v}"`);
      }
    }
  }
  return hits;
};

const flat = ({ cases }) => Object.entries(cases).flatMap(([name, r]) => (r.missing ? [`${name}: case not rendered`] : r.problems.map((p) => `${name}: ${p.kind} by ${p.by}px — ${p.el}${p.out ? ` (out of ${p.out})` : ''}`)));

async function shoot(page, testInfo, locale) {
  for (const name of SHOTS) {
    await testInfo.attach(`${locale}-${name}.png`, { body: await page.locator(`[data-case="${name}"]`).screenshot(), contentType: 'image/png' });
  }
}

test('the transform: accents every letter, keeps placeholders, runs about 35 % longer, brackets both ends', () => {
  const out = accent('Clear filters');
  expect(out.startsWith('[') && out.endsWith(']')).toBe(true);
  expect(out).not.toMatch(/[A-Za-z]/);
  expect(out.length).toBeGreaterThanOrEqual(Math.ceil('Clear filters'.length * (1 + EXPANSION)));
  expect(accent('{count} selected')).toMatch(/^\[\{count\} šéļéçţéð/);
  expect(accent('{from}–{to} of {total}')).toContain('{from}–{to} ö');
  expect(rtl('Next')).toBe('‮Next‬');

  const fn = (n) => `${n} rows`;
  const parseDate = (s) => s;
  const labels = pseudoLabels({ a: { b: 'Close', status: { done: 'Done' }, count: fn, parseDate }, dateFormat: { placeholder: 'DD.MM.YYYY' } }, accent);
  expect(labels.a.b).toBe(accent('Close'));
  expect(labels.a.status.done).toBe(accent('Done'));
  expect(labels.a.count(3)).toBe(accent('3 rows'));
  expect(labels.a.parseDate).toBe(parseDate);
  expect(labels.dateFormat.placeholder).toBe('DD.MM.YYYY');
  expect(COMPOUNDS.every((c) => c.length >= 28 && !/\s/.test(c))).toBe(true);
});

test('the English pack, the pseudo-locales' source, has every UixLabels namespace', () => {
  const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
  const iface = read('../../packages/react/src/labels-context.tsx').match(/export interface UixLabels {([sS]*?)
}/)[1];
  const namespaces = [...iface.matchAll(/^ {2}(w+)?:/gm)].map((m) => m[1]).filter((k) => k !== 'dateFormat' && k !== 'locale');
  const source = read('../../packages/react/src/locales/en.ts').match(/export const en: UixLabelPack = {([sS]*?)
};?/)[1];
  const listed = [...source.matchAll(/^ {2}(w+)[:,]/gm)].map((m) => m[1]);
  expect(namespaces.length).toBeGreaterThan(40);
  expect(namespaces.filter((k) => !listed.includes(k)), 'add these to packages/react/src/locales/en.ts (and the other packs)').toEqual([]);
});

test('en-XA: longer words fit every case, and no English default is left on screen', async ({ page }, testInfo) => {
  await open(page, 'en-XA');
  expect(await page.evaluate(() => document.documentElement.lang)).toBe('en-XA');

  const result = await measure(page);
  await testInfo.attach('en-XA-geometry.json', { body: JSON.stringify(result, null, 2), contentType: 'application/json' });
  await shoot(page, testInfo, 'en-XA');
  expect(flat(result), 'clipped or overflowing in en-XA').toEqual([]);
  expect(result.pageScroll, 'horizontal page scroll').toBeLessThanOrEqual(0);
  expect(await page.evaluate(englishLeft), 'English left on screen: these strings do not come from the labels').toEqual([]);
});

test('en (control): the English harness fits too, and the scan sees its defaults', async ({ page }, testInfo) => {
  await open(page, 'en');
  const result = await measure(page);
  await testInfo.attach('en-geometry.json', { body: JSON.stringify(result, null, 2), contentType: 'application/json' });
  expect(flat(result), 'clipped or overflowing in English').toEqual([]);
  // the English-left scan works: in English it finds the kit's own defaults
  expect((await page.evaluate(englishLeft)).length).toBeGreaterThan(5);
});

test('en-XB (right to left): informational, never fails', async ({ page }, testInfo) => {
  await open(page, 'en-XB');
  expect(await page.evaluate(() => document.documentElement.dir)).toBe('rtl');
  const result = await measure(page);
  const problems = flat(result);
  await testInfo.attach('en-XB-geometry.json', { body: JSON.stringify(result, null, 2), contentType: 'application/json' });
  await shoot(page, testInfo, 'en-XB');
  console.log(`en-XB (informational): ${problems.length ? problems.join('; ') : 'no clipping or overflow'}`);
  testInfo.annotations.push({ type: 'rtl (informational)', description: problems.length ? problems.join('\n') : `no clipping or overflow; page scroll ${result.pageScroll}px` });
});
