import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

test('a declared actions column renders only the virtual window', async () => {
  let redirected = false;
  const plugins = process.env.UIX_WORKSPACE_FROM_DIST === '1' ? [{
    name: 'built-workspace',
    setup(builder) {
      builder.onResolve({ filter: /packages\/react\/src\/components\/DataWorkspace\.js$/ }, () => {
        redirected = true;
        return { path: fileURLToPath(new URL('../packages/react/dist/components/DataWorkspace.js', import.meta.url)) };
      });
    },
  }] : [];
  const bundle = await build({ entryPoints: [fileURLToPath(new URL('./workspace-actions-fixture.tsx', import.meta.url))], bundle: true, write: false, platform: 'browser', format: 'iife', jsx: 'automatic', plugins, define: { 'process.env.NODE_ENV': '"production"' } });
  if (process.env.UIX_WORKSPACE_FROM_DIST === '1') assert.equal(redirected, true, 'the fixture must use the built component');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent('<!doctype html><style>.uix-data-workspace__table{height:400px;overflow:auto} table{border-collapse:collapse} tr[data-uix-row-id]{height:40px}</style><div id="root"></div>');
    await page.addScriptTag({ content: bundle.outputFiles[0].text });
    await page.waitForSelector('tr[data-uix-row-id]');
    const calls = await page.evaluate(() => window.calls);
    assert.ok(calls < 100, `initial renderer calls: ${calls}`);
    assert.equal(await page.locator('th.uix-table__actions').count(), 1);
    const cells = await page.evaluate(() => window.cells);
    await page.locator('tbody input[type=checkbox]').first().check();
    assert.ok(await page.evaluate(() => window.cells) - cells <= 2, 'selection should only rerender changed rows');
    assert.equal(await page.evaluate(() => window.calls), calls, 'selection should not rerender actions');
    const firstRow = page.locator('tr[data-uix-row-id]').first();
    await firstRow.focus();
    await firstRow.press('ArrowDown');
    assert.equal(await page.locator('tr[data-uix-row-id]').nth(1).evaluate((el) => document.activeElement === el), true);
    await page.locator('.uix-data-workspace__table').evaluate((el) => { el.scrollTop = el.scrollHeight; });
    await page.getByRole('button', { name: 'Last action' }).click();
    assert.equal(await page.evaluate(() => window.acted), true);
    console.log(`action renderer calls: ${calls} initially, ${await page.evaluate(() => window.calls)} after scrolling`);
    for (const mode of ['legacy', 'empty', 'declared-empty', 'paged', 'grouped', 'cards']) {
      const other = await browser.newPage();
      await other.setContent('<!doctype html><style>#root{width:390px}.uix-data-workspace__table{height:400px;overflow:auto} tr[data-uix-row-id]{height:40px}</style><div id="root"></div>');
      await other.evaluate((value) => { window.mode = value; }, mode);
      await other.addScriptTag({ content: bundle.outputFiles[0].text });
      await other.waitForSelector('tr[data-uix-row-id]');
      if (mode === 'cards') await other.waitForSelector('.uix-data-workspace__table--cards');
      const expected = ['paged', 'grouped', 'cards'].includes(mode) ? 20 : 10000;
      if (mode === 'declared-empty') assert.ok(await other.evaluate(() => window.calls) < 100);
      else if (mode === 'cards') assert.ok(await other.evaluate(() => window.calls) >= expected);
      else assert.equal(await other.evaluate(() => window.calls), expected);
      assert.equal(await other.locator('th.uix-table__actions').count(), ['legacy', 'declared-empty'].includes(mode) ? 1 : 0);
      await other.close();
    }
    const dynamic = await browser.newPage();
    await dynamic.setContent('<!doctype html><style>.uix-data-workspace__table{height:400px;overflow:auto} tr[data-uix-row-id]{height:40px}</style><div id="root"></div>');
    await dynamic.evaluate(() => { window.mode = 'dynamic'; });
    await dynamic.addScriptTag({ content: bundle.outputFiles[0].text });
    await dynamic.waitForSelector('tr[data-uix-row-id]');
    assert.equal(await dynamic.locator('th.uix-table__actions').count(), 0);
    await dynamic.getByRole('button', { name: 'Toggle permissions' }).click();
    assert.equal(await dynamic.locator('th.uix-table__actions').count(), 1);
    await dynamic.locator('.uix-data-workspace__table').evaluate((el) => { el.scrollTop = el.scrollHeight; });
    await dynamic.getByRole('button', { name: 'Last action' }).click();
    assert.equal(await dynamic.evaluate(() => window.acted), true);
    await dynamic.close();
    const overlap = await browser.newPage();
    await overlap.setContent('<!doctype html><style>.uix-data-workspace__table{height:400px;overflow:auto} tr[data-uix-row-id]{height:40px}</style><div id="root"></div>');
    await overlap.evaluate(() => { window.mode = 'all'; });
    await overlap.addScriptTag({ content: bundle.outputFiles[0].text });
    const wrap = overlap.locator('.uix-data-workspace__table');
    await overlap.waitForSelector('tr[data-uix-row-id]');
    await overlap.waitForFunction(() => document.querySelector('.uix-data-workspace__table').scrollHeight > 1000);
    await overlap.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await wrap.evaluate((el) => { el.scrollTop = 400; });
    await overlap.waitForFunction(() => document.querySelector('tr[data-uix-row-id]')?.getAttribute('data-uix-row-id') !== '0');
    const before = await overlap.evaluate(() => window.calls);
    const first = await overlap.locator('tr[data-uix-row-id]').first().getAttribute('data-uix-row-id');
    const rowHeight = await overlap.locator('tr[data-uix-row-id]').first().evaluate((el) => el.offsetHeight);
    await wrap.evaluate((el, height) => { el.scrollTop += height; }, rowHeight);
    await overlap.waitForFunction((id) => document.querySelector('tr[data-uix-row-id]')?.getAttribute('data-uix-row-id') !== id, first);
    assert.ok(await overlap.evaluate(() => window.calls) - before <= 3, 'one-row scroll should only render newly mounted actions');
    await overlap.close();
  } finally { await browser.close(); }
});
