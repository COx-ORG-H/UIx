/* Live harness for the older kit gaps TENSOR's triage still found blocking (HAR-1346,
 * 2026-10-08), bundled by build.mjs from source for tests/a11y/older-gaps.spec.mjs. One
 * <section id> per issue; window.__older records what the components reported.
 *
 *   #dates       HAR-1383  DatePicker, DateTimePicker, DateRangePicker mode="field"
 *   #inline-edit HAR-1381  values of a record edited in place
 *   #radio-cards HAR-1373  RadioGroup variant="card"
 *   #tree        HAR-1382  a tree that loads children on expand: loading, error, retry
 *   #entity      HAR-1648  EntityPicker idle hint and "more match" row
 *   #presence    HAR-1374  Avatar presence
 */
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Avatar, DatePicker, DateRangePicker, DateTimePicker, DescriptionItem, DescriptionList, EntityPicker, Field, InlineEdit, RadioCard,
  RadioGroup, Tree,
} from '../../packages/react/src/index.js';
import type { DateRangeValue, SearchSuggestOption, TreeNodeData } from '../../packages/react/src/index.js';

declare global {
  interface Window {
    __older: { due: string | null; starts: string | null; period: DateRangeValue; saved: string[]; plan: string; loads: string[]; outerEscape: number };
  }
}
window.__older = { due: '2026-11-18', starts: '2026-11-22T14:30', period: {}, saved: [], plan: 'team', loads: [], outerEscape: 0 };

const TODAY = '2026-11-10';

function DateCases() {
  const [due, setDue] = useState<string | null>(window.__older.due);
  const [starts, setStarts] = useState<string | null>(window.__older.starts);
  const [period, setPeriod] = useState<DateRangeValue>(window.__older.period);
  const [low, setLow] = useState<string | null>('2026-11-18');
  return (
    // What a drawer around the fields would hear: Escape must not reach it from an open calendar.
    <section id="dates" onKeyDown={(event) => { if (event.key === 'Escape') window.__older.outerEscape += 1; }}>
      <h2>Date fields (HAR-1383)</h2>
      <button type="button" id="before-dates">Before</button>
      <Field label="Due date" hint="Working days only">
        <DatePicker
          value={due} locale="de" today={TODAY} name="due" min="2026-11-02" max="2026-12-31"
          isUnavailable={(date) => [0, 6].includes(new Date(`${date}T00:00:00Z`).getUTCDay())}
          onValueChange={(next) => { window.__older.due = next; setDue(next); }}
        />
      </Field>
      <Field label="Starts">
        <DateTimePicker
          value={starts} locale="de" today={TODAY} timeZone="Europe/Vienna" minuteStep={15}
          onValueChange={(next) => { window.__older.starts = next; setStarts(next); }}
        />
      </Field>
      <Field label="Period">
        <DateRangePicker
          mode="field" value={period} locale="de" today={TODAY} visibleMonth="2026-11-01" label="Period"
          onChange={(next) => { window.__older.period = next; setPeriod(next); }}
        />
      </Field>
      <button type="button" id="after-dates">After</button>
      {/* The last thing on a short page: the calendar has no room below and must stay on screen. */}
      <div id="low-date" style={{ marginBlockStart: '70vh' }}>
        <DatePicker value={low} onValueChange={setLow} locale="en-GB" today={TODAY} aria-label="Low date" size="sm" weekStartsOn={0} />
      </div>
    </section>
  );
}

function InlineEditCases() {
  const [title, setTitle] = useState('Payment API latency');
  const [owner, setOwner] = useState('');
  const [summary, setSummary] = useState('Checkout requests time out');
  const save = (set: (next: string) => void) => (next: string) => { window.__older.saved.push(next); set(next); };
  return (
    <section id="inline-edit">
      <h2>Inline edit (HAR-1381)</h2>
      <DescriptionList>
        <DescriptionItem term="Title"><InlineEdit label="Title" value={title} onSave={save(setTitle)} validate={(next) => (next.trim() ? undefined : 'A title is required.')} /></DescriptionItem>
        <DescriptionItem term="Owner"><InlineEdit label="Owner" value={owner} onSave={save(setOwner)} /></DescriptionItem>
        <DescriptionItem term="Summary">
          <InlineEdit
            label="Summary" value={summary} multiline
            onSave={(next) => new Promise<void>((resolve, reject) => {
              window.setTimeout(() => {
                if (next.includes('fail')) reject(new Error('That summary is already used by INC-2041.'));
                else { save(setSummary)(next); resolve(); }
              }, 150);
            })}
          />
        </DescriptionItem>
        <DescriptionItem term="State"><InlineEdit label="State" value="Closed" onSave={() => undefined} disabled /></DescriptionItem>
      </DescriptionList>
    </section>
  );
}

function RadioCardCases() {
  const [plan, setPlan] = useState(window.__older.plan);
  const pick = (next: string) => { window.__older.plan = next; setPlan(next); };
  const card = (value: string, title: string, description: string, disabled = false) => (
    <RadioCard name="plan" value={value} title={title} description={description} checked={plan === value} disabled={disabled} onChange={() => pick(value)} />
  );
  return (
    <section id="radio-cards">
      <h2>Radio cards (HAR-1373)</h2>
      <button type="button" id="before-cards">Before</button>
      <RadioGroup variant="card" label="Rollout">
        {card('single', 'One site', 'Vienna only, for a first week of feedback.')}
        {card('team', 'One team', 'The service desk in every site.')}
        {card('legacy', 'Legacy tenants', 'Not available on this plan.', true)}
        {card('all', 'Everyone', 'All sites and teams at once, with no way to pause in between.')}
      </RadioGroup>
      <button type="button" id="after-cards">After</button>
    </section>
  );
}

const ROOTS: TreeNodeData[] = [
  { id: 'emea', label: 'EMEA', hasChildren: true },
  { id: 'apac', label: 'APAC', hasChildren: true },
  { id: 'hq', label: 'Headquarters' },
];

function TreeCases() {
  const [nodes, setNodes] = useState(ROOTS);
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const loadChildren = (node: TreeNodeData) => new Promise<TreeNodeData[]>((resolve, reject) => {
    window.__older.loads.push(node.id);
    const attempt = window.__older.loads.filter((id) => id === node.id).length;
    window.setTimeout(() => {
      // APAC fails the first time, so the error row and Retry are reachable.
      if (node.id === 'apac' && attempt === 1) { reject(new Error('offline')); return; }
      const children = node.id === 'emea'
        ? [{ id: 'emea-vie', label: 'Vienna' }, { id: 'emea-sjj', label: 'Sarajevo' }]
        : [{ id: 'apac-sin', label: 'Singapore' }];
      setNodes((current) => current.map((root) => (root.id === node.id ? { ...root, children } : root)));
      resolve(children);
    }, 200);
  });
  return (
    <section id="tree">
      <h2>Lazy tree (HAR-1382)</h2>
      <Tree aria-label="Sites" nodes={nodes} loadChildren={loadChildren} selected={selected} onSelect={setSelected} />
    </section>
  );
}

const PEOPLE: SearchSuggestOption[] = Array.from({ length: 30 }, (_, index) => ({
  id: `p${index + 1}`,
  title: ['Amra Hodžić', 'Jonas Weber', 'Mira Novak', 'Tarik Begić', 'Lena Schmid'][index % 5] + ` ${index + 1}`,
  meta: ['Service desk'],
}));

function EntityCases() {
  const [person, setPerson] = useState<SearchSuggestOption | null>(null);
  return (
    <section id="entity">
      <h2>Entity picker (HAR-1648)</h2>
      <div className="rail">
        <Field label="Assignee">
          <EntityPicker
            label="Assignee" value={person} onValueChange={setPerson} minQueryLength={2} delay={0}
            onSearch={async (query) => {
              const found = PEOPLE.filter((option) => option.title.toLowerCase().includes(query.toLowerCase()));
              return { options: found.slice(0, 5), hasMore: found.length > 5 };
            }}
          />
        </Field>
      </div>
    </section>
  );
}

function PresenceCases() {
  return (
    <section id="presence">
      <h2>Avatar presence (HAR-1374)</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--uix-space-4)', alignItems: 'center' }}>
        <Avatar presence="online" alt="Amra Hodžić">AH</Avatar>
        <Avatar presence="busy" alt="Jonas Weber">JW</Avatar>
        <Avatar presence="away" alt="Mira Novak" size="lg">MN</Avatar>
        <Avatar presence="offline" alt="Tarik Begić" size="sm">TB</Avatar>
      </div>
    </section>
  );
}

function Harness() {
  return (
    <>
      <h1>Older kit gaps</h1>
      <InlineEditCases />
      <RadioCardCases />
      <TreeCases />
      <EntityCases />
      <PresenceCases />
      <DateCases />
    </>
  );
}

createRoot(document.getElementById('root')!).render(<StrictMode><Harness /></StrictMode>);
