import { chromium, firefox, webkit } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
const pages = ['tests/scroll-edge/fixture.html', 'packages/tokens/docs/index.html#motion', 'tests/search-bar/harness.html'];
for (const [n, t] of Object.entries({ webkit, chromium, firefox })) {
  const b = await t.launch(); const out = [];
  for (const u of pages) {
    const p = await (await b.newContext()).newPage();
    await p.goto('http://localhost:4291/' + u, { waitUntil: 'networkidle' }); await p.waitForTimeout(500);
    await p.evaluate(() => document.querySelectorAll('.uix-scroll-edge,.uix-table-wrap,.uix-drawer__body').forEach((e) => { e.scrollTop = 40; }));
    const r = await Promise.race([new AxeBuilder({ page: p }).withRules(['color-contrast']).analyze().then(() => 'ok'), new Promise((res) => setTimeout(() => res('TIMEOUT'), 25000))]).catch((e) => 'CRASH ' + e.message.split('\n')[0]);
    out.push(`${u.split('/').pop()}:${r}`);
    if (u.includes('fixture')) out.push(JSON.stringify(await p.evaluate(() => Object.fromEntries(['list', 'menu', 'drawer-body', 'table'].map((id) => { const e = document.getElementById(id); const c = getComputedStyle(e); return [id, `${c.getPropertyValue('--uix-edge-start')}/${c.getPropertyValue('--uix-edge-end')}/${c.maskImage === 'none' ? 'nomask' : 'mask'}/div:${getComputedStyle(e, '::before').opacity}`]; })))));
    await p.close();
  }
  console.log(n, out.join('  ')); await b.close();
}
