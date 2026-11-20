/* Live harness for WCAG 2.5.7 Dragging Movements (enterprise UX study, roadmap #19), bundled by
 * build.mjs from source for tests/a11y/single-pointer.spec.mjs. Every drag in the kit has a path
 * that takes single clicks; this page has one of each, with German labels from UixLabelsProvider:
 *   - #sortable: SortableList (Move up / Move down on every row);
 *   - #view-menu: ViewMenu column rows (the ⋯ menu's Move up / Move down);
 *   - #kanban: a board whose cards have the Move menu (Move up / Move down, a column list); the
 *     cards also have the product's own pointer-drag start and click-to-open, which a press in the
 *     Move menu must never trigger (window.__kanban.drags / .opened);
 *   - #canvas: DashboardCanvas in edit mode (a press on a handle shows its step buttons).
 * window.__orders records every new order; [data-testid="layout"] shows the canvas layout. */
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DashboardCanvas, Kanban, KanbanCard, KanbanColumn, SortableList, UixLabelsProvider, ViewMenu } from '../../packages/react/src/index.js';
import type { DashboardCanvasItem, KanbanMoveDirection, ViewMenuColumn } from '../../packages/react/src/index.js';

declare global {
  interface Window {
    __orders: Record<string, unknown[]>;
    __kanban: { drags: number; opened: string[] };
  }
}
window.__orders = {};
window.__kanban = { drags: 0, opened: [] };
const record = (key: string, value: unknown) => { (window.__orders[key] ??= []).push(value); };

const LABELS = {
  sortableList: { grip: '{label} ziehen', moveUp: '{label} nach oben', moveDown: '{label} nach unten', moved: '{label} ist jetzt an Position {position} von {count}' },
  viewMenu: { rowActions: 'Spaltenaktionen: {label}', reorder: '{label} ziehen', moveUp: 'Nach oben', moveDown: 'Nach unten', hide: 'Ausblenden', show: 'Einblenden', required: 'Immer sichtbar', moved: '{label} ist jetzt an Position {position} von {count}' },
  kanban: { moveMenu: '{label} verschieben', moveUp: 'Nach oben', moveDown: 'Nach unten', moveLeft: 'Nach links', moveRight: 'Nach rechts', moveTo: 'Verschieben nach' },
  dashboardCanvas: {
    region: 'Übersicht', move: '{label} verschieben', resize: 'Größe von {label} ändern',
    instructions: 'Drücken zeigt Schaltflächen, die einen Schritt verschieben oder die Größe ändern; die Pfeiltasten tun dasselbe. Escape bricht ein Ziehen ab.',
    moved: '{label}: Spalte {col}, Zeile {row}', resized: '{label}: {w} Spalten breit, {h} Zeilen hoch', atEdge: '{label} kann nicht weiter in diese Richtung', cancelled: 'Verschieben abgebrochen',
    moveUp: 'Nach oben', moveDown: 'Nach unten', moveLeft: 'Nach links', moveRight: 'Nach rechts',
    narrower: 'Schmaler', wider: 'Breiter', shorter: 'Niedriger', taller: 'Höher', closeSteps: 'Fertig',
  },
};

const STEPS = [{ id: 's1', title: 'Antrag prüfen' }, { id: 's2', title: 'Freigabe einholen' }, { id: 's3', title: 'Benachrichtigen' }];

function Sortable() {
  const [items, setItems] = useState(STEPS);
  return (
    <section>
      <h2>Schritte</h2>
      <SortableList
        id="sortable" aria-label="Schritte" items={items} getId={(s) => s.id} getLabel={(s) => s.title} renderItem={(s) => s.title}
        onReorder={(ids) => { record('sortable', ids); setItems(ids.map((id) => STEPS.find((s) => s.id === id)!)); }}
      />
    </section>
  );
}

const COLUMNS: ViewMenuColumn[] = [
  { id: 'id', label: 'Nummer', visible: true, required: true },
  { id: 'title', label: 'Titel', visible: true },
  { id: 'state', label: 'Status', visible: true },
  { id: 'owner', label: 'Verantwortlich', visible: false },
];

function Columns() {
  const [columns, setColumns] = useState(COLUMNS);
  return (
    <section id="view-menu">
      <h2>Spalten</h2>
      <ViewMenu
        columns={columns}
        columnsLabel="Spalten"
        onColumnVisibilityChange={(id, visible) => setColumns((all) => all.map((c) => (c.id === id ? { ...c, visible } : c)))}
        onReorder={(ids) => { record('view-menu', ids); setColumns((all) => ids.map((id) => all.find((c) => c.id === id)!)); }}
      />
    </section>
  );
}

type Card = { id: string; title: string };
const BOARD_COLUMNS = [{ id: 'todo', label: 'Offen' }, { id: 'doing', label: 'In Arbeit' }, { id: 'done', label: 'Erledigt' }];
const START_BOARD: Record<string, Card[]> = {
  todo: [{ id: 'c1', title: 'Drucker im 2. Stock' }, { id: 'c2', title: 'VPN-Zugang für Lejla' }],
  doing: [{ id: 'c3', title: 'Bibliotheksverwaltungsdienstleistungszentrum migrieren' }],
  done: [],
};

function Board() {
  const [board, setBoard] = useState(START_BOARD);
  const [announcement, setAnnouncement] = useState('');
  const order = BOARD_COLUMNS.map((c) => c.id);
  const place = (cardId: string, toColumn: string, toIndex?: number) => {
    setBoard((current) => {
      const from = order.find((col) => current[col]!.some((c) => c.id === cardId))!;
      const card = current[from]!.find((c) => c.id === cardId)!;
      const next = Object.fromEntries(order.map((col) => [col, current[col]!.filter((c) => c.id !== cardId)])) as Record<string, Card[]>;
      const list = next[toColumn]!;
      const index = Math.max(0, Math.min(toIndex ?? list.length, list.length));
      list.splice(index, 0, card);
      const label = BOARD_COLUMNS.find((c) => c.id === toColumn)!.label;
      setAnnouncement(`${card.title} ist jetzt in ${label}, Position ${index + 1} von ${list.length}`);
      record('kanban', Object.fromEntries(order.map((col) => [col, next[col]!.map((c) => c.id)])));
      return next;
    });
  };
  const move = (col: string, index: number, card: Card) => (dir: KanbanMoveDirection) => {
    const at = order.indexOf(col);
    if (dir === 'up') place(card.id, col, index - 1);
    else if (dir === 'down') place(card.id, col, index + 1);
    else if (dir === 'left' && at > 0) place(card.id, order[at - 1]!);
    else if (dir === 'right' && at < order.length - 1) place(card.id, order[at + 1]!);
  };
  return (
    <section>
      <h2>Tafel</h2>
      <Kanban id="kanban" announcement={announcement}>
        {BOARD_COLUMNS.map((column) => {
          const cards = board[column.id]!;
          return (
            <KanbanColumn key={column.id} title={column.label} count={cards.length} data-col={column.id}>
              {cards.map((card, index) => {
                const at = order.indexOf(column.id);
                const disabled: KanbanMoveDirection[] = [];
                if (index === 0) disabled.push('up');
                if (index === cards.length - 1) disabled.push('down');
                if (at === 0) disabled.push('left');
                if (at === order.length - 1) disabled.push('right');
                return (
                  <KanbanCard
                    key={card.id}
                    itemId={card.id}
                    data-card={card.id}
                    title={card.title}
                    meta={<span className="uix-text-muted">{card.id.toUpperCase()}</span>}
                    onMove={move(column.id, index, card)}
                    moveColumns={BOARD_COLUMNS}
                    column={column.id}
                    onMoveTo={(to) => place(card.id, to)}
                    disabledMoves={disabled}
                    // the product's own drag start and click-to-open, which the Move menu must not reach
                    onPointerDown={() => { window.__kanban.drags += 1; }}
                    onClick={() => { window.__kanban.opened.push(card.id); }}
                  />
                );
              })}
            </KanbanColumn>
          );
        })}
      </Kanban>
    </section>
  );
}

const CANVAS: DashboardCanvasItem[] = [
  { id: 'needs-you', col: 0, row: 0, w: 8, h: 3 },
  { id: 'updates', col: 8, row: 0, w: 4, h: 3, minW: 3 },
  { id: 'sla', col: 0, row: 3, w: 4, h: 2 },
  { id: 'trend', col: 4, row: 3, w: 8, h: 2, maxH: 3 },
];
const NAMES: Record<string, string> = { 'needs-you': 'Braucht dich', updates: 'Neuigkeiten', sla: 'SLA-Risiko', trend: 'Zugang und Abgang' };

function Canvas() {
  const [items, setItems] = useState(CANVAS);
  return (
    <section id="canvas">
      <h2>Übersicht</h2>
      <DashboardCanvas
        items={items}
        editable
        itemLabel={(item) => NAMES[item.id] ?? item.id}
        renderItem={(item) => <div className="tile">{NAMES[item.id]}</div>}
        onLayoutChange={(next, change) => { record('canvas', change); setItems(next); }}
      />
      <pre data-testid="layout">{JSON.stringify(items.map(({ id, col, row, w, h }) => ({ id, col, row, w, h })))}</pre>
    </section>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <UixLabelsProvider labels={LABELS}>
      <h1>Ohne Ziehen</h1>
      <Sortable />
      <Columns />
      <Board />
      <Canvas />
    </UixLabelsProvider>
  </StrictMode>,
);
