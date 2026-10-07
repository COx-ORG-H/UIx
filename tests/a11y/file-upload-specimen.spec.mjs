/* FileUpload docs specimen (HAR-1567): "Choose files" is a centred UIx button, like the React FileUpload.
 *
 * The specimen used to be `label.uix-dropzone > strong + span + input.uix-input[type=file]`. `.uix-input`
 * is `width:100%`, so flex centring centred the BOX and the browser's own grey button sat top-left inside
 * it (228 px off-centre at 1440). The visual golden had that baked in, and a DOM test cannot see it: jsdom
 * has no layout. So everything here is measured in Chromium, in both themes, at 1440 and 375.
 */
import { test, expect } from '@playwright/test';

const ROUTE = 'docs/explorer.html#file-upload';
const VIEWPORTS = [{ width: 1440, height: 900 }, { width: 375, height: 800 }];

const open = async (page, testInfo, viewport) => {
  await page.setViewportSize(viewport);
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, testInfo.project.name);
  await page.goto(ROUTE, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', testInfo.project.name);
  await page.evaluate(() => document.fonts.ready);
  const example = page.locator('[data-component-preview="file-upload"] [data-file-example]');
  await expect(example).toBeVisible();
  return example;
};

for (const viewport of VIEWPORTS) {
  test.describe(`${viewport.width}px`, () => {
    test('every drop-zone child is centred, padding is even, and no browser button shows', async ({ page }, testInfo) => {
      const example = await open(page, testInfo, viewport);
      const m = await example.evaluate((root) => {
        const zone = root.querySelector('.uix-dropzone');
        const z = zone.getBoundingClientRect();
        const box = (el) => { const r = el.getBoundingClientRect(); return { left: r.left - z.left, right: z.right - r.right, top: r.top - z.top, bottom: z.bottom - r.bottom, w: r.width, h: r.height }; };
        const visible = [...zone.children].filter((el) => !el.matches('input[type=file]'));
        const input = zone.querySelector('input[type=file]');
        const button = zone.querySelector('button');
        const probe = Object.assign(document.createElement('span'), { textContent: 'x' });
        probe.style.fontFamily = 'var(--uix-font-sans)';
        document.body.append(probe);
        const sans = getComputedStyle(probe).fontFamily;
        probe.remove();
        const status = root.querySelector('[data-file-status]').getBoundingClientRect();
        return {
          children: visible.map((el) => ({ tag: el.tagName.toLowerCase(), ...box(el) })),
          input: { w: input.getBoundingClientRect().width, h: input.getBoundingClientRect().height, tabindex: input.getAttribute('tabindex'), ariaHidden: input.getAttribute('aria-hidden') },
          button: { cls: button.className, font: getComputedStyle(button).fontFamily, centreDelta: (button.getBoundingClientRect().left + button.getBoundingClientRect().width / 2) - (z.left + z.width / 2) },
          sans,
          hintGap: status.top - z.bottom,
          listHidden: getComputedStyle(root.querySelector('[data-file-list]')).display,
          nativeFileButtons: zone.querySelectorAll('input.uix-input[type=file]').length,
        };
      });
      console.log(`[${testInfo.project.name} ${viewport.width}] ${JSON.stringify(m)}`);

      expect(m.children.map((c) => c.tag)).toEqual(['svg', 'strong', 'span', 'button']);
      for (const c of m.children) expect(Math.abs(c.left - c.right), `${c.tag} left/right gap`).toBeLessThanOrEqual(1);
      const first = m.children[0];
      const last = m.children.at(-1);
      expect(Math.abs(first.top - last.bottom), 'top/bottom padding').toBeLessThanOrEqual(1);
      expect(Math.abs(m.button.centreDelta), 'button centre vs drop-zone centre').toBeLessThanOrEqual(1);

      expect(m.nativeFileButtons).toBe(0);
      expect(m.button.cls).toContain('uix-btn');
      expect(m.button.font).toBe(m.sans);
      expect(m.button.font).not.toMatch(/arial/i);
      expect(m.input.w).toBeLessThanOrEqual(1);
      expect(m.input.h).toBeLessThanOrEqual(1);
      expect(m.input.tabindex).toBe('-1');
      expect(m.input.ariaHidden).toBe('true');

      // 12 px grid gap only: the empty (hidden) list adds no spacer.
      expect(m.listHidden).toBe('none');
      expect(Math.abs(m.hintGap - 12), 'drop zone to hint').toBeLessThanOrEqual(1);
    });

    for (const key of ['Enter', 'Space']) {
      test(`${key} on the focused button opens the file chooser`, async ({ page }, testInfo) => {
        const example = await open(page, testInfo, viewport);
        const button = example.getByRole('button', { name: 'Choose files' });
        await expect(button).toHaveAccessibleDescription(/Local preview only/);
        await button.focus();
        await expect(button).toBeFocused();
        const chooser = page.waitForEvent('filechooser');
        await page.keyboard.press(key);
        expect((await chooser).isMultiple()).toBe(true);
      });
    }

    test('Tab reaches the button first and skips the hidden input', async ({ page }, testInfo) => {
      const example = await open(page, testInfo, viewport);
      const button = example.getByRole('button', { name: 'Choose files' });

      // Tab from the title (made focusable only for this test) lands on the button, not on the input.
      const title = example.locator('strong');
      await title.evaluate((el) => el.setAttribute('tabindex', '-1'));
      await title.focus();
      await page.keyboard.press('Tab');
      await expect(button).toBeFocused();

      // ...and Tab from the button leaves the drop zone without stopping on the input.
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => document.activeElement?.matches('input[type=file]'))).toBe(false);
      await page.keyboard.press('Shift+Tab');
      await expect(button).toBeFocused();
    });

    test('a click on the empty drop zone opens the chooser, and 2 files give 2 rows plus a status line', async ({ page }, testInfo) => {
      const example = await open(page, testInfo, viewport);
      const zone = example.locator('.uix-dropzone');
      const chooser = page.waitForEvent('filechooser');
      await zone.click({ position: { x: 6, y: 6 } });
      await chooser;

      await example.locator('input[type=file]').setInputFiles([
        { name: 'one.txt', mimeType: 'text/plain', buffer: Buffer.from('1') },
        { name: 'two.txt', mimeType: 'text/plain', buffer: Buffer.from('22') },
      ]);
      await expect(example.locator('[data-file-list] li.uix-filelist__item')).toHaveCount(2);
      await expect(example.locator('[data-file-list]')).toBeVisible();
      await expect(example.locator('[data-file-status]')).toHaveText(/2 file\(s\) selected locally/);

      await example.locator('input[type=file]').setInputFiles([]);
      await expect(example.locator('[data-file-list]')).toBeHidden();
      await expect(example.locator('[data-file-status]')).toHaveText('No files selected.');
    });
  });
}

test('the Code tab shows the new markup', async ({ page }, testInfo) => {
  await open(page, testInfo, VIEWPORTS[0]);
  const preview = page.locator('[data-component-preview="file-upload"]');
  await preview.getByRole('tab', { name: 'Code', exact: true }).click();
  const code = await preview.locator('.uix-docs__demo-code code').textContent();
  expect(code).toContain('uix-btn uix-btn--secondary uix-btn--sm');
  expect(code).toContain('data-file-choose');
  expect(code).toContain('uix-visually-hidden');
  expect(code).not.toContain('uix-input');
});
