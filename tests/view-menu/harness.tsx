/* Live harness for ViewMenu's column rows (TENSOR HAR-666), bundled by build.mjs from source for
 * tests/a11y/view-menu.spec.mjs. Two hosts:
 *   - #bare: a chrome-stripping overlay shell like TENSOR's AnchoredOverlay — no surface of its own,
 *     and it closes itself on Escape from a document listener, so the row menu must keep Escape;
 *   - #popover: the kit Popover (native, light-dismiss), where the view menu must not draw a
 *     second border;
 *   - #saved: SavedViewMenu, which shares the live-reorder pointer drag.
 * window.__vm records what the tests need to observe. */
import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, Popover, SavedViewMenu, ViewMenu } from '../../packages/react/src/index.js';
import type { ViewMenuColumn } from '../../packages/react/src/index.js';

type Log = { orders: string[][]; toggles: [string, boolean][]; bareClosed: number; savedOrders: string[][] };
declare global { interface Window { __vm: Log } }
window.__vm = { orders: [], toggles: [], bareClosed: 0, savedOrders: [] };

const INITIAL: ViewMenuColumn[] = [
  { id: 'id', label: 'ID', visible: true, required: true },
  { id: 'title', label: 'Title', visible: true },
  { id: 'state', label: 'State', visible: true },
  { id: 'severity', label: 'Severity', visible: false },
  { id: 'assignee', label: 'Assignee', visible: true },
  { id: 'group', label: 'Assignment group', visible: true },
  { id: 'service', label: 'Affected service', visible: true },
  { id: 'opened', label: 'Opened', visible: false },
  { id: 'updated', label: 'Updated', visible: true },
  { id: 'sla', label: 'SLA due', visible: true },
  { id: 'priority', label: 'Priority', visible: true },
  { id: 'category', label: 'Category with a deliberately long name that truncates', visible: false },
];

function useColumns() {
  const [columns, setColumns] = useState(INITIAL);
  const [density, setDensity] = useState('standard');
  const [zebra, setZebra] = useState(true);
  return {
    density: { density, densityLabel: 'Row spacing', densityOptions: [{ value: 'compact', label: 'Compact' }, { value: 'standard', label: 'Standard' }, { value: 'comfortable', label: 'Comfortable' }], onDensityChange: setDensity },
    zebra: { checked: zebra, label: 'Alternating rows', onChange: setZebra },
    columns,
    onColumnVisibilityChange: (id: string, visible: boolean) => {
      window.__vm.toggles.push([id, visible]);
      setColumns((cols) => cols.map((c) => (c.id === id ? { ...c, visible } : c)));
    },
    onReorder: (ids: string[]) => {
      window.__vm.orders.push(ids);
      setColumns((cols) => ids.map((id) => cols.find((c) => c.id === id)!));
    },
  };
}

function BareOverlay() {
  const state = useColumns();
  const [open, setOpen] = useState(true);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { window.__vm.bareClosed += 1; setOpen(false); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);
  return (
    <section aria-labelledby="bare-title">
      <h2 id="bare-title">Chromeless overlay</h2>
      <Button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}>Columns</Button>
      {/* A shell that adds no background, border or shadow: the panel must bring its own. */}
      <div id="bare" data-open={open || undefined} style={{ position: 'relative', height: 540, background: 'repeating-linear-gradient(45deg, #e11d48 0 6px, #2563eb 6px 12px)' }}>
        {open && (
          <div role="dialog" aria-label="Columns" style={{ position: 'absolute', top: 12, left: 12 }}>
            <ViewMenu
              {...state.density}
              displayLabel="Display"
              zebra={state.zebra}
              columns={state.columns}
              columnsLabel="Columns"
              onColumnVisibilityChange={state.onColumnVisibilityChange}
              onReorder={state.onReorder}
              footer={<button type="button" className="uix-menu__item">Reset sort</button>}
              className="harness-bare-menu"
            />
          </div>
        )}
      </div>
    </section>
  );
}

function InPopover() {
  const state = useColumns();
  const anchor = useRef<HTMLButtonElement>(null);
  return (
    <section aria-labelledby="popover-title">
      <h2 id="popover-title">Inside the kit Popover</h2>
      <div>
        <Button ref={anchor} type="button" popoverTarget="popover-menu">View</Button>
        <Popover id="popover-menu" anchor={anchor} aria-label="View options">
          <ViewMenu {...state.density} columns={state.columns} columnsLabel="Columns" onColumnVisibilityChange={state.onColumnVisibilityChange} onReorder={state.onReorder} />
        </Popover>
      </div>
    </section>
  );
}

const VIEWS = ['Mine', 'Team queue', 'P1 only', 'Unassigned', 'Breached'].map((label) => ({ id: label.toLowerCase().replace(/[^a-z0-9]+/g, '-'), label }));

function Saved() {
  const [items, setItems] = useState(VIEWS);
  return (
    <section id="saved" aria-labelledby="saved-title">
      <h2 id="saved-title">Saved views</h2>
      <SavedViewMenu
        items={items}
        onSelect={() => {}}
        reorderLabel="Drag to reorder"
        onReorder={(ids) => {
          window.__vm.savedOrders.push(ids);
          setItems(ids.map((id) => items.find((item) => item.id === id)!));
        }}
      />
    </section>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <h1>ViewMenu harness</h1>
    <BareOverlay />
    <InPopover />
    <Saved />
  </StrictMode>,
);
