/* Operator primitives (TENSOR incident page): Tabs overflow="scroll", the toned / compact /
 * interactive Stat, and CopyButton — the real React components, bundled from source in
 * globalSetup (tests/operator-primitives/build.mjs). Runs in both theme projects.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const SPECIMEN = '/tests/operator-primitives/harness.html';

const open = async (page, theme, init, arg) => {
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, theme);
  if (init) await page.addInitScript(init, arg);
  await page.goto(SPECIMEN, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await expect(page.getByRole('heading', { name: 'Operator primitives' })).toBeVisible();
};

test('no serious or critical axe violations', async ({ page }, testInfo) => {
  await open(page, testInfo.project.name);
  // open one editor so the expanded state is scanned too
  await page.getByRole('button', { name: /^Priority : P2 , change$/ }).first().click();
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const gated = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(gated.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
});

test.describe('Tabs overflow="scroll"', () => {
  const tabs = (page, variant = 'line') => page.locator(`[data-specimen="tabs-${variant}"]`);

  test('Arrow, Home and End still move the selection, and the selected tab scrolls into view', async ({ page }, testInfo) => {
    await open(page, testInfo.project.name);
    await page.setViewportSize({ width: 360, height: 800 });
    const root = tabs(page);
    const list = root.getByRole('tablist');
    const all = root.getByRole('tab');
    await all.first().focus();
    await page.keyboard.press('ArrowRight');
    await expect(all.nth(1)).toHaveAttribute('aria-selected', 'true');
    await expect(all.nth(1)).toBeFocused();
    await page.keyboard.press('End');
    await expect(all.last()).toHaveAttribute('aria-selected', 'true');
    await expect(root.getByRole('tabpanel')).toHaveText('Attachments for INC-2043.');
    // fully inside the scrolling list, not only inside the page
    await expect.poll(() => all.last().evaluate((tab) => {
      const l = tab.parentElement.getBoundingClientRect();
      const t = tab.getBoundingClientRect();
      return t.left >= l.left - 1 && t.right <= l.right + 1;
    })).toBe(true);
    await page.keyboard.press('Home');
    await expect(all.first()).toHaveAttribute('aria-selected', 'true');
    await expect.poll(() => list.evaluate((el) => el.scrollLeft)).toBe(0);
    await page.keyboard.press('ArrowLeft'); // wraps
    await expect(all.last()).toHaveAttribute('aria-selected', 'true');
  });

  test('edge buttons appear only on the overflowing side and page by 80% of the width', async ({ page }, testInfo) => {
    await open(page, testInfo.project.name);
    await page.setViewportSize({ width: 360, height: 800 });
    const root = tabs(page);
    const list = root.getByRole('tablist');
    const prev = root.locator('.uix-tabs-scroller__prev');
    const next = root.locator('.uix-tabs-scroller__next');
    await expect(prev).toBeHidden();
    await expect(next).toBeVisible();
    await expect(next).toHaveAttribute('aria-hidden', 'true');
    await expect(next).toHaveAttribute('tabindex', '-1');

    const width = await list.evaluate((el) => el.clientWidth);
    await next.click();
    await expect.poll(() => list.evaluate((el) => el.scrollLeft)).toBeGreaterThan(width * 0.8 - 2);
    await expect(prev).toBeVisible();
    // the click must not park focus on the aria-hidden control
    expect(await next.evaluate((el) => el === document.activeElement)).toBe(false);

    await list.evaluate((el) => { el.scrollLeft = el.scrollWidth; });
    await expect(next).toBeHidden();
    await expect(prev).toBeVisible();
  });

  test('no edge buttons when every tab fits', async ({ page }, testInfo) => {
    await open(page, testInfo.project.name);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.locator('[data-specimen="tabs-line"]').evaluate((el) => { el.style.width = '400rem'; });
    const root = tabs(page);
    await expect(root.locator('.uix-tabs-scroller__next')).toBeHidden();
    await expect(root.locator('.uix-tabs-scroller__prev')).toBeHidden();
  });

  test('2.5× labels at 360px: no clipped text, at most two lines, no page-level horizontal scroll', async ({ page }, testInfo) => {
    await open(page, testInfo.project.name);
    await page.setViewportSize({ width: 360, height: 800 });
    for (const variant of ['line', 'enclosed', 'pill']) {
      const report = await tabs(page, variant).getByRole('tab').evaluateAll((els) => els.map((el) => {
        const cs = getComputedStyle(el);
        const lineHeight = Number.parseFloat(cs.lineHeight) || Number.parseFloat(cs.fontSize) * 1.2;
        const content = el.clientHeight - Number.parseFloat(cs.paddingTop) - Number.parseFloat(cs.paddingBottom);
        return {
          text: el.textContent,
          clippedX: el.scrollWidth > el.clientWidth + 1,
          clippedY: el.scrollHeight > el.clientHeight + 1,
          lines: Math.round(content / lineHeight),
          overflow: cs.textOverflow,
          whiteSpace: cs.whiteSpace,
        };
      }));
      for (const tab of report) {
        expect(tab, `${variant}: ${tab.text}`).toMatchObject({ clippedX: false, clippedY: false, overflow: 'clip', whiteSpace: 'normal' });
        expect(tab.lines, `${variant}: ${tab.text}`).toBeLessThanOrEqual(2);
      }
      expect(report.some((t) => t.lines === 2), `${variant}: a 2.5× label should wrap`).toBe(true);
    }
    const page_ = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    expect(page_.scroll).toBeLessThanOrEqual(page_.client);
  });

  test('smooth scrolling, except under reduced motion', async ({ page }, testInfo) => {
    await open(page, testInfo.project.name);
    const list = tabs(page).getByRole('tablist');
    await expect(list).toHaveCSS('scroll-behavior', 'smooth');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(list).toHaveCSS('scroll-behavior', 'auto');
  });
});

test.describe('Stat', () => {
  test('interactive tile is a named button that toggles aria-expanded from the keyboard', async ({ page }, testInfo) => {
    await open(page, testInfo.project.name);
    const tile = page.locator('[data-specimen="stats-compact"]').getByRole('button', { name: /^Priority : P2 , change$/ });
    await expect(tile).toHaveAttribute('aria-haspopup', 'dialog');
    await expect(tile).toHaveAttribute('aria-expanded', 'false');
    await expect(tile).toHaveAccessibleDescription('Impact high × urgency medium');
    await page.keyboard.press('Shift'); // keyboard modality, so focus() matches :focus-visible
    await tile.focus();
    const ring = await tile.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { visible: el.matches(':focus-visible'), style: cs.outlineStyle, width: cs.outlineWidth };
    });
    expect(ring).toEqual({ visible: true, style: 'solid', width: '2px' });
    await page.keyboard.press('Enter');
    await expect(tile).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Space');
    await expect(tile).toHaveAttribute('aria-expanded', 'false');
  });

  test('static tiles stay non-interactive', async ({ page }, testInfo) => {
    await open(page, testInfo.project.name);
    const statics = page.locator('div.uix-stat');
    await expect(statics).toHaveCount(6);
    await expect(page.locator('button.uix-stat')).toHaveCount(6);
  });

  test('tone outlines clear 3:1 and tone values clear 4.5:1 on the tile surface', async ({ page }, testInfo) => {
    await open(page, testInfo.project.name);
    const results = await page.locator('div.uix-stat--warning, div.uix-stat--danger').evaluateAll((tiles) => {
      const rgb = (css) => {
        const probe = document.createElement('canvas').getContext('2d');
        probe.fillStyle = css;
        probe.fillRect(0, 0, 1, 1);
        return [...probe.getImageData(0, 0, 1, 1).data.slice(0, 3)];
      };
      const lum = ([r, g, b]) => {
        const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      };
      const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
      return tiles.map((tile) => {
        const surface = rgb(getComputedStyle(tile).backgroundColor);
        const page = rgb(getComputedStyle(document.body).backgroundColor);
        return {
          tone: tile.className,
          border: Math.min(ratio(rgb(getComputedStyle(tile).borderTopColor), surface), ratio(rgb(getComputedStyle(tile).borderTopColor), page)),
          value: ratio(rgb(getComputedStyle(tile.querySelector('.uix-stat__value')).color), surface),
        };
      });
    });
    expect(results).toHaveLength(4);
    for (const r of results) {
      expect(r.border, `${r.tone} border`).toBeGreaterThanOrEqual(3);
      expect(r.value, `${r.tone} value`).toBeGreaterThanOrEqual(4.5);
    }
  });

  test('long unbroken values wrap inside the tile', async ({ page }, testInfo) => {
    await open(page, testInfo.project.name);
    await page.setViewportSize({ width: 360, height: 800 });
    const overflowing = await page.locator('.uix-stat').evaluateAll((tiles) =>
      tiles.filter((t) => t.scrollWidth > t.clientWidth + 1).length);
    expect(overflowing).toBe(0);
  });
});

test.describe('CopyButton', () => {
  const status = (page) => page.locator('[data-specimen="copy"]').getByRole('status');
  const button = (page) => page.getByRole('button', { name: 'Copy email' });

  test('success copies the value, shows the check and announces, then resets', async ({ page }, testInfo) => {
    await open(page, testInfo.project.name, () => {
      window.__copied = [];
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: async (text) => { window.__copied.push(text); } },
      });
    });
    await expect(status(page)).toHaveText('');
    await button(page).click();
    await expect(status(page)).toHaveText('Copied');
    await expect(button(page)).toHaveAttribute('data-copied', 'true');
    expect(await page.evaluate(() => window.__copied)).toEqual(['ada.lovelace@example.com']);
    await expect(status(page)).toHaveText('', { timeout: 3000 });
    await expect(button(page)).not.toHaveAttribute('data-copied', /.*/);
  });

  for (const [name, clipboard] of [
    ['a rejected write', 'reject'],
    ['no clipboard', 'missing'],
  ]) {
    test(`${name} stays silent`, async ({ page }, testInfo) => {
      await open(page, testInfo.project.name, (mode) => {
        Object.defineProperty(navigator, 'clipboard', {
          configurable: true,
          value: mode === 'reject' ? { writeText: async () => { throw new DOMException('denied', 'NotAllowedError'); } } : undefined,
        });
      }, clipboard);
      await button(page).click();
      await page.waitForTimeout(300);
      await expect(status(page)).toHaveText('');
      await expect(button(page)).not.toHaveAttribute('data-copied', /.*/);
      expect(await page.evaluate(() => document.querySelectorAll('[role="alert"]').length)).toBe(0);
    });
  }
});
