/* Live harness for the state-feedback kit (motion rollout WP2, HAR-2579), bundled by build.mjs
 * from source for tests/a11y/feedback-kit.spec.mjs, and the page the operator's recordings are
 * made from. Every section fakes a server whose answer time is picked in #latency (fast = 150 ms,
 * under the 300 ms pending delay; slow = 1200 ms) and whether it fails.
 *   - #button: Save (primary) and Assign (secondary) with `loading` and `result`, between
 *     neighbours whose positions the spec measures.
 *   - #save-status: an autosaving field with SaveStatus.
 *   - #busy: a BusyRegion list and a refreshing TableWrap; Refetch keeps the rows.
 *   - #loaders: Spinner delay and LoadingState delay, mounted while a load runs.
 *   - #dialog: a Save with `result` inside a Modal (its announcement must reach into the modal),
 *     and an icon-only button with `result` (the mark alone, inside its square). */
import { StrictMode, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BusyRegion, Button, LoadingState, Modal, SaveStatus, Spinner, Table, TableWrap, Td, Th, Tr,
} from '../../packages/react/src/index.js';
import type { ButtonResult, SaveStatusState } from '../../packages/react/src/index.js';

type Latency = { ms: number; fail: boolean };
let latency: Latency = { ms: 1200, fail: false };
const server = () => new Promise<void>((resolve, reject) => {
  const { ms, fail } = latency;
  setTimeout(() => (fail ? reject(new Error('Server said no')) : resolve()), ms);
});

function LatencyPicker() {
  const [value, setValue] = useState(latency);
  const set = (next: Latency) => { latency = next; setValue(next); };
  return (
    <fieldset id="latency" className="uix-cluster">
      <legend>Server answers in</legend>
      <label><input type="radio" name="ms" checked={value.ms === 150} onChange={() => set({ ...value, ms: 150 })} /> 150 ms</label>
      <label><input type="radio" name="ms" checked={value.ms === 1200} onChange={() => set({ ...value, ms: 1200 })} /> 1200 ms</label>
      <label><input type="checkbox" checked={value.fail} onChange={(e) => set({ ...value, fail: e.target.checked })} /> and fails</label>
    </fieldset>
  );
}

function useAction() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ButtonResult | null>(null);
  const run = async () => {
    setLoading(true);
    setResult(null);
    try { await server(); setResult('success'); } catch { setResult('error'); } finally { setLoading(false); }
  };
  return { loading, result, run };
}

function ButtonSection() {
  const save = useAction();
  const assign = useAction();
  return (
    <section id="button" aria-labelledby="button-h">
      <h2 id="button-h">Button loading and result</h2>
      <div className="uix-cluster" data-testid="row">
        <Button data-testid="before">Cancel</Button>
        <Button variant="primary" data-testid="save" loading={save.loading} result={save.result}
          resultLabels={{ success: 'Saved', error: 'Couldn’t save' }} onClick={save.run}>Save</Button>
        <Button data-testid="assign" loading={assign.loading} result={assign.result}
          resultLabels={{ success: 'Assigned', error: 'Not assigned' }} onClick={assign.run}>Assign to me</Button>
        <Button variant="ghost" data-testid="after">More</Button>
      </div>
    </section>
  );
}

function SaveStatusSection() {
  const [state, setState] = useState<SaveStatusState>('idle');
  const [value, setValue] = useState('Printer on floor 3 is jammed');
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const save = async () => {
    setState('saving');
    try { await server(); setState('saved'); } catch { setState('failed'); }
  };
  return (
    <section id="save-status" aria-labelledby="save-h">
      <h2 id="save-h">SaveStatus</h2>
      <label className="uix-field">
        <span className="uix-field__label">Summary</span>
        <input className="uix-input" value={value} onChange={(e) => {
          setValue(e.target.value);
          clearTimeout(timer.current);
          timer.current = setTimeout(save, 400);
        }} />
      </label>
      <SaveStatus state={state} onRetry={save} data-testid="save-status" />
    </section>
  );
}

const ROWS = [
  ['INC-0412', 'Email outage in Sarajevo office', 'P1', 'Network'],
  ['INC-0413', 'VPN drops every 20 minutes', 'P2', 'Network'],
  ['INC-0415', 'Printer on floor 3 is jammed', 'P4', 'Facilities'],
  ['INC-0418', 'Payroll export missing employees', 'P2', 'HR systems'],
  ['INC-0420', 'SSO login loop for contractors', 'P1', 'Identity'],
  ['INC-0421', 'Laptop battery swelling', 'P3', 'End-user devices'],
];

function BusySection() {
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState(ROWS);
  const refetch = async () => {
    setBusy(true);
    try { await server(); setRows((current) => [...current].reverse()); } catch { /* the rows stay */ } finally { setBusy(false); }
  };
  return (
    <section id="busy" aria-labelledby="busy-h">
      <h2 id="busy-h">BusyRegion and TableWrap refreshing</h2>
      <Button data-testid="refetch" onClick={refetch} disabled={busy}>Refetch</Button>
      <BusyRegion busy={busy} data-testid="region" aria-label="Queue">
        <ul className="uix-list">{rows.slice(0, 3).map(([id, title]) => <li key={id} className="uix-list__item">{id} · {title}</li>)}</ul>
      </BusyRegion>
      <TableWrap refreshing={busy} className="uix-table-wrap--scroll" style={{ ['--uix-table-max-height' as string]: '12rem' }} tabIndex={0} role="region" aria-label="Incidents" data-testid="table">
        <Table>
          <thead><tr><Th>Number</Th><Th>Title</Th><Th>Priority</Th><Th>Group</Th></tr></thead>
          <tbody>{rows.map(([id, title, p, g]) => <Tr key={id}><Td>{id}</Td><Td>{title}</Td><Td>{p}</Td><Td>{g}</Td></Tr>)}</tbody>
        </Table>
      </TableWrap>
    </section>
  );
}

function LoadersSection() {
  const [loading, setLoading] = useState(false);
  const load = async () => { setLoading(true); try { await server(); } catch { /* shown below */ } finally { setLoading(false); } };
  let body: ReactNode = <p data-testid="loaded">Loaded.</p>;
  if (loading) {
    body = (
      <div className="uix-stack">
        <Spinner delay label="Loading the queue" data-testid="spinner" />
        <LoadingState delay rows={3} data-testid="skeleton" />
      </div>
    );
  }
  return (
    <section id="loaders" aria-labelledby="loaders-h">
      <h2 id="loaders-h">Spinner and LoadingState delay</h2>
      <Button data-testid="load" onClick={load}>Load</Button>
      {body}
    </section>
  );
}

const StarGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z" /></svg>
);

function DialogSection() {
  const [open, setOpen] = useState(false);
  const save = useAction();
  const pin = useAction();
  return (
    <section id="dialog" aria-labelledby="dialog-h">
      <h2 id="dialog-h">Inside a dialog, and icon-only</h2>
      <div className="uix-cluster">
        <Button data-testid="open-dialog" onClick={() => setOpen(true)}>Edit template</Button>
        <Button icon variant="ghost" aria-label="Pin view" data-testid="pin" loading={pin.loading} result={pin.result}
          resultLabels={{ success: 'Pinned', error: 'Not pinned' }} onClick={pin.run}><StarGlyph /></Button>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Edit template"
        footer={<Button variant="primary" data-testid="dialog-save" loading={save.loading} result={save.result}
          resultLabels={{ success: 'Saved', error: 'Couldn’t save' }} onClick={save.run}>Save</Button>}>
        <p>Incident created (v2)</p>
      </Modal>
    </section>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LatencyPicker />
    <ButtonSection />
    <SaveStatusSection />
    <BusySection />
    <LoadersSection />
    <DialogSection />
  </StrictMode>,
);
