/* Live harness for NavItem's trailing slot (HAR-3093), bundled by build.mjs for
 * tests/a11y/nav-trailing.spec.mjs. German labels at the kit's 248 px sidebar width, as TENSOR
 * renders its expanded nav at 1440 px: a long label with a count and an unpinned star, the same row
 * pinned, a row with only a star, and a sub-row with a count. */
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { NavItem, Sidebar, StarButton, SubNavItem } from '../../packages/react/src/index.js';

const Bell = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
);

function Harness() {
  const [pinned, setPinned] = useState<Record<string, boolean>>({ pinned: true });
  const star = (id: string, label: string) => (
    <StarButton pinned={!!pinned[id]} label={label} addLabel="{label} zu Favoriten hinzufügen" onToggle={(next) => setPinned((p) => ({ ...p, [id]: next }))} />
  );
  return (
    <Sidebar aria-label="Hauptnavigation" style={{ width: 'var(--uix-sidebar-w)' }}>
      <NavItem id="row-count" href="#benachrichtigungen" icon={<Bell />} badge="12" trailing={star('count', 'Benachrichtigungen')}>Benachrichtigungen</NavItem>
      <NavItem id="row-pinned" href="#benachrichtigungen-2" icon={<Bell />} badge="12" trailing={star('pinned', 'Benachrichtigungen')}>Benachrichtigungen</NavItem>
      <NavItem id="row-star" href="#konfiguration" icon={<Bell />} trailing={star('star', 'Konfigurationselemente')}>Konfigurationselemente</NavItem>
      <NavItem id="row-long" href="#arbeitsbereich" icon={<Bell />} badge="3" trailing={star('long', 'Arbeitsbereich-Einstellungen')}>Arbeitsbereich-Einstellungen und Benachrichtigungsregeln</NavItem>
      <SubNavItem id="row-sub" href="#offen" badge="7" trailing={star('sub', 'Offene Vorfälle')}>Offene Vorfälle</SubNavItem>
      <NavItem id="row-plain" href="#plain" icon={<Bell />} badge="5">Ohne Stern</NavItem>
      <NavItem id="row-fit" href="#berechtigung" icon={<Bell />} trailing={star('fit', 'Berechtigungskonzept')}>Berechtigungskonzept</NavItem>
      <NavItem id="row-router" href="#router" icon={<Bell />} badge="2" renderLink={(p) => <a {...p} data-router="yes" />} trailing={star('router', 'Über den Router')}>Über den Router</NavItem>
    </Sidebar>
  );
}

createRoot(document.getElementById('root')!).render(<Harness />);
