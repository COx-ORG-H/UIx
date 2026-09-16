// Regenerates the layered RelationshipGraph specimen on the docs page
// `examples-relationship-graph` (ADR-0003) from the BUILT package, so the static
// styleguide shows exactly what the component renders.
//
//   npm run build:react   (or: cd packages/react && npx tsup)
//   node packages/react/scripts/render-relationship-graph-specimen.mjs
//
// The static docs have no React runtime, so each node button also gets
// `data-nav-*` attributes (from `layeredNeighbor`) that guide/phase-46-9.js uses
// to reproduce the component's keyboard traversal.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { layeredNeighbor, layoutLayeredGraph, RelationshipGraph } from '../dist/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const target = join(here, '../../tokens/docs/showcase-data.js');
const START = '<!-- layered-specimen:start -->';
const END = '<!-- layered-specimen:end -->';

// Five hops: a diamond (two apps → one database), a 12-host leaf fan-out that
// clusters, a column whose nodes each continue (never clustered), a supplier
// chain with an emphasised edge, and a cycle back from storage to the database.
const node = (id, label, type, depth) => ({ id, label, type, description: id.toUpperCase(), depth });
const nodes = [
  node('svc', 'Payments service', 'Business service', 0),
  node('checkout', 'Checkout application', 'Application', 1),
  node('ledger', 'Ledger application', 'Application', 1),
  node('vendor', 'Card processor', 'Supplier', 1),
  node('db', 'Payments database cluster', 'Database', 2),
  node('queue', 'Settlement queue', 'Message broker', 2),
  node('sub', 'Processor data centre', 'Supplier', 2),
  node('cluster', 'Database host pool', 'Cluster', 3),
  node('k8s', 'Queue workers', 'Kubernetes cluster', 3),
  ...Array.from({ length: 12 }, (_, i) => node(`host${i + 1}`, `Host ${i + 1}`, 'Server', 4)),
  ...Array.from({ length: 3 }, (_, i) => node(`worker${i + 1}`, `Worker node ${i + 1}`, 'Node', 4)),
  ...Array.from({ length: 3 }, (_, i) => node(`pod${i + 1}`, `Settlement pod ${i + 1}`, 'Pod', 5)),
  node('san', 'Shared storage array', 'Storage', 5),
];
const edge = (source, target, type, extra = {}) => ({ id: `${source}->${target}`, source, target, type, label: type.replace(/_/g, ' '), ...extra });
const edges = [
  edge('svc', 'checkout', 'depends_on'),
  edge('svc', 'ledger', 'depends_on'),
  edge('svc', 'vendor', 'supplied_by', { emphasis: true }),
  edge('checkout', 'db', 'depends_on'),
  edge('ledger', 'db', 'depends_on'),
  edge('ledger', 'queue', 'depends_on'),
  edge('vendor', 'sub', 'sub_outsourced_to', { emphasis: true }),
  edge('db', 'cluster', 'runs_on'),
  edge('queue', 'k8s', 'runs_on'),
  ...Array.from({ length: 12 }, (_, i) => edge('cluster', `host${i + 1}`, 'member_of')),
  ...Array.from({ length: 3 }, (_, i) => edge('k8s', `worker${i + 1}`, 'member_of')),
  ...Array.from({ length: 3 }, (_, i) => edge(`worker${i + 1}`, `pod${i + 1}`, 'runs_on')),
  edge('host1', 'san', 'connects_to'),
  edge('san', 'db', 'depends_on'),
];

const props = { layout: 'layered', rootId: 'svc', nodes, edges, height: '28rem', selectedId: 'db' };
let markup = renderToStaticMarkup(h(RelationshipGraph, props));

const layout = layoutLayeredGraph(nodes, edges, { rootId: 'svc' });
const keys = { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown', home: 'Home', end: 'End' };
for (const item of layout.items) {
  const attrs = Object.entries(keys)
    .map(([name, key]) => [name, layeredNeighbor(layout, item.id, key)])
    .filter(([, id]) => id !== undefined)
    .map(([name, id]) => `data-nav-${name}="${id}"`)
    .join(' ');
  markup = markup.replace(`data-node-id="${item.id}"`, () => `data-node-id="${item.id}" ${attrs}`);
}

const section = `${START}<div class="uix-guide__subhead">Layered layout</div><p class="lead">Columns are hops from the root. Shared nodes are drawn once, the storage → database back edge is a marked cycle, the 12-host fan-out is a cluster, and supplier edges keep their labels. Tab into the map, then use the arrow keys.</p><div data-layered-specimen>${markup}</div>${END}`;

const source = readFileSync(target, 'utf8');
const pages = source.match(/"slug": "examples-relationship-graph"[\s\S]*?"html": ("(?:[^"\\]|\\.)*")/);
if (!pages) throw new Error('examples-relationship-graph page not found');
const html = JSON.parse(pages[1]);
const stripped = html.includes(START) ? html.slice(0, html.indexOf(START)) + html.slice(html.indexOf(END) + END.length) : html;
const closing = stripped.lastIndexOf('</section>');
const next = `${stripped.slice(0, closing).trimEnd()}${section}\n    ${stripped.slice(closing)}`;
writeFileSync(target, source.replace(pages[1], () => JSON.stringify(next)));
console.log(`layered specimen: ${layout.items.length} items, ${layout.edges.length} edges, ${layout.clusters.length} cluster(s)`);
