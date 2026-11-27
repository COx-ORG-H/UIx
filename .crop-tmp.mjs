// crop a region from several PNGs into one strip using playwright's chromium to render
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const [out, x, y, w, h, ...files] = process.argv.slice(2);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: (+w + 10) * files.length, height: +h + 30 }, deviceScaleFactor: 2 });
const imgs = files.map((f) => `<figure style="margin:0 5px;display:inline-block"><div style="width:${w}px;height:${h}px;background:url(data:image/png;base64,${readFileSync(f).toString('base64')}) -${x}px -${y}px no-repeat"></div><figcaption style="font:10px sans-serif">${f.split(/[\/]/).pop()}</figcaption></figure>`).join('');
await p.setContent(`<body style="margin:0;white-space:nowrap">${imgs}</body>`); await p.screenshot({ path: out }); await b.close();
