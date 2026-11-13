/* Live harness for LinkTile (HAR-3095), bundled by build.mjs from source for tests/a11y/link-tile.spec.mjs:
 * a settings hub's grid of navigation tiles, one with a two-line description limit. */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CardLink, LinkTile } from '../../packages/react/src/index.js';
import { BellIcon, ShieldIcon, UsersIcon } from '../../packages/react/src/icons.js';

const before = new URLSearchParams(location.search).get('case') === 'cardlink';

function Before() {
  return (
    <section aria-label="Zugriff und Identität" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(16rem, 1fr))', gap: 'var(--uix-space-4)', maxWidth: 900 }}>
      <CardLink href="#users" title="Benutzer" subtitle="Mitglieder einladen, Rollen vergeben und Zugänge sperren." />
      <CardLink href="#roles" title="Rollen und Berechtigungen" subtitle="Was jede Rolle sehen und ändern darf, mit der Trennung der Aufgaben, die DORA und das interne Kontrollsystem verlangen, und den Ausnahmen." />
      <CardLink href="#notify" title="Benachrichtigungen" subtitle="Wer wann worüber informiert wird." />
    </section>
  );
}

function Harness() {
  if (before) return <Before />;
  return (
    <section aria-label="Zugriff und Identität" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(16rem, 1fr))', gap: 'var(--uix-space-4)', maxWidth: 900 }}>
      <LinkTile href="#users" icon={<UsersIcon />} title="Benutzer" description="Mitglieder einladen, Rollen vergeben und Zugänge sperren." data-tile="users" />
      <LinkTile href="#roles" icon={<ShieldIcon />} title="Rollen und Berechtigungen" description="Was jede Rolle sehen und ändern darf, mit der Trennung der Aufgaben, die DORA und das interne Kontrollsystem verlangen, und den Ausnahmen." descriptionLines={2} data-tile="roles" />
      <LinkTile href="#notify" icon={<BellIcon />} title="Benachrichtigungen" description="Wer wann worüber informiert wird." data-tile="notify" />
    </section>
  );
}

createRoot(document.getElementById('root')!).render(<StrictMode><Harness /></StrictMode>);
