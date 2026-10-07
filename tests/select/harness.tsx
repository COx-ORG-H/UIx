/* Live harness for Select (HAR-1572), bundled by build.mjs from source for
 * tests/a11y/select.spec.mjs.
 *   - #form: <label htmlFor> + <option>/<optgroup> children, name, required + placeholder, reset.
 *   - #multi: multiple, posted as several values.
 *   - #wrapped: a <label> that wraps the Select.
 *   - #states: disabled, read-only, invalid, sm, searchable.
 *   - #drawer / #popover / #cell: inside a modal Drawer, a Popover and an overflow:hidden cell.
 *   - #bottom: pinned to the bottom of the viewport (the list must flip up).
 *   - #async: loadOptions, steered from the spec through window.__async.
 *   - #rhf: react-hook-form `register` and `Controller`. */
import { StrictMode, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { Controller, useForm } from 'react-hook-form';
import { Button, Drawer, Field, Popover, Select } from '../../packages/react/src/index.js';
import type { SelectOption } from '../../packages/react/src/index.js';

declare global {
  interface Window {
    __posted: Record<string, string[]>;
    __async: { mode: 'ok' | 'empty' | 'fail'; delay: number; calls: string[]; aborted: string[] };
    __rhf: Record<string, unknown> | null;
  }
}
window.__posted = {};
window.__async = { mode: 'ok', delay: 150, calls: [], aborted: [] };
window.__rhf = null;

const post = (event: FormEvent<HTMLFormElement>, key: string) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  window.__posted[key] = [...data.entries()].map(([k, v]) => `${k}=${String(v)}`);
};

const STATUS_CHILDREN = (
  <>
    <option value="" disabled hidden>Choose a status</option>
    <optgroup label="Active">
      <option value="new">New</option>
      <option value="open">Open</option>
      <option value="blocked" disabled>Blocked</option>
      <option value="progress">In progress</option>
    </optgroup>
    <optgroup label="Archived" disabled>
      <option value="old">Old</option>
    </optgroup>
    {['Reopened', 'Resolved', 'Solved', 'Spam'].map((s) => <option key={s} value={s.toLowerCase()}>{s}</option>)}
  </>
);

const MANY: SelectOption[] = Array.from({ length: 40 }, (_, i) => ({ value: `q${i + 1}`, label: `Queue ${String(i + 1).padStart(2, '0')}` }));
const LABELS: SelectOption[] = ['Network', 'Hardware', 'Access', 'Email', 'Printing'].map((l) => ({ value: l.toLowerCase(), label: l }));

function Basic() {
  return (
    <section id="form" aria-label="Form">
      <form onSubmit={(e) => post(e, 'form')} noValidate={false}>
        <div style={{ display: 'grid', gap: 'var(--uix-space-3)', maxWidth: '22rem' }}>
          <label htmlFor="status" className="uix-field__label">Status</label>
          <Select id="status" name="status" defaultValue="open" data-testid="status">{STATUS_CHILDREN}</Select>
          <label htmlFor="queue" className="uix-field__label">Queue</label>
          <Select id="queue" name="queue" required placeholder="Pick a queue" options={MANY} />
          <div style={{ display: 'flex', gap: 'var(--uix-space-2)' }}>
            <Button type="submit" id="submit">Submit</Button>
            <Button type="reset" variant="secondary" id="reset">Reset</Button>
          </div>
        </div>
      </form>
    </section>
  );
}

function Multi() {
  return (
    <section id="multi" aria-label="Multi">
      <form onSubmit={(e) => post(e, 'multi')}>
        <div style={{ display: 'grid', gap: 'var(--uix-space-3)', maxWidth: '22rem' }}>
          <label htmlFor="labels" className="uix-field__label">Labels</label>
          <Select id="labels" name="labels" multiple defaultValue={['network', 'access']} options={LABELS} placeholder="Add labels" />
          <Button type="submit" id="submit-multi">Submit labels</Button>
        </div>
      </form>
    </section>
  );
}

function Wrapped() {
  return (
    <section id="wrapped" aria-label="Wrapped">
      <label className="uix-label" style={{ display: 'grid', gap: 'var(--uix-space-1)', maxWidth: '16rem' }}>
        <span>Priority</span>
        <Select id="priority" defaultValue="p2">
          <option value="p1">P1 · Critical</option>
          <option value="p2">P2 · High</option>
          <option value="p3">P3 · Normal</option>
        </Select>
      </label>
    </section>
  );
}

function States() {
  return (
    <section id="states" aria-label="States" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(14rem, 1fr))', gap: 'var(--uix-space-3)' }}>
      <Field label="Disabled"><Select id="s-disabled" disabled defaultValue="a"><option value="a">Alpha</option></Select></Field>
      <Field label="Read-only"><Select id="s-readonly" readOnly defaultValue="a"><option value="a">Alpha</option></Select></Field>
      <Field label="Invalid" error="Pick a value"><Select id="s-invalid" placeholder="Nothing chosen" options={LABELS} /></Field>
      <Field label="Small"><Select id="s-small" size="sm" defaultValue="hardware" options={LABELS} /></Field>
      <Field label="Long label">
        <Select id="s-long" defaultValue="gt"><option value="gt">is greater than or equal to the configured threshold</option><option value="lt">is less than</option></Select>
      </Field>
      <Field label="Searchable"><Select id="s-search" searchable="auto" options={MANY} defaultValue="q3" /></Field>
    </section>
  );
}

function Containers() {
  const [drawer, setDrawer] = useState(false);
  const anchor = useRef<HTMLButtonElement>(null);
  return (
    <section id="containers" aria-label="Containers" style={{ display: 'grid', gap: 'var(--uix-space-3)' }}>
      <div>
        <Button id="open-drawer" onClick={() => setDrawer(true)}>Open drawer</Button>
        <Drawer id="drawer" open={drawer} onClose={() => setDrawer(false)} title="Edit incident">
          <Field label="Status in drawer"><Select id="in-drawer" defaultValue="open">{STATUS_CHILDREN}</Select></Field>
        </Drawer>
      </div>
      <div>
        <button ref={anchor} id="open-popover" className="uix-btn uix-btn--secondary" type="button" popoverTarget="filter-pop">Filter</button>
        <Popover id="filter-pop" anchor={anchor} style={{ width: '16rem', overflow: 'hidden' }}>
          <Field label="Status in popover"><Select id="in-popover" defaultValue="open">{STATUS_CHILDREN}</Select></Field>
        </Popover>
      </div>
      <table className="uix-table" style={{ tableLayout: 'fixed', width: 'min(24rem, 100%)' }}>
        <tbody>
          <tr>
            <td style={{ overflow: 'hidden', height: '3rem' }}>
              <Select id="in-cell" aria-label="Status in cell" defaultValue="open">{STATUS_CHILDREN}</Select>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}

function Bottom() {
  return (
    <div id="bottom" style={{ position: 'fixed', left: 'var(--uix-space-5)', bottom: 'var(--uix-space-2)', width: '16rem', zIndex: 1 }}>
      <Select id="near-bottom" aria-label="Status near the bottom" defaultValue="open">{STATUS_CHILDREN}</Select>
    </div>
  );
}

const loadOwners = (query: string, signal: AbortSignal) => {
  const a = window.__async;
  a.calls.push(query);
  return new Promise<SelectOption[]>((resolve, reject) => {
    const timer = setTimeout(() => {
      if (a.mode === 'fail') reject(new Error('down'));
      else if (a.mode === 'empty') resolve([]);
      else resolve(['Ada Lovelace', 'Ben Ali', 'Chen Wu'].filter((n) => n.toLowerCase().includes(query.toLowerCase())).map((n) => ({ value: n.split(' ')[0]!.toLowerCase(), label: n })));
    }, a.delay);
    signal.addEventListener('abort', () => { clearTimeout(timer); a.aborted.push(query); reject(new DOMException('aborted', 'AbortError')); });
  });
};

function Async() {
  return (
    <section id="async" aria-label="Async">
      <Field label="Owner"><Select id="owner" searchable loadOptions={loadOwners} placeholder="Find an owner" /></Field>
    </section>
  );
}

type RhfValues = { team: string; tags: string[]; site: string };
function Rhf() {
  const { register, control, handleSubmit, formState } = useForm<RhfValues>({ defaultValues: { team: 'ops', tags: ['b'], site: 'sa' } });
  return (
    <section id="rhf" aria-label="react-hook-form">
      <form onSubmit={handleSubmit((values) => { window.__rhf = values; })} style={{ display: 'grid', gap: 'var(--uix-space-3)', maxWidth: '22rem' }}>
        <Field label="Team (register)" error={formState.errors.team ? 'Pick a team' : undefined}>
          <Select id="rhf-team" {...register('team', { required: true })} placeholder="Pick a team">
            <option value="ops">Operations</option>
            <option value="dev">Development</option>
            <option value="sec">Security</option>
          </Select>
        </Field>
        <Field label="Tags (register, multiple)">
          <Select id="rhf-tags" multiple {...register('tags')}>
            <option value="a">Alpha</option>
            <option value="b">Bravo</option>
            <option value="c">Charlie</option>
          </Select>
        </Field>
        <Controller
          control={control}
          name="site"
          render={({ field }) => (
            <Field label="Site (Controller)">
              <Select id="rhf-site" {...field} options={[{ value: 'sa', label: 'Sarajevo' }, { value: 'mo', label: 'Mostar' }, { value: 'tz', label: 'Tuzla' }]} />
            </Field>
          )}
        />
        <Button type="submit" id="rhf-submit">Save</Button>
      </form>
    </section>
  );
}

function Harness() {
  return (
    <>
      <Basic />
      <Multi />
      <Wrapped />
      <States />
      <Containers />
      <Async />
      <Rhf />
      <div style={{ height: '6rem' }} />
      <Bottom />
    </>
  );
}

const root = document.getElementById('root');
if (root) createRoot(root).render(<StrictMode><Harness /></StrictMode>);
