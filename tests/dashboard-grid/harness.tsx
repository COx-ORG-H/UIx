/* Live harness for DashboardGrid (HAR-1555), bundled by build.mjs from source for
 * tests/a11y/dashboard-grid.spec.mjs.
 *   - #default: no `columns` (1, 2 from sm, 3 from lg of the grid's width); spans 1, 2 and full,
 *     with a real Chart in a full and a span-1 item whose height is a share of the item width.
 *   - #explicit: the issue's `columns={{ base: 1, sm: 2, xl: 3 }}`, gap lg; the spec sets its width.
 *   - #fixed: `columns={2}`: the CSS defaults (3 from lg) must not leak into an explicit set.
 *   - #narrow: the default grid in a 35rem box: one column on a wide screen (container, not viewport). */
import { StrictMode } from 'react';
import type { ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { DashboardGrid } from '../../packages/react/src/index.js';
import type { DashboardGridSpan } from '../../packages/react/src/index.js';
import { Chart } from '../../packages/react/src/chart.js';

const option = {
  animation: false,
  grid: { left: 32, right: 8, top: 8, bottom: 24 },
  xAxis: { type: 'category' as const, data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
  yAxis: { type: 'value' as const },
  series: [{ type: 'line' as const, data: [12, 18, 15, 22, 19, 9, 7] }],
};

const CHART_HEIGHT = 'clamp(160px, 40cqi, 360px)';

const Tile = ({ id, span, children }: { id: string; span?: DashboardGridSpan; children?: ReactNode }) => (
  <DashboardGrid.Item span={span} data-testid={id}>
    <div className="tile">{children ?? `${id} · span ${span ?? 1}`}</div>
  </DashboardGrid.Item>
);

function Harness() {
  return (
    <>
      <section id="default" aria-label="Default columns">
        <DashboardGrid>
          <Tile id="a" />
          <Tile id="b" />
          <Tile id="c">c · span 1 — a longer widget: its row grows to fit it, and the other widgets in the row stretch to the same height instead of leaving ragged bottoms.</Tile>
          <Tile id="wide" span={2} />
          <Tile id="d" />
          <DashboardGrid.Item span="full" data-testid="full">
            <Chart title="Resolved per day, full width" option={option} height={CHART_HEIGHT} />
          </DashboardGrid.Item>
          <DashboardGrid.Item data-testid="chart-1">
            <Chart title="Resolved per day, one column" option={option} height={CHART_HEIGHT} />
          </DashboardGrid.Item>
        </DashboardGrid>
      </section>
      <section id="explicit" aria-label="Explicit columns">
        <DashboardGrid columns={{ base: 1, sm: 2, xl: 3 }} gap="lg">
          <Tile id="x1" />
          <Tile id="x2" span={2} />
          <Tile id="xfull" span="full" />
          <Tile id="x3" />
        </DashboardGrid>
      </section>
      <section id="fixed" aria-label="Two columns">
        <DashboardGrid columns={2}>
          <Tile id="f1" />
          <Tile id="f2" />
          <Tile id="f3" span={2} />
        </DashboardGrid>
      </section>
      <section id="narrow" aria-label="Narrow container">
        <DashboardGrid>
          <Tile id="n1" />
          <Tile id="n2" span={2} />
          <Tile id="n3" span="full" />
        </DashboardGrid>
      </section>
    </>
  );
}

const root = document.getElementById('root');
if (root) createRoot(root).render(<StrictMode><Harness /></StrictMode>);
