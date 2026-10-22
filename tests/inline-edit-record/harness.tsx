/* Live harness for InlineEdit as a record field (HAR-1833; TENSOR HAR-1490 EditableRecord),
 * bundled by build.mjs from source for tests/a11y/inline-edit-record.spec.mjs. German labels.
 * window.__record records every save, state change and the open field.
 *   - #record: a Card with a DescriptionList; one field open at a time (controlled `editing`):
 *     Titel (commit="blur", text; "langsam" takes 900 ms, "fehler" fails with Try again,
 *     "konflikt" fails with Reload latest), Verantwortlich (an object, commit="change"),
 *     Ticket (trigger="icon", the value is a link), Quelle (readOnlyReason), Beschreibung (empty);
 *   - #in-drawer: the same title field inside a Drawer, where Escape cancels the edit first;
 *   - #narrow: a 16rem column with a long German compound value. */
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, Card, DescriptionItem, DescriptionList, Drawer, InlineEdit, UixLabelsProvider } from '../../packages/react/src/index.js';
import type { InlineEditState } from '../../packages/react/src/index.js';

type Person = { id: string; name: string };
const PEOPLE: Person[] = [{ id: 'u1', name: 'Amra Kovač' }, { id: 'u2', name: 'Jonas Weber' }, { id: 'u3', name: 'Lejla Hadžić-Šehović' }];
declare global { interface Window { __record: { saves: string[]; states: Record<string, InlineEditState[]>; drawerCloses: number } } }

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
class Conflict extends Error { code = 'conflict'; }

function saveTitle(next: string): Promise<void> {
  window.__record.saves.push(`title:${next}`);
  if (next.includes('fehler')) return wait(120).then(() => { throw new Error('Zeitüberschreitung beim Speichern.'); });
  if (next.includes('konflikt')) return wait(120).then(() => { throw new Conflict('Jemand hat dieses Feld inzwischen geändert.'); });
  return wait(next.includes('langsam') ? 900 : 120);
}

function Record() {
  const [open, setOpen] = useState<string | null>(null);
  const [title, setTitle] = useState('Drucker im 3. OG druckt nicht');
  const [owner, setOwner] = useState<Person | null>(PEOPLE[0]);
  const [description, setDescription] = useState('');
  const track = (id: string) => (state: InlineEditState) => { (window.__record.states[id] ??= []).push(state); };
  const editing = (id: string) => ({ editing: open === id, onEditingChange: (next: boolean) => setOpen(next ? id : (open === id ? null : open)) });
  return (
    <Card id="record" title="INC-20418" titleAs="h2">
      <DescriptionList>
        <DescriptionItem term="Titel">
          <InlineEdit
            label="Titel" value={title} commit="blur" {...editing('title')}
            validate={(next) => (next.trim() ? undefined : 'Ein Titel ist erforderlich.')}
            onSave={(next) => saveTitle(next).then(() => setTitle(next))}
            onStateChange={track('title')}
            renderError={(error, { message, retry, cancel }) => (
              <span className="uix-cluster" style={{ alignItems: 'center' }}>
                <span>{message}</span>
                {(error as { code?: string }).code === 'conflict'
                  ? <Button size="sm" variant="link" onClick={cancel}>Neu laden</Button>
                  : <Button size="sm" variant="link" onClick={retry}>Erneut versuchen</Button>}
              </span>
            )}
          />
        </DescriptionItem>
        <DescriptionItem term="Verantwortlich">
          <InlineEdit<Person | null>
            label="Verantwortlich" value={owner} commit="change" {...editing('owner')}
            equals={(a, b) => a?.id === b?.id} isEmpty={(v) => v == null} renderView={(v) => v?.name}
            onSave={(next) => { window.__record.saves.push(`owner:${next?.id ?? 'none'}`); return wait(120).then(() => setOwner(next)); }}
            renderEditor={({ value, onChange, field }) => (
              <select className="uix-select uix-select--sm" {...field} value={value?.id ?? ''} onChange={(e) => onChange(PEOPLE.find((p) => p.id === e.target.value) ?? null)}>
                <option value="">Niemand</option>
                {PEOPLE.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
          />
        </DescriptionItem>
        <DescriptionItem term="Ticket">
          <InlineEdit
            label="Ticket" value="INC-20417" trigger="icon" {...editing('ticket')}
            renderView={(v) => <a className="uix-link" href={`#${v}`}>{v}</a>}
            onSave={(next) => { window.__record.saves.push(`ticket:${next}`); }}
          />
        </DescriptionItem>
        <DescriptionItem term="Quelle">
          <InlineEdit label="Quelle" value="Importiert aus ServiceNow" readOnlyReason="Wird von der Integration gesetzt." onSave={() => undefined} />
        </DescriptionItem>
        <DescriptionItem term="Beschreibung">
          <InlineEdit label="Beschreibung" value={description} placeholder="Beschreibung hinzufügen" multiline {...editing('description')} onSave={(next) => setDescription(next)} />
        </DescriptionItem>
      </DescriptionList>
    </Card>
  );
}

function InDrawer() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('Netzwerkdrucker');
  return (
    <section>
      <Button id="open-drawer" onClick={() => setOpen(true)}>Details öffnen</Button>
      <Drawer id="in-drawer" open={open} title="Details" onClose={() => { window.__record.drawerCloses += 1; setOpen(false); }}>
        <DescriptionList>
          <DescriptionItem term="Gerät"><InlineEdit label="Gerät" value={value} onSave={(next) => { window.__record.saves.push(`drawer:${next}`); setValue(next); }} /></DescriptionItem>
        </DescriptionList>
      </Drawer>
    </section>
  );
}

function Harness() {
  const [narrow, setNarrow] = useState('Donaudampfschifffahrtsgesellschaftskapitänskajütentürschloss');
  return (
    <UixLabelsProvider labels={{ inlineEdit: { edit: '{label} bearbeiten', save: 'Speichern', cancel: 'Abbrechen', saving: 'Wird gespeichert…', saved: 'Gespeichert', failed: 'Speichern fehlgeschlagen.', empty: 'Nicht gesetzt', readOnly: 'Schreibgeschützt:' } }}>
      <h1>Datensatz</h1>
      <Record />
      <InDrawer />
      <section>
        <h2>Schmal</h2>
        <div id="narrow" style={{ width: '16rem', maxWidth: '100%', padding: 'var(--uix-space-3)', border: '1px solid var(--uix-border)', borderRadius: 'var(--uix-radius-md)', background: 'var(--uix-surface)' }}>
          <InlineEdit label="Bauteil" value={narrow} onSave={setNarrow} />
        </div>
      </section>
    </UixLabelsProvider>
  );
}

window.__record = { saves: [], states: {}, drawerCloses: 0 };
createRoot(document.getElementById('root')!).render(<StrictMode><Harness /></StrictMode>);
