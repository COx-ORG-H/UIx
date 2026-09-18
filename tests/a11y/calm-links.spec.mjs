/* Calm links in chrome and table cells (RX-20 / HAR-363; findings LD-06, SD-17, CM-45).
 *
 * The base layer used to underline EVERY anchor on hover (`a:hover`), so each chrome
 * component had to defend itself with its own `text-decoration: none` — and any that
 * forgot (buttons, tabs) underlined. Consumers then patched the same leak page by page
 * (125 `hover:underline` sites in the product). The base underline now belongs to
 * CONTENT links only: `a[href]:not([class])` carries it persistently (WCAG 1.4.1), and
 * nothing adds one on hover.
 *
 * Three claims, measured in the browser because a cascade only exists when rendered:
 *   1. an anchor styled as a control (`.uix-btn`, `.uix-tab`) never underlines on hover;
 *   2. the id cell's click-through keeps the row's text colour instead of turning accent;
 *   3. `.uix-cell-link` is quiet at REST as well as on hover, and keeps its focus ring.
 * Plus the guard that makes the whole thing safe: prose links still underline.
 *
 * Colours differ per theme, so this runs in both projects. `.uix-btn--link` is excluded
 * from (1) on purpose: button.css underlines it deliberately — it IS a text link.
 */
import { test, expect } from '@playwright/test';

const PAGES = [
  'tables.html',
  'docs/explorer.html#examples-foundations',
  'docs/explorer.html#examples-workspace',
];

const open = async (page, testInfo, path) => {
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, testInfo.project.name);
  await page.goto(path, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', testInfo.project.name);
  await page.evaluate(() => document.fonts.ready); // no late reflow under the pointer
};

/* ── 1 · control-shaped anchors never underline on hover ───────────────────────── */

for (const path of PAGES) {
  test(`control anchors keep no underline on hover — ${path}`, async ({ page }, testInfo) => {
    await open(page, testInfo, path);

    // .uix-btn--link is a deliberate text link (button.css underlines it on hover).
    const controls = page.locator('a.uix-btn:not(.uix-btn--link), a.uix-tab');
    const total = await controls.count();
    const offenders = [];
    let inspected = 0;

    for (let i = 0; i < total; i++) {
      const a = controls.nth(i);
      if (!(await a.isVisible().catch(() => false))) continue;
      inspected++;
      await a.hover({ force: true });
      const seen = await a.evaluate((el) => ({
        cls: el.className,
        text: (el.textContent || '').trim().slice(0, 40),
        decoration: getComputedStyle(el).textDecorationLine,
      }));
      if (seen.decoration.includes('underline')) offenders.push(seen);
    }

    // the denominator, so a selector that silently matches nothing cannot pass as clean
    console.log(`${path}: ${inspected} visible control anchors inspected, ${offenders.length} underlined on hover`);
    expect(inspected, 'no control-shaped anchors found — the scan proved nothing').toBeGreaterThan(0);
    expect(offenders, offenders.map((o) => `${o.cls} "${o.text}" → ${o.decoration}`).join('\n')).toEqual([]);
  });
}

/* ── 2 · the id cell's click-through stays the row's text colour ────────────────── */

test('id-cell click-through keeps the row text colour on hover', async ({ page }, testInfo) => {
  await open(page, testInfo, 'tables.html');
  const btn = page.locator('#grid-detail .uix-id-cell__btn').first();
  await expect(btn).toBeVisible();
  await btn.hover();
  await expect.poll(() => btn.evaluate((el) => el.matches(':hover'))).toBe(true);

  const seen = await btn.evaluate((el) => ({
    color: getComputedStyle(el).color,
    cellColor: getComputedStyle(el.closest('td')).color,
    // the row's own text colour, for the message when this fails
    accent: getComputedStyle(el).getPropertyValue('--uix-accent').trim(),
  }));
  expect(seen.color, `id cell turned ${seen.color}; the row text is ${seen.cellColor}`).toBe(seen.cellColor);
});

/* ── 3 · .uix-cell-link is quiet at rest, on hover and on keyboard focus ───────── */

const cellLinkState = (a) => a.evaluate((el) => ({
  color: getComputedStyle(el).color,
  cellColor: getComputedStyle(el.closest('td')).color,
  decoration: getComputedStyle(el).textDecorationLine,
  focusVisible: el.matches(':focus-visible'),
  outlineWidth: getComputedStyle(el).outlineWidth,
}));

test('.uix-cell-link is quiet at rest', async ({ page }, testInfo) => {
  await open(page, testInfo, 'tables.html');
  const a = page.locator('.uix-table .uix-cell-link').first();
  await expect(a, 'no .uix-cell-link specimen on tables.html').toBeVisible();
  const s = await cellLinkState(a);
  expect(s.decoration).toBe('none');
  expect(s.color, `rest colour ${s.color} differs from the cell's ${s.cellColor}`).toBe(s.cellColor);
});

test('.uix-cell-link stays quiet on hover', async ({ page }, testInfo) => {
  await open(page, testInfo, 'tables.html');
  const a = page.locator('.uix-table .uix-cell-link').first();
  await expect(a).toBeVisible();
  await a.hover();
  await expect.poll(() => a.evaluate((el) => el.matches(':hover'))).toBe(true);
  const s = await cellLinkState(a);
  expect(s.decoration).toBe('none');
  expect(s.color).toBe(s.cellColor);
});

test('.uix-cell-link keeps a visible focus ring on keyboard focus', async ({ page }, testInfo) => {
  await open(page, testInfo, 'tables.html');
  const a = page.locator('.uix-table .uix-cell-link').first();
  await expect(a).toBeVisible();
  await page.keyboard.press('Shift'); // a keyboard modality, so focus() matches :focus-visible
  await a.focus();
  const s = await cellLinkState(a);
  expect(s.focusVisible).toBe(true);
  expect(Number.parseFloat(s.outlineWidth), 'the focus ring is the only keyboard cue').toBeGreaterThan(0);
  expect(s.decoration).toBe('none');
  expect(s.color).toBe(s.cellColor);
});

/* ── guard · content links in prose keep their underline ───────────────────────── */

for (const path of PAGES) {
  test(`prose links still underline, at rest and on hover — ${path}`, async ({ page }, testInfo) => {
    await open(page, testInfo, path);
    // A link in a text block: a classless anchor inside a paragraph. That is exactly the
    // shape WCAG 1.4.1 is about, and the one case that keeps the persistent underline.
    // Chrome anchors (nav, header, footer) and registry slots are quiet by design, and a
    // classless anchor can appear in either, so neither belongs in this guard.
    const prose = page.locator('p a[href]:not([class])');
    const total = await prose.count();
    let inspected = 0;

    for (let i = 0; i < total; i++) {
      const a = prose.nth(i);
      if (!(await a.isVisible().catch(() => false))) continue;
      if (await a.evaluate((el) => !!el.closest('nav, header, footer, [role="navigation"], .uix-table, .uix-dl'))) continue;
      inspected++;
      await expect(a).toHaveCSS('text-decoration-line', 'underline');
      await a.hover({ force: true });
      await expect(a).toHaveCSS('text-decoration-line', 'underline');
    }

    console.log(`${path}: ${inspected} prose content links inspected, all underlined`);
    expect(inspected, 'no prose links found — the guard proved nothing').toBeGreaterThan(0);
  });
}
