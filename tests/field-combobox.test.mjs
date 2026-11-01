import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('Field labels, required state and descriptions reach the combobox input', async () => {
  const bundle = await build({ entryPoints: [fileURLToPath(new URL('./field-combobox-fixture.tsx', import.meta.url))], bundle: true, write: false, platform: 'browser', format: 'iife', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' } });
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.setContent('<!doctype html><html lang="en"><head><title>Field</title></head><body><main id="root"></main></body></html>');
    await page.addScriptTag({ content: bundle.outputFiles[0].text });
    const input = page.getByRole('combobox', { name: 'Category' });
    await page.locator('label', { hasText: 'Category' }).click();
    assert.equal(await input.evaluate((el) => document.activeElement === el), true);
    assert.equal(await input.getAttribute('aria-required'), 'true');
    assert.equal(await input.getAttribute('aria-invalid'), 'true');
    const description = await input.getAttribute('aria-describedby');
    assert.ok(description.split(' ').includes('extra'));
    assert.match(await input.evaluate((el) => (el.getAttribute('aria-describedby') || '').split(' ').map((id) => document.getElementById(id)?.textContent).join(' ')), /Extra guidance.*Choose a category/);
    assert.equal(await page.locator('#wrapper').count(), 1);
    await input.fill('Two');
    await input.press('Enter');
    assert.equal(await input.inputValue(), 'Two');
    assert.equal(await input.evaluate((el) => document.activeElement === el), true);
    assert.equal(await input.getAttribute('aria-invalid'), null);
    assert.match(await input.evaluate((el) => (el.getAttribute('aria-describedby') || '').split(' ').map((id) => document.getElementById(id)?.textContent).join(' ')), /Extra guidance.*Select one/);
    for (const [label, id] of [['Explicit', 'explicit-input'], ['For only', 'for-input']]) {
      await page.locator('label', { hasText: label }).click();
      assert.equal(await page.locator(`#${id}`).evaluate((el) => document.activeElement === el), true);
      await page.locator(`#${id}`).press('Escape');
    }
    await page.locator('label', { hasText: 'Memoized' }).click();
    const memoized = page.getByRole('combobox', { name: 'Memoized' });
    assert.equal(await memoized.evaluate((el) => document.activeElement === el), true);
    assert.equal(await memoized.getAttribute('aria-required'), 'true');
    const results = await new AxeBuilder({ page }).withRules(['aria-allowed-attr', 'label']).analyze();
    assert.deepEqual(results.violations, []);
  } finally { await browser.close(); }
});
