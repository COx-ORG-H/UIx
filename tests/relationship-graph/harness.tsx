/* Live harness for the layered RelationshipGraph map with `controls="compact"` (TENSOR
 * HAR-2501/HAR-2512), bundled by build.mjs from source for
 * tests/a11y/relationship-graph-map.spec.mjs.
 *   - #de: German labels, as TENSOR's CI record renders them (the longest hint we ship);
 *   - #en: the kit's English defaults.
 * Each map sits in a `.frame` whose width the spec sets, so one page measures every width. */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RelationshipGraph } from '../../packages/react/src/index.js';
import type { RelationshipGraphEdge, RelationshipGraphNode } from '../../packages/react/src/index.js';

/** A focal service with three levels of dependencies: wider than a narrow map at 75 %. */
function fixture() {
  const nodes: RelationshipGraphNode[] = [{ id: 'root', label: 'Antragsannahme Bürgschaften', type: 'Business Service' }];
  const edges: RelationshipGraphEdge[] = [];
  for (let depth = 1; depth <= 3; depth += 1) {
    for (let i = 0; i < 2; i += 1) {
      const id = `d${depth}-${i}`;
      nodes.push({ id, label: `Bestandsverwaltung ${depth}.${i}`, type: 'Application' });
      edges.push({ id: `e-${id}`, source: depth === 1 ? 'root' : `d${depth - 1}-${i}`, target: id, label: 'hängt ab von' });
    }
  }
  return { nodes, edges };
}

const GERMAN = {
  navigationHint: (modifier: string) => `Ziehen zum Verschieben · ${modifier} + Mausrad zum Zoomen`,
  zoomLevel: (percent: number) => `Zoom ${percent} %`,
  zoomIn: 'Vergrößern',
  zoomOut: 'Verkleinern',
  fit: 'Alles anzeigen',
  reset: 'Zurücksetzen',
  fullscreen: 'Vollbild',
  exitFullscreen: 'Vollbild verlassen',
  controls: 'Kartensteuerung',
};

function Map({ id, german }: { id: string; german?: boolean }) {
  const { nodes, edges } = fixture();
  return (
    <section id={id}>
      <h2>{german ? 'Deutsch' : 'English'}</h2>
      <div className="frame">
        <RelationshipGraph
          layout="layered"
          rootId="root"
          nodes={nodes}
          edges={edges}
          controls="compact"
          height="18rem"
          showList={false}
          {...(german ? { labels: GERMAN } : {})}
        />
      </div>
    </section>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <h1>Map controls</h1>
    <Map id="de" german />
    <Map id="en" />
  </StrictMode>,
);
