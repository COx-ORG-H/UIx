/* Live harness for SlaTimer (Docs/specs/2026-11-20-sla-timer.md), bundled by build.mjs for
 * tests/a11y/sla-timer.spec.mjs. Every timer except #live reads a fixed `now` (?now=, default
 * 2026-11-20T12:00:00Z), so a screenshot is the same on every run; #live reads the page's clock,
 * which the spec drives with Playwright's page.clock.
 *   - #queue: a DataWorkspace queue with an SLA column sorted by slaSortValue (most urgent first),
 *     one row per state: breached, urgent, warning, notice, on track, paused, met, no SLA;
 *   - #header: a record header's three SLAs (resolution warning, first response met, a paused one
 *     with its reason) and a breached one;
 *   - #formats: relative and absolute;
 *   - #de: German words through UixLabelsProvider, German Intl units, in a narrow column;
 *   - #live: two timers on the real clock, one with `announce`. */
import { StrictMode, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DataWorkspace, SlaTimer, UixLabelsProvider, slaSortValue } from '../../packages/react/src/index.js';
import type { DataWorkspaceColumn, DataWorkspaceSort, SlaInput, UixLabels } from '../../packages/react/src/index.js';

const q = new URLSearchParams(location.search);
const NOW = Date.parse(q.get('now') ?? '2026-11-20T12:00:00Z');
const MIN = 60_000;
const HOUR = 3_600_000;
const TZ = 'Europe/Sarajevo';
const LOCALE = 'en-GB';

type Ticket = SlaInput & { id: string; title: string; reason?: string };
const TICKETS: Ticket[] = [
  { id: 'INC-0412', title: 'E-mail outage, Sarajevo office', startedAt: NOW - 4 * HOUR, dueAt: NOW - 35 * MIN },
  { id: 'INC-0419', title: 'VPN disconnects every 10 minutes', startedAt: NOW - 3 * HOUR, dueAt: NOW + 12 * MIN },
  { id: 'INC-0420', title: 'Printer queue stuck on floor 3', startedAt: NOW - 6 * HOUR, dueAt: NOW + 80 * MIN },
  {
    id: 'INC-0423', title: 'Laptop for a new starter', startedAt: NOW - 5 * HOUR, dueAt: NOW + 4 * HOUR,
    thresholds: [{ level: 'notice', elapsed: 0.5 }, { level: 'warning', elapsed: 0.75 }, { level: 'urgent', elapsed: 0.9 }],
  },
  { id: 'INC-0425', title: 'Licence renewal for the design team', startedAt: NOW - HOUR, dueAt: NOW + 2 * 24 * HOUR + 5 * HOUR },
  { id: 'INC-0426', title: 'Shared drive permissions', dueAt: NOW + 6 * HOUR, paused: true, pausedAt: NOW - 2 * HOUR, reason: 'Waiting for the requester' },
  { id: 'INC-0401', title: 'Password reset', dueAt: NOW - HOUR, completedAt: NOW - 3 * HOUR },
  { id: 'REQ-0390', title: 'Question about the holiday calendar' },
];

function Queue() {
  const [sort, setSort] = useState<DataWorkspaceSort | null>({ columnId: 'sla', direction: 'ascending' });
  const rows = useMemo(() => {
    if (!sort) return TICKETS;
    const sign = sort.direction === 'ascending' ? 1 : -1;
    if (sort.columnId === 'sla') return [...TICKETS].sort((a, b) => sign * (slaSortValue(a, NOW) - slaSortValue(b, NOW)));
    return [...TICKETS].sort((a, b) => sign * a.title.localeCompare(b.title, 'en'));
  }, [sort]);
  const columns = useMemo<DataWorkspaceColumn<Ticket>[]>(() => [
    { id: 'title', header: 'Title', cell: (r) => r.title, sortable: true },
    {
      id: 'sla', header: 'Resolution SLA', sortable: true, width: '11rem',
      cell: (r) => <SlaTimer {...r} pausedReason={r.reason} now={NOW} locale={LOCALE} timeZone={TZ} />,
    },
  ], []);
  return (
    <DataWorkspace<Ticket>
      id="queue" label="Incidents" rows={rows} getRowId={(r) => r.id} columns={columns}
      idColumn={{ header: 'ID', id: 'id', text: (r: Ticket) => r.id }}
      sort={sort} onSortChange={setSort} status="ready"
    />
  );
}

function Header() {
  return (
    <section id="header" aria-labelledby="header-title" className="uix-card" style={{ padding: 'var(--uix-space-4)' }}>
      <h2 id="header-title" style={{ margin: 0 }}>INC-0420 Printer queue stuck on floor 3</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--uix-space-6)', marginTop: 'var(--uix-space-3)' }}>
        <SlaTimer variant="header" label="Resolution" startedAt={NOW - 6 * HOUR} dueAt={NOW + 80 * MIN} now={NOW} locale={LOCALE} timeZone={TZ} />
        <SlaTimer variant="header" label="First response" dueAt={NOW - 5 * HOUR} completedAt={NOW - 5.5 * HOUR} now={NOW} locale={LOCALE} timeZone={TZ} />
        <SlaTimer variant="header" label="Supplier OLA" dueAt={NOW + 6 * HOUR} paused pausedAt={NOW - 2 * HOUR} pausedReason="Waiting for the requester" now={NOW} locale={LOCALE} timeZone={TZ} />
        <SlaTimer variant="header" label="Escalation" dueAt={NOW - 2 * HOUR - 5 * MIN} now={NOW} locale={LOCALE} timeZone={TZ} />
      </div>
    </section>
  );
}

function Formats() {
  return (
    <section id="formats" aria-label="Formats" style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--uix-space-6)' }}>
      <SlaTimer format="relative" dueAt={NOW + 2 * HOUR + 10 * MIN} now={NOW} locale={LOCALE} timeZone={TZ} />
      <SlaTimer format="relative" dueAt={NOW - 3 * HOUR} now={NOW} locale={LOCALE} timeZone={TZ} />
      <SlaTimer format="absolute" variant="header" label="Resolution" dueAt={NOW + 20 * MIN} now={NOW} locale={LOCALE} timeZone={TZ} />
    </section>
  );
}

const DE: UixLabels = {
  dateFormat: { locale: 'de' },
  slaTimer: {
    dueIn: 'Fällig in {time}', due: 'Fällig {time}', breachedAgo: 'Seit {time} überschritten', breached: 'Überschritten {time}',
    over: '{time} überschritten', paused: 'Pausiert', pausedLeft: 'Pausiert, noch {time}', met: 'Eingehalten', none: 'Keine Frist',
    lessThanMinute: '< 1 Min.', lessThanMinuteLong: 'weniger als eine Minute', deadline: 'Frist {time}', labelled: '{label}: {text}',
    states: { 'on-track': 'im Plan', notice: 'bald fällig', warning: 'Warnung', urgent: 'dringend', breached: 'überschritten', paused: 'pausiert', met: 'eingehalten' },
  },
};

function German() {
  return (
    <UixLabelsProvider labels={DE}>
      <section id="de" lang="de" aria-label="Deutsch" style={{ display: 'grid', gap: 'var(--uix-space-3)', maxWidth: '13rem' }}>
        <SlaTimer variant="header" label="Lösungsfrist (Verfügbarkeitsvereinbarung)" startedAt={NOW - 6 * HOUR} dueAt={NOW + 80 * MIN} now={NOW} timeZone={TZ} />
        <SlaTimer variant="header" label="Reaktionszeit" dueAt={NOW + 6 * HOUR} paused pausedAt={NOW - 2 * HOUR}
          pausedReason="Wartet auf Rückmeldung der Anforderungsstellerin" now={NOW} timeZone={TZ} />
        <SlaTimer dueAt={NOW - 2 * HOUR - 5 * MIN} now={NOW} timeZone={TZ} />
      </section>
    </UixLabelsProvider>
  );
}

function Live() {
  // read once: the spec installs a fake clock before the page loads
  const [base] = useState(() => Date.now());
  return (
    <section id="live" aria-label="Live" style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--uix-space-6)' }}>
      <SlaTimer data-testid="live-announce" variant="header" label="Resolution" dueAt={base + 31 * MIN} announce locale={LOCALE} timeZone={TZ} />
      <SlaTimer data-testid="live-quiet" dueAt={base + 2 * HOUR + 30_000} locale={LOCALE} timeZone={TZ} />
    </section>
  );
}

function App() {
  return (
    <>
      <h1>SlaTimer harness</h1>
      <Queue />
      <Header />
      <Formats />
      <German />
      <Live />
    </>
  );
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
