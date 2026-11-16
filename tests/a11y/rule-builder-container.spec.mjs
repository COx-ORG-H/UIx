import { test, expect } from '@playwright/test';
for (const width of [1440, 320]) test(`RuleBuilder fits its container at ${width}px`, async ({ page }, info) => {
  await page.setViewportSize({ width, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(theme => localStorage.setItem('uix-theme', theme), info.project.name === 'dark' ? 'dark' : 'light');
  await page.goto('/tests/optional-condition/harness.html', { waitUntil: 'networkidle' });
  for (const id of ['constrained', 'constrained-actions']) {
    const example = page.locator(`[data-example="${id}"]`);
    const builder = example.locator('.uix-rule-builder');
    await expect(builder).toBeVisible();
    expect(await builder.evaluate(element => element.scrollWidth <= element.clientWidth + 1), id).toBe(true);
    for (const row of await builder.locator('.uix-rule-builder__condition, .uix-rule-builder__action').all()) {
      expect(await row.evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length), id).toBe(1);
      expect(await row.evaluate(element => element.scrollWidth <= element.clientWidth + 1), id).toBe(true);
    }
    const value = example.getByRole('textbox', { name: 'Wert für Priorität', exact: true });
    await value.fill('P2');
    await expect(value).toBeFocused();
    await expect(value).toHaveValue('P2');
    await example.scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath(`${id}.png`) });
  }
  const actions = page.locator('[data-example="constrained-actions"]');
  await actions.getByRole('textbox', { name: 'Nachricht', exact: true }).fill('Prüfung erfolgreich');
  await expect(actions.getByRole('textbox', { name: 'Nachricht', exact: true })).toHaveValue('Prüfung erfolgreich');
  const intrinsic = page.locator('[data-example="intrinsic"] .uix-rule-builder');
  const intrinsicWidth = await intrinsic.evaluate(element => element.getBoundingClientRect().width);
  expect(intrinsicWidth).toBeGreaterThanOrEqual(190);
  expect(await intrinsic.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  const wide = page.locator('[data-example="default"]');
  await wide.getByRole('button', { name: 'Bedingung hinzufügen', exact: true }).click();
  expect(await wide.locator('.uix-rule-builder__condition').evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length)).toBe(width === 1440 ? 4 : 1);
  const mid = page.locator('[data-example="mid-width"] .uix-rule-builder__condition');
  expect(await mid.evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length)).toBe(width === 1440 ? 4 : 1);
  const overflow = await page.locator('body *').evaluateAll(elements => elements.filter(element => {
    const box = element.getBoundingClientRect();
    return box.width > 0 && box.right > innerWidth + 1 && !element.closest('[aria-hidden="true"]');
  }).slice(0, 12).map(element => ({ tag: element.tagName, class: element.className, text: element.textContent.slice(0, 65), right: element.getBoundingClientRect().right })));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), JSON.stringify(overflow)).toBe(true);
});
