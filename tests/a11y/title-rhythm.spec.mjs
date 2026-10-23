/* One title -> secondary-text rhythm across the kit (HAR-1577, after HAR-1568).
 *
 * After HAR-1568 every title and its secondary text stacked, but List, Attachment, Media and NavItem
 * did so with a 0 px box gap (only line-height between them) while Alert, Card, Chart, Contact, Inbox,
 * ToggleRow, Pipeline and Toast used --uix-space-1 (4 px). Now they all do:
 *   1. on every explorer route, each title element (`__title|name|label|subject`) and the secondary
 *      element that follows it are 4 px ± 0.5 apart, except the pairs below, which are a different tier
 *      on purpose (each with its reason);
 *   2. List, Attachment (plain markup and the React row), Media and NavItem built from <span>s measure
 *      4 px ± 0.5, in both themes, at 1280 and 375.
 * The sweep also caught the docs' own prose rules (`.uix-docs__page h2/h3/p`) giving kit headings docs
 * margins (a 16 px page-header subtitle gap, a 12 px chart subtitle gap); docs.css now leaves any
 * element with a kit class alone. */
import { test, expect } from '@playwright/test';

const OTHER_TIER = [
  { block: 'uix-collapsible', why: 'Collapsible header: the meta trails the title on the header row (inline by design, HAR-1568)' },
  { block: 'uix-page-header', why: 'The page heading tier: the subtitle sits --uix-space-2 under a 24-40 px title' },
  { block: 'uix-featured', why: 'Editorial featured story: a display-size title, --uix-space-3 to its standfirst' },
  { block: 'uix-popconfirm', why: 'A small dialog: the body is a paragraph under its title, --uix-space-2' },
  { block: 'uix-search-suggest', why: 'Dense result rows (2 px): the operator\'s "dense lists may want 2 px" call, left as it was' },
];

const open = async (page, route) => {
  await page.goto(`docs/explorer.html#${route}`, { waitUntil: 'networkidle' });
  await expect(page.locator('.uix-docs__page')).toBeVisible();
  await page.evaluate(() => document.fonts.ready.then(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))));
};

const pairsOnPage = (allow) => {
  const TITLE = /^uix-[a-z0-9-]+__(title|name|label|subject)$/;
  const SECOND = /^uix-[a-z0-9-]+__(meta|msg|desc|description|sub|subtitle|summary|preview|role|hint|body|size)$/;
  const out = [];
  for (const el of document.querySelector('.uix-docs__page').querySelectorAll('[class*="__"]')) {
    const tc = [...el.classList].find((c) => TITLE.test(c));
    if (!tc || tc.startsWith('uix-docs') || allow.includes(tc.split('__')[0])) continue;
    const sec = el.nextElementSibling;
    const sc = sec && [...sec.classList].find((c) => SECOND.test(c));
    if (!sc) continue;
    const a = el.getBoundingClientRect();
    const b = sec.getBoundingClientRect();
    if (!a.height || !b.height) continue;
    out.push({ pair: `${tc} -> ${sc}`, gap: b.top - a.bottom });
  }
  return out;
};

test('every title and its secondary text are --uix-space-1 apart, on every explorer route', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'light', 'layout only');
  test.setTimeout(300_000);
  await open(page, 'introduction');
  const routes = await page.evaluate(() => [...new Set([...document.querySelectorAll('[data-uix-docs-nav] a[href^="#"]')].map((a) => a.getAttribute('href').slice(1)))]);
  expect(routes.length).toBeGreaterThan(100);
  const off = [];
  const seen = new Set();
  for (const route of routes) {
    await open(page, route);
    for (const { pair, gap } of await page.evaluate(pairsOnPage, OTHER_TIER.map((p) => p.block))) {
      seen.add(pair);
      if (Math.abs(gap - 4) > 0.5) off.push(`${route}: ${pair} ${gap.toFixed(1)} px`);
    }
  }
  // the four pairs this issue is about are on the pages, and measured
  for (const pair of ['uix-list__title -> uix-list__meta', 'uix-attachment__name -> uix-attachment__size', 'uix-media__name -> uix-media__meta']) {
    expect([...seen], pair).toContain(pair);
  }
  expect(off).toEqual([]);
});

/* Markup a consumer could plausibly write: <span>s, one row each. */
const PROBES = `
<div class="uix-list" data-probe="list"><a class="uix-list__item" href="#x"><span><span class="uix-list__title">Identity gateway</span><span class="uix-list__meta">Updated 8 minutes ago</span></span></a></div>
<div class="uix-attachments" data-probe="attachment"><div class="uix-attachment"><span class="uix-attachment__icon"></span><span><span class="uix-attachment__name">signed-contract.pdf</span><span class="uix-attachment__size">2.4 MB</span></span></div></div>
<ul class="uix-attachments uix-attachments--list" data-probe="attachment-react"><li class="uix-attachment"><span class="uix-attachment__icon"></span><span class="uix-attachment__body"><span class="uix-attachment__line"><a class="uix-attachment__name" href="#x">floor-plan.png</a></span><span class="uix-attachment__meta"><span class="uix-attachment__size">1.1 MB</span></span></span></li></ul>
<div class="uix-media" data-probe="media"><span class="uix-media__thumb"></span><span><span class="uix-media__name">MacBook Pro 14"</span><span class="uix-media__meta">Asset #A-1043</span></span></div>
<nav class="uix-sidebar" data-probe="navitem" style="width:260px"><a class="uix-navitem" href="#x" data-multiline><span class="uix-navitem__text"><span class="uix-navitem__label">Change advisory board</span><span class="uix-navitem__desc">4 changes waiting for review this week</span></span></a></nav>`;

const CASES = [
  ['list', '.uix-list__title', '.uix-list__meta'],
  ['attachment', '.uix-attachment__name', '.uix-attachment__size'],
  ['attachment-react', '.uix-attachment__line', '.uix-attachment__meta'],
  ['media', '.uix-media__name', '.uix-media__meta'],
  ['navitem', '.uix-navitem__label', '.uix-navitem__desc'],
];

for (const viewport of [{ width: 1280, height: 900 }, { width: 375, height: 800 }]) {
  test(`List, Attachment, Media and NavItem from <span>s: 4 px ± 0.5 at ${viewport.width} px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.addInitScript((t) => { try { localStorage.setItem('uix-theme', t); } catch { /* private */ } }, testInfo.project.name);
    await open(page, 'introduction');
    await page.evaluate((html) => {
      const host = document.createElement('div');
      host.style.cssText = 'max-width:340px;padding:8px;display:grid;gap:16px';
      host.innerHTML = html;
      document.querySelector('.uix-docs__page').prepend(host);
    }, PROBES);
    for (const [probe, titleSel, secSel] of CASES) {
      const gap = await page.evaluate(([p, t, s]) => {
        const root = document.querySelector(`[data-probe="${p}"]`);
        return root.querySelector(s).getBoundingClientRect().top - root.querySelector(t).getBoundingClientRect().bottom;
      }, [probe, titleSel, secSel]);
      expect(Math.abs(gap - 4), `${probe}: ${gap.toFixed(2)} px`).toBeLessThanOrEqual(0.5);
    }
  });
}
