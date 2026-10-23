/* Live harness for the state-feedback kit (motion rollout WP2, HAR-2579), bundled by build.mjs
 * from source for tests/a11y/feedback-kit.spec.mjs, and the page the operator's recordings are
 * made from. Every section fakes a server whose answer time is picked in #latency (fast = 150 ms,
 * under the 300 ms pending delay; slow = 1200 ms) and whether it fails.
 *   - #button: Save (primary) and Assign (secondary) with `loading` and `result`, between
 *     neighbours whose positions the spec measures.
 *   - #save-status: an autosaving field with SaveStatus.
 *   - #busy: a BusyRegion list and a refreshing TableWrap; Refetch keeps the rows.
 *   - #loaders: Spinner delay and LoadingState delay, mounted while a load runs.
 *   - #changes: a row whose status a "live update" changes (the row tints, the pill rings) and
 *     a Count in a badge and a stat tile.
 *   - #optimistic: a star saved optimistically; with "and fails" it comes back and flashes.
 *   - #list: a MotionList queue (add, resolve = leave, shuffle) whose order is held while pointed at.
 *   - #tabs: line and pill Tabs, a Segmented, a CollapsibleSection.
 *   - #success: Submit swaps a form for the SuccessState.
 *   Review options: ?tint=attention swaps the highlight tint, ?length=long uses --uix-dur-highlight.
 *   - #dialog: a Save with `result` inside a Modal (its announcement must reach into the modal),
 *     and an icon-only button with `result` (the mark alone, inside its square). */
import { StrictMode, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BusyRegion, Button, ChangeHighlight, CollapsibleSection, Count, LoadingState, Modal, MotionList, SaveStatus, Segmented,
  SegmentedOption, Spinner, Stat, StarButton, StatusPill, SuccessState, Tab, TabPanel, Table, TableWrap, Tabs, Td, Th, Tr,
  useDeferredReorder, useOptimisticValue,
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

const params = new URLSearchParams(location.search);
if (params.get('tint') === 'attention' || params.get('length') === 'long') {
  const style = document.createElement('style');
  style.textContent = `.uix-change-highlight, .uix-changed {${params.get('tint') === 'attention' ? '--uix-change-tint: color-mix(in srgb, var(--uix-attention) 18%, var(--uix-surface));' : ''}${params.get('length') === 'long' ? '--uix-change-duration: var(--uix-dur-highlight);' : ''}}`;
  document.head.append(style);
}

const STATUSES: [string, 'info' | 'warning' | 'success'][] = [['In progress', 'info'], ['Waiting for customer', 'warning'], ['Resolved', 'success']];

function ChangesSection() {
  const [step, setStep] = useState(0);
  const [unread, setUnread] = useState(4);
  const [open, setOpen] = useState(42);
  const [status, tone] = STATUSES[step % STATUSES.length];
  return (
    <section id="changes" aria-labelledby="changes-h">
      <h2 id="changes-h">ChangeHighlight and Count</h2>
      <div className="uix-cluster">
        <Button data-testid="live-update" onClick={() => setStep((n) => n + 1)}>Simulate a live update</Button>
        <Button data-testid="unread-up" onClick={() => setUnread((n) => n + 1)}>+1 unread</Button>
        <Button data-testid="unread-down" onClick={() => setUnread((n) => Math.max(0, n - 1))}>−1 unread</Button>
        <Button data-testid="open-up" onClick={() => setOpen((n) => n + 3)}>+3 open</Button>
      </div>
      <div className="uix-cluster">
        <a className="uix-navitem" href="#changes" style={{ minWidth: '10rem' }}><span>Inbox</span><span className="uix-navitem__badge" data-testid="badge"><Count value={unread} /></span></a>
        <Stat label="Open incidents" value={<Count value={open} data-testid="stat-count" />} meta="6 opened today" style={{ minWidth: '12rem' }} />
      </div>
      <TableWrap>
        <Table>
          <thead><tr><Th>Number</Th><Th>Title</Th><Th>Status</Th></tr></thead>
          <tbody>
            <Tr><Td>INC-0411</Td><Td>Mail delivery delayed</Td><Td><StatusPill tone="neutral">New</StatusPill></Td></Tr>
            <ChangeHighlight as="tr" value={step} data-testid="changed-row" announce={step ? `INC-0412 status changed to ${status} by A. Novak` : undefined}>
              <Td>INC-0412</Td><Td>Email outage in Sarajevo office</Td>
              <Td><ChangeHighlight value={status} variant="ring" data-testid="changed-pill"><StatusPill tone={tone}>{status}</StatusPill></ChangeHighlight></Td>
            </ChangeHighlight>
            <Tr><Td>INC-0413</Td><Td>VPN drops every 20 minutes</Td><Td><StatusPill tone="neutral">New</StatusPill></Td></Tr>
          </tbody>
        </Table>
      </TableWrap>
    </section>
  );
}

function OptimisticSection() {
  const [server, setServer] = useState(false);
  const [message, setMessage] = useState('');
  const star = useOptimisticValue(server, (next: boolean) => server_().then(() => setServer(next)), {
    onRollback: ({ restored }) => setMessage(`Couldn’t ${restored ? 'remove' : 'add'} the favourite — it is back as it was.`),
  });
  return (
    <section id="optimistic" aria-labelledby="optimistic-h">
      <h2 id="optimistic-h">Optimistic star with visible rollback</h2>
      <div className="uix-cluster">
        <ChangeHighlight value={star.rollbacks} variant="ring" data-testid="star-wrap" announce={star.rollback ? 'Favourite restored' : undefined}>
          <StarButton pinned={star.value} label="Major incidents" onToggle={(next) => { setMessage(''); void star.set(next); }} />
        </ChangeHighlight>
        <span data-testid="star-state">{star.value ? 'Starred' : 'Not starred'}</span>
      </div>
      <p role="status" data-testid="star-message">{message}</p>
    </section>
  );
}
const server_ = () => server();

type Ticket = { id: number; title: string; priority: number };
const TICKETS: Ticket[] = [
  { id: 412, title: 'Email outage in Sarajevo office', priority: 1 },
  { id: 413, title: 'VPN drops every 20 minutes', priority: 2 },
  { id: 415, title: 'Printer on floor 3 is jammed', priority: 4 },
  { id: 418, title: 'Payroll export missing employees', priority: 2 },
];

function ListSection() {
  const [rows, setRows] = useState(TICKETS);
  const [next, setNext] = useState(420);
  const queue = useDeferredReorder(rows, (r) => r.id);
  return (
    <section id="list" aria-labelledby="list-h">
      <h2 id="list-h">MotionList and a held order</h2>
      <div className="uix-cluster">
        <Button data-testid="add" onClick={() => { setRows((r) => [{ id: next, title: `New ticket ${next}`, priority: 3 }, ...r]); setNext((n) => n + 1); }}>Add at top</Button>
        <Button data-testid="resolve" onClick={() => setRows((r) => r.filter((_, i) => i !== 1))}>Resolve the second</Button>
        <Button data-testid="shuffle" onClick={() => setRows((r) => [...r].reverse())}>Re-sort (live)</Button>
      </div>
      <p data-testid="held">{queue.held ? 'New order waiting — move the pointer away to apply' : 'Order is current'}</p>
      <MotionList {...queue.listProps} items={queue.items} getKey={(r) => r.id} className="uix-list" data-testid="queue" aria-label="My queue"
        renderItem={(r) => <li className="uix-list__item"><button type="button" className="uix-btn uix-btn--ghost uix-btn--sm" data-testid={`row-${r.id}`}>INC-0{r.id}</button> {r.title}</li>} />
    </section>
  );
}

function TabsSection() {
  const [tab, setTab] = useState('all');
  const [pill, setPill] = useState('day');
  const [density, setDensity] = useState('comfortable');
  return (
    <section id="tabs" aria-labelledby="tabs-h">
      <h2 id="tabs-h">Tabs, Segmented, CollapsibleSection</h2>
      <Tabs value={tab} onChange={setTab} aria-label="Queue views" data-testid="line-tabs">
        <Tab value="all">All open</Tab><Tab value="mine">Assigned to me</Tab><Tab value="breach">About to breach</Tab><Tab value="closed">Closed</Tab>
        {['all', 'mine', 'breach', 'closed'].map((v) => <TabPanel key={v} value={v}>{v} tickets</TabPanel>)}
      </Tabs>
      <Tabs variant="pill" value={pill} onChange={setPill} aria-label="Range" data-testid="pill-tabs">
        <Tab value="day">Day</Tab><Tab value="week">Week</Tab><Tab value="month">Month</Tab>
        {['day', 'week', 'month'].map((v) => <TabPanel key={v} value={v}>Range: {v}</TabPanel>)}
      </Tabs>
      <Segmented value={density} onChange={setDensity} aria-label="Density" data-testid="segmented">
        <SegmentedOption value="compact">Compact</SegmentedOption><SegmentedOption value="comfortable">Comfortable</SegmentedOption><SegmentedOption value="spacious">Spacious</SegmentedOption>
      </Segmented>
      <CollapsibleSection title="SLA details" summary="2 targets" data-testid="collapsible">
        <p>Response within 15 minutes; resolution within 4 hours.</p>
      </CollapsibleSection>
    </section>
  );
}

function SuccessSection() {
  const [done, setDone] = useState(false);
  return (
    <section id="success" aria-labelledby="success-h">
      <h2 id="success-h">SuccessState</h2>
      {done ? (
        <SuccessState data-testid="success-state" headingLevel={3} title="Request submitted" reference="REQ-0233"
          next={['We have emailed you a confirmation.', 'An agent will pick it up within one working day.', 'You can follow it under My requests.']}
          action={<Button variant="primary" onClick={() => setDone(false)}>Back to the portal</Button>}>
          <p>Thanks — we have your request for a new laptop.</p>
        </SuccessState>
      ) : (
        <Button variant="primary" data-testid="submit" onClick={() => setDone(true)}>Submit request</Button>
      )}
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
    <ChangesSection />
    <OptimisticSection />
    <ListSection />
    <TabsSection />
    <SuccessSection />
  </StrictMode>,
);
