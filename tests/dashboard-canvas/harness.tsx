/* Live harness for DashboardCanvas (TENSOR HAR-1823), bundled by build.mjs from source for
 * tests/a11y/dashboard-canvas.spec.mjs.
 *   - #editable: four items in edit mode; every change is applied and written as JSON to
 *     [data-testid="layout"], so the spec reads the layout the product would save.
 *   - #narrow: the same items read-only in a 35rem box, given in an order that is NOT the reading
 *     order, so the one-column collapse has to sort them. */
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DashboardCanvas } from '../../packages/react/src/index.js';
import type { DashboardCanvasItem } from '../../packages/react/src/index.js';

const START: DashboardCanvasItem[] = [
  { id: 'needs-you', col: 0, row: 0, w: 8, h: 3 },
  { id: 'updates', col: 8, row: 0, w: 4, h: 3, minW: 3 },
  { id: 'sla', col: 0, row: 3, w: 4, h: 2 },
  { id: 'trend', col: 4, row: 3, w: 8, h: 2, maxH: 3 },
];

const NAMES: Record<string, string> = { 'needs-you': 'Needs you', updates: 'Updates', sla: 'SLA risk', trend: 'Inflow vs outflow' };

const Tile = ({ item }: { item: DashboardCanvasItem }) => (
  <div className="tile" data-testid={`tile-${item.id}`}>
    {NAMES[item.id]}
  </div>
);

function Editable() {
  const [items, setItems] = useState(START);
  return (
    <section id="editable">
      <DashboardCanvas
        items={items}
        editable
        itemLabel={(item) => NAMES[item.id] ?? item.id}
        renderItem={(item) => <Tile item={item} />}
        onLayoutChange={(next) => setItems(next)}
      />
      <pre data-testid="layout">{JSON.stringify(items.map(({ id, col, row, w, h }) => ({ id, col, row, w, h })))}</pre>
    </section>
  );
}

function Narrow() {
  // Reversed: DOM order is the opposite of reading order.
  return (
    <section id="narrow">
      <DashboardCanvas items={[...START].reverse()} labels={{ region: 'Narrow layout' }} renderItem={(item) => <Tile item={item} />} />
    </section>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Editable />
    <Narrow />
  </StrictMode>,
);
