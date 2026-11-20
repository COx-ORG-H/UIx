/* Pseudo-locale harness (roadmap #20), bundled by build.mjs from source for
 * tests/a11y/pseudo-locale.spec.mjs. `?locale=en-XA` (default) renders every kit label through the
 * accented, ~35 % longer transform, and the product's own words (titles, tabs, buttons, options) the
 * same way, with a German compound in each place a compound lands; `?locale=en-XB` renders them
 * right to left in a dir="rtl" page; `?locale=en` is the English control.
 *
 * Each case is a <section data-case> at a width a product gives that component. The spec reads the
 * geometry; nothing here asserts. */
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Alert, Breadcrumbs, Button, Card, Chip, ChipGroup, DataWorkspace, EmptyState, Field, PageHeader, Pagination,
  SearchBar, Segmented, SegmentedOption, Select, StatusPill, Step, Steps, Tab, TabPanel, Tabs, UixLabelsProvider,
  useUixLabels,
} from '../../packages/react/src/index.js';
import type { UixLabels } from '../../packages/react/src/index.js';
import { COMPOUNDS, PSEUDO_LOCALES, pseudoLabels } from './pseudo.mjs';
import { ENGLISH } from './english.js';

const params = new URLSearchParams(location.search);
const LOCALE = (params.get('locale') ?? 'en-XA') as 'en' | 'en-XA' | 'en-XB';
const transform: (s: string) => string = LOCALE === 'en' ? (s) => s : PSEUDO_LOCALES[LOCALE];
const t = (s: string) => transform(s);
const LABELS = (LOCALE === 'en' ? ENGLISH : pseudoLabels(ENGLISH, transform)) as UixLabels;
document.documentElement.lang = LOCALE;
if (LOCALE === 'en-XB') document.documentElement.dir = 'rtl';
/** A German compound, tagged so hyphenation (where the browser has a dictionary) can act. */
const de = (i: number) => <span lang="de">{COMPOUNDS[i]}</span>;

interface Ticket { id: string; title: string; state: string; owner: string }
const ROWS: Ticket[] = [
  { id: 'INC-2041', title: 'VPN drops every few minutes for the night shift', state: 'Waiting for approval', owner: 'Amra Hodžić' },
  { id: 'INC-2042', title: COMPOUNDS[3], state: 'In progress', owner: 'Jonas Weißgerber' },
  { id: 'INC-2043', title: 'Printer on floor 3 offline', state: 'Resolved', owner: 'Ivana Đurić' },
];

function Case({ name, width, children }: { name: string; width: number; children: React.ReactNode }) {
  return (
    <section data-case={name} aria-label={name} style={{ inlineSize: width, maxInlineSize: '100%' }}>
      {children}
    </section>
  );
}

function PaginationCase() {
  const labels = useUixLabels();
  const [page, setPage] = useState(4);
  return <Pagination page={page} pageCount={12} onChange={setPage} labels={labels.pagination} />;
}

function Cases() {
  const [tab, setTab] = useState('open');
  const [view, setView] = useState('board');
  const [owner, setOwner] = useState('ops');
  const [selection, setSelection] = useState<Set<string>>(new Set(['INC-2041', 'INC-2043']));
  const [search, setSearch] = useState('');
  return (
    <>
      <Case name="page-header" width={720}>
        <PageHeader
          eyebrow={t('Service desk')}
          title={<>{t('Incidents')} · {de(0)}</>}
          subtitle={t('Everything the night shift needs to hand over before 06:00.')}
          actions={<><Button variant="secondary">{t('Export')}</Button><Button variant="primary">{t('New incident')}</Button></>}
        />
      </Case>
      <Case name="buttons" width={480}>
        <div className="uix-cluster">
          <Button variant="primary">{t('Save changes')}</Button>
          <Button variant="secondary">{t('Discard')}</Button>
          <Button variant="ghost" size="sm">{t('Assign to me')}</Button>
          <Button variant="secondary">{de(4)}</Button>
        </div>
      </Case>
      <Case name="tabs" width={640}>
        <Tabs value={tab} onChange={setTab} aria-label={t('Queue views')}>
          <Tab value="open">{t('All open')}</Tab>
          <Tab value="mine">{t('Assigned to me')}</Tab>
          <Tab value="breach">{t('About to breach')}</Tab>
          <Tab value="survey">{de(2)}</Tab>
          <Tab value="closed">{t('Closed')}</Tab>
          {['open', 'mine', 'breach', 'survey', 'closed'].map((v) => <TabPanel key={v} value={v}>{t('Tickets')}</TabPanel>)}
        </Tabs>
      </Case>
      <Case name="segmented" width={420}>
        <Segmented value={view} onChange={setView} aria-label={t('View')}>
          <SegmentedOption value="list">{t('List')}</SegmentedOption>
          <SegmentedOption value="board">{t('Board')}</SegmentedOption>
          <SegmentedOption value="calendar">{t('Calendar')}</SegmentedOption>
        </Segmented>
      </Case>
      <Case name="data-workspace" width={760}>
        <DataWorkspace<Ticket>
          label={t('Incidents')}
          rows={ROWS}
          getRowId={(r) => r.id}
          idColumn={{ header: 'ID', text: (r) => r.id, href: (r) => `#${r.id}` }}
          columns={[
            { id: 'title', header: t('Title'), cell: (r) => t(r.title), textWrap: 'truncate', className: 'uix-col--w-lg' },
            { id: 'state', header: t('State'), cell: (r) => <StatusPill tone="warning">{t(r.state)}</StatusPill> },
            { id: 'owner', header: de(1), cell: (r) => r.owner },
          ]}
          selection={selection}
          onSelectionChange={setSelection}
          bulkActions={() => <><Button size="sm">{t('Assign to me')}</Button><Button size="sm" variant="ghost">{t('Close')}</Button></>}
          search={{ value: search, onChange: setSearch, label: t('Search incidents') }}
          pagination={{ mode: 'offset', page: 1, pageSize: 25, total: 3, onPageChange: () => {} }}
        />
      </Case>
      <Case name="pagination" width={520}>
        <PaginationCase />
      </Case>
      <Case name="search-bar" width={420}>
        <SearchBar label={t('Knowledge base')} placeholder={t('Search articles and settings')} />
      </Case>
      <Case name="alert" width={480}>
        <Alert tone="warning" title={t('The change window closes in 20 minutes')} onDismiss={() => {}}
          actions={<Button size="sm" variant="secondary">{t('Extend window')}</Button>}>
          {t('Two approvals are still missing:')} {de(4)}.
        </Alert>
      </Case>
      <Case name="empty" width={420}>
        <EmptyState title={t('No incidents match')} action={<Button variant="secondary">{t('Clear filters')}</Button>}>
          {t('Change the search or clear a filter.')}
        </EmptyState>
      </Case>
      <Case name="chips" width={360}>
        <ChipGroup label={t('Filters')}>
          <Chip onRemove={() => {}}>{t('Priority: high')}</Chip>
          <Chip onRemove={() => {}}>{t('Team: network')}</Chip>
          <Chip onRemove={() => {}}>{de(3)}</Chip>
        </ChipGroup>
        <p><StatusPill tone="warning" dot>{t('Waiting for approval')}</StatusPill></p>
      </Case>
      <Case name="steps" width={560}>
        <Steps label={t('Import')}>
          <Step title={t('Upload')} state="complete" />
          <Step title={t('Validate')} state="error" />
          <Step title={de(0)} />
          <Step title={t('Publish')} />
        </Steps>
      </Case>
      <Case name="breadcrumbs" width={420}>
        <Breadcrumbs label={t('Breadcrumbs')} items={[
          { label: t('Service desk'), href: '#desk' },
          { label: de(4) as unknown as string, href: '#changes' },
          { label: 'CHG-1042' },
        ]} />
      </Case>
      <Case name="card" width={360}>
        <Card title={de(2)} headerAction={<Button size="sm" variant="ghost">{t('Edit')}</Button>}>
          {t('Response rate fell after the reminder e-mail was switched off.')}
        </Card>
      </Case>
      <Case name="select" width={280}>
        <Field label={t('Owning team')} htmlFor="owner">
          <Select id="owner" value={owner} onValueChange={(v) => setOwner(String(v))} options={[
            { value: 'ops', label: t('Operations and infrastructure') },
            { value: 'net', label: COMPOUNDS[1] },
          ]} />
        </Field>
      </Case>
    </>
  );
}

function Harness() {
  return (
    <UixLabelsProvider labels={LABELS}>
      <h1>{t('Pseudo-locale')} {LOCALE}</h1>
      <Cases />
    </UixLabelsProvider>
  );
}

/** Every English default string (templates cut at their first placeholder), for the hard-coded-English scan. */
const englishStrings = (value: unknown): string[] => {
  if (typeof value === 'string') return [value.split('{')[0].trim()];
  if (value && typeof value === 'object') return Object.values(value).flatMap(englishStrings);
  return [];
};

createRoot(document.getElementById('root')!).render(<StrictMode><Harness /></StrictMode>);
(window as unknown as { __pseudo: unknown }).__pseudo = {
  locale: LOCALE,
  namespaces: Object.keys(ENGLISH),
  english: [...new Set(englishStrings(ENGLISH).filter((s) => s.length >= 4))],
};
