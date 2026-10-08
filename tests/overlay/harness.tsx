/* Live harness for the anchored-overlay engine and Menu (HAR-1613, HAR-1629), bundled by
 * build.mjs from source for tests/a11y/overlay-shift.spec.mjs and menu.spec.mjs.
 *
 *   - #columns → #panel: a 304 × 384 Popover, the size of TENSOR's /incidents columns menu, which
 *     at 320 × 640 fits neither above nor below its trigger;
 *   - #tall-trigger → #tall: a Popover with 1200 px of content and capHeight;
 *   - #hook-trigger → #hook-panel: a consumer that positions with useAnchoredPosition itself and
 *     closes on onAnchorHidden (window.__overlay.hookHidden counts the calls);
 *   - #preset (radio items), #view-columns (checkbox items), #bulk (every item disabled) and
 *     #long (60 items): the Menu cases.
 * The page is 1400 px of spacer above and below the triggers, so a test scrolls a trigger to
 * any height in the viewport. */
import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Button, Menu, MenuItem, MenuItemCheckbox, MenuItemRadio, MenuRadioGroup, MenuSeparator, Popover, useAnchoredPosition,
} from '../../packages/react/src/index.js';

declare global { interface Window { __overlay: { hookHidden: number; preset: string; columns: string[] } } }
window.__overlay = { hookHidden: 0, preset: 'team', columns: ['state'] };

const toggle = (id: string) => () => {
  const el = document.getElementById(id) as (HTMLElement & { togglePopover?: () => void }) | null;
  el?.togglePopover?.();
};

/** A panel placed with the hook, not with Popover's `anchor`. */
function HookConsumer() {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  useAnchoredPosition(anchorRef, panelRef, {
    open,
    placement: 'bottom-start',
    onAnchorHidden: () => { window.__overlay.hookHidden += 1; setOpen(false); },
  });
  useEffect(() => {
    const el = panelRef.current as (HTMLDivElement & { showPopover(): void; hidePopover(): void }) | null;
    if (!el) return;
    try { if (open) el.showPopover(); else el.hidePopover(); } catch { /* already in that state */ }
  }, [open]);
  return (
    <>
      <Button ref={anchorRef} id="hook-trigger" aria-expanded={open} onClick={() => setOpen((o) => !o)}>Hook panel</Button>
      <div ref={panelRef} id="hook-panel" className="uix-popover" {...({ popover: 'manual' } as Record<string, string>)}>
        <p style={{ width: 200, height: 120, margin: 0 }}>Placed with useAnchoredPosition.</p>
      </div>
    </>
  );
}

function Harness() {
  const columnsRef = useRef<HTMLButtonElement>(null);
  const tallRef = useRef<HTMLButtonElement>(null);
  const [preset, setPreset] = useState(window.__overlay.preset);
  const [columns, setColumns] = useState<string[]>(window.__overlay.columns);
  const choose = (value: string) => { window.__overlay.preset = value; setPreset(value); };
  const flip = (name: string) => (on: boolean) => {
    const next = on ? [...columns, name] : columns.filter((c) => c !== name);
    window.__overlay.columns = next;
    setColumns(next);
  };
  return (
    <>
      <div className="spacer" />
      <div className="row">
        <HookConsumer />
        <Button ref={tallRef} id="tall-trigger" onClick={toggle('tall')}>Tall</Button>
        <Menu trigger={<Button id="preset">Preset</Button>}>
          <MenuItem id="manage-presets" data-action-id="preset.manage" onSelect={() => {}}>Manage presets</MenuItem>
          <MenuSeparator />
          <MenuRadioGroup label="Dashboard preset" value={preset} onValueChange={choose}>
            <MenuItemRadio value="mine" data-action-id="preset.mine">My queue</MenuItemRadio>
            <MenuItemRadio value="team" data-action-id="preset.team">Team</MenuItemRadio>
            <MenuItemRadio value="all" data-action-id="preset.all">Everything</MenuItemRadio>
          </MenuRadioGroup>
        </Menu>
        <Menu trigger={<Button id="view-columns">Show</Button>} label="Columns shown">
          {['state', 'owner', 'priority'].map((name) => (
            <MenuItemCheckbox key={name} checked={columns.includes(name)} onCheckedChange={flip(name)} data-action-id={`column.${name}`}>
              {name[0]!.toUpperCase() + name.slice(1)}
            </MenuItemCheckbox>
          ))}
        </Menu>
        <Menu trigger={<Button id="bulk">Bulk actions</Button>}>
          <MenuItem disabled>Assign</MenuItem>
          <MenuItem disabled>Close</MenuItem>
        </Menu>
        <Menu trigger={<Button id="long">Long</Button>}>
          {Array.from({ length: 60 }, (_, i) => <MenuItem key={i} onSelect={() => {}}>{`Action ${i + 1}`}</MenuItem>)}
        </Menu>
        <Button ref={columnsRef} id="columns" onClick={toggle('panel')}>Columns</Button>
      </div>
      <Popover id="panel" className="fixed-panel" popover="manual" anchor={columnsRef} placement="bottom-end">
        <div>304 × 384</div>
      </Popover>
      <Popover id="tall" popover="manual" anchor={tallRef} placement="bottom-end" capHeight>
        <div className="tall-content">1200 px of content</div>
      </Popover>
      <div className="spacer" />
    </>
  );
}

createRoot(document.getElementById('root')!).render(<StrictMode><Harness /></StrictMode>);
