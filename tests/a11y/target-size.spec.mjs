/* Hit area of at least 24 px, kit-wide (WCAG 2.2 SC 2.5.8; HAR-3104, the UI climb rules).
 *
 * Two measures over the canonical docs and every example route (the pages a11y.spec.mjs scans):
 *
 * - `axe`: axe-core's `target-size` rule, the WCAG measure. A target under 24 × 24 px passes when a
 *   24 px circle around it overlaps no other target, so it only flags small targets that crowd.
 * - `ownBox`: the measure of TENSOR's UI council probe (scripts/lib/ui-council/browser.mjs), the bar
 *   the UI climbs hold every page to: a control whose own box is under 24 px in either direction,
 *   spacing or not. Not counted: a link inside running text (WCAG's inline exception), a visually
 *   hidden form proxy, and a checkbox or radio inside its <label> (the label is what is pressed).
 *   Only controls in the page's content count, not the docs explorer's own navigation.
 *
 * It is a ratchet, not a zero bar: the kit had undersized targets when this test arrived. Each page's
 * counts are in target-size-baseline.json and may never rise. When a fix brings a page under its
 * count the test fails too, so the baseline is lowered in the same change and the target cannot come
 * back. A page that is not listed is held at 0.
 *
 * To lower the baseline after a fix (one worker: the file is read and written per page):
 *   UPDATE_TARGET_SIZE_BASELINE=1 npx playwright test tests/a11y/target-size.spec.mjs --project=light --workers=1
 * The update only ever lowers a count; raising one is a decision for review, by hand.
 *
 * Geometry is the same in both themes, so only the light project runs it.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync, writeFileSync } from 'node:fs';
import { SHOWCASE_PAGES } from '../../packages/tokens/docs/showcase-data.js';

const BASELINE_URL = new URL('./target-size-baseline.json', import.meta.url);
const UPDATE = process.env.UPDATE_TARGET_SIZE_BASELINE === '1';
const MEASURES = ['axe', 'ownBox'];

const PAGES = [
  { name: 'tables', path: 'tables.html' },
  { name: 'docs', path: 'docs/explorer.html#introduction' },
  { name: 'docs-status', path: 'docs/explorer.html#component-status' },
  { name: 'docs-chart', path: 'docs/explorer.html#chart' },
  { name: 'docs-pipeline', path: 'docs/explorer.html#pipeline' },
  { name: 'docs-flow', path: 'docs/explorer.html#flow' },
  { name: 'docs-calendar-model', path: 'docs/explorer.html#calendar-model' },
  ...SHOWCASE_PAGES.map(({ slug }) => ({ name: slug, path: `docs/explorer.html#${slug}` })),
];

const readBaseline = () => JSON.parse(readFileSync(BASELINE_URL, 'utf8'));

/** The council probe's rule, in the page: controls in the content whose own box is under 24 px. */
const ownBoxTargets = () => {
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
  };
  const chrome = (el) => !!el.closest('aside, .docs-nav, .docs-sidebar, .uix-guide__nav, header.docs-header');
  const hiddenProxy = (el) => el.matches('.uix-visually-hidden, .uix-select__proxy, [data-uix-select-proxy]')
    || (() => { const s = getComputedStyle(el); return s.clip === 'rect(0px, 0px, 0px, 0px)' || s.clipPath === 'inset(50%)'; })();
  const inLabel = (el) => el.matches('input[type="checkbox"], input[type="radio"]') && !!el.closest('label');
  // WCAG 2.5.8's inline exception: a link whose line is set by the text around it
  const inline = (el) => el.tagName === 'A' && [...(el.parentElement?.childNodes ?? [])].some((n) => n !== el && n.nodeType === 3 && n.textContent.trim());
  const describe = (el) => `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? `.${el.className.trim().split(/\s+/).slice(0, 2).join('.')}` : ''}`;
  return [...document.querySelectorAll('a[href], button, [role="button"], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
    .filter((el) => visible(el) && !chrome(el) && !hiddenProxy(el) && !inLabel(el) && !inline(el))
    .filter((el) => { const r = el.getBoundingClientRect(); return r.width < 24 || r.height < 24; })
    .map((el) => { const r = el.getBoundingClientRect(); return `${describe(el)} ${Math.round(r.width)}x${Math.round(r.height)}`; });
};

for (const pg of PAGES) {
  test(`targets of at least 24 px: ${pg.name}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'light', 'target geometry does not depend on the theme');
    await page.addInitScript(() => { try { localStorage.setItem('uix-theme', 'light'); } catch { /* private mode */ } });
    await page.goto(pg.path, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);

    const { violations } = await new AxeBuilder({ page }).withRules(['target-size']).analyze();
    const found = {
      axe: violations.flatMap((v) => v.nodes.map((n) => n.target.join(' '))),
      ownBox: await page.evaluate(ownBoxTargets),
    };
    await testInfo.attach('targets-under-24px.json', { body: JSON.stringify(found, null, 2), contentType: 'application/json' });

    const allowed = (baseline) => Object.fromEntries(MEASURES.map((m) => [m, baseline.pages[pg.name]?.[m] ?? 0]));
    if (UPDATE) {
      const next = readBaseline();
      const was = allowed(next);
      const entry = { ...next.pages[pg.name] };
      for (const m of MEASURES) if (found[m].length < was[m]) entry[m] = found[m].length;
      for (const m of MEASURES) if (entry[m] === 0) delete entry[m];
      if (Object.keys(entry).length) next.pages[pg.name] = entry; else delete next.pages[pg.name];
      writeFileSync(BASELINE_URL, `${JSON.stringify(next, null, 2)}\n`);
      return;
    }

    const limit = allowed(readBaseline());
    for (const m of MEASURES) {
      expect(found[m].length, `${pg.name} (${m}): ${found[m].length} target(s) under 24 px, the baseline allows ${limit[m]}:\n    ${found[m].join('\n    ')}`).toBeLessThanOrEqual(limit[m]);
    }
    for (const m of MEASURES) {
      expect(found[m].length, `${pg.name} (${m}): down to ${found[m].length} from ${limit[m]}. Lower tests/a11y/target-size-baseline.json (see the header of this file) so the fixed targets cannot come back`).toBe(limit[m]);
    }
  });
}

test('the baseline names only pages this test scans, with positive whole counts', () => {
  const { pages } = readBaseline();
  const names = new Set(PAGES.map((p) => p.name));
  for (const [name, counts] of Object.entries(pages)) {
    expect(names.has(name), `target-size-baseline.json names "${name}", which is not a scanned page`).toBe(true);
    for (const [measure, count] of Object.entries(counts)) {
      expect(MEASURES.includes(measure), `${name}: unknown measure "${measure}"`).toBe(true);
      expect(Number.isInteger(count) && count > 0, `${name} ${measure}: a count is a positive integer; a page at 0 is left out`).toBe(true);
    }
  }
});
