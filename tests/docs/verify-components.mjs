/* Browser checks against local files using request interception; no server or build.
 * Run: node tests/docs/verify-components.mjs
 * UIX_PLAYWRIGHT_MODULE may point at a bundled playwright index.mjs. */
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { COMPONENT_ITEMS } from '../../packages/tokens/docs/docs.js';
import { COMPONENT_SPECIMENS } from '../../packages/tokens/docs/component-specimens.js';

const { chromium } = await import(process.env.UIX_PLAYWRIGHT_MODULE ? pathToFileURL(process.env.UIX_PLAYWRIGHT_MODULE).href : 'playwright');
const root = fileURLToPath(new URL('../../', import.meta.url));
const axePath = process.env.UIX_AXE_PATH || createRequire(import.meta.url).resolve('axe-core/axe.min.js');
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  page.setDefaultTimeout(5000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname !== 'uix.test') return route.abort();
    const file = resolve(root, '.' + decodeURIComponent(url.pathname));
    if (!file.startsWith(root.endsWith(sep) ? root : root + sep)) return route.abort();
    try {
      const body = await readFile(file);
      const contentType = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'}[extname(file)] || 'text/plain';
      await route.fulfill({ body, contentType });
    } catch { await route.fulfill({ status: 404, body: 'Not found' }); }
  });
  await page.goto('http://uix.test/packages/tokens/docs/explorer.html');
  const failures = [];
  for (const theme of ['light', 'dark']) {
    await page.evaluate((theme) => document.documentElement.dataset.theme = theme, theme);
    for (const item of COMPONENT_ITEMS) {
      await page.evaluate((slug) => { location.hash = slug; }, item.slug);
      const host = page.locator(`[data-component-preview="${item.slug}"]`);
      try {
        await host.waitFor({ timeout: 3000 });
        const stage = host.locator('.uix-docs__demo-stage');
        await stage.waitFor({ state: 'visible', timeout: 3000 });
        assert(await stage.locator(COMPONENT_SPECIMENS[item.slug].selector).count(), 'Specimen selector absent');
        const overlay = ['modal','drawer','peek','popover','lightbox','combobox','view-menu'].includes(item.slug);
        if (!overlay) assert(await stage.locator(COMPONENT_SPECIMENS[item.slug].selector).first().isVisible(), 'Component is hidden');
        assert(await stage.locator(':scope > *').count(), 'Empty preview');
        assert(await page.locator(`[data-uix-docs-nav] a[href="#${item.slug}"][aria-current="page"]`).count(), 'No active sidebar entry');
      } catch (error) { failures.push(`${theme}/${item.slug}: ${error.message.split('\n')[0]}`); }
    }
  }
  console.log(JSON.stringify({ failures, errors }, null, 2));
  assert.deepEqual(failures, []);
  assert.deepEqual(errors, []);
  await page.evaluate(() => location.hash = 'combobox');
  const combo = page.locator('[data-component-preview="combobox"]');
  await combo.locator('[popovertarget]').click();
  assert(await combo.locator('#rs-type').isVisible());
  await combo.locator('input').fill('Problem');
  await combo.locator('[data-rs-option]').filter({hasText:'Problem'}).click();
  assert.equal(await combo.locator('[data-rs-label]').innerText(), 'Problem');
  for (let visit = 0; visit < 3; visit++) {
    await page.evaluate(() => location.hash = 'lightbox');
    const box = page.locator('[data-component-preview="lightbox"]');
    await box.locator('[data-uix-lightbox]').first().click();
    assert(await box.locator('dialog[open]').isVisible());
    await page.keyboard.press('Escape');
    await page.evaluate(() => location.hash = 'button');
    await page.locator('[data-component-preview="button"]').waitFor();
  }
  assert.deepEqual(errors, []);
  await page.evaluate(() => location.hash = 'tag-input');
  const tag = page.locator('[data-component-preview="tag-input"]');
  await tag.locator('input').fill('documentation');
  await tag.locator('input').press('Enter');
  assert.equal(await tag.locator('.uix-tag').count(), 2);
  await tag.locator('input').fill('documentation'); await tag.locator('input').press('Enter');
  assert.equal(await tag.locator('.uix-tag').count(), 2);
  await tag.getByRole('button', {name:'Remove documentation', exact:true}).click();
  assert.equal(await tag.locator('.uix-tag').count(), 1);
  await tag.getByRole('tab', {name:'Code',exact:true}).click();
  assert(await tag.locator('.uix-docs__demo-code').isVisible());
  assert((await tag.locator('code').textContent()).includes('uix-taginput'));
  await page.evaluate(() => location.hash = 'file-upload');
  await page.locator('[data-component-preview="file-upload"] input').setInputFiles({ name:'example.txt', mimeType:'text/plain', buffer:Buffer.from('UIx') });
  assert.equal(await page.locator('[data-file-list]').innerText(), 'example.txt\n3 bytes');
  await page.evaluate(() => location.hash = 'color-picker');
  await page.locator('[data-color-trigger]').click();
  assert.equal(await page.locator('[data-color-trigger]').getAttribute('aria-expanded'), 'true');
  await page.locator('[data-color-hex]').fill('#FFFFFF');
  await page.locator('[data-color-set]').click();
  assert((await page.locator('[data-color-live]').innerText()).includes('1.00:1'));
  assert.equal(await page.evaluate(() => document.documentElement.style.getPropertyValue('--uix-brand')), '');
  await page.locator('[data-color-dialog] input[type=range]').last().fill('0');
  assert.equal(await page.locator('[data-color-value]').innerText(), '#000000');
  assert((await page.locator('[data-color-live]').innerText()).includes('21.00:1'));
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('[data-color-trigger]').getAttribute('aria-expanded'), 'false');
  await mkdir(resolve(root, 'test-results/docs'), { recursive:true });
  await page.addScriptTag({ path:axePath });
  for (const theme of ['light','dark']) {
    await page.evaluate((theme) => document.documentElement.dataset.theme = theme, theme);
    for (const slug of ['color-picker','tag-input','file-upload','build-with-uix','extend-the-system']) {
      await page.evaluate((slug) => location.hash = slug, slug);
      await page.waitForFunction((slug) => document.title.startsWith(slug === 'build-with-uix' ? 'Build with UIx' : slug === 'extend-the-system' ? 'Extend the system' : slug.split('-').map((v,i) => i ? v : v[0].toUpperCase()+v.slice(1)).join(' ')), slug);
      if (slug === 'color-picker') await page.locator('[data-color-trigger]').click();
      const violations = await page.evaluate(async () => (await window.axe.run(document, {runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}})).violations.filter((v) => ['serious','critical'].includes(v.impact)).map((v) => ({id:v.id,targets:v.nodes.map((n)=>n.target)})));
      assert.deepEqual(violations, [], `${theme}/${slug} accessibility`);
    }
  }
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height:900 });
    for (const slug of ['color-picker','tag-input','file-upload','build-with-uix']) {
      await page.evaluate((slug) => location.hash = slug, slug);
      await page.locator('h1').waitFor();
      await page.screenshot({ path:resolve(root, `test-results/docs/${slug}-${width}.png`), fullPage:true, animations:'disabled' });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${slug} page overflows at ${width}`);
    }
  }
  console.log(`PASS: ${COMPONENT_ITEMS.length} component previews in both themes, tag/file/color interactions, code view, and narrow/wide pages.`);
} finally { await browser.close(); }
