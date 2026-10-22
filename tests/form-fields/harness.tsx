/* Live harness for the form-field batch (HAR-1812, HAR-1799, HAR-1376, HAR-1835, HAR-2432,
 * HAR-1575, HAR-1588, HAR-1377, HAR-2465, HAR-1834), bundled by build.mjs from source for
 * tests/a11y/form-fields.spec.mjs. One <section> per issue; `?only=<id>` renders just that one
 * (the screenshots of the visual check use it).
 *   - #sizes: Input, Select, Textarea, InputGroup and Button at sm / md / lg, in one row each.
 *   - #checkbox-group: CheckboxGroup in a card (3 columns, long German and Bosnian tags, error when none
 *     is ticked) and a disabled group.
 *   - #sign-in: PasswordInput (md, lg, disabled) in a form, OtpInput numeric with an error on 000000,
 *     an 8-character alphanumeric one and a disabled one. window.__posted / __completed record results.
 *   - #times: TimePicker (de with min/max and a 30-minute step, en-US, disabled), DateTimePicker (de)
 *     and a TimePicker inside a modal Drawer.
 *   - #filter-date: FilterPopover type="date" in a Popover, with a provider dateFormat (de).
 *     window.__filter.applied records each Apply.
 *   - #combobox: Combobox with groups, a disabled option and 27 more, plain, in a modal Drawer, in a
 *     Popover with overflow:hidden and in an overflow:hidden table cell.
 *   - #tag-input: TagInput with suggestions, maxTags, validate and a long German tag in a form (window.__posted.tags),
 *     a disabled one and one in a modal Drawer. */
import { StrictMode, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Button, Checkbox, CheckboxGroup, Combobox, DateTimePicker, Drawer, Field, FilterPopover, Input, InputGroup, OtpInput, PasswordInput, Popover,
  Select, TagInput, Textarea, TimePicker, UixLabelsProvider,
} from '../../packages/react/src/index.js';

const Search = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
);

const TOPICS = [{ value: 'loan', label: 'Borrowing a book' }, { value: 'room', label: 'Booking a reading room' }];

function Sizes() {
  return (
    <section id="sizes" aria-label="Sizes">
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <div key={size} data-size-row={size} style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--uix-space-3)', alignItems: 'flex-start' }}>
          <Input id={`in-${size}`} size={size} aria-label={`Name ${size}`} placeholder={`Input ${size}`} style={{ width: '12rem' }} />
          <div style={{ width: '12rem' }}><Select id={`sel-${size}`} size={size} aria-label={`Topic ${size}`} options={TOPICS} defaultValue="loan" /></div>
          <Button id={`btn-${size}`} size={size} variant="primary">Send</Button>
        </div>
      ))}
      <div style={{ display: 'grid', gap: 'var(--uix-space-4)', maxWidth: '26rem' }}>
        <Field label="Search the catalogue">
          <InputGroup id="group-lg" leadingIcon={<Search />} trailingIcon={<Search />}>
            <Input size="lg" defaultValue="A long query that runs right up to the trailing icon of the field" />
          </InputGroup>
        </Field>
        <Field label="Message" hint="Textarea lg">
          <Textarea id="ta-lg" size="lg" rows={1} />
        </Field>
        <Field label="Message (md)">
          <Textarea id="ta-md" rows={1} />
        </Field>
      </div>
    </section>
  );
}

const SHELVES = ['Fiction', 'History', 'Poetry', 'Children', 'Reference', 'Zeitgeschichte und Gesellschaftswissenschaften', 'Local authors', 'Biografije i memoari'];

function Tags() {
  const [chosen, setChosen] = useState<string[]>(['History']);
  const toggle = (tag: string) => setChosen((now) => (now.includes(tag) ? now.filter((t) => t !== tag) : [...now, tag]));
  return (
    <section id="checkbox-group" aria-label="Checkbox group" style={{ display: 'grid', gap: 'var(--uix-space-5)' }}>
      <div className="uix-card" style={{ maxWidth: '40rem' }}><div className="uix-card__body">
        <CheckboxGroup id="tags" label="Curated tags" hint="Shown on the book's public page." columns={3} required
          error={chosen.length ? undefined : 'Choose at least one tag.'}>
          {SHELVES.map((tag) => (
            <Checkbox key={tag} name="tags" value={tag} label={tag} checked={chosen.includes(tag)} onChange={() => toggle(tag)} />
          ))}
        </CheckboxGroup>
      </div></div>
      <CheckboxGroup id="tags-disabled" label="Locked tags" disabled>
        <Checkbox name="locked" label="Archive" defaultChecked />
        <Checkbox name="locked" label="Staff picks" />
      </CheckboxGroup>
    </section>
  );
}

declare global {
  interface Window { __posted: Record<string, string[]>; __completed: string[] }
}
window.__posted = {};
window.__completed = [];

function SignIn() {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | undefined>();
  return (
    <section id="sign-in" aria-label="Sign in" style={{ display: 'grid', gap: 'var(--uix-space-4)', maxWidth: '24rem' }}>
      <form
        id="sign-in-form"
        onSubmit={(event) => {
          event.preventDefault();
          window.__posted.signIn = [...new FormData(event.currentTarget).entries()].map(([k, v]) => `${k}=${String(v)}`);
        }}
        style={{ display: 'grid', gap: 'var(--uix-space-2)' }}
      >
        <Field label="Email"><Input id="email" name="email" type="email" autoComplete="username" defaultValue="ada@example.com" /></Field>
        <Field label="Password" hint="At least 12 characters." required>
          <PasswordInput id="password" name="password" autoComplete="current-password" defaultValue="correct horse battery" />
        </Field>
        <Field label="Lozinka (lg)">
          <PasswordInput id="password-lg" size="lg" autoComplete="new-password" labels={{ show: 'Prikaži lozinku' }} />
        </Field>
        <Field label="Disabled password"><PasswordInput id="password-off" disabled defaultValue="secret" /></Field>
        <Button type="submit" id="sign-in-submit" variant="primary">Sign in</Button>
      </form>
      <Field label="Verification code" hint="Enter the 6 digits from your authenticator app." error={error}>
        <OtpInput
          id="otp" name="otp" value={code} groupSize={3}
          onValueChange={(next) => { setCode(next); setError(undefined); }}
          onComplete={(done) => { window.__completed.push(done); if (done === '000000') setError('That code is not valid. Try the newest one.'); }}
        />
      </Field>
      <Field label="Recovery code"><OtpInput id="otp-alpha" mode="alphanumeric" length={8} groupSize={4} /></Field>
      <Field label="Code (disabled)"><OtpInput id="otp-off" disabled defaultValue="12" /></Field>
    </section>
  );
}

function Times() {
  const [start, setStart] = useState<string | null>('09:30');
  const [quiet, setQuiet] = useState<string | null>(null);
  const [due, setDue] = useState<string | null>('2026-11-22T14:30');
  const [drawer, setDrawer] = useState(false);
  const [late, setLate] = useState<string | null>('16:00');
  return (
    <section id="times" aria-label="Times" style={{ display: 'grid', gap: 'var(--uix-space-4)', maxWidth: '30rem' }}>
      <Field label="Opens at" hint="Business hours, 08:00 to 18:00." required>
        <TimePicker id="opens" name="opens" value={start} onValueChange={setStart} locale="de" minuteStep={30} min="08:00" max="18:00" />
      </Field>
      <Field label="Quiet hours start (en-US)">
        <TimePicker id="quiet" value={quiet} onValueChange={setQuiet} locale="en-US" />
      </Field>
      <Field label="Geplanter Start">
        <DateTimePicker id="due" value={due} onValueChange={setDue} locale="de" timeZone="Europe/Vienna" today="2026-11-10" />
      </Field>
      <Field label="Disabled"><TimePicker id="time-off" value="12:00" onValueChange={() => {}} disabled /></Field>
      <div><Button id="open-time-drawer" onClick={() => setDrawer(true)}>Edit calendar</Button></div>
      <Drawer open={drawer} onClose={() => setDrawer(false)} title="Business calendar">
        <Field label="Closes at"><TimePicker id="closes" value={late} onValueChange={setLate} locale="de" /></Field>
      </Drawer>
    </section>
  );
}

declare global {
  interface Window { __filter: { applied: string[] } }
}
window.__filter = { applied: [] };

function FilterDate() {
  const [value, setValue] = useState('');
  const anchor = useRef<HTMLButtonElement>(null);
  return (
    <section id="filter-date" aria-label="Filter by date">
      <UixLabelsProvider labels={{ dateFormat: { locale: 'de' } }}>
        <button ref={anchor} id="filter-date-trigger" className="uix-btn uix-btn--secondary" type="button" popoverTarget="filter-date-popover">Created</button>
        <Popover id="filter-date-popover" anchor={anchor} style={{ width: '18rem' }}>
          <FilterPopover
            label="Created on or after" type="date" value={value} onValueChange={setValue}
            applyLabel="Apply" clearLabel="Clear" onApply={() => window.__filter.applied.push(value)} onClear={() => setValue('')}
          />
        </Popover>
      </UixLabelsProvider>
    </section>
  );
}

const CATEGORIES = [
  { label: 'Hardware', options: [{ value: 'laptop', label: 'Laptop' }, { value: 'monitor', label: 'Monitor', disabled: true }, { value: 'dock', label: 'Docking station' }] },
  { label: 'Software', options: [{ value: 'office', label: 'Office suite' }, { value: 'vpn', label: 'VPN client', keywords: ['remote'] }] },
  { value: 'other', label: 'Other' },
  ...Array.from({ length: 24 }, (_, i) => ({ value: `q${i + 1}`, label: `Queue ${String(i + 1).padStart(2, '0')}` })),
];

function Comboboxes() {
  const [value, setValue] = useState('office');
  const [drawer, setDrawer] = useState(false);
  const anchor = useRef<HTMLButtonElement>(null);
  const field = (id: string) => (
    <Combobox id={`${id}-root`} inputId={id} aria-labelledby={`${id}-label`} label="Category" emptyLabel="No matching category"
      options={CATEGORIES} value={value} onValueChange={(next) => setValue(next)} />
  );
  return (
    <section id="combobox" aria-label="Combobox" style={{ display: 'grid', gap: 'var(--uix-space-4)', maxWidth: '26rem' }}>
      <div className="uix-field"><span id="cb-plain-label" className="uix-field__label">Category</span>{field('cb-plain')}</div>
      <div>
        <Button id="cb-open-drawer" onClick={() => setDrawer(true)}>Open drawer</Button>
        <Drawer open={drawer} onClose={() => setDrawer(false)} title="Edit asset">
          <div className="uix-field"><span id="cb-drawer-label" className="uix-field__label">Category in drawer</span>{field('cb-drawer')}</div>
        </Drawer>
      </div>
      <div>
        <button ref={anchor} id="cb-open-popover" className="uix-btn uix-btn--secondary" type="button" popoverTarget="cb-pop">Filter</button>
        <Popover id="cb-pop" anchor={anchor} style={{ width: '16rem', overflow: 'hidden' }}>
          <div className="uix-field"><span id="cb-popover-label" className="uix-field__label">Category in popover</span>{field('cb-popover')}</div>
        </Popover>
      </div>
      <table className="uix-table" style={{ tableLayout: 'fixed', width: 'min(24rem, 100%)' }}>
        <tbody><tr><td style={{ overflow: 'hidden', height: '3rem' }}>
          <span id="cb-cell-label" className="uix-visually-hidden">Category in cell</span>{field('cb-cell')}
        </td></tr></tbody>
      </table>
    </section>
  );
}

function Tagging() {
  const [labels, setLabels] = useState<string[]>(['network', 'Zeitgeschichte-und-Gesellschaftswissenschaften', 'vpn']);
  const [drawerTags, setDrawerTags] = useState<string[]>([]);
  const [drawer, setDrawer] = useState(false);
  const suggestions = ['Network', 'Hardware', 'Access', 'Email', 'Printing', 'Mobile devices', 'Identity', 'Backup', 'Licensing'];
  return (
    <section id="tag-input" aria-label="Tag input" style={{ display: 'grid', gap: 'var(--uix-space-4)', maxWidth: '30rem' }}>
      <form id="tags-form" onSubmit={(event) => { event.preventDefault(); window.__posted.tags = new FormData(event.currentTarget).getAll('labels').map(String); }}>
        <Field label="Labels" hint="Enter or a comma adds a label.">
          <TagInput id="tags" name="labels" value={labels} onValueChange={setLabels} suggestions={suggestions} maxTags={8}
            validate={(tag) => (tag.length > 48 ? 'Use at most 48 characters.' : null)} placeholder="Add a label" />
        </Field>
        <Button type="submit" id="tags-submit">Save</Button>
      </form>
      <Field label="Disabled tags"><TagInput id="tags-off" value={['archive']} onValueChange={() => {}} disabled /></Field>
      <div>
        <Button id="tags-open-drawer" onClick={() => setDrawer(true)}>Tag in a drawer</Button>
        <Drawer open={drawer} onClose={() => setDrawer(false)} title="Tag the asset">
          <Field label="Asset labels"><TagInput id="tags-drawer" value={drawerTags} onValueChange={setDrawerTags} suggestions={suggestions} /></Field>
        </Drawer>
      </div>
    </section>
  );
}

const SECTIONS: Record<string, () => ReactNode> = {
  sizes: Sizes, 'checkbox-group': Tags, 'sign-in': SignIn, times: Times, 'filter-date': FilterDate, combobox: Comboboxes, 'tag-input': Tagging,
};

function App() {
  const only = new URLSearchParams(location.search).get('only');
  const keys = only ? only.split(',') : Object.keys(SECTIONS);
  return <>{keys.map((key) => { const Section = SECTIONS[key]; return Section ? <Section key={key} /> : null; })}</>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
