/* Live harness for the forms error-recovery layer, bundled by build.mjs from source for
 * tests/a11y/form-errors.spec.mjs. window.__forms counts saves and navigations.
 *   - #incident: a page form (title, requester e-mail, team) on useFormErrors with an ErrorSummary;
 *     #incident-save submits it. A tall spacer puts the submit far below the summary.
 *   - #open-drawer: the same form in a Drawer whose body scrolls; its Save sits in the footer.
 *   - #leave: useLeaveGuard over the page form (dirty once anything is typed); #go-elsewhere
 *     navigates in-app through leave.confirm; #save-state cycles the save state for the guard.
 *   - #conflict: a ConflictNotice for an incident Alex changed while you edited it. */
import { StrictMode, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Button, ConflictNotice, Drawer, ErrorSummary, Field, Input, SaveStatus, useFormErrors, useLeaveGuard,
} from '../../packages/react/src/index.js';
import type { FormFieldErrors, JsonValue, SaveStatusState } from '../../packages/react/src/index.js';

declare global {
  interface Window { __forms: { saved: Record<string, number>; navigated: number; reloaded: unknown; applied: unknown } }
}

interface Incident { title: string; email: string; team: string }
const EMPTY: Incident = { title: '', email: '', team: '' };

const validate = (v: Incident): FormFieldErrors<Incident> => ({
  title: !v.title.trim() ? 'Enter a title' : v.title.length > 60 ? 'Title must be 60 characters or fewer' : undefined,
  email: !v.email.trim() ? 'Enter the requester’s email address' : !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email) ? 'Enter an email address in the correct format, like name@example.com' : undefined,
  team: !v.team.trim() ? 'Enter the team that owns this incident' : undefined,
});

function IncidentFields({ id, form, values, onChange }: { id: string; form: ReturnType<typeof useFormErrors<Incident>>; values: Incident; onChange: (next: Incident) => void }) {
  const input = (name: keyof Incident, label: string, hint?: string) => (
    <Field label={label} hint={hint} {...form.field(name)}>
      <Input {...form.control(name)} value={values[name]} onChange={(e) => onChange({ ...values, [name]: e.currentTarget.value })} autoComplete="off" data-testid={`${id}-${name}`} />
    </Field>
  );
  return (
    <div className="uix-form-stack">
      {input('title', 'Title')}
      {input('email', 'Requester email', 'The person who reported it')}
      {input('team', 'Team')}
    </div>
  );
}

function PageForm({ values, setValues }: { values: Incident; setValues: (v: Incident) => void }) {
  const form = useFormErrors({ values, validate, idPrefix: 'incident' });
  return (
    <form id="incident" noValidate onSubmit={form.handleSubmit(() => { window.__forms.saved.page += 1; form.reset(); setValues(EMPTY); })}>
      <ErrorSummary {...form.summary} />
      <h2>Report an incident</h2>
      <IncidentFields id="incident" form={form} values={values} onChange={setValues} />
      <div style={{ height: '120vh' }} aria-hidden="true" />
      <Button id="incident-save" type="submit" variant="primary">Save incident</Button>
    </form>
  );
}

function DrawerForm() {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(EMPTY);
  const form = useFormErrors({ values, validate, idPrefix: 'drawer' });
  const submit = form.handleSubmit(() => { window.__forms.saved.drawer += 1; setOpen(false); });
  return (
    <>
      <Button id="open-drawer" onClick={() => setOpen(true)}>Report in a drawer</Button>
      <Drawer id="drawer" open={open} onClose={() => setOpen(false)} title="Report an incident"
        footer={<Button id="drawer-save" type="submit" form="drawer-form" variant="primary">Save incident</Button>}>
        <form id="drawer-form" noValidate onSubmit={(e: FormEvent) => submit(e)}>
          <ErrorSummary {...form.summary} prefixTitle={false} />
          <div style={{ height: '70vh' }} aria-hidden="true" />
          <IncidentFields id="drawer" form={form} values={values} onChange={setValues} />
        </form>
      </Drawer>
    </>
  );
}

const STATES: SaveStatusState[] = ['idle', 'saving', 'saved', 'failed'];

function LeaveSection({ values }: { values: Incident }) {
  const [saveState, setSaveState] = useState<SaveStatusState>('idle');
  const changed = (Object.keys(values) as (keyof Incident)[]).filter((k) => values[k] !== '');
  const names = { title: 'Title', email: 'Requester email', team: 'Team' };
  const leave = useLeaveGuard({ dirty: changed.length > 0, saveState, fields: changed.map((k) => names[k]) });
  return (
    <section id="leave" aria-labelledby="leave-title">
      <h2 id="leave-title">Leaving the page</h2>
      <p data-testid="leave-active">{leave.active ? 'Armed' : 'Not armed'}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--uix-space-2)' }}>
        <a id="go-elsewhere" href="#elsewhere" onClick={(event) => {
          event.preventDefault();
          leave.confirm(() => { window.__forms.navigated += 1; window.location.hash = 'elsewhere'; });
        }}>Go to the incident list</a>
        <Button id="save-state" size="sm" onClick={() => setSaveState(STATES[(STATES.indexOf(saveState) + 1) % STATES.length])}>Next save state</Button>
        <SaveStatus state={saveState} delay={0} data-testid="save-status" />
      </div>
      {leave.dialog}
    </section>
  );
}

const BASE: JsonValue = { title: 'Mail relay down', priority: 'P3', assignee: 'Ana', notes: '' };
const NAMES: Record<string, string> = { '$.title': 'Title', '$.priority': 'Priority', '$.assignee': 'Assignee', '$.notes': 'Notes' };

function ConflictSection() {
  const [record, setRecord] = useState<{ base: JsonValue; yours: JsonValue }>({ base: BASE, yours: { ...(BASE as object), priority: 'P2', notes: 'Restarted the relay' } });
  const theirs = useMemo<JsonValue>(() => ({ ...(BASE as object), title: 'Mail relay down (EU)', priority: 'P1' }), []);
  const [conflict, setConflict] = useState(false);
  return (
    <section id="conflict" aria-labelledby="conflict-title">
      <h2 id="conflict-title">Saving over someone else’s change</h2>
      <Button id="simulate-conflict" onClick={() => setConflict(true)}>Save (the server answers 409)</Button>
      {conflict && (
        <ConflictNotice
          base={record.base} yours={record.yours} theirs={theirs} changedBy="Alex Novak" changedAt="14:02"
          labelFor={(path) => NAMES[path]}
          onReload={(merged) => { window.__forms.reloaded = merged; setRecord({ base: theirs, yours: merged as JsonValue }); setConflict(false); }}
          onApply={(merged) => { window.__forms.applied = merged; setRecord({ base: theirs, yours: merged as JsonValue }); setConflict(false); }}
          onDiscard={() => { setRecord({ base: theirs, yours: theirs }); setConflict(false); }}
        />
      )}
      <pre data-testid="record">{JSON.stringify(record.yours)}</pre>
    </section>
  );
}

function Harness() {
  const [values, setValues] = useState(EMPTY);
  return (
    <>
      <h1>Form errors</h1>
      <PageForm values={values} setValues={setValues} />
      <DrawerForm />
      <LeaveSection values={values} />
      <ConflictSection />
    </>
  );
}

window.__forms = { saved: { page: 0, drawer: 0 }, navigated: 0, reloaded: null, applied: null };
createRoot(document.getElementById('root')!).render(<StrictMode><Harness /></StrictMode>);
