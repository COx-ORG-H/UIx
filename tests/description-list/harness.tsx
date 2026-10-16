/* Live harness for the description list's narrow layout (HAR-2032), bundled by build.mjs from
 * source for tests/a11y/description-list.spec.mjs. The same German record details in four boxes:
 *   - #card: a card that fills the page (320 px wide on a phone);
 *   - #auto: the same card in a grid with an auto track (Tailwind's bare `grid`), which sizes
 *     from its children's minimum width: a long label used to push the page sideways there;
 *   - #rail: a 20rem side-rail card, narrow at any viewport;
 *   - #wide: a 40rem card;
 *   - #flex: a list beside an avatar in a flex row, a box sized by its content. */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Avatar, Card, DescriptionList } from '../../packages/react/src/index.js';

const ITEMS = [
  { term: 'Status', description: 'In Bearbeitung' },
  { term: 'Verantwortliche Gruppe', description: 'Netzwerkbetrieb, zweite Ebene' },
  { term: 'Neue Tickets pro Person und Stunde', description: '4' },
  { term: 'Konfigurationselement', description: 'srv-ledger-prod-eu-central-01.intern.example.com' },
];

function Harness() {
  return (
    <>
      <h1>Beschreibungsliste</h1>
      <section>
        <h2>Karte</h2>
        <Card><DescriptionList id="card" items={ITEMS} /></Card>
      </section>
      <section>
        <h2>Raster</h2>
        <div style={{ display: 'grid', gap: 'var(--uix-space-4)' }}>
          <Card><DescriptionList id="auto" items={ITEMS} /></Card>
        </div>
      </section>
      <section>
        <h2>Seitenleiste</h2>
        <div style={{ width: '20rem', maxWidth: '100%' }}>
          <Card><DescriptionList id="rail" items={ITEMS} /></Card>
        </div>
      </section>
      <section>
        <h2>Breit</h2>
        <div style={{ width: '40rem', maxWidth: '100%' }}>
          <Card><DescriptionList id="wide" items={ITEMS} /></Card>
        </div>
      </section>
      <section>
        <h2>Neben einem Avatar</h2>
        <div id="flex-row" style={{ display: 'flex', gap: 'var(--uix-space-4)', alignItems: 'flex-start' }}>
          <Avatar size="lg">AH</Avatar>
          <DescriptionList id="flex" items={ITEMS.slice(0, 2)} />
        </div>
      </section>
    </>
  );
}

createRoot(document.getElementById('root')!).render(<StrictMode><Harness /></StrictMode>);
