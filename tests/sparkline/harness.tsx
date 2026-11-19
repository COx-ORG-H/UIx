/* Live harness for Sparkline (HAR-2880), bundled by build.mjs from source for
 * tests/a11y/sparkline.spec.mjs: the shapes a product puts beside a number (plain, with a gap, with a
 * target, past a threshold, the value written out, no data at all), inside an Arrive stage that plays
 * on load, and the same row in a stat and in a table cell at a narrow width. */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Arrive, ArriveItem, Sparkline, Stat } from '../../packages/react/src/index.js';

const backlog = [20, 19, 22, 22, 20, 18, 60, 75, 80, 82, 85];
const uptime = [99.9, 99.8, null, null, 99.1, 98.7, 99.4, 99.6];

function Harness() {
  return (
    <Arrive id="stage" aria-label="Sparklines" role="region">
      <ArriveItem index={0} className="uix-card" style={{ padding: 'var(--uix-space-4)' }}>
        <ul id="shapes" style={{ display: 'grid', gap: 'var(--uix-space-3)', margin: 0, padding: 0, listStyle: 'none' }}>
          <li data-case="plain"><Sparkline values={backlog} label="Offener Rückstand, 11 Wochen" valueText="85 offen" /></li>
          <li data-case="gap"><Sparkline values={uptime} tone="series" label="Verfügbarkeit, 8 Tage" valueText="99,6 %, zwei Tage ohne Messung" showValue /></li>
          <li data-case="target"><Sparkline values={[40, 48, 52, 58, 61, 57, 64]} target={60} label="Lösungsquote" valueText="64 %, Ziel 60 %" showValue /></li>
          <li data-case="crossed"><Sparkline values={[3, 4, 3, 5, 9, 12]} threshold={{ value: 8, direction: 'above' }} label="Wartende Anfragen" valueText="12, über der Grenze 8" showValue /></li>
          <li data-case="empty"><Sparkline values={[null, null, null]} label="Durchsatz" valueText="noch keine Messwerte" showValue /></li>
          <li data-case="decoration"><span>85 offen </span><Sparkline values={backlog} /></li>
          <li data-case="narrow" style={{ width: 150 }}><Sparkline values={uptime} label="Verfügbarkeit" valueText="99,6 %, drei Tage ohne Messung" showValue /></li>
        </ul>
      </ArriveItem>
      <ArriveItem index={1} style={{ maxWidth: 220, marginTop: 'var(--uix-space-4)' }}>
        <Stat id="stat" label="Offener Rückstand" value="85" size="compact"
          meta={<Sparkline values={backlog} target={60} label="Rückstand, 11 Wochen" valueText="85 offen, Ziel 60" showValue />} />
      </ArriveItem>
    </Arrive>
  );
}

createRoot(document.getElementById('root')!).render(<StrictMode><Harness /></StrictMode>);
