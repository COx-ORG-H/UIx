import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { COMPONENT_ITEMS, REACT_COMPONENT_SLUGS } from '../../packages/tokens/docs/docs.js';

const repo = fileURLToPath(new URL('../../', import.meta.url));
const site = process.env.UIX_DOCS_SITE_DIR ? resolve(process.env.UIX_DOCS_SITE_DIR) : null;
const cases = [{ name: 'repository preview', prefix: '', root: repo, path: '/packages/tokens/docs/explorer.html' }];
if (site) cases.push({ name: 'assembled project-prefix site', prefix: '/UIx', root: site, path: '/UIx/docs/explorer.html' });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.md': 'text/plain' };

for (const fixture of cases) test(`${fixture.name}: version, catalogue and both API links`, async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.route('**/*', async (route) => {
      const url = new URL(route.request().url());
      if (url.hostname !== 'uix.test' || (fixture.prefix && !url.pathname.startsWith(`${fixture.prefix}/`))) return route.abort();
      const pathname = decodeURIComponent(url.pathname.slice(fixture.prefix.length));
      const path = resolve(fixture.root, `.${pathname}`);
      if (!path.startsWith(resolve(fixture.root) + sep)) return route.abort();
      try { return await route.fulfill({ body: await readFile(path), contentType: types[extname(path)] ?? 'application/octet-stream' }); }
      catch { return route.fulfill({ status: 404, body: 'Not found' }); }
    });
    const base = `http://uix.test${fixture.path}`;
    const version = JSON.parse(await readFile(resolve(fixture.root, fixture.prefix ? 'package.json' : 'packages/tokens/package.json'), 'utf8')).version;
    await page.goto(base);
    await page.waitForFunction((expected) => document.querySelector('[data-docs-version]')?.textContent === `v${expected}`, version);
    const content = await page.locator('[data-docs-page]').innerText();
    assert.match(content, new RegExp(`${COMPONENT_ITEMS.filter((item) => !item.composite).length} CSS modules`));
    assert.match(content, new RegExp(`${REACT_COMPONENT_SLUGS.length} mapped React entries`));
    for (const [hash, selector] of [['', 'header [data-api-report]'], ['#data-workspace', '[data-docs-page] [data-api-report]']]) {
      await page.goto(`${base}${hash}`);
      const link = page.locator(selector).first();
      await link.waitFor();
      const href = await link.getAttribute('href');
      const response = await page.goto(new URL(href, `${base}${hash}`).href);
      assert.equal(response.status(), 200, `${fixture.name}: ${href}`);
      assert.match(await response.text(), /DataWorkspace/);
    }
  } finally { await browser.close(); }
});
