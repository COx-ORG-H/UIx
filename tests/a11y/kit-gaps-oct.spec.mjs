/* The kit gaps MOTUS and TENSOR filed in October 2026, in a real browser: a wrapping Button
 * label (HAR-1813), an anchored overlay under CSS zoom (HAR-1798), ContentList titles that
 * break (HAR-1811), MetricInput required + hint (HAR-1819), and five small gaps MOTUS patched
 * locally (HAR-1814). Layout, focus-visible, zoom and painted colours are what jsdom cannot
 * show; each case reads them off the rendered page, plus an axe scan per section in light and
 * dark. Harness: tests/kit-gaps-oct/harness.tsx, bundled from source in globalSetup. */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { settleAnimations, settleOverlay } from './settle.mjs';

const HARNESS = '/tests/kit-gaps-oct/harness.html';
const GATED = new Set(['serious', 'critical']);

const open = async (page, testInfo, viewport) => {
  if (viewport) await page.setViewportSize(viewport);
  await page.addInitScript((t) => { try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ } }, testInfo.project.name);
  await page.goto(HARNESS, { waitUntil: 'networkidle' });
  await expect(page.locator('#wrap')).toBeVisible();
};

const axe = async (page, scope) => {
  await settleAnimations(page);
  const { violations } = await new AxeBuilder({ page }).include(scope).analyze();
  return violations.filter((v) => GATED.has(v.impact)).map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
};

/** A custom property as the browser paints it, for comparing with a computed colour. */
const painted = (page, variable) => page.evaluate((v) => {
  const probe = document.createElement('div');
  probe.style.color = `var(${v})`;
  document.body.append(probe);
  const color = getComputedStyle(probe).color;
  probe.remove();
  return color;
}, variable);

const zoom = (page, factor) => page.evaluate((z) => { document.documentElement.style.zoom = String(z); }, factor);

// ── HAR-1813 ────────────────────────────────────────────────────────────────
test.describe('Button wrap (HAR-1813)', () => {
  test('a long label wraps inside a 320 px column at 200 % zoom; icon and default buttons keep their shape', async ({ page }, testInfo) => {
    // 640 px at zoom 2 leaves the 320 CSS px a phone has.
    await open(page, testInfo, { width: 640, height: 900 });
    await zoom(page, 2);
    const measure = (id) => page.locator(`#${id}`).evaluate((el) => {
      const column = el.closest('.column').getBoundingClientRect();
      const box = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        scroll: el.scrollWidth, client: el.clientWidth, right: box.right, columnRight: column.right,
        width: el.offsetWidth, height: el.offsetHeight, whiteSpace: cs.whiteSpace,
      };
    });
    for (const id of ['wrap-lg', 'wrap-md', 'wrap-link']) {
      const m = await measure(id);
      expect(m.whiteSpace, `${id} may wrap`).toBe('normal');
      expect(m.scroll, `${id}: its label overflows its own box`).toBeLessThanOrEqual(m.client);
      expect(m.right, `${id} ends past its column`).toBeLessThanOrEqual(m.columnRight + 0.5);
      expect(m.height, `${id} should have wrapped onto a second line`).toBeGreaterThan(44);
    }
    const icon = await measure('wrap-icon');
    expect(icon.width, 'an icon-only button stays square').toBe(icon.height);
    const plain = await measure('nowrap-md');
    expect(plain.whiteSpace, 'the default stays on one line').toBe('nowrap');
    const column = await page.locator('#wrap-column').evaluate((el) => ({ s: el.scrollWidth, c: el.clientWidth }));
    expect(column.s, 'the column scrolls sideways').toBeLessThanOrEqual(column.c);
  });
});

// ── HAR-1798 ────────────────────────────────────────────────────────────────
test.describe('anchored overlays under CSS zoom (HAR-1798)', () => {
  for (const factor of [1, 2]) {
    test(`a Select list opens against its trigger, inside the viewport, at zoom ${factor}`, async ({ page }, testInfo) => {
      await open(page, testInfo, { width: 720, height: 780 });
      await zoom(page, factor);
      const trigger = page.locator('#zoom-role');
      await trigger.scrollIntoViewIfNeeded();
      // Low in the viewport, where a list placed at twice its offset falls off the bottom.
      await page.evaluate(() => {
        const r = document.getElementById('zoom-role').getBoundingClientRect();
        window.scrollBy(0, r.bottom - window.innerHeight * 0.55);
      });
      await trigger.click();
      const list = page.getByRole('listbox');
      await expect(list).toBeVisible();
      await settleOverlay(list);
      const geo = await page.evaluate(() => {
        const t = document.getElementById('zoom-role').getBoundingClientRect();
        // The popup, not the listbox inside its padding.
        const list = document.querySelector('[role="listbox"]');
        const l = (list.closest('[popover]') ?? list).getBoundingClientRect();
        return { t: { top: t.top, bottom: t.bottom, left: t.left }, l: { top: l.top, bottom: l.bottom, left: l.left, right: l.right }, vw: window.innerWidth, vh: window.innerHeight };
      });
      expect(geo.l.top, 'the list starts above the viewport').toBeGreaterThanOrEqual(0);
      expect(geo.l.bottom, 'the list ends below the viewport').toBeLessThanOrEqual(geo.vh + 0.5);
      expect(geo.l.right, 'the list ends right of the viewport').toBeLessThanOrEqual(geo.vw + 0.5);
      // Against the trigger: below it, or flipped above it, within the offset (scaled by the zoom).
      const gapBelow = geo.l.top - geo.t.bottom;
      const gapAbove = geo.t.top - geo.l.bottom;
      const near = (gap) => gap >= -1 && gap <= 12 * factor + 2;
      expect(near(gapBelow) || near(gapAbove), `list ${JSON.stringify(geo.l)} is not against the trigger ${JSON.stringify(geo.t)}`).toBe(true);
      expect(Math.abs(geo.l.left - geo.t.left), 'the list is not aligned with the trigger').toBeLessThanOrEqual(2);
      // And the options can be chosen by pointer.
      await page.getByRole('option', { name: 'Administrator' }).click();
      await expect(trigger).toContainText('Administrator');
    });
  }
});

// ── HAR-1811 ────────────────────────────────────────────────────────────────
test('ContentList: an 80-character unbroken title and meta stay inside a 320 px page (HAR-1811)', async ({ page }, testInfo) => {
  await open(page, testInfo, { width: 320, height: 800 });
  const row = page.locator('#content .uix-content-list__item');
  const seen = await row.evaluate((el) => ({
    row: { s: el.scrollWidth, c: el.clientWidth },
    title: getComputedStyle(el.querySelector('.uix-content-list__title')).overflowWrap,
    meta: getComputedStyle(el.querySelector('.uix-content-list__meta')).overflowWrap,
    right: el.getBoundingClientRect().right,
    viewport: document.documentElement.clientWidth,
  }));
  expect(seen.title).toBe('anywhere');
  expect(seen.meta).toBe('anywhere');
  expect(seen.row.s, 'the row overflows').toBeLessThanOrEqual(seen.row.c);
  // The harness page holds wider sections too, so the row is measured, not the document.
  expect(seen.right, `the row ends at ${seen.right} px in a ${seen.viewport} px viewport`).toBeLessThanOrEqual(seen.viewport);
});

// ── HAR-1819 ────────────────────────────────────────────────────────────────
test.describe('MetricInput required and hint (HAR-1819)', () => {
  test('required: the Field marker, native required and aria-required; the hint is read with the input', async ({ page }, testInfo) => {
    await open(page, testInfo);
    const input = page.locator('#loan-days');
    await expect(input).toHaveAttribute('required', '');
    await expect(input).toHaveAttribute('aria-required', 'true');
    const marker = await page.locator('label[for="loan-days"]').evaluate((el) => getComputedStyle(el, '::after').content);
    expect(marker).toBe('" *"');
    await expect(input).toHaveAccessibleDescription('Between 1 and 60 days.');
  });

  test('an error joins the hint in the description', async ({ page }, testInfo) => {
    await open(page, testInfo);
    await expect(page.locator('#renewals')).toHaveAccessibleDescription('At most 5. Too many renewals.');
    await expect(page.locator('#renewals')).toHaveAttribute('aria-invalid', 'true');
  });

  test('axe: no serious or critical violation', async ({ page }, testInfo) => {
    await open(page, testInfo);
    expect(await axe(page, '#metric')).toEqual([]);
  });
});

// ── HAR-1814 ────────────────────────────────────────────────────────────────
test.describe('small gaps MOTUS patched locally (HAR-1814)', () => {
  test('a row the keyboard is in shows its actions and its arrow; the others stay quiet', async ({ page }, testInfo) => {
    await open(page, testInfo);
    await page.mouse.move(0, 0);
    await page.locator('#row-1-link').focus();
    const opacity = (sel) => page.locator(sel).evaluate((el) => Number(getComputedStyle(el).opacity));
    await expect.poll(() => opacity('#row-1-action')).toBe(1);
    await expect.poll(() => opacity('#row-1-arrow')).toBe(1);
    expect(await opacity('#row-2-action')).toBe(0);
  });

  test('a sortable header keeps the type of its plain neighbours', async ({ page }, testInfo) => {
    await open(page, testInfo);
    const type = (sel) => page.locator(sel).evaluate((el) => {
      const cs = getComputedStyle(el);
      return { letterSpacing: cs.letterSpacing, textTransform: cs.textTransform, fontSize: cs.fontSize, fontWeight: cs.fontWeight };
    });
    expect(await type('#sortable-th .uix-th__sortbtn')).toEqual(await type('#plain-th'));
  });

  test('DetailLayout without a side gives the main column the whole width', async ({ page }, testInfo) => {
    await open(page, testInfo, { width: 1280, height: 900 });
    const cols = (sel) => page.locator(sel).evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
    expect(await cols('#detail-no-side')).toBe(1);
    expect(await cols('#detail-with-side'), 'a layout with a side keeps two columns').toBe(2);
    const widths = await page.locator('#detail-no-side').evaluate((el) => ({ layout: el.clientWidth, main: el.querySelector('.uix-detail__main').clientWidth }));
    expect(widths.main).toBe(widths.layout);
  });

  test('a NavItem in a Sidebar draws its own ring inside, where overflow cannot clip it', async ({ page }, testInfo) => {
    await open(page, testInfo);
    await page.locator('#row-2-action').focus();
    for (let i = 0; i < 12; i += 1) {
      if (await page.evaluate(() => document.activeElement?.id) === 'nav-first') break;
      await page.keyboard.press('Tab');
    }
    const ring = await page.locator('#nav-first').evaluate((el) => {
      const cs = getComputedStyle(el);
      return { focused: document.activeElement === el, visible: el.matches(':focus-visible'), style: cs.outlineStyle, width: cs.outlineWidth, offset: cs.outlineOffset };
    });
    expect(ring).toEqual({ focused: true, visible: true, style: 'solid', width: '2px', offset: '-2px' });
  });

  test('Input and Field warning: the warning border and a polite message; an error wins', async ({ page }, testInfo) => {
    await open(page, testInfo);
    const warning = await painted(page, '--uix-warning');
    const danger = await painted(page, '--uix-danger');
    const border = (sel) => page.locator(sel).evaluate((el) => getComputedStyle(el).borderTopColor);
    expect(await border('#warn-input')).toBe(warning);
    await expect(page.locator('#warn-field')).toHaveAttribute('data-warning', 'true');
    expect(await border('#warn-field')).toBe(warning);
    await expect(page.locator('#warn-field')).toHaveAccessibleDescription('Filled in by the assistant: check it.');
    await expect(page.locator('#warning .uix-field__warning')).toHaveAttribute('role', 'status');
    await expect(page.locator('#warn-error')).not.toHaveAttribute('data-warning', /.*/);
    expect(await border('#warn-error')).toBe(danger);
  });

  for (const scope of ['#wrap', '#content', '#table', '#detail', '#nav', '#warning']) {
    test(`axe ${scope}: no serious or critical violation`, async ({ page }, testInfo) => {
      await open(page, testInfo);
      expect(await axe(page, scope)).toEqual([]);
    });
  }
});
