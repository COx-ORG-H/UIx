/* Live harness for the kit gaps MOTUS and TENSOR filed in October 2026, bundled by build.mjs
 * from source for tests/a11y/kit-gaps-oct.spec.mjs. One <section id> per issue.
 *
 *   #wrap      HAR-1813  a Button / ButtonLink label that may wrap
 *   #zoom      HAR-1798  a Select opened low on the page, for the spec to set html { zoom: 2 }
 *   #content   HAR-1811  a ContentList row with an unbroken 80-character title
 *   #metric    HAR-1819  MetricInput required + hint + error
 *   #table     HAR-1814  row actions and id-cell arrow on keyboard focus, sortable header type
 *   #detail    HAR-1814  DetailLayout without a side
 *   #nav       HAR-1814  NavItem focus ring inside a Sidebar
 *   #warning   HAR-1814  Input / Field warning state
 */
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Button, ButtonLink, ContentList, ContentListItem, DetailLayout, Field, Input, MetricInput, NavItem, RowAction,
  RowActions, Select, Sidebar, Table, Th,
} from '../../packages/react/src/index.js';

const LONG_LABEL = 'Prebaci podsjetnike na engleski jezik i pošalji mi potvrdu e-poštom';
const UNBROKEN = 'Datenschutzfolgenabschätzungsverfahrensdokumentationsvorlage_für_Rechenzentren_2026';

function WrapCases() {
  return (
    <section id="wrap">
      <h2>Wrapping labels (HAR-1813)</h2>
      <div className="column" id="wrap-column">
        <Button id="wrap-lg" size="lg" variant="outline" wrap>{LONG_LABEL}</Button>
        <Button id="wrap-md" wrap>{LONG_LABEL}</Button>
        <ButtonLink id="wrap-link" href="#wrap" size="lg" wrap>{LONG_LABEL}</ButtonLink>
        <Button id="wrap-icon" icon wrap aria-label="Close">×</Button>
        <Button id="nowrap-md">Save</Button>
      </div>
    </section>
  );
}

const ROLES = [
  { value: 'reader', label: 'Reader' },
  { value: 'staff', label: 'Staff' },
  { value: 'admin', label: 'Administrator' },
];

function ZoomCases() {
  const [role, setRole] = useState<string>('');
  return (
    <section id="zoom">
      <h2>Anchored overlay under CSS zoom (HAR-1798)</h2>
      {/* Low enough that, zoomed 2×, a list placed at twice its offset lands below the viewport. */}
      <div style={{ marginBlockStart: '14rem' }}>
        <label htmlFor="zoom-role" className="uix-field__label">Add a role</label>
        <Select id="zoom-role" placeholder="Pick a role" options={ROLES} value={role} onValueChange={(v) => setRole(String(v))} />
      </div>
    </section>
  );
}

function ContentCases() {
  return (
    <section id="content">
      <h2>Content list titles (HAR-1811)</h2>
      <div className="column" id="content-column">
        <ContentList>
          <ContentListItem title={UNBROKEN} meta={UNBROKEN} trailing={<span aria-hidden="true">→</span>} />
        </ContentList>
      </div>
    </section>
  );
}

function MetricCases() {
  const [days, setDays] = useState<number | null>(14);
  return (
    <section id="metric">
      <h2>MetricInput required and hint (HAR-1819)</h2>
      <MetricInput id="loan-days" label="Loan period" unit="days" min={1} max={60} value={days} onValueChange={setDays}
        required hint="Between 1 and 60 days." />
      <MetricInput id="renewals" label="Renewals" min={0} max={5} value={9} onValueChange={() => {}}
        required hint="At most 5." invalid errorMessage="Too many renewals." />
    </section>
  );
}

function TableCases() {
  return (
    <section id="table">
      <h2>Table on the keyboard (HAR-1814)</h2>
      <Table>
        <thead>
          <tr>
            <Th id="sortable-th" sortable sortDirection="none" onSort={() => {}}>Number</Th>
            <Th id="plain-th">Title</Th>
            <th><span className="uix-visually-hidden">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          <tr id="row-1">
            <td>
              <a id="row-1-link" className="uix-id-cell__btn" href="#row-1">INC-1042</a>
              <svg className="uix-id-cell__arrow" id="row-1-arrow" viewBox="0 0 16 16" aria-hidden="true"><path d="M5 11 11 5M6 5h5v5" fill="none" stroke="currentColor" /></svg>
            </td>
            <td>Printer offline</td>
            <RowActions><RowAction id="row-1-action" aria-label="More actions">⋯</RowAction></RowActions>
          </tr>
          <tr id="row-2">
            <td><a className="uix-id-cell__btn" href="#row-2">INC-1043</a></td>
            <td>VPN slow</td>
            <RowActions><RowAction id="row-2-action" aria-label="More actions">⋯</RowAction></RowActions>
          </tr>
        </tbody>
      </Table>
    </section>
  );
}

function DetailCases() {
  return (
    <section id="detail">
      <h2>DetailLayout without a side (HAR-1814)</h2>
      <DetailLayout id="detail-no-side"><p id="detail-main-text">Main column only.</p></DetailLayout>
      <DetailLayout id="detail-with-side" side={<p>Side</p>}><p>Main column.</p></DetailLayout>
    </section>
  );
}

function NavCases() {
  return (
    <section id="nav">
      <h2>NavItem focus in a Sidebar (HAR-1814)</h2>
      <div className="rail">
        <Sidebar aria-label="Workspace">
          <NavItem id="nav-first" href="#nav">Circulation</NavItem>
          <NavItem href="#nav">Members</NavItem>
        </Sidebar>
      </div>
    </section>
  );
}

function WarningCases() {
  return (
    <section id="warning">
      <h2>Warning state (HAR-1814)</h2>
      <Input id="warn-input" aria-label="ISBN" defaultValue="978-3-16-148410-0" warning />
      <Field label="Publisher" warning="Filled in by the assistant: check it.">
        <Input id="warn-field" defaultValue="Svjetlost" />
      </Field>
      <Field label="Year" error="Not a year." warning="Check this.">
        <Input id="warn-error" defaultValue="19x4" />
      </Field>
    </section>
  );
}

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <WrapCases />
    <ZoomCases />
    <ContentCases />
    <MetricCases />
    <TableCases />
    <DetailCases />
    <NavCases />
    <WarningCases />
  </StrictMode>,
);
