/* Live harness for keyboard shortcuts on Button, Tooltip and Menu items (HAR-2031), bundled by
 * build.mjs from source for tests/a11y/shortcut.spec.mjs. window.__shortcut counts activations.
 *   - #assign: a text Button with shortcut ['A'], in a ButtonGroup beside two plain buttons
 *     (#plain-* is the same group without a shortcut, for geometry);
 *   - #search: an icon Button with shortcut ['Mod', 'K'] (Meta on Apple, Control elsewhere);
 *   - #full: a full-width Button with a shortcut, in a 20rem column;
 *   - #save-both: a Button with a shortcut and its own aria-keyshortcuts, which it keeps;
 *   - #send: a submit Button with a shortcut in a form (#hint-form);
 *   - #watch: an icon Button with a shortcut inside a Tooltip (one bubble: the Tooltip's);
 *   - #tip-trigger: a link inside a Tooltip with shortcut ['Shift', '?'];
 *   - #new-link: a ButtonLink with shortcut ['N'] (HAR-2416), #new-icon an icon one with ['Mod', 'I'];
 *   - #record-menu: a Menu whose trigger and items carry shortcuts. */
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, ButtonGroup, ButtonLink, Menu, MenuItem, MenuItemCheckbox, MenuSeparator, Tooltip } from '../../packages/react/src/index.js';

declare global { interface Window { __shortcut: Record<string, number> } }
const count = (key: string) => () => { window.__shortcut[key] = (window.__shortcut[key] ?? 0) + 1; };

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
  </svg>
);
const EyeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />
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
        <div style={{ display: 'flex', gap: 'var(--uix-space-2)', alignItems: 'center' }}>
          <Button id="search" icon variant="ghost" aria-label="Search" shortcut={['Mod', 'K']} onClick={count('search')}><SearchIcon /></Button>
          <Button id="save-both" shortcut={['Mod', 'S']} aria-keyshortcuts="Control+S Meta+S">Save</Button>
          <Tooltip label="Watch this record">
            <Button id="watch" icon variant="ghost" aria-label="Watch" shortcut={['W']}><EyeIcon /></Button>
          </Tooltip>
        </div>
        <form id="hint-form" onSubmit={(event) => { event.preventDefault(); count('submit')(); }}>
          <Button id="send" type="submit" variant="primary" shortcut={['Mod', 'Enter']}>Send</Button>
        </form>
      </section>
      <section style={{ width: '20rem' }}>
        <h2>Full width</h2>
        <Button id="full" variant="primary" shortcut={['Mod', 'Enter']} style={{ width: '100%' }}>Save and close</Button>
      </section>
      <section>
        <h2>Links</h2>
        <div style={{ display: 'flex', gap: 'var(--uix-space-2)', alignItems: 'center' }}>
          <ButtonLink id="new-link" href="#new" variant="primary" shortcut={['N']}>New incident</ButtonLink>
          <ButtonLink id="new-icon" href="#import" icon variant="ghost" aria-label="Import" shortcut={['Mod', 'I']}><SearchIcon /></ButtonLink>
        </div>
      </section>
      <section>
        <h2>Tooltip</h2>
        <Tooltip label="Keyboard shortcuts" shortcut={['Shift', '?']}>
          <a id="tip-trigger" href="#shortcuts">Shortcuts</a>
        </Tooltip>
      </section>
      <section>
        <h2>Menu</h2>
        <Menu trigger={<Button id="record-menu" shortcut={['.']}>Actions</Button>}>
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
