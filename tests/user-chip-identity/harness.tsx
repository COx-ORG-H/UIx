import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Avatar, UserChip } from '../../packages/react/src/components/Avatar.js';
import { Button } from '../../packages/react/src/components/Button.js';
const name = 'Mitarbeiterin'.repeat(7);
const sub = 'Sicherheitsbeauftragte@' + 'Gesundheitsorganisation'.repeat(3) + '.invalid';
function Example() {
  const [opened, setOpened] = useState(false);
  return <>
    <h1>Personen in schmalen Zeilen</h1>
    <div className="identity-row" data-constrained>
      <UserChip style={{ maxWidth: '100%' }} title={name} avatar={<Avatar size={28}>AM</Avatar>}
        name={<span data-identity-name>{name}</span>} sub={<span data-identity-sub>{sub}</span>}>
        <Button size="sm" onClick={() => setOpened(true)} aria-label="Profil öffnen">Profil</Button>
      </UserChip>
    </div>
    <div data-short><UserChip avatar={<Avatar size={28}>AM</Avatar>} name="Anne Müller" sub="Service-Desk" /></div>
    <output aria-live="polite">{opened ? 'Profil geöffnet' : 'Kein Profil geöffnet'}</output>
  </>;
}
createRoot(document.getElementById('root')!).render(<Example />);
