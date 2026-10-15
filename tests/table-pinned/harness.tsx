/* Live harness for the frozen trailing actions column (Table pinnedActions), bundled by build.mjs
 * from source for tests/a11y/table-pinned-actions.spec.mjs. Every table sits in a 360 px wrap
 * that is narrower than its 760 px minimum, so the wrap scrolls sideways, as TENSOR's list
 * tables do on a narrow screen or with extra columns turned on.
 *   - #both: pinnedCol + pinnedActions, zebra, a height-capped wrap (both scroll axes), a pinned
 *     row, a selected row and an expanded detail row.
 *   - #no-zebra: both pins on a line-divider table.
 *   - #control: the same table without pinnedActions; its Peek button leaves the wrap. */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { TableWrap, Table, Th, Td, Tr, RowActions, RowAction } from '../../packages/react/src/index.js';

const ROWS = [
  ['INC-4821', 'Disk pressure on db-03', 'M. Okafor', 'Open', '12.10.2026 09:14'],
  ['INC-4822', 'DNS flap in eu-west', 'R. Lindqvist', 'In progress', '12.10.2026 10:02'],
  ['INC-4823', 'Certificate expiry on api-gw', 'S. Haddad', 'Waiting', '12.10.2026 11:47'],
  ['INC-4824', 'Backup window overran on vault-01', 'P. Novak', 'Open', '13.10.2026 08:30'],
  ['INC-4825', 'Payroll export timing out', 'O. Diallo', 'Resolved', '13.10.2026 14:05'],
  ['INC-4826', 'VPN disconnects randomly', 'M. Chen', 'Open', '14.10.2026 07:55'],
  ['INC-4827', 'Printer queue stuck on floor 3', 'P. Shah', 'In progress', '14.10.2026 12:20'],
  ['INC-4828', 'SSO login loop for contractors', 'A. Moreau', 'Waiting', '15.10.2026 09:41'],
] as const;

const Eye = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />
  </svg>
);

interface SpecimenProps {
  id: string;
  label: string;
  pinnedActions?: boolean;
  pinnedCol?: boolean;
  zebra?: boolean;
  scroll?: boolean;
}

function Specimen({ id, label, pinnedActions, pinnedCol, zebra = true, scroll }: SpecimenProps) {
  return (
    <section id={id} aria-label={label}>
      <h2>{label}</h2>
      <TableWrap
        className={scroll ? 'uix-table-wrap--scroll' : undefined}
        style={{ width: 360, ...(scroll ? { ['--uix-table-max-height' as string]: '240px' } : {}) }}
        tabIndex={0}
        role="region"
        aria-label={`${label} (scrolls)`}
      >
        <Table aria-label={label} pinnedActions={pinnedActions} pinnedCol={pinnedCol} zebra={zebra} style={{ minWidth: 760 }}>
          <thead>
            <tr>
              <Th scope="col">ID</Th><Th scope="col">Subject</Th><Th scope="col">Assignee</Th>
              <Th scope="col">Status</Th><Th scope="col">Updated</Th>
              <Th scope="col" className="uix-table__actions"><span className="uix-visually-hidden">Actions</span></Th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map(([key, subject, who, status, updated], i) => [
              <Tr key={key} pinned={i === 2 || undefined} selected={i === 4 || undefined} data-row={key}>
                <Td className="uix-mono">{key}</Td><Td>{subject}</Td><Td>{who}</Td><Td>{status}</Td><Td>{updated}</Td>
                <RowActions><RowAction aria-label={`Peek ${key}`}><Eye /></RowAction></RowActions>
              </Tr>,
              i === 5 ? (
                <tr key={`${key}-detail`} className="uix-table__detail" data-row={`${key}-detail`}>
                  <td colSpan={6}><div className="uix-table__detail-inner">Expanded detail for {key}</div></td>
                </tr>
              ) : null,
            ])}
          </tbody>
        </Table>
      </TableWrap>
    </section>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Specimen id="both" label="Both columns pinned" pinnedCol pinnedActions scroll />
    <Specimen id="no-zebra" label="Both columns pinned, no zebra" pinnedCol pinnedActions zebra={false} />
    <Specimen id="control" label="No pinned actions" />
  </StrictMode>,
);
