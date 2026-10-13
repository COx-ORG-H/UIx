/* Live harness for the decision-grade charts (HAR-1553/1554/1556), bundled by build.mjs from source
 * for tests/a11y/insight-charts.spec.mjs. It renders the SAME specs as the docs page
 * (packages/tokens/guide/insight-examples.js):
 *   - #analytic: ChartPanels with one panel and every overlay (C2);
 *   - #delivery: the level-2 Delivery health — InsightCard (split) over ChartPanels, with a
 *     CorrelationScatter aside (C3, C4);
 *   - #sparse: a scatter with five points, which must refuse to draw a trend.
 * window.__chart(el) returns the ECharts instance of a chart element. */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { getInstanceByDom } from 'echarts/core';
import type { ECharts } from 'echarts';
import { ChartPanels, CorrelationScatter } from '../../packages/react/src/chart-analytic.js';
import { InsightCard } from '../../packages/react/src/components/InsightCard.js';
import type { ChartPanelsProps, CorrelationScatterProps } from '../../packages/react/src/chart-analytic.js';
import type { InsightCardProps } from '../../packages/react/src/components/InsightCard.js';
// plain JS data shared with the docs page
import { ANALYTIC_EXAMPLE, DELIVERY_CARD, DELIVERY_PANELS, DELIVERY_SCATTER, SPARSE_SCATTER } from '../../packages/tokens/guide/insight-examples.js';

declare global {
  interface Window { __chart: (el: Element) => ECharts | undefined; __clicks: string[] }
}
window.__chart = (el) => getInstanceByDom(el as HTMLElement);
window.__clicks = [];

const analytic = ANALYTIC_EXAMPLE as Omit<ChartPanelsProps, 'ariaLabel'>;
const panels = DELIVERY_PANELS as Omit<ChartPanelsProps, 'ariaLabel'>;
const scatter = DELIVERY_SCATTER as Omit<CorrelationScatterProps, 'ariaLabel'>;
const sparse = SPARSE_SCATTER as Omit<CorrelationScatterProps, 'ariaLabel'>;
const card = DELIVERY_CARD as Omit<InsightCardProps, 'headline'> & { headline: string; action: string };

function Harness() {
  return (
    <>
      <section id="analytic" aria-labelledby="analytic-title">
        <h2 id="analytic-title">Overlays</h2>
        <ChartPanels
          {...analytic}
          title="Residence in Review"
          ariaLabel="Residence in Review, daily for 15 days, over the 15 h budget since Sep 2, with a 4-day projection"
          onEventClick={(event) => window.__clicks.push(`event:${event.label}`)}
          onPointClick={(panel, x) => window.__clicks.push(`point:${panel}:${x}`)}
        />
      </section>
      <section id="delivery" aria-labelledby="delivery-title">
        <h2 id="delivery-title">Delivery health, level 2</h2>
        <InsightCard
          eyebrow={card.eyebrow}
          headline={card.headline}
          sowhat={card.sowhat}
          status={card.status}
          kpis={card.kpis}
          coverage={card.coverage}
          source={card.source}
          updated={card.updated}
          layout="split"
          actions={<a className="uix-btn uix-btn--secondary uix-btn--sm" href="#analytic">{card.action}</a>}
          aside={<CorrelationScatter {...scatter} ariaLabel="Items in Review against residence, one point per day" title="Work in Review vs residence" />}
        >
          <ChartPanels {...panels} ariaLabel="Residence per checkpoint, work in Review and reviewers available, daily for 15 days" />
        </InsightCard>
      </section>
      <section id="sparse" aria-labelledby="sparse-title">
        <h2 id="sparse-title">Too little history</h2>
        <CorrelationScatter {...sparse} ariaLabel="Items in Review against residence, five days" title="Five days of history" />
      </section>
    </>
  );
}

createRoot(document.getElementById('root')!).render(<StrictMode><Harness /></StrictMode>);
