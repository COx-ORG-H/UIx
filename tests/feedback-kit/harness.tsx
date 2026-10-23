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
 *   Review options: ?tint=attention swaps the highlight tint, ?length=long uses --uix-dur-highlight.
 *   - #dialog: a Save with `result` inside a Modal (its announcement must reach into the modal),
 *     and an icon-only button with `result` (the mark alone, inside its square). */
import { StrictMode, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BusyRegion, Button, ChangeHighlight, Count, Kanban, KanbanCard, KanbanColumn, KanbanDropLine, LoadingState, Modal,
  SaveStatus, SortableList, Spinner, Stat, StarButton, StatusPill, Table, TableWrap, Td, Th, Tr, settleDrop,
  useKeyboardGrab, useOptimisticValue,
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

type Card = { id: string; title: string };
const BOARD: Record<string, Card[]> = {
  todo: [{ id: 'c1', title: 'INC-0412 Email outage' }, { id: 'c2', title: 'INC-0413 VPN drops' }],
  doing: [{ id: 'c3', title: 'INC-0415 Printer jammed' }, { id: 'c4', title: 'INC-0418 Payroll export' }],
};

function DragSection() {
  // SortableList: the kit's own pointer drag (lift, settle)
  const [rows, setRows] = useState(['Email outage', 'VPN drops', 'Printer jammed', 'Payroll export']);
  // Kanban: a small pointer drag of the harness's own, wired to the kit's affordances
  const [board, setBoard] = useState(BOARD);
  const [drag, setDrag] = useState<{ id: string; col: string | null; index: number } | null>(null);
  const [landed, setLanded] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!landed) return;
    settleDrop(boardRef.current?.querySelector<HTMLElement>(`[data-card="${landed}"]`));
    setLanded(null);
  }, [landed]);
  useEffect(() => {
    if (!drag) return undefined;
    const move = (event: PointerEvent) => {
      const col = (document.elementFromPoint(event.clientX, event.clientY) as Element | null)?.closest<HTMLElement>('[data-col]');
      if (!col) { setDrag((d) => d && { ...d, col: null }); return; }
      const cards = Array.from(col.querySelectorAll<HTMLElement>('[data-card]')).filter((c) => c.dataset.card !== drag.id);
      const index = cards.filter((c) => { const r = c.getBoundingClientRect(); return event.clientY > r.top + r.height / 2; }).length;
      setDrag((d) => d && { ...d, col: col.dataset.col ?? null, index });
    };
    const up = () => {
      setDrag((d) => {
        if (d?.col) {
          setBoard((b) => {
            const card = Object.values(b).flat().find((c) => c.id === d.id)!;
            const next = Object.fromEntries(Object.entries(b).map(([k, v]) => [k, v.filter((c) => c.id !== d.id)]));
            next[d.col!].splice(d.index, 0, card);
            return next;
          });
          setLanded(d.id);
        }
        return null;
      });
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
  }, [drag?.id]);
  // the keyboard path for a list the product builds itself
  const [order, setOrder] = useState(['P1 Critical', 'P2 High', 'P3 Medium']);
  return (
    <section id="drag" aria-labelledby="drag-h">
      <h2 id="drag-h">Drag affordances</h2>
      <SortableList items={rows} getId={(r) => r} getLabel={(r) => r} renderItem={(r) => r} onReorder={setRows} aria-label="Queue order" data-testid="sortable" />
      <div ref={boardRef} style={{ minWidth: 0 }}>
        <Kanban data-testid="board">
          {Object.entries(board).map(([col, cards]) => (
            <KanbanColumn key={col} title={col === 'todo' ? 'To do' : 'Doing'} count={cards.length} data-col={col} dropTarget={drag?.col === col}>
              {(() => {
                // the dragged card stays where it was, lifted; the line shows where it would land
                const out: ReactNode[] = [];
                let n = 0;
                for (const card of cards) {
                  const dragged = drag?.id === card.id;
                  if (!dragged && drag?.col === col && drag.index === n) out.push(<KanbanDropLine key="line" />);
                  out.push(<KanbanCard key={card.id} data-card={card.id} title={card.title} dragging={dragged}
                    onPointerDown={(e) => { if (e.button === 0) { e.preventDefault(); setDrag({ id: card.id, col: null, index: 0 }); } }} />);
                  if (!dragged) n += 1;
                }
                if (drag?.col === col && drag.index >= n) out.push(<KanbanDropLine key="line" />);
                return out;
              })()}
            </KanbanColumn>
          ))}
        </Kanban>
      </div>
      <ol className="uix-stack" aria-label="Priorities (keyboard: Space, arrows, Space)" data-testid="grab-list">
        {order.map((label, i) => <GrabRow key={label} label={label} index={i} count={order.length} move={(d) => setOrder((o) => {
          const n = [...o]; const j = Math.max(0, Math.min(o.length - 1, i + d)); n.splice(i, 1); n.splice(j, 0, label); return n;
        })} />)}
      </ol>
    </section>
  );
}

function GrabRow({ label, index, count, move }: { label: string; index: number; count: number; move: (delta: number) => void }) {
  const start = useRef(index);
  const grab = useKeyboardGrab({
    label,
    onMove: (dir) => { if (dir === 'up' || dir === 'down') { move(dir === 'up' ? -1 : 1); return `Position ${Math.max(1, Math.min(count, index + 1 + (dir === 'up' ? -1 : 1)))} of ${count}`; } },
    onCancel: () => move(start.current - index),
  });
  if (!grab.grabbed) start.current = index;
  return <li className="uix-card" style={{ padding: 'var(--uix-space-2) var(--uix-space-3)' }} tabIndex={0} data-testid={`grab-${index}`} {...grab.itemProps}>{label}</li>;
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
    <DragSection />
  </StrictMode>,
);
