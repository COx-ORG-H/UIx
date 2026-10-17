/* Live harness for OrgChart (HAR-1807), bundled by build.mjs from source for
 * tests/a11y/org-chart.spec.mjs.
 *   - #wide: a five-level organisation whose reports load on expand (120 ms); "risk" fails its
 *     first load. `window.__orgReveal(id, line)` expands a reporting line and reveals a person.
 *   - #box: the same chart in a 30rem box: the list layout on a wide screen (container query). */
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { OrgChart } from '../../packages/react/src/index.js';
import type { OrgChartNode } from '../../packages/react/src/index.js';

const p = (id: string, name: string, title: string, team: string, location: string, reportCount = 0): OrgChartNode =>
  ({ id, name, title, team, location, reportCount });

const ROOT: OrgChartNode[] = [p('ceo', 'Mira Kovač', 'Chief Executive Officer', 'Executive board', 'Munich', 3)];
const REPORTS: Record<string, OrgChartNode[]> = {
  ceo: [p('cio', 'Jan Novak', 'Head of IT', 'IT', 'Munich', 3), p('cfo', 'Olga Berg', 'Head of Finance', 'Finance', 'Frankfurt', 2), p('risk', 'Tom Weber', 'Head of Risk', 'Risk', 'Munich', 2)],
  cio: [p('desk', 'Ana Petrović', 'Service desk lead', 'Service desk', 'Berlin', 3), p('platform', 'Ben Ali', 'Platform lead', 'Platform', 'Munich', 4), p('sec', 'Lea Brandt', 'Security lead', 'Security', 'Hamburg', 2)],
  cfo: [p('acc', 'Nina Graf', 'Accounting lead', 'Accounting', 'Frankfurt', 2), p('ctrl', 'Omar Haddad', 'Controlling lead', 'Controlling', 'Frankfurt', 2)],
  risk: [p('mrisk', 'Sara Vogel', 'Market risk lead', 'Market risk', 'Munich', 2), p('orisk', 'Kai Busch', 'Operational risk lead', 'Operational risk', 'Munich', 2)],
  desk: [p('d1', 'Eva Roth', 'Service desk agent', 'Service desk', 'Berlin'), p('d2', 'Ida Lang', 'Service desk agent', 'Service desk', 'Berlin'), p('d3', 'Paul Kern', 'Service desk agent', 'Service desk', 'Berlin')],
  platform: [p('p1', 'Lars Engel', 'Platform engineer', 'Platform', 'Munich'), p('p2', 'Mia Schulz', 'Platform engineer', 'Platform', 'Munich'), p('p3', 'Finn Wolf', 'Database administrator', 'Platform', 'Munich'), p('p4', 'Zoe Hahn', 'Cloud engineer', 'Platform', 'Hamburg')],
  sec: [p('s1', 'Jonas Beck', 'Security analyst', 'Security', 'Hamburg'), p('s2', 'Lina Koch', 'Security engineer', 'Security', 'Hamburg')],
  acc: [p('a1', 'Tim Franke', 'Accountant', 'Accounting', 'Frankfurt'), p('a2', 'Ute Krause', 'Accountant', 'Accounting', 'Frankfurt')],
  ctrl: [p('c1', 'Rita Lorenz', 'Controller', 'Controlling', 'Frankfurt'), p('c2', 'Ole Kraft', 'Controller', 'Controlling', 'Frankfurt')],
  mrisk: [p('m1', 'Emil Sauer', 'Risk analyst', 'Market risk', 'Munich'), p('m2', 'Pia Jung', 'Risk analyst', 'Market risk', 'Munich')],
  orisk: [p('o1', 'Max Stein', 'Risk analyst', 'Operational risk', 'Munich'), p('o2', 'Lia Ernst', 'Risk analyst', 'Operational risk', 'Munich')],
};
const failOnce = new Set(['risk']);
const loads: string[] = [];
const load = (node: OrgChartNode) => new Promise<OrgChartNode[]>((resolve, reject) => {
  loads.push(node.id);
  setTimeout(() => {
    if (failOnce.delete(node.id)) reject(new Error('offline'));
    else resolve(REPORTS[node.id] ?? []);
  }, 120);
});

declare global {
  interface Window { __orgReveal?: (id: string, line: string[]) => void; __orgLoads: string[] }
}
window.__orgLoads = loads;

function Demo({ id, reveal }: { id: string; reveal?: boolean }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set(['ceo']));
  const [revealId, setRevealId] = useState<string | null>(null);
  if (reveal) {
    window.__orgReveal = (target, line) => {
      setExpanded((prev) => new Set([...prev, ...line]));
      setRevealId(target);
    };
  }
  return (
    <section id={id}>
      <h2>{id}</h2>
      <OrgChart
        aria-label={`Organisation (${id})`}
        nodes={ROOT}
        loadChildren={load}
        expanded={expanded}
        onToggle={(nodeId, open) => setExpanded((prev) => { const next = new Set(prev); if (open) next.add(nodeId); else next.delete(nodeId); return next; })}
        selected={selected}
        onSelect={setSelected}
        revealId={revealId}
        onReveal={() => setRevealId(null)}
      />
      <output data-testid={`${id}-selected`}>{selected ?? ''}</output>
    </section>
  );
}

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <Demo id="wide" reveal />
    <Demo id="box" />
  </StrictMode>,
);
