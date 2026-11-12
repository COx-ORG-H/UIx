import { test, expect } from '@playwright/test';

/* A dialog's actions stay in view (the UI climb rules, HAR-3107; enforced in the kit by HAR-3104).
 * When a Modal's or a Drawer's body is longer than the viewport, the header and the footer keep
 * their place and only the body scrolls: the person can always see and reach "Speichern" without
 * scrolling the panel. Checked at a desktop and a phone viewport, before and after scrolling the
 * body to its end, and by keyboard: Tab from the last field reaches the footer's action in view. */

const HARNESS = '/tests/dialog-actions/harness.html';
const themeOf = (testInfo) => (testInfo.project.name === 'dark' ? 'dark' : 'light');

for (const which of ['modal', 'drawer']) {
  for (const viewport of [{ width: 1280, height: 600 }, { width: 320, height: 568 }]) {
    test(`${which} at ${viewport.width}×${viewport.height}: the footer's actions stay in view and only the body scrolls`, async ({ page }, testInfo) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.addInitScript((t) => localStorage.setItem('uix-theme', t), themeOf(testInfo));
      await page.goto(`${HARNESS}?case=${which}`, { waitUntil: 'networkidle' });
      const panel = page.getByRole('dialog');
      await expect(panel).toBeVisible();
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.allSettled(document.getAnimations().filter((a) => Number.isFinite(a.effect?.getComputedTiming().iterations)).map((a) => a.finished));
      });
      const measure = () => panel.evaluate((el, vh) => {
        const body = el.querySelector('[class$="__body"]');
        const footer = el.querySelector('[class$="__footer"]');
        const header = el.querySelector('[class$="__header"]');
        const rect = (n) => { const r = n.getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; };
        return {
          panel: rect(el), header: rect(header), footer: rect(footer),
          actions: [...footer.querySelectorAll('[data-action]')].map((b) => rect(b)),
          bodyScrolls: body.scrollHeight > body.clientHeight + 1,
          panelScrolls: el.scrollHeight > el.clientHeight + 1,
          vh,
        };
      }, viewport.height);
      const check = (m, when) => {
        expect(m.bodyScrolls, `${when}: the body scrolls`).toBe(true);
        expect(m.panelScrolls, `${when}: the panel itself does not scroll`).toBe(false);
        expect(m.header.top, `${when}: the header is in view`).toBeGreaterThanOrEqual(0);
        for (const a of m.actions) {
          expect(a.top, `${when}: an action starts in view`).toBeGreaterThanOrEqual(0);
          expect(a.bottom, `${when}: an action ends in view`).toBeLessThanOrEqual(m.vh);
        }
      };
      const before = await measure();
      check(before, 'at rest');
      await panel.locator('[class$="__body"]').evaluate((b) => { b.scrollTop = b.scrollHeight; });
      const after = await measure();
      check(after, 'scrolled to the end');
      expect(after.footer.top, 'the footer did not move').toBeCloseTo(before.footer.top, 0);
      // keyboard: from the last field, Tab lands on the first action, which is in view
      await panel.getByLabel('Feld 14').focus();
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => { const r = document.activeElement.getBoundingClientRect(); return { action: document.activeElement.dataset.action ?? null, top: r.top, bottom: r.bottom }; });
      expect(focused.action).toBe('cancel');
      expect(focused.bottom).toBeLessThanOrEqual(viewport.height);
      await testInfo.attach(`${which}-${viewport.width}`, { body: await page.screenshot(), contentType: 'image/png' });
    });
  }
}
