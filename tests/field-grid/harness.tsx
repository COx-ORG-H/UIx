/* Live harness for the 4 px grid (HAR-2985, HAR-3092, HAR-3098), bundled by build.mjs from source for
 * tests/a11y/field-grid.spec.mjs: every field with a leading icon at both sizes, stacked so their
 * text lines up (InputGroup, SearchSuggest, SearchBar), an InputGroup with a trailing icon, buttons
 * with an icon at every size, and the sidebar favourites heading with its empty state. */
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, Input, InputGroup, NavFavourites, SearchBar, SearchSuggest } from '../../packages/react/src/index.js';

const Glass = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
  </svg>
);
const Plus = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
);

function Fields() {
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  return (
    <div style={{ display: 'grid', gap: 'var(--uix-space-3)', maxWidth: 420 }}>
      <div data-field="group-md"><InputGroup leadingIcon={<Glass />}><Input aria-label="Suchen" placeholder="Einstellungen durchsuchen" /></InputGroup></div>
      <div data-field="suggest-md"><SearchSuggest label="Einstellungen" placeholder="Einstellungen durchsuchen" value={a} onValueChange={setA} options={[]} /></div>
      <div data-field="bar-md"><SearchBar label="Wissen" placeholder="Einstellungen durchsuchen" size="md" /></div>
      <div data-field="trailing-md"><InputGroup trailingIcon={<Glass />}><Input aria-label="Mit Symbol hinten" placeholder="Einstellungen durchsuchen" /></InputGroup></div>
      <div data-field="group-lg"><InputGroup leadingIcon={<Glass />}><Input className="uix-input--lg" aria-label="Suchen groß" placeholder="Einstellungen durchsuchen" /></InputGroup></div>
      <div data-field="suggest-lg"><SearchSuggest size="lg" label="Einstellungen groß" placeholder="Einstellungen durchsuchen" value={b} onValueChange={setB} options={[]} /></div>
      <div data-field="bar-lg"><SearchBar label="Wissen groß" placeholder="Einstellungen durchsuchen" size="lg" /></div>
      <div data-field="trailing-lg"><InputGroup trailingIcon={<Glass />}><Input className="uix-input--lg" aria-label="Mit Symbol hinten groß" placeholder="Einstellungen durchsuchen" /></InputGroup></div>
      <div data-field="group-sm"><InputGroup leadingIcon={<Glass />}><Input size="sm" aria-label="Suchen klein" placeholder="Einstellungen durchsuchen" /></InputGroup></div>
      <div data-field="trailing-sm"><InputGroup trailingIcon={<Glass />}><Input size="sm" aria-label="Mit Symbol hinten klein" placeholder="Einstellungen durchsuchen" /></InputGroup></div>
    </div>
  );
}

function Buttons() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--uix-space-2)', alignItems: 'center' }}>
      {(['xs', 'sm', 'md', 'lg'] as const).map((size) => (
        <Button key={size} size={size} data-button={size}><Plus />Hinzufügen</Button>
      ))}
      <Button variant="primary" data-button="primary"><Plus />Anlegen</Button>
    </div>
  );
}

function Favourites() {
  return (
    <nav aria-label="Seitenleiste" className="uix-sidebar" style={{ width: 260 }}>
      <NavFavourites
        items={[]}
        onRemove={() => {}}
        onReorder={() => {}}
        labels={{ heading: 'Favoriten', empty: 'Noch keine Favoriten. Stern an einer Seite setzen.', moveUp: 'Nach oben', moveDown: 'Nach unten', remove: '{label} entfernen' }}
      />
    </nav>
  );
}

function Harness() {
  return (
    <>
      <h1>Das 4-px-Raster</h1>
      <section aria-label="Felder"><Fields /></section>
      <section aria-label="Schaltflächen"><Buttons /></section>
      <section aria-label="Favoriten"><Favourites /></section>
    </>
  );
}

createRoot(document.getElementById('root')!).render(<StrictMode><Harness /></StrictMode>);
