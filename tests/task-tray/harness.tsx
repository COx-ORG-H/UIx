/* Live harness for TaskTray (Docs/specs/2026-11-20-task-tray.md), bundled by build.mjs from source
 * for tests/a11y/task-tray.spec.mjs and the screenshots in the PR.
 *
 *   ?scene=one      one export at 62 %
 *   ?scene=five     five tasks: determinate, indeterminate, done with Open, failed with Retry, cancelled
 *   ?scene=long     long German titles and an unbroken file name
 *   ?scene=failure  a failed import with Retry beside a running one
 *   ?scene=done     everything finished (the pill shows the counts of what is done)
 *   ?scene=live     buttons that start simulated jobs (the recording); also the default
 *   &open=1         start expanded
 *
 * window.__tasks is the store's API, so a spec can start, move and end tasks itself. */
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, Card, TaskTray, Toaster, tasks } from '../../packages/react/src/index.js';
import type { TaskHandle } from '../../packages/react/src/index.js';

declare global { interface Window { __tasks: typeof tasks } }
window.__tasks = tasks;

const q = new URLSearchParams(location.search);
const scene = q.get('scene') ?? 'live';
const open = q.get('open') === '1';
const noop = () => {};

function seed() {
  if (scene === 'one') {
    tasks.start('Export 4,000 tickets', { step: 'Writing CSV', value: 2480, max: 4000, onCancel: noop });
  }
  if (scene === 'five') {
    tasks.start('Monthly SLA report (PDF)', { step: 'Rendering charts', onCancel: noop }).cancel();
    tasks.start('Bulk update 400 tickets', { onCancel: noop }).fail({ message: '12 tickets are locked by another agent', action: { label: 'Retry', onClick: noop } });
    tasks.start('Import users.csv').complete({ message: '1,204 users imported', action: { label: 'Open', onClick: noop } });
    tasks.start('CMDB discovery: Sarajevo DC', { step: 'Scanning 10.20.0.0/16', onCancel: noop });
    tasks.start('Export 4,000 tickets', { step: 'Writing CSV', value: 2480, max: 4000, onCancel: noop });
  }
  if (scene === 'long') {
    tasks.start('Konfigurationsmanagementdatenbankabgleichsprotokoll_Rechenzentrum_Sarajevo_2026-11-20.csv', { step: 'Zeile 1.200 von 4.000 wird geprüft', value: 1200, max: 4000, valueText: '1.200 von 4.000 Zeilen', onCancel: noop });
    tasks.start('Massenaktualisierung von 4.000 Störungstickets der Zuweisungsgruppe Rechenzentrum-Infrastruktur-Betrieb', { step: 'Tickets werden gesperrt und aktualisiert', onCancel: noop })
      .fail({ message: 'Zwölf Tickets werden gerade von einer anderen Bearbeiterin bearbeitet und konnten nicht geändert werden', action: { label: 'Erneut versuchen', onClick: noop } });
  }
  if (scene === 'failure') {
    tasks.start('Import users.csv', { step: 'Validating' }).fail({ message: '12 rows are invalid (line 4, 9, 17 …)', action: { label: 'Retry', onClick: noop } });
    tasks.start('Export 4,000 tickets', { step: 'Collecting', value: 600, max: 4000, onCancel: noop });
  }
  if (scene === 'done') {
    tasks.start('Import users.csv').complete({ message: '1,204 users imported', action: { label: 'Open', onClick: noop } });
    tasks.start('Export 4,000 tickets').complete({ message: '4,000 rows written', action: { label: 'Download', href: 'data:text/csv,id%0A1', download: 'tickets.csv' } });
    tasks.start('Monthly SLA report (PDF)').cancel();
  }
}
seed();

const wait = (ms: number, signal: AbortSignal) => new Promise<void>((resolve, reject) => {
  const timer = setTimeout(resolve, ms);
  signal.addEventListener('abort', () => { clearTimeout(timer); reject(new DOMException('Cancelled', 'AbortError')); }, { once: true });
});

/** A simulated export: 4,000 rows in 20 steps, about 8 s. */
const runExport = () => tasks.run('Export 4,000 tickets', async (task: TaskHandle) => {
  task.update({ step: 'Collecting', value: 0, max: 4000 });
  for (let i = 1; i <= 20; i += 1) {
    await wait(400, task.signal);
    task.update({ step: i < 6 ? 'Collecting' : 'Writing CSV', value: i * 200 });
  }
  return 4000;
}, {
  success: (n) => ({ message: `${n.toLocaleString('en')} rows written`, action: { label: 'Download', href: 'data:text/csv,id%0A1', download: 'tickets.csv' } }),
}).catch(noop);

/** A discovery run with no measurable end. */
const runDiscovery = () => tasks.run('CMDB discovery: Sarajevo DC', async (task) => {
  for (const step of ['Scanning 10.20.0.0/16', 'Fingerprinting 212 hosts', 'Matching configuration items']) {
    task.update({ step });
    await wait(1800, task.signal);
  }
  return 37;
}, { success: (n) => ({ message: `${n} new configuration items`, action: { label: 'Open', onClick: noop } }) }).catch(noop);

/** A bulk update that fails part-way, with Retry restarting the same row. */
const runBulk = (): Promise<void> => tasks.run('Bulk update 400 tickets', async (task) => {
  for (let i = 1; i <= 6; i += 1) {
    await wait(350, task.signal);
    task.update({ step: `Ticket ${i * 40} of 400`, value: i * 40, max: 400 });
  }
  throw new Error('12 tickets are locked by another agent');
}, { id: 'bulk', error: (e) => ({ message: (e as Error).message, action: { label: 'Retry', onClick: () => { void runBulk(); } } }) }).then(noop, noop);

function Harness() {
  const [, force] = useState(0);
  return (
    <>
      <h1>Service desk</h1>
      <Card style={{ padding: 'var(--uix-space-4)' }}>
        <p style={{ margin: 0 }}>Work keeps running in the tray while you move on. Start a job, then keep working here or open another page.</p>
        {scene === 'live' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--uix-space-2)', marginTop: 'var(--uix-space-3)' }}>
            <Button id="start-export" onClick={() => { void runExport(); force((n) => n + 1); }}>Export 4,000 tickets</Button>
            <Button id="start-discovery" onClick={() => { void runDiscovery(); }}>Run CMDB discovery</Button>
            <Button id="start-bulk" onClick={() => { void runBulk(); }}>Bulk update (fails)</Button>
          </div>
        )}
      </Card>
      {Array.from({ length: 6 }, (_, i) => (
        <Card key={i} style={{ padding: 'var(--uix-space-4)' }}>
          <strong>INC-04{12 + i}</strong> — {['E-Mail-Ausfall im Büro Sarajevo', 'VPN trennt alle 20 Minuten', 'Drucker im 3. Stock blockiert', 'Lohnexport ohne neue Mitarbeitende', 'Citrix-Sitzungen trennen sich', 'Zertifikat läuft in 3 Tagen ab'][i]}
        </Card>
      ))}
      <TaskTray defaultOpen={open} />
      <Toaster />
    </>
  );
}

createRoot(document.getElementById('root')!).render(<StrictMode><Harness /></StrictMode>);
