/* Live harness for the form-field batch (HAR-1812, HAR-1799, HAR-1376, HAR-1835, HAR-2432,
 * HAR-1575, HAR-1588, HAR-1377, HAR-2465, HAR-1834), bundled by build.mjs from source for
 * tests/a11y/form-fields.spec.mjs. One <section> per issue; `?only=<id>` renders just that one
 * (the screenshots of the visual check use it).
 *   - #sizes: Input, Select, Textarea, InputGroup and Button at sm / md / lg, in one row each.
 *   - #checkbox-group: CheckboxGroup in a card (3 columns, long German and Bosnian tags, error when none
 *     is ticked) and a disabled group. */
import { StrictMode, useState } from 'react';
import type { ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, Checkbox, CheckboxGroup, Field, Input, InputGroup, Select, Textarea } from '../../packages/react/src/index.js';

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

const SECTIONS: Record<string, () => ReactNode> = { sizes: Sizes, 'checkbox-group': Tags };

function App() {
  const only = new URLSearchParams(location.search).get('only');
  const keys = only ? only.split(',') : Object.keys(SECTIONS);
  return <>{keys.map((key) => { const Section = SECTIONS[key]; return Section ? <Section key={key} /> : null; })}</>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
