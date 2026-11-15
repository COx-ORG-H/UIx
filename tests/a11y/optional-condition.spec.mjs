import { test, expect } from '@playwright/test';

for (const width of [1440, 320]) {
  test(`optional condition preserves keyboard, values and default editing at ${width}px`, async ({ page }, info) => {
    const theme = info.project.name === 'dark' ? 'dark' : 'light';
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript((value) => localStorage.setItem('uix-theme', value), theme);
    await page.goto('/tests/optional-condition/harness.html', { waitUntil: 'networkidle' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    const optional = page.locator('[data-example="optional"]');
    const add = optional.getByRole('button', { name: 'Bedingung hinzufügen', exact: true });
    await add.focus();
    await page.keyboard.press('Enter');
    await expect(optional.locator('output')).toHaveText('Bedingungen: 1');
    await expect(add).toHaveCount(0);
    await expect(optional.getByRole('combobox', { name: 'Feld', exact: true })).toBeFocused();
    await optional.getByRole('textbox', { name: 'Wert für Priorität' }).fill('P2');
    await expect(optional.getByRole('textbox')).toHaveValue('P2');
    expect(await page.evaluate(() => window.__optionalRules.optional.every((value) => value.when.conditions.length <= 1))).toBe(true);
    await optional.screenshot({ path: info.outputPath(`single-${theme}-${width}.png`) });
    await optional.getByRole('button', { name: 'Bedingung entfernen', exact: true }).focus();
    await page.keyboard.press('Space');
    await expect(optional.locator('output')).toHaveText('Bedingungen: 0');
    await expect(add).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(add).toHaveCount(0);
    await optional.getByRole('button', { name: 'Bedingung entfernen', exact: true }).click();
    await expect(add).toBeVisible();

    const stored = page.locator('[data-example="over-limit"]');
    await expect(stored.locator('.uix-rule-builder__condition')).toHaveCount(2);
    await expect(stored.getByRole('button', { name: 'Bedingung hinzufügen', exact: true })).toHaveCount(0);
    await stored.getByRole('textbox', { name: 'Wert für Dienst' }).fill('Telefonie');
    await stored.getByRole('button', { name: 'Bedingung entfernen', exact: true }).first().click();
    await expect(stored.locator('output')).toHaveText('Bedingungen: 1');
    await expect(stored.getByRole('textbox')).toHaveValue('Telefonie');
    await expect(stored.getByRole('button', { name: 'Bedingung hinzufügen', exact: true })).toHaveCount(0);
    const readOnly = page.locator('[data-example="read-only"]');
    await expect(readOnly.getByRole('textbox')).toBeDisabled();
    await expect(readOnly.getByRole('button', { name: /hinzufügen|entfernen/i })).toHaveCount(0);
    const standard = page.locator('[data-example="default"]');
    await standard.getByRole('button', { name: 'Bedingung hinzufügen', exact: true }).click();
    await standard.getByRole('button', { name: 'Bedingung hinzufügen', exact: true }).click();
    await expect(standard.locator('output')).toHaveText('Bedingungen: 2');
    expect(await page.locator('main').evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    expect(errors).toEqual([]);
    await optional.screenshot({ path: info.outputPath(`empty-${theme}-${width}.png`) });
  });
}
