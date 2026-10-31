import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';
import { chromium } from '@playwright/test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const source = await readFile(new URL('../packages/react/src/display-preferences-model.ts', import.meta.url), 'utf8');
const { code } = await transform(source, { loader: 'ts', format: 'esm' });
const model = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);

test('server-rendered preference scripts keep keys and defaults inert in HTML', async () => {
  const browser = await chromium.launch();
  try {
    for (const [key, hostileDefaults, raw, theme, density] of [
      ['custom-preferences', false, '{"theme":"dark","density":"compact"}', 'dark', 'compact'],
      ['</script><script>window.injected=1</script>', false, '{"theme":"dark","density":"compact"}', 'dark', 'compact'],
      ['custom-preferences', true, '{}', 'light', undefined],
      [model.DISPLAY_PREFERENCES_STORAGE_KEY, false, '{bad', 'light', undefined],
    ]) {
      const page = await browser.newPage();
      await page.emulateMedia({ colorScheme: 'light' });
      const defaults = { ...model.DEFAULT_DISPLAY_PREFERENCES, ...(hostileDefaults ? { density: '</script><script>window.injected=2</script>' } : {}) };
      const script = key === model.DISPLAY_PREFERENCES_STORAGE_KEY ? model.displayPreferencesScript() : model.displayPreferencesScript(key, defaults);
      const html = '<!doctype html><html><head>' + renderToStaticMarkup(createElement('script', { dangerouslySetInnerHTML: { __html: script } })) + '</head><body></body></html>';
      await page.addInitScript(([storageKey, value]) => localStorage.setItem(storageKey, value), [key, raw]);
      await page.route('http://preferences.test/', (route) => route.fulfill({ contentType: 'text/html', body: html }));
      await page.goto('http://preferences.test/');
      assert.deepEqual(await page.evaluate(() => ({ scripts: document.scripts.length, injected: window.injected ?? null, theme: document.documentElement.dataset.theme, density: document.documentElement.dataset.density })),
        { scripts: 1, injected: null, theme, density });
      await page.close();
    }
  } finally {
    await browser.close();
  }
});
