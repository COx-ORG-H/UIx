/* Live harness for HAR-1576 (no text character stands in for an icon), bundled by build.mjs from
 * source for tests/a11y/glyph-icons.spec.mjs. Every control that drew × « ‹ › + − ★ or ! as text,
 * and the two plain-CSS slots that drew arrows and a chevron, now with the icon set:
 *   - #toast: a Toast with its close button;
 *   - #pages / #cursor: an offset pager and a cursor pager (first / previous / next);
 *   - #metric: a MetricInput with its + and − steppers;
 *   - #views: a SavedViewMenu with a pinned and an unpinned view;
 *   - #steps: Steps with an error step;
 *   - #table: a table with an unsorted, an ascending and a descending sortable header;
 *   - #select: a Select trigger, whose chevron is a masked ::after;
 *   - #glyphs: the plain-CSS `.uix-glyph` spans. */
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MetricInput, Pagination, SavedViewMenu, Select, Step, Steps, Table, Th, Toast } from '../../packages/react/src/index.js';

function Harness() {
  const [page, setPage] = useState(3);
  const [value, setValue] = useState<number | null>(40);
  return (
    <>
      <h1>Icons, not glyphs</h1>
      <section id="toast"><Toast title="Policy saved" message="The service policy is now active." onClose={() => {}} /></section>
      <section id="pages"><Pagination page={page} pageCount={9} onChange={setPage} /></section>
      <section id="cursor"><Pagination mode="cursor" hasPrevious hasNext onFirst={() => {}} onPrevious={() => {}} onNext={() => {}} summary="21–40" /></section>
      <section id="metric" style={{ maxWidth: '16rem' }}><MetricInput label="Latency threshold" unit="ms" value={value} onValueChange={setValue} /></section>
      <section id="views" style={{ maxWidth: '20rem' }}>
        <SavedViewMenu items={[{ id: 'mine', label: 'My open work', pinned: true }, { id: 'team', label: 'Team queue' }]} onSelect={() => {}} onPinChange={() => {}} pinLabel="Pin view" unpinLabel="Unpin view" />
      </section>
      <section id="steps"><Steps label="Import"><Step title="Upload" state="complete" /><Step title="Validate" state="error" /><Step title="Publish" /></Steps></section>
      <section id="table">
        <Table>
          <thead><tr>
            <Th sortable onSort={() => {}}>Ticket</Th>
            <Th sortable sortDirection="ascending" onSort={() => {}}>Opened</Th>
            <Th sortable sortDirection="descending" onSort={() => {}}>Priority</Th>
          </tr></thead>
          <tbody><tr><td>INC-1</td><td>12.10.2026</td><td>P2</td></tr></tbody>
        </Table>
      </section>
      <section id="select" style={{ maxWidth: '16rem' }}>
        <Select aria-label="State" options={[{ value: 'open', label: 'Open' }, { value: 'closed', label: 'Closed' }]} defaultValue="open" />
      </section>
      <section id="glyphs">
        <span className="uix-glyph uix-glyph--chevron-down" aria-hidden="true" />
        <span className="uix-glyph uix-glyph--arrow-up" aria-hidden="true" />
        <span className="uix-glyph uix-glyph--arrow-down" aria-hidden="true" />
        <span className="uix-glyph uix-glyph--arrow-up-down" aria-hidden="true" />
        <span className="uix-glyph uix-glyph--x" aria-hidden="true" />
      </section>
    </>
  );
}

createRoot(document.getElementById('root')!).render(<StrictMode><Harness /></StrictMode>);
