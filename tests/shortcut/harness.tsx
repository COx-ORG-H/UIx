/* Live harness for keyboard shortcuts on Button, Tooltip and Menu items (HAR-2031), bundled by
 * build.mjs from source for tests/a11y/shortcut.spec.mjs. window.__shortcut counts activations.
 *   - #assign: a text Button with shortcut ['A'], in a ButtonGroup with two plain buttons;
 *   - #search: an icon Button with shortcut ['Mod', 'K'] (Meta on Apple, Control elsewhere);
 *   - #full: a full-width Button with a shortcut, in a 20rem column;
 *   - #tip-trigger: a link inside a Tooltip with shortcut ['Shift', '?'];
 *   - #record-menu: a Menu whose items carry shortcuts, one of them a checkbox item. */
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, ButtonGroup, Menu, MenuItem, MenuItemCheckbox, MenuSeparator, Tooltip } from '../../packages/react/src/index.js';

declare global { interface Window { __shortcut: Record<string, number> } }
const count = (key: string) => () => { window.__shortcut[key] = (window.__shortcut[key] ?? 0) + 1; };

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
  </svg>
);

function Harness() {
  const [watching, setWatching] = useState(false);
  return (
    <>
      <h1>Shortcuts</h1>
      <section>
        <h2>Record actions</h2>
        <ButtonGroup>
          <Button id="assign" shortcut={['A']} onClick={count('assign')}>Assign</Button>
          <Button id="resolve" onClick={count('resolve')}>Resolve</Button>
          <Button id="close-record" onClick={count('close')}>Close</Button>
        </ButtonGroup>
        <ButtonGroup>
          <Button id="plain-a">Assign</Button>
          <Button id="plain-b">Resolve</Button>
          <Button id="plain-c">Close</Button>
        </ButtonGroup>
        <Button id="search" icon variant="ghost" aria-label="Search" shortcut={['Mod', 'K']} onClick={count('search')}><SearchIcon /></Button>
      </section>
      <section style={{ width: '20rem' }}>
        <h2>Full width</h2>
        <Button id="full" variant="primary" shortcut={['Mod', 'Enter']} style={{ width: '100%' }}>Save and close</Button>
      </section>
      <section>
        <h2>Tooltip</h2>
        <Tooltip label="Keyboard shortcuts" shortcut={['Shift', '?']}>
          <a id="tip-trigger" href="#shortcuts">Shortcuts</a>
        </Tooltip>
      </section>
      <section>
        <h2>Menu</h2>
        <Menu trigger={<Button id="record-menu">Actions</Button>}>
          <MenuItem id="menu-assign" shortcut={['A']} onSelect={count('menu-assign')}>Assign to me</MenuItem>
          <MenuItem id="menu-duplicate" shortcut={['Mod', 'D']}>Duplicate</MenuItem>
          <MenuItemCheckbox id="menu-watch" checked={watching} onCheckedChange={setWatching} shortcut={['Shift', 'W']}>Watch</MenuItemCheckbox>
          <MenuSeparator />
          <MenuItem id="menu-legacy" shortcut={<kbd className="uix-kbd">Del</kbd>} tone="danger">Delete</MenuItem>
        </Menu>
      </section>
    </>
  );
}

window.__shortcut = {};
createRoot(document.getElementById('root')!).render(<StrictMode><Harness /></StrictMode>);
