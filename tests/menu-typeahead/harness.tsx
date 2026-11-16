import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button } from '../../packages/react/src/components/Button.js';
import { Menu, MenuItem } from '../../packages/react/src/components/Menu.js';

function Example({ controlled }: { controlled: boolean }) {
  const [open, setOpen] = useState(false);
  const [outcome, setOutcome] = useState('Keine Aktion ausgeführt');
  const id = controlled ? 'controlled' : 'uncontrolled';
  const title = controlled ? 'Gesteuertes Menü' : 'Eigenständiges Menü';
  return <section data-example={id}>
    <h2>{title}</h2>
    {controlled && <><Button onClick={() => setOpen(true)}>Menü von außen öffnen</Button><Button onClick={() => setOpen(false)}>Menü von außen schließen</Button></>}
    <Menu label={title} trigger={<Button>Menü öffnen</Button>} {...(controlled ? { open, onOpenChange: setOpen } : {})}>
      <MenuItem onSelect={() => setOutcome('Termine ausgeführt')}>Termine</MenuItem>
      <MenuItem onSelect={() => setOutcome('Teilen ausgeführt')}>Teilen</MenuItem>
      <MenuItem disabled>Oben ohne Berechtigung</MenuItem>
      <MenuItem onSelect={() => setOutcome('Anheften ausgeführt')}>Oben anheften</MenuItem>
      <MenuItem tone="danger" onSelect={() => setOutcome('Löschen angefragt')}>Löschen</MenuItem>
    </Menu>
    <output aria-live="polite">{outcome}</output>
  </section>;
}
createRoot(document.getElementById('root')!).render(<><h1>Jedes Öffnen beginnt eine neue Menüsuche</h1><Example controlled={false} /><Example controlled /></>);
