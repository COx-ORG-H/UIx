/* The live TaskTray on its component page (Feedback & overlays → Task tray → "Try it").
 *
 * Mounts the real @tensor_1/react TaskTray and the `tasks` store, bundled from source by build.mjs,
 * with three simulated jobs: an export with measurable progress, a discovery run with no measurable
 * end, and a bulk update that fails part-way and offers Retry. The tray is fixed to the bottom of the
 * window, as it is in an app. docs.js imports this when the page opens and calls `mount`, which
 * returns the unmount it calls when the page changes. */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, TaskTray, createTaskApi, createTaskStore } from '../../../react/src/index.js';
import type { TaskHandle } from '../../../react/src/index.js';

const demo = createTaskApi(createTaskStore());
const noop = () => {};

const wait = (ms: number, signal: AbortSignal) => new Promise<void>((resolve, reject) => {
  const timer = setTimeout(resolve, ms);
  signal.addEventListener('abort', () => { clearTimeout(timer); reject(new DOMException('Cancelled', 'AbortError')); }, { once: true });
});

let exports = 0;
const runExport = () => {
  exports += 1;
  const rows = 4000;
  void demo.run(`Export ${rows.toLocaleString('en')} tickets${exports > 1 ? ` (${exports})` : ''}`, async (task: TaskHandle) => {
    task.update({ step: 'Collecting', value: 0, max: rows });
    for (let i = 1; i <= 25; i += 1) {
      await wait(400, task.signal);
      task.update({ step: i < 8 ? 'Collecting' : 'Writing CSV', value: (i * rows) / 25 });
    }
    return rows;
  }, {
    success: (n) => ({ message: `${n.toLocaleString('en')} rows written`, action: { label: 'Download', href: 'data:text/csv;charset=utf-8,id%2Ctitle%0AINC-0412%2CE-Mail-Ausfall', download: 'tickets.csv' } }),
  }).catch(noop);
};

const runDiscovery = () => {
  void demo.run('CMDB discovery: Sarajevo DC', async (task) => {
    for (const step of ['Scanning 10.20.0.0/16', 'Fingerprinting 212 hosts', 'Matching configuration items']) {
      task.update({ step });
      await wait(2200, task.signal);
    }
    return 37;
  }, { success: (n) => ({ message: `${n} new configuration items`, action: { label: 'Open', onClick: noop } }) }).catch(noop);
};

const runBulk = (): void => {
  void demo.run('Bulk update 400 tickets', async (task) => {
    for (let i = 1; i <= 8; i += 1) {
      await wait(450, task.signal);
      task.update({ step: `Ticket ${i * 30} of 400`, value: i * 30, max: 400 });
    }
    throw new Error('12 tickets are locked by another agent');
  }, {
    id: 'docs-bulk',
    error: (e) => ({ message: (e as Error).message, action: { label: 'Retry', onClick: runBulk } }),
  }).catch(noop);
};

function Demo() {
  return (
    <div className="uix-docs__live-demo">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--uix-space-2)' }}>
        <Button onClick={runExport}>Export 4,000 tickets</Button>
        <Button onClick={runDiscovery}>Run CMDB discovery</Button>
        <Button onClick={runBulk}>Bulk update (fails)</Button>
      </div>
      <TaskTray store={demo.store} />
    </div>
  );
}

export function mount(el: HTMLElement): () => void {
  const root = createRoot(el);
  root.render(<StrictMode><Demo /></StrictMode>);
  return () => {
    root.unmount();
    for (const task of demo.store.getSnapshot()) if (task.status === 'running') demo.cancel(task.id);
    demo.dismiss();
  };
}
