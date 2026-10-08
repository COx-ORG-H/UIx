/* FilterPopover is a plain field: no tag band, even spacing (HAR-1573).
 *
 * The popover used to wrap its control in <label class="uix-label">, the Label tag pill. It drew an
 * accent-tinted band (padding 1px 8px) around "Status" and the select, with 1 px between the select
 * and the band's bottom edge. A scoped `display: grid` rule hid the layout side of that collision,
 * and no golden covered the route, so every gate stayed green. jsdom has no layout, so the spacing
 * is measured here on the docs specimen (the same markup the React adapter renders; the markup and
 * label[for] are also pinned by packages/react/src/filter-popover-field.test.mjs).
 *
 * Runs in both theme projects, at desktop width and at 320 px.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROUTE = 'docs/explorer.html#filter-popover';

const open = async (page, theme, width) => {
  await page.addInitScript((t) => { try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ } }, theme);
  await page.setViewportSize({ width, height: 900 });
  await page.goto(ROUTE, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await page.evaluate(() => document.fonts.ready);
  const popover = page.locator('.uix-docs__page .uix-filter-popover');
  await expect(popover).toHaveCount(1);
  await expect(popover).toBeVisible();
  return popover;
};

const measure = (popover) => popover.evaluate((root) => {
  const label = root.querySelector('label');
  // Fall back to the first control so the old markup (no for/id) fails on the assertions, not here.
  const control = (label.htmlFor && document.getElementById(label.htmlFor)) || root.querySelector('select, input');
  const actions = root.querySelector('.uix-filter-popover__actions');
  const box = (el) => el.getBoundingClientRect();
  const cs = getComputedStyle(root);
  const inner = (() => {
    const r = box(root);
    return {
      top: r.top + parseFloat(cs.borderTopWidth), bottom: r.bottom - parseFloat(cs.borderBottomWidth),
      left: r.left + parseFloat(cs.borderLeftWidth), right: r.right - parseFloat(cs.borderRightWidth),
    };
  })();
  const r = (n) => Math.round(n * 100) / 100;
  const L = box(label); const C = box(control); const A = box(actions);
  // Every element between the popover and the control: none may paint a band or pad the field.
  const chain = [];
  for (let el = control.parentElement; el && el !== root; el = el.parentElement) chain.push(el);
  return {
    labelClass: label.className,
    labelFor: label.htmlFor,
    controlId: control.id || null,
    controlTag: control.tagName,
    labelWrapsControl: label.contains(control),
    tagPills: root.querySelectorAll('.uix-label').length,
    bands: [label, ...chain].map((el) => {
      const s = getComputedStyle(el);
      return { el: `${el.tagName.toLowerCase()}.${el.className}`, background: s.backgroundColor, padding: s.padding };
    }),
    labelColor: getComputedStyle(label).color,
    textColor: getComputedStyle(document.documentElement).getPropertyValue('--uix-text').trim(),
    labelToControl: r(C.top - L.bottom),
    controlToActions: r(A.top - C.bottom),
    padTop: r(L.top - inner.top),
    padBottom: r(inner.bottom - A.bottom),
    padLeft: r(Math.min(L.left, C.left, A.left) - inner.left),
    padRight: r(inner.right - Math.max(C.right, A.right)),
    paddingCss: cs.padding,
    popoverRight: r(box(root).right),
    viewport: window.innerWidth,
    popoverSize: `${r(box(root).width)} x ${r(box(root).height)}`,
  };
});

for (const width of [1280, 320]) {
  test(`#filter-popover at ${width}px: plain label, 8 px to the control, 16 px to the actions, 16 px padding`, async ({ page }, testInfo) => {
    const theme = testInfo.project.name;
    const m = await measure(await open(page, theme, width));
    testInfo.annotations.push({ type: 'measured', description: JSON.stringify({ theme, width, ...m }) });
    console.log(`[filter-popover] ${theme} ${width}px ${JSON.stringify(m)}`);

    expect(m.tagPills, 'no .uix-label tag pill inside the popover').toBe(0);
    expect(m.labelClass).toBe('uix-field__label');
    expect(m.labelWrapsControl, 'the label sits above the control, not around it').toBe(false);
    expect(m.controlId).toBeTruthy();
    expect(m.labelFor, 'label[for] equals the control id').toBe(m.controlId);
    for (const band of m.bands) {
      expect(band.background, `${band.el} paints no band`).toBe('rgba(0, 0, 0, 0)');
      expect(band.padding, `${band.el} has no padding`).toBe('0px');
    }
    expect(m.labelToControl).toBeCloseTo(8, 0);
    expect(m.controlToActions).toBeCloseTo(16, 0);
    expect(m.paddingCss).toBe('16px');
    for (const side of ['padTop', 'padBottom', 'padLeft', 'padRight']) expect(m[side], side).toBeCloseTo(16, 0);
    expect(m.popoverRight, 'the popover fits the viewport').toBeLessThanOrEqual(m.viewport);
  });
}

test('#filter-popover is axe-clean', async ({ page }, testInfo) => {
  await open(page, testInfo.project.name, 1280);
  const specimen = await new AxeBuilder({ page })
    .include('.uix-docs__page .uix-filter-popover')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(specimen.violations.map((v) => `${v.impact} ${v.id}: ${v.nodes.length}`), 'the specimen, any impact').toEqual([]);
  const route = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(route.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.impact} ${v.id}: ${v.nodes.length}`), 'the route, serious + critical').toEqual([]);
});
