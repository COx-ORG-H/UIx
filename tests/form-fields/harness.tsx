/* Live harness for the form-field batch (HAR-1812, HAR-1799, HAR-1376, HAR-1835, HAR-2432,
 * HAR-1575, HAR-1588, HAR-1377, HAR-2465, HAR-1834), bundled by build.mjs from source for
 * tests/a11y/form-fields.spec.mjs. One <section> per issue; `?only=<id>` renders just that one
 * (the screenshots of the visual check use it).
 *   - #sizes: Input, Select, Textarea, InputGroup and Button at sm / md / lg, in one row each. */
import { StrictMode } from 'react';
import type { ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, Field, Input, InputGroup, Select, Textarea } from '../../packages/react/src/index.js';

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

const SECTIONS: Record<string, () => ReactNode> = { sizes: Sizes };

function App() {
  const only = new URLSearchParams(location.search).get('only');
  const keys = only ? only.split(',') : Object.keys(SECTIONS);
  return <>{keys.map((key) => { const Section = SECTIONS[key]; return Section ? <Section key={key} /> : null; })}</>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
