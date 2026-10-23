/* Live harness for the FilterEditor kinds of HAR-1832 (TENSOR HAR-1484), bundled by build.mjs for
 * tests/a11y/filter-editor-kinds.spec.mjs. German labels. window.__filters records every apply.
 *   - #toolbar: one filter chip per field with its summary; each opens a Popover with the editor:
 *     Host (tags), Erstellt (date with a condition), Bearbeiter (reference, restored from ids
 *     that resolveLabels names after 400 ms);
 *   - #inline: the same three editors laid out side by side, for the screenshots. */
import { StrictMode, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Chip, FilterEditor, Popover, UixLabelsProvider, isFilterEmpty, resolveFilterLabels, summarizeFilter } from '../../packages/react/src/index.js';
import type { FilterChoice, FilterField, FilterValue } from '../../packages/react/src/index.js';

declare global { interface Window { __filters: { applied: Record<string, FilterValue>; resolveCalls: string[][] } } }

const PEOPLE: FilterChoice[] = [
  { value: 'u1', label: 'Amra Kovač' }, { value: 'u2', label: 'Jonas Weber' }, { value: 'u3', label: 'Lejla Hadžić-Šehović' }, { value: 'u4', label: 'Maximilian Oberstaatsanwaltschaftsrat' },
];
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const FIELDS: FilterField[] = [
  { id: 'host', label: 'Host', kind: 'tags' },
  { id: 'created', label: 'Erstellt', kind: 'date' },
  {
    id: 'assignee', label: 'Bearbeiter', kind: 'reference',
    onSearch: (q) => wait(150).then(() => PEOPLE.filter((p) => p.label.toLowerCase().includes(q.toLowerCase()))),
    resolveLabels: (ids) => { window.__filters.resolveCalls.push([...ids]); return wait(400).then(() => PEOPLE.filter((p) => ids.includes(p.value))); },
  },
];
/** What a saved view restores: tags and a one-day "between", and bare reference ids. */
const RESTORED: Record<string, FilterValue> = {
  host: { kind: 'tags', values: ['db-prod-eu-central-01', 'web-01'] },
  created: { kind: 'date', operator: 'between', from: '2026-10-05', to: '2026-10-05' },
  assignee: { kind: 'reference', values: [{ value: 'u1', label: 'u1' }, { value: 'u3', label: 'u3' }] },
};
const formatDate = (d: string) => d.split('-').reverse().join('.');
const SUMMARY = { labels: { before: 'vor {date}', after: 'nach {date}', more: '{first} +{count}' }, formatDate };

function Editor({ field, initial, onApplied }: { field: FilterField; initial?: FilterValue; onApplied: (v: FilterValue) => void }) {
  const [draft, setDraft] = useState<FilterValue | undefined>(initial);
  return (
    <FilterEditor
      field={field} value={draft} onValueChange={setDraft} searchDelay={100}
      onApply={(v) => { window.__filters.applied[field.id] = v; onApplied(v); }}
      onClear={() => setDraft(undefined)}
    />
  );
}

function FilterChip({ field, value, onApplied }: { field: FilterField; value?: FilterValue; onApplied: (v: FilterValue) => void }) {
  const anchor = useRef<HTMLSpanElement>(null);
  const active = value != null && !isFilterEmpty(value);
  const label = active ? summarizeFilter(field, value, SUMMARY) : field.label;
  const popover = () => document.getElementById(`pop-${field.id}`);
  return (
    <span ref={anchor} id={`chip-${field.id}`}>
      <Chip aria-haspopup="dialog" onClick={() => popover()?.togglePopover()}>{label}</Chip>
      <Popover id={`pop-${field.id}`} anchor={anchor} role="dialog" aria-label={field.label}>
        <Editor field={field} initial={value} onApplied={(v) => { onApplied(v); popover()?.hidePopover(); }} />
      </Popover>
    </span>
  );
}

function Toolbar() {
  const [applied, setApplied] = useState<Record<string, FilterValue>>(RESTORED);
  // The chips outside the editors name the restored people too (resolveFilterLabels).
  useEffect(() => {
    let live = true;
    void resolveFilterLabels(FIELDS[2], RESTORED.assignee).then((v) => { if (live && v) setApplied((a) => ({ ...a, assignee: v })); });
    return () => { live = false; };
  }, []);
  return (
    <div id="toolbar" className="uix-cluster" style={{ alignItems: 'center' }}>
      {FIELDS.map((field) => (
        <FilterChip key={field.id} field={field} value={applied[field.id]} onApplied={(v) => setApplied((a) => ({ ...a, [field.id]: v }))} />
      ))}
    </div>
  );
}

function Harness() {
  const labels = useMemo(() => ({
    filterEditor: {
      apply: 'Anwenden', clear: 'Zurücksetzen', operator: 'Bedingung', value: 'Wert', from: 'Von', to: 'Bis', date: 'Datum',
      addTag: 'Wert hinzufügen', addTagHint: 'Mit Eingabetaste oder Komma hinzufügen.', remove: '{label} entfernen',
      search: 'Suchen', searching: 'Suche läuft…', noMatches: 'Keine Treffer.', selected: '{count} ausgewählt',
      dateOperators: { on: 'am', before: 'vor', after: 'nach', between: 'zwischen' },
    },
  }), []);
  return (
    <UixLabelsProvider labels={labels}>
      <h1>Filter</h1>
      <section>
        <h2>Symbolleiste</h2>
        <Toolbar />
      </section>
      <section>
        <h2>Nebeneinander</h2>
        <div id="inline" className="uix-cluster" style={{ alignItems: 'flex-start', gap: 'var(--uix-space-4)' }}>
          {FIELDS.map((field) => (
            <div key={field.id} className="uix-card" style={{ padding: 'var(--uix-space-3)' }} data-field={field.id}>
              <Editor field={field} initial={RESTORED[field.id]} onApplied={() => {}} />
            </div>
          ))}
        </div>
      </section>
    </UixLabelsProvider>
  );
}

window.__filters = { applied: {}, resolveCalls: [] };
createRoot(document.getElementById('root')!).render(<StrictMode><Harness /></StrictMode>);
