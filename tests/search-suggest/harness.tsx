/* Live harness for SearchSuggest + .uix-arrival (TENSOR HAR-763), bundled by build.mjs from source
 * for tests/a11y/search-suggest.spec.mjs. Hosts:
 *   - #full: a settings search over a small catalog — recent list on focus, footer, empty state,
 *     and a jump that lands on a target below with the arrival highlight;
 *   - #narrow: the same field at 280px, where the breadcrumb must truncate its MIDDLE crumbs;
 *   - #loading / #error: the two fetch states.
 * window.__ss records what the tests need to observe. */
import { StrictMode, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { SearchSuggest } from '../../packages/react/src/index.js';
import type { SearchSuggestOption } from '../../packages/react/src/index.js';

type Log = { picks: string[]; footer: number };
declare global { interface Window { __ss: Log } }
window.__ss = { picks: [], footer: 0 };

const CATALOG: SearchSuggestOption[] = [
  { id: 'timezone', title: 'Time zone', meta: ['Settings', 'Presentation', 'General', 'Regional'], description: 'Used for due dates, SLA clocks and every time shown to people in this workspace.' },
  { id: 'language', title: 'Language', meta: ['Settings', 'My account', 'Language'], description: 'The language of menus, emails and notifications you receive.' },
  { id: 'mfa', title: 'Two-factor sign-in', meta: ['Settings', 'My account', 'Security'], description: 'Ask for a second step, such as an authenticator app, when you sign in.' },
  { id: 'business-hours', title: 'Business hours', meta: ['Settings', 'Service desk', 'Business calendars'], description: 'The hours SLA clocks run. Outside them, clocks pause.' },
  { id: 'freeze', title: 'Change freeze windows', meta: ['Settings', 'Change & release', 'Change freeze windows'] },
  { id: 'mailbox', title: 'Mailbox', meta: ['Settings', 'Communications & integration', 'Email intake'], description: 'The address people write to; each email becomes a ticket.' },
  { id: 'works-council', title: 'Works council access', meta: ['Settings', 'Compliance & governance', 'Works council'], description: 'Who may review pseudonymised data and disclosures, under BetrVG.' },
  { id: 'long', title: 'A setting with a deliberately long name that has to truncate on one line', meta: ['Settings', 'A group with a long name', 'A page with an even longer name than the group', 'Section'], description: 'A long description that has to clamp at two lines so the list keeps a steady rhythm, whatever the content is, however long it runs on and on.' },
];

const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const matches = (option: SearchSuggestOption, query: string) => {
  const q = fold(query.trim());
  const hay = fold([option.title, ...(option.meta ?? []), option.description ?? ''].join(' '));
  return hay.includes(q) || q.split(/\s+/).every((t) => hay.split(/\s+/).some((w) => w.startsWith(t)));
};

function Full() {
  const [value, setValue] = useState('');
  const [recent, setRecent] = useState<string[]>(['language', 'mfa']);
  const [arrived, setArrived] = useState<string | null>(null);
  const results = useMemo(() => (value.trim() ? CATALOG.filter((o) => matches(o, value)) : []), [value]);
  const shown = value.trim() ? results.slice(0, 5) : CATALOG.filter((o) => recent.includes(o.id));
  const land = (id: string) => {
    window.__ss.picks.push(id);
    setRecent((r) => [id, ...r.filter((x) => x !== id)].slice(0, 5));
    setArrived(null);
    requestAnimationFrame(() => {
      setArrived(id);
      document.getElementById(`setting-${id}`)?.scrollIntoView({ block: 'center' });
    });
  };
  return (
    <section id="full" aria-label="Full">
      <SearchSuggest
        value={value}
        onValueChange={setValue}
        options={shown}
        onSelect={land}
        label="Search settings"
        placeholder="Search settings"
        size="lg"
        shortcutHint="/"
        heading={value.trim() ? undefined : 'Recently opened'}
        headingAction={value.trim() ? undefined : { label: 'Clear', onSelect: () => setRecent([]) }}
        footer={value.trim() && results.length > 5 ? { label: `Show all ${results.length} results`, onSelect: () => { window.__ss.footer += 1; } } : undefined}
        empty={<span>No settings match “{value}”. Check the spelling or try a shorter word.</span>}
        status={value.trim() ? `${results.length} results` : ''}
      />
      <div style={{ display: 'grid', gap: 'var(--uix-space-3)', marginTop: 'var(--uix-space-6)' }}>
        {CATALOG.map((o) => (
          <div key={o.id} id={`setting-${o.id}`} className={arrived === o.id ? 'uix-arrival' : undefined} style={{ padding: 'var(--uix-space-3)' }}>
            <label>
              {o.title}
              <input className="uix-input" defaultValue="" aria-label={o.title} />
            </label>
          </div>
        ))}
      </div>
    </section>
  );
}

function Narrow() {
  const [value, setValue] = useState('long');
  const options = CATALOG.filter((o) => matches(o, value));
  return (
    <section id="narrow" aria-label="Narrow" style={{ width: 280 }}>
      <SearchSuggest value={value} onValueChange={setValue} options={options} onSelect={() => {}} label="Search settings (narrow)" open />
    </section>
  );
}

function Fetching({ id, loading, error }: { id: string; loading?: boolean; error?: boolean }) {
  const [value, setValue] = useState('tim');
  return (
    <section id={id} aria-label={id}>
      <SearchSuggest
        value={value}
        onValueChange={setValue}
        options={[]}
        onSelect={() => {}}
        label={`Search settings (${id})`}
        loading={loading}
        loadingLabel="Searching…"
        error={error ? <span>Detailed results are unavailable right now. <button type="button" className="uix-btn uix-btn--sm">Retry</button></span> : undefined}
        empty="No settings match"
      />
    </section>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Full />
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, auto)', gap: 'var(--uix-space-6)', alignItems: 'start', minHeight: '20rem' }}>
      <Narrow />
      <Fetching id="loading" loading />
      <Fetching id="error" error />
    </div>
  </StrictMode>,
);
