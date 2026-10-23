/* Lays frame PNGs out as one contact sheet for an operator review (WP2 taste choices).
 *   node tests/feedback-kit/contact-sheet.mjs <frames-dir> <out.png> <title> <rowsJSON> <colsJSON>
 * rows: [[label, filename-infix]], cols: [[label, filename-suffix]]; a cell is the file whose
 * name contains the row infix and ends with the column suffix. */
import { chromium } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const [dir, out, title, rowsJson, colsJson] = process.argv.slice(2);
const rows = JSON.parse(rowsJson);
const cols = JSON.parse(colsJson);
const files = readdirSync(dir);
const find = (infix, suffix) => files.find((f) => f.includes(infix) && f.endsWith(suffix));
// inlined: a page set from a string cannot load file:// images
const cell = (infix, suffix) => { const f = find(infix, suffix); return f ? `<img src="data:image/png;base64,${readFileSync(join(dir, f)).toString('base64')}">` : '<em>missing</em>'; };
const html = `<!doctype html><meta charset="utf-8"><style>
body{font:14px system-ui;margin:16px;background:#fff;color:#111} h1{font-size:18px;margin:0 0 12px}
table{border-collapse:collapse} th,td{padding:6px;vertical-align:top;text-align:left} th{font-weight:600}
img{width:360px;display:block;border:1px solid #ddd}</style>
<h1>${title}</h1><table><tr><th></th>${cols.map(([l]) => `<th>${l}</th>`).join('')}</tr>
${rows.map(([l, infix]) => `<tr><th>${l}</th>${cols.map(([, s]) => `<td>${cell(infix, s)}</td>`).join('')}</tr>`).join('')}</table>`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 400 + cols.length * 380, height: 400 } });
await page.setContent(html, { waitUntil: 'load' });
await page.screenshot({ path: out, fullPage: true });
await browser.close();
console.log(out);
