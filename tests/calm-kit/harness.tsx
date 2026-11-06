/* Live harness for the calm kit (2.56), bundled by build.mjs from source for
 * tests/a11y/calm-kit.spec.mjs: a German glance home that arrives (Arrive, ArriveItem, ChartCard,
 * Count arrive, Sparkline, Meter target, BarList, StatusStrip, GlanceLineChart, PairedBarChart on
 * the lean preset) and the signal ladder (StatusDot, the critical pill).
 *   - #refresh: new numbers, as a refetch would bring them (the arrival must not replay);
 *   - ?ready=0: the stage waits until #load is pressed;
 *   - window.__calm.renders counts renders of the home. */
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Arrive, ArriveItem, BarList, Button, ChartCard, Count, Meter, Sparkline, Stat, StatusDot, StatusPill, StatusStrip } from '../../packages/react/src/index.js';
import { ChartLegend, ChartLegendItem, GlanceLineChart, PairedBarChart } from '../../packages/react/src/chart-preset.js';

declare global { interface Window { __calm: { renders: number } } }
window.__calm = { renders: 0 };

const WEEKS = ['17. Aug.', '24. Aug.', '31. Aug.', '7. Sept.', '14. Sept.', '21. Sept.', '28. Sept.', '5. Okt.', '12. Okt.', '19. Okt.', '26. Okt.', '2. Nov.'];
const DAYS = ['Do', 'Fr', 'Sa', 'So', 'Mo', 'Di', 'Mi'];
const SERVICES = ['Mail', 'VPN', 'Portal', 'DMS', 'Druck', 'HR', 'CRM', 'Wiki', 'SSO'];

function Home({ bump }: { bump: number }) {
  window.__calm.renders += 1;
  const backlog = [20, 21, 18, 19, 22, 22, 20, 19, 60, 75, 82, 85 + bump];
  const opened = [18, 22, 15, 9, 6, 21, 19 + bump];
  return (
    <>
      <ArriveItem index={0} className="uix-card" id="now" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--uix-space-4)', padding: 'var(--uix-space-3) var(--uix-space-5)' }}>
        <StatusDot tone="critical">Läuft gerade</StatusDot>
        <span style={{ flex: '1 1 16rem', minWidth: 0, fontWeight: 600 }}>INC-0001 · Förderportal: Antragsübermittlung bricht für alle Antragstellenden ab</span>
        <Button size="sm">Krisenraum öffnen</Button>
      </ArriveItem>
      <div className="grid" style={{ '--min': '13rem' } as React.CSSProperties}>
        <ArriveItem index={1}><Stat size="compact" label="Warten auf Sie" value={<Count id="count-wait" value={16 + bump} arrive />} meta="3 davon heute fällig" /></ArriveItem>
        <ArriveItem index={2}><Stat size="compact" label="SLA in Gefahr" value={<Count value={5} arrive />} meta="nächste Frist in 1 Std. 40 Min." /></ArriveItem>
        <ArriveItem index={3}><Stat size="compact" label="Offener Rückstand" value={<Count id="count-backlog" value={85 + bump} arrive />} meta={<>↑ 3 ggü. Vorwoche <Sparkline id="spark" values={backlog} /></>} /></ArriveItem>
        <ArriveItem index={4}>
          <Stat size="compact" label="SLA-Einhaltung · 30 Tage" value={<><Count value={42} arrive /> %</>} meta={<>
            <Meter id="meter" value={42} tone="warning" target={95} targetLabel="Ziel 95 %" label="SLA-Einhaltung" style={{ flex: '1 1 100%', margin: 'var(--uix-space-2) 0' }} />
            <StatusDot tone="warning" size="sm">unter Ziel 95 %</StatusDot>
          </>} />
        </ArriveItem>
      </div>
      <div className="grid" style={{ '--min': '20rem' } as React.CSSProperties}>
        <ChartCard id="card-backlog" arriveIndex={5} question="Wächst der Rückstand?" headline={<Count value={85 + bump} arrive />} answer="offen, Prognose 140 bis 23. Nov." note="Seit drei Wochen gehen mehr Störungen ein als gelöst werden. Gestrichelt: Prognose.">
          <GlanceLineChart
            ariaLabel="Offener Rückstand der letzten 12 Wochen, steigend von 20 auf 85, Prognose 140 am 23. November"
            categoryLabel="Woche"
            categories={WEEKS}
            values={backlog}
            name="offen"
            forecast={{ categories: ['9. Nov.', '16. Nov.', '23. Nov.'], values: [102, 121, 140], name: 'erwartet', label: 'Prognose 140' }}
            tooltipTitle={(c) => `Woche ab ${c}`}
          />
        </ChartCard>
        <ChartCard id="card-flow" arriveIndex={6} question="Kommen wir hinterher?" headline="+22" answer="mehr eröffnet als gelöst" note={<ChartLegend style={{ display: 'inline-flex' }}><ChartLegendItem label="eröffnet" color="var(--uix-chart-series)" /><ChartLegendItem label="gelöst" color="var(--uix-chart-comparison)" /></ChartLegend>}>
          <PairedBarChart
            ariaLabel="Eröffnete und gelöste Störungen der letzten 7 Tage"
            categoryLabel="Tag"
            categories={DAYS}
            series={{ name: 'eröffnet', values: opened }}
            comparison={{ name: 'gelöst', values: [14, 17, 16, 8, 5, 15, 13] }}
          />
        </ChartCard>
        <ChartCard id="card-age" arriveIndex={7} question="Wie alt ist der Rückstand?" headline="82" answer="von 85 älter als 7 Tage">
          <BarList aria-label="Offene Störungen nach Alter" items={[{ label: '< 1 Tag', value: 1 }, { label: '1–3 Tage', value: 0 }, { label: '3–7 Tage', value: 2 }, { label: '> 7 Tage', value: 82 }]} />
        </ChartCard>
        <ChartCard id="card-services" arriveIndex={8} question="Laufen die Dienste?" headline="9" answer="von 12 in Betrieb">
          <StatusStrip summary="9 von 12 Diensten in Betrieb, 3 eingeschränkt" items={[
            { id: 'citrix', label: 'Citrix-Arbeitsplätze', tone: 'warning', state: 'eingeschränkt' },
            { id: 'core', label: 'Kernbank-API', tone: 'warning', state: 'eingeschränkt' },
            { id: 'sap', label: 'SAP FI/CO', tone: 'warning', state: 'eingeschränkt' },
            ...SERVICES.map((id) => ({ id, label: id, tone: 'ok' as const })),
          ]} />
        </ChartCard>
      </div>
    </>
  );
}

function Harness() {
  const params = new URLSearchParams(location.search);
  const [bump, setBump] = useState(0);
  const [ready, setReady] = useState(params.get('ready') !== '0');
  return (
    <>
      <h1>Guten Abend, Daniel</h1>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--uix-space-2)' }}>
        <Button id="refresh" size="sm" onClick={() => setBump((b) => b + 1)}>Neue Daten</Button>
        <Button id="load" size="sm" onClick={() => setReady(true)}>Laden</Button>
      </div>
      <Arrive id="stage" ready={ready} aria-label="Überblick" role="region" className="stack">
        <Home bump={bump} />
      </Arrive>
      <section id="ladder" aria-label="Signalstufen">
        <h2>Signalstufen</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--uix-space-5)' }}>
          <StatusDot id="dot-neutral">P1</StatusDot>
          <StatusDot id="dot-info" tone="info">Neu seit Ihrem letzten Besuch</StatusDot>
          <StatusDot id="dot-warning" tone="warning">SLA in 1 Std. 40 Min.</StatusDot>
          <StatusDot id="dot-critical" tone="critical">SLA seit 2 Std. überschritten</StatusDot>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--uix-space-2)' }}>
          <StatusPill id="pill-critical" tone="critical" dot>Kritisch</StatusPill>
          <StatusPill tone="danger">Verletzt</StatusPill>
          <Button id="destroy" variant="danger" size="sm">Löschen</Button>
        </div>
        <div style={{ maxWidth: '24rem' }}><ChartCard id="card-empty" question="Anstehende Wartung" empty="Keine Wartung in den nächsten 14 Tagen." /></div>
      </section>
    </>
  );
}

createRoot(document.getElementById('root')!).render(<StrictMode><Harness /></StrictMode>);
