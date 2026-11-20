/* Live harness for useViewTransition, bundled by build.mjs from source for
 * tests/a11y/view-transition.spec.mjs:
 *   - #records: a list whose row opens into its detail (the hook on its own, parts across two
 *     elements under one key), and back;
 *   - #workspace: a DataWorkspace with Maximize in its More menu;
 *   - #canvas: an editable DashboardCanvas (a pointer drop morphs the cards it pushes).
 * window.__vt records each start of the list demo: whether it animated, and how many finished;
 * window.__records.go starts one from the spec (a second start in the middle of a morph). */
import { StrictMode, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, DashboardCanvas, DataWorkspace, useViewTransition } from '../../packages/react/src/index.js';
import type { DashboardCanvasItem, DataWorkspaceColumn } from '../../packages/react/src/index.js';

declare global { interface Window { __vt: { animated: boolean[]; finished: number }; __records: { go: (next: string | null) => void } } }
window.__vt = { animated: [], finished: 0 };

type Ticket = { id: string; title: string; detail: string };
const TICKETS: Ticket[] = [
  { id: 'INC-0412', title: 'E-Mail-Ausfall im Büro Sarajevo', detail: 'Seit 08:10 erreicht keine externe E-Mail das Postfach. Exchange-Dienst läuft.' },
  { id: 'INC-0413', title: 'VPN trennt alle 20 Minuten', detail: 'Betrifft nur Laptops mit dem neuen Client. Neustart hilft für eine Weile.' },
  { id: 'INC-0415', title: 'Drucker im 3. Stock blockiert', detail: 'Papierstau gemeldet, Fach leer. Haustechnik ist informiert.' },
];
const COLUMNS: DataWorkspaceColumn<Ticket>[] = [
  { id: 'id', header: 'Nummer', cell: (t) => t.id, width: '7rem' },
  { id: 'title', header: 'Titel', cell: (t) => t.title },
];
type Widget = DashboardCanvasItem & { title: string };
const WIDGETS: Widget[] = [
  { id: 'open', col: 0, row: 0, w: 4, h: 2, title: 'Offene Störungen' },
  { id: 'sla', col: 4, row: 0, w: 4, h: 2, title: 'SLA in Gefahr' },
  { id: 'new', col: 8, row: 0, w: 4, h: 2, title: 'Neu heute' },
  { id: 'mine', col: 0, row: 2, w: 6, h: 2, title: 'Mir zugewiesen' },
  { id: 'done', col: 6, row: 2, w: 6, h: 2, title: 'Diese Woche gelöst' },
];

function Records() {
  const morph = useViewTransition();
  const [open, setOpen] = useState<string | null>(null);
  const list = useRef<HTMLUListElement>(null);
  const detail = useRef<HTMLDivElement>(null);
  const go = (next: string | null) => {
    const key = next ?? open;
    const result = morph(() => setOpen(next), {
      // the row and its detail are one thing under one key: before, the row; after, the panel
      parts: () => [['record', detail.current ?? list.current?.querySelector(`[data-id="${key}"]`)]],
    });
    window.__vt.animated.push(result.animated);
    void result.finished.then(() => { window.__vt.finished += 1; });
  };
  // the spec starts a second change in the middle of a morph through this
  window.__records = { go };
  const ticket = TICKETS.find((t) => t.id === open);
  return (
    <section id="records" aria-label="Meldungen">
      <h2>List to detail</h2>
      {ticket ? (
        <div ref={detail} id="detail" className="uix-card" style={{ padding: 'var(--uix-space-5)', display: 'grid', gap: 'var(--uix-space-3)', minHeight: '16rem' }}>
          <strong>{ticket.id} · {ticket.title}</strong>
          <p style={{ margin: 0 }}>{ticket.detail}</p>
          <div><Button id="back" variant="secondary" onClick={() => go(null)}>Zurück zur Liste</Button></div>
        </div>
      ) : (
        <ul ref={list} id="list" style={{ display: 'grid', gap: 'var(--uix-space-2)', margin: 0, padding: 0, listStyle: 'none' }}>
          {TICKETS.map((t) => (
            <li key={t.id} data-id={t.id} className="uix-card" style={{ padding: 'var(--uix-space-3)', display: 'flex', alignItems: 'center', gap: 'var(--uix-space-3)' }}>
              <span style={{ flex: 1 }}>{t.id} · {t.title}</span>
              <Button size="sm" variant="secondary" data-open={t.id} onClick={() => go(t.id)}>Öffnen</Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Workspace() {
  const [maximized, setMaximized] = useState(false);
  return (
    <section>
      <h2>Workspace</h2>
      <DataWorkspace<Ticket> id="workspace" label="Störungen" rows={TICKETS} getRowId={(t) => t.id} columns={COLUMNS}
        maximized={maximized} onMaximizedChange={setMaximized} />
    </section>
  );
}

function Canvas() {
  const [items, setItems] = useState(WIDGETS);
  return (
    <section>
      <h2>Canvas</h2>
      <DashboardCanvas<Widget> id="canvas" items={items} editable rowHeight="3rem" itemLabel={(w) => w.title}
        onLayoutChange={(next) => setItems(next)}
        renderItem={(w) => <div className="uix-card" style={{ padding: 'var(--uix-space-3)' }}>{w.title}</div>} />
    </section>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Records />
    <Workspace />
    <Canvas />
  </StrictMode>,
);
