/* Calm row links (tables.html → "Row links").
 *
 * Body-row links must not underline or turn link-coloured on hover/focus: the base layer's
 * `a:hover` and link.css's data-cell hover rule both used to reach them, and link.css loads
 * later at equal specificity, so only the rendered result proves table.css wins. The row
 * tint eases in over --uix-dur-fast, and not at all under reduced motion.
 * Colours differ per theme, so this runs in both projects.
 */
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }, testInfo) => {
  const theme = testInfo.project.name;
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, theme);
  await page.goto('tables.html', { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await page.evaluate(() => document.fonts.ready); // no late reflow under the pointer
});

const table = (page) => page.getByRole('table', { name: 'Row links example' });

/** The anchor's colour + underline next to its cell's text colour. */
const linkStyle = (a) => a.evaluate((el) => {
  const cs = getComputedStyle(el);
  return {
    color: cs.color,
    cellColor: getComputedStyle(el.closest('td')).color,
    decoration: cs.textDecorationLine,
    focusVisible: el.matches(':focus-visible'),
  };
});

for (const [label, pick] of [
  ['plain anchor', (t) => t.locator('tbody td:first-child a').first()],
  ['class-bearing anchor', (t) => t.locator('tbody a.tbx-rowlink').first()],
]) {
  test(`${label}: no underline and row text colour on hover`, async ({ page }) => {
    const a = pick(table(page));
    await a.hover();
    // a plain anchor is already un-underlined at rest, so prove the hover actually landed
    await expect.poll(() => a.evaluate((el) => el.matches(':hover'))).toBe(true);
    await expect(a).toHaveCSS('text-decoration-line', 'none');
    const s = await linkStyle(a);
    expect(s.color).toBe(s.cellColor);
  });

  test(`${label}: no underline and row text colour on keyboard focus`, async ({ page }) => {
    const a = pick(table(page));
    await page.keyboard.press('Shift'); // a keyboard modality, so focus() matches :focus-visible
    await a.focus();
    const s = await linkStyle(a);
    expect(s.focusVisible).toBe(true);
    expect(s.decoration).toBe('none');
    expect(s.color).toBe(s.cellColor);
  });
}

test('row and pinned cell ease their background; none under reduced motion', async ({ page }) => {
  const row = table(page).locator('tbody tr').first();
  const pinned = row.locator('td').first();
  const transition = (loc) => loc.evaluate((el) => {
    const cs = getComputedStyle(el);
    return { property: cs.transitionProperty, duration: cs.transitionDuration };
  });

  for (const loc of [row, pinned]) {
    const t = await transition(loc);
    expect(t.property).toBe('background-color');
    expect(Number.parseFloat(t.duration)).toBeGreaterThan(0.01);
  }

  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const loc of [row, pinned]) {
    expect((await transition(loc)).property).toBe('none');
  }
});
