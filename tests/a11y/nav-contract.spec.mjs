/* Keyboard contract for the collapsible sidebar nav group.
 *
 * The panel collapses with a grid-template-rows animation (0fr + overflow:hidden), which
 * only clips content visually — without visibility:hidden the links inside stay in the tab
 * order and a keyboard user Tabs into invisible items. This spec pins the contract:
 * a collapsed group's items are hidden AND not reachable by Tab.
 *
 * The static showcase renders its sub-items as non-focusable <div>s, so the spec injects
 * real <a class="uix-navitem uix-subitem"> links into the showcase panel — same markup a
 * consumer (or the React NavGroup) puts there — and drives the guide's own trigger handler.
 */
import { test, expect } from '@playwright/test';

test('collapsed navgroup items are hidden and not reachable by Tab', async ({ page }) => {
  await page.goto('index.html', { waitUntil: 'networkidle' });

  await page.evaluate(() => {
    const inner = document.querySelector('.uix-navgroup__trigger + .uix-navgroup__panel > div');
    inner.innerHTML =
      '<a class="uix-navitem uix-subitem" href="#sla"><span class="uix-navitem__label">SLA overview</span></a>' +
      '<a class="uix-navitem uix-subitem" href="#backlog"><span class="uix-navitem__label">Backlog</span></a>';
  });

  const trigger = page.locator('.uix-navgroup__trigger');
  const panelLinks = page.locator('.uix-navgroup__panel a.uix-subitem');

  // sanity: expanded, the links are visible and focusable
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(panelLinks.first()).toBeVisible();
  await panelLinks.first().focus();
  await expect(panelLinks.first()).toBeFocused();

  // collapse via the guide's own trigger handler
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');

  // hidden — not just clipped (toBeHidden auto-waits through the collapse transition)
  await expect(panelLinks.first()).toBeHidden();
  await expect(panelLinks.last()).toBeHidden();

  // and unreachable: Tab from the trigger must skip the whole panel
  await trigger.focus();
  await page.keyboard.press('Tab');
  const focusEscapedPanel = await page.evaluate(
    () => !document.activeElement.closest('.uix-navgroup__panel')
  );
  expect(focusEscapedPanel, 'Tab from a collapsed trigger must not land inside the panel').toBe(true);
});
