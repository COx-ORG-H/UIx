import { chromium } from 'playwright';
const PAGES = [
  ['docs-foundations', 'docs/explorer.html#examples-foundations'],
  ['tables', 'tables.html'],
  ['docs-workspace', 'docs/explorer.html#examples-workspace'],
  ['docs-rule-builder-wide', 'docs/explorer.html#examples-rule-builder'],
  ['docs-color-picker-narrow', 'docs/explorer.html#color-picker', 390],
  ['docs-tag-input-narrow', 'docs/explorer.html#tag-input', 390],
  ['docs-file-upload-narrow', 'docs/explorer.html#file-upload', 390],
  ['docs-prose', 'docs/explorer.html#examples-prose'],
  ['docs-crm', 'docs/explorer.html#examples-crm-itsm'],
];
const b = await chromium.launch();
for (const theme of ['light', 'dark']) for (const [name, path, w] of PAGES) {
  const shots = [];
  for (const port of [4179, 4178]) {
    const page = await b.newPage({ viewport: { width: w ?? 1280, height: w ? 844 : 900 } });
    await page.addInitScript((t) => localStorage.setItem('uix-theme', t), theme);
    await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    await page.goto(`http://localhost:${port}/packages/tokens/${path}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    shots.push(await page.screenshot({ fullPage: true, animations: 'disabled' }));
    await page.close();
  }
  console.log(theme, name, Buffer.compare(shots[0], shots[1]) === 0 ? 'SAME' : 'DIFF');
  if (Buffer.compare(shots[0], shots[1]) !== 0) { (await import('node:fs')).writeFileSync(`.scratch/ab-${theme}-${name}-old.png`, shots[0]); (await import('node:fs')).writeFileSync(`.scratch/ab-${theme}-${name}-new.png`, shots[1]); }
}
await b.close();
