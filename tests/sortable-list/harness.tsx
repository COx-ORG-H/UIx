/* Live harness for SortableList (HAR-1375; MOTUS C-16 programme photos), bundled by build.mjs for
 * tests/a11y/sortable-list.spec.mjs. German labels. window.__sortable records every new order.
 *   - #photos: five photos with a thumbnail, a caption and a long German compound, in a Card;
 *   - #steps: three plain steps (text only);
 *   - #single: one item (both move buttons disabled);
 *   - #empty: no items;
 *   - #in-drawer: the steps again inside a Drawer. */
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, Card, Drawer, SortableList, UixLabelsProvider } from '../../packages/react/src/index.js';

declare global { interface Window { __sortable: Record<string, string[][]> } }
type Photo = { id: string; title: string; hue: number };
const PHOTOS: Photo[] = [
  { id: 'p1', title: 'Lesesaal am Eröffnungsabend', hue: 210 },
  { id: 'p2', title: 'Kinderecke', hue: 140 },
  { id: 'p3', title: 'Lesung mit Meša Selimović-Gesellschaft', hue: 20 },
  { id: 'p4', title: 'Bibliotheksverwaltungsdienstleistungszentrum', hue: 280 },
  { id: 'p5', title: 'Garderobe', hue: 50 },
];
const STEPS = [{ id: 's1', title: 'Antrag prüfen' }, { id: 's2', title: 'Freigabe einholen' }, { id: 's3', title: 'Benachrichtigen' }];

function useOrder<T extends { id: string }>(key: string, initial: T[]) {
  const [items, setItems] = useState(initial);
  const onReorder = (ids: string[]) => { (window.__sortable[key] ??= []).push(ids); setItems(ids.map((id) => initial.find((x) => x.id === id)!)); };
  return { items, onReorder };
}

function Harness() {
  const photos = useOrder('photos', PHOTOS);
  const steps = useOrder('steps', STEPS);
  const drawerSteps = useOrder('drawer', STEPS);
  const [drawer, setDrawer] = useState(false);
  const thumb = (hue: number) => (
    <span aria-hidden="true" style={{ display: 'inline-block', width: 48, height: 36, borderRadius: 'var(--uix-radius-sm)', background: `hsl(${hue} 45% 60%)`, flex: 'none' }} />
  );
  return (
    <UixLabelsProvider labels={{ sortableList: { grip: '{label} ziehen', moveUp: '{label} nach oben', moveDown: '{label} nach unten', moved: '{label} ist jetzt an Position {position} von {count}' } }}>
      <h1>Reihenfolge</h1>
      <Card title="Fotos" titleAs="h2" id="photos-card">
        <SortableList
          id="photos" aria-label="Fotos" items={photos.items} getId={(p) => p.id} getLabel={(p) => p.title} onReorder={photos.onReorder}
          renderItem={(p, { index }) => (
            <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--uix-space-3)', minWidth: 0 }}>
              {thumb(p.hue)}
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontWeight: 500 }}>{p.title}</span>
                <span style={{ display: 'block', fontSize: 'var(--uix-text-meta)', color: 'var(--uix-text-muted)' }}>{index === 0 ? 'Titelbild' : `Bild ${index + 1}`}</span>
              </span>
            </span>
          )}
        />
      </Card>
      <section>
        <h2>Schritte</h2>
        <SortableList id="steps" aria-label="Schritte" items={steps.items} getId={(s) => s.id} getLabel={(s) => s.title} onReorder={steps.onReorder} renderItem={(s) => s.title} />
      </section>
      <section>
        <h2>Einer</h2>
        <SortableList id="single" aria-label="Ein Schritt" items={[STEPS[0]]} getId={(s) => s.id} getLabel={(s) => s.title} onReorder={() => {}} renderItem={(s) => s.title} />
        <h2>Keiner</h2>
        <SortableList id="empty" aria-label="Keine Schritte" items={[] as typeof STEPS} getId={(s) => s.id} onReorder={() => {}} renderItem={(s) => s.title} />
      </section>
      <section>
        <Button id="open-drawer" onClick={() => setDrawer(true)}>Schritte bearbeiten</Button>
        <Drawer id="drawer" open={drawer} onClose={() => setDrawer(false)} title="Schritte">
          <SortableList id="in-drawer" aria-label="Schritte im Drawer" items={drawerSteps.items} getId={(s) => s.id} getLabel={(s) => s.title} onReorder={drawerSteps.onReorder} renderItem={(s) => s.title} />
        </Drawer>
      </section>
    </UixLabelsProvider>
  );
}

window.__sortable = {};
createRoot(document.getElementById('root')!).render(<StrictMode><Harness /></StrictMode>);
