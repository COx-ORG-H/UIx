/* Live harness for AuditLog (HAR-987; MEDx S50 "Historija pristupa"), bundled by build.mjs for
 * tests/a11y/audit-log.spec.mjs. Bosnian labels, PHI-free rows. A fake server filters and pages
 * (keyset, 6 per page, 400 ms per request); window.__audit records every request.
 *   - #history: the access history of one record in a Card, filters on, "Prikaži starije";
 *   - #states: the same component in its first-load, empty, error and forbidden states. */
import { StrictMode, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AuditLog, Card, UixLabelsProvider } from '../../packages/react/src/index.js';
import type { AuditLogEvent, AuditLogFilters } from '../../packages/react/src/index.js';

declare global { interface Window { __audit: { requests: string[] } } }

const NOW = new Date('2026-10-22T12:00:00Z');
const ACTIONS = {
  viewed: { label: 'Otvoreno', tone: 'info' as const },
  edited: { label: 'Izmijenjeno', tone: 'warning' as const },
  exported: { label: 'Izvezeno', tone: 'danger' as const },
  printed: { label: 'Odštampano', tone: 'neutral' as const },
};
const ACTORS = [
  { value: 'u1', label: 'dr. Amra Kovač' }, { value: 'u2', label: 'med. sestra Lejla Hadžić-Šehović' },
  { value: 'u3', label: 'Podrška POSx (portal)' }, { value: 'u4', label: 'Administrator ordinacije' },
];
const exact = (d: Date) => `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}. ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
const KINDS = Object.keys(ACTIONS) as (keyof typeof ACTIONS)[];
const TARGETS = ['Karton pacijenta 1042', 'Alergije', 'Nalaz laboratorije 2026-10-14', 'Recept R-2026-118'];
/** 20 entries, newest first, an hour and a half apart. */
const ALL = Array.from({ length: 20 }, (_, i) => {
  const actor = ACTORS[i % ACTORS.length];
  return {
    id: `e${i + 1}`, actorId: actor.value, actor: actor.label, action: KINDS[i % KINDS.length], target: TARGETS[i % TARGETS.length],
    at: new Date(NOW.getTime() - (i + 1) * 90 * 60_000).toISOString(),
    detail: i % 3 === 1 ? `Polja: dijagnoza, terapija. Razlog: kontrolni pregled. IP 10.20.${i}.4` : undefined,
  };
});

function query(filters: AuditLogFilters) {
  return ALL.filter((e) => {
    const day = e.at.slice(0, 10);
    if (filters.when?.from && day < filters.when.from) return false;
    if (filters.when?.to && day > filters.when.to) return false;
    if (filters.actor?.values.length && !filters.actor.values.includes(e.actorId)) return false;
    if (filters.action?.values.length && !filters.action.values.includes(e.action)) return false;
    return true;
  });
}

function History() {
  const [filters, setFilters] = useState<AuditLogFilters>({});
  const [events, setEvents] = useState<AuditLogEvent[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready'>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const found = useMemo(() => query(filters), [filters]);
  // a filter change reloads page one; the rows on show stay until the answer is there
  useEffect(() => {
    window.__audit.requests.push(`page1 ${JSON.stringify(filters)}`);
    setRefreshing(true);
    const t = setTimeout(() => { setEvents(found.slice(0, 6)); setStatus('ready'); setRefreshing(false); }, 400);
    return () => clearTimeout(t);
  }, [found, filters]);
  return (
    <Card id="history" title="Historija pristupa" titleAs="h2">
      <AuditLog
        events={events} actions={ACTIONS} actors={ACTORS} now={NOW}
        // Chromium has no data for `bs` (it prints "2026 M10 22" and "-1 h"): Croatian relative
        // times read the same, and the exact time is written out.
        locale="hr-HR" formatExact={exact} status={status} refreshing={status === 'ready' && refreshing}
        filters={filters} onFiltersChange={setFilters} formatDate={(d) => d.split('-').reverse().join('. ') + '.'}
        hasMore={events.length < found.length} loadingMore={loadingMore}
        onLoadMore={() => {
          window.__audit.requests.push(`after ${events.at(-1)?.id}`);
          setLoadingMore(true);
          setTimeout(() => { setEvents(found.slice(0, events.length + 6)); setLoadingMore(false); }, 400);
        }}
      />
    </Card>
  );
}

function Harness() {
  return (
    <UixLabelsProvider labels={{
      auditLog: {
        list: 'Historija pristupa', filters: 'Filtriraj historiju', when: 'Period', actor: 'Ko', action: 'Šta', clearFilters: 'Očisti filtere', details: 'Detalji',
        loadMore: 'Prikaži starije', loadingMore: 'Učitavam starije unose…', loaded: 'Prikazano još {count} unosa', loading: 'Učitavam historiju',
        empty: 'Još nema zabilježenih pristupa', emptyDetail: 'Svaki put kad neko otvori ili izmijeni ovaj karton, to se vidi ovdje.',
        filteredEmpty: 'Ništa ne odgovara filterima', filteredEmptyDetail: 'Uklonite filter ili izaberite duži period.',
        error: 'Historija se nije mogla učitati', retry: 'Pokušaj ponovo', forbidden: 'Nemate pristup ovoj historiji', forbiddenDetail: 'Zatražite pristup od administratora ordinacije.',
      },
      filterEditor: { apply: 'Primijeni', clear: 'Očisti', from: 'Od', to: 'Do', selectAll: 'Označi sve', selectNone: 'Poništi izbor', selected: '{count} izabrano' },
    }}>
      <h1>Karton 1042</h1>
      <History />
      <section id="states">
        <h2>Stanja</h2>
        <div className="uix-stack" style={{ gap: 'var(--uix-space-4)' }}>
          <AuditLog id="state-loading" events={[]} actions={ACTIONS} status="loading" />
          <AuditLog id="state-empty" events={[]} actions={ACTIONS} />
          <AuditLog id="state-error" events={[]} actions={ACTIONS} status="error" onRetry={() => {}} />
          <AuditLog id="state-forbidden" events={[]} actions={ACTIONS} status="forbidden" />
        </div>
      </section>
    </UixLabelsProvider>
  );
}

window.__audit = { requests: [] };
createRoot(document.getElementById('root')!).render(<StrictMode><Harness /></StrictMode>);
