"use client";

import { Fragment, useId, useRef, useState } from 'react';
import { cx } from '../cx.js';
import { useUixLabels } from '../labels-context.js';
import { Modal } from './Modal.js';
import { Switch } from './Switch.js';
import { KbdCombo } from './Kbd.js';
import { useShortcut, useShortcuts } from './Shortcuts.js';
import type { ShortcutBinding } from '../shortcut-model.js';
import type { ShortcutSheetGroup } from '../shortcut-registry.js';

/** The words of the shortcut sheet and of the kit's own registered shortcuts (`UixLabelsProvider` `shortcuts`). */
export interface ShortcutLabels {
  /** The sheet's title. Default "Keyboard shortcuts". */
  title: string;
  /** The sheet's own shortcut, as the sheet and the palette list it. Default "Show keyboard shortcuts". */
  open: string;
  /** The heading of the shortcuts that work everywhere. Default "Everywhere". */
  global: string;
  /** The character-key switch. Default "Single-key shortcuts". */
  characterKeys: string;
  /** What the switch does. */
  characterKeysHint: string;
  /** Shown while the switch is off. */
  characterKeysOff: string;
  /** Nothing is active where focus is. Default "No keyboard shortcuts work here." */
  empty: string;
  /** Between the keys of a sequence: "G then I". Default "then". */
  then: string;
  /** `CommandPalette` `shortcut`. Default "Open the command palette". */
  openPalette: string;
  /** `AppShell` `navHotkey`. Default "Collapse or expand the navigation". */
  toggleNav: string;
  /** `DataWorkspace` Mod+/. Default "Search this list". */
  focusSearch: string;
}

export const DEFAULT_SHORTCUT_LABELS: ShortcutLabels = {
  title: 'Keyboard shortcuts',
  open: 'Show keyboard shortcuts',
  global: 'Everywhere',
  characterKeys: 'Single-key shortcuts',
  characterKeysHint: 'Shortcuts of one character, such as ? or G then I. Turn them off if you use speech input or press keys by accident.',
  characterKeysOff: 'Single-key shortcuts are off. Shortcuts with Ctrl, ⌘ or Alt still work.',
  empty: 'No keyboard shortcuts work here.',
  then: 'then',
  openPalette: 'Open the command palette',
  toggleNav: 'Collapse or expand the navigation',
  focusSearch: 'Search this list',
};

export interface ShortcutSheetProps {
  /** Controlled open state. Pair with `onOpenChange`. Default: the sheet keeps its own. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** The sheet's own keys. Default `'?'` (a character key: the switch turns it off; open the sheet from the palette or a button too). `null`: none. */
  keys?: ShortcutBinding | null;
  /** Show the character-key switch at the end of the sheet. Default `true`. */
  characterKeySwitch?: boolean;
  /** Override words; default `UixLabelsProvider` `shortcuts`, then English. */
  labels?: Partial<ShortcutLabels>;
  className?: string;
}

/** The shortcut sheet's own command id: `<Button shortcutId={SHORTCUT_SHEET_ID}>`, a palette item's `shortcutId`. */
export const SHORTCUT_SHEET_ID = 'uix.shortcut-sheet';

/** One scope's shortcuts, split by their `group` in the order the groups first appear. */
const byGroup = (shortcuts: ShortcutSheetGroup['shortcuts']) => {
  const groups = new Map<string, ShortcutSheetGroup['shortcuts']>();
  for (const shortcut of shortcuts) {
    const key = shortcut.group ?? '';
    groups.set(key, [...(groups.get(key) ?? []), shortcut]);
  }
  return [...groups.entries()];
};

/**
 * The `?` sheet (enterprise UX study, roadmap #1): a modal dialog listing the shortcuts that work
 * where focus was when it opened, grouped by scope (everywhere first, then each `ShortcutScope`
 * focus is in), with each command's current keys after remaps. A character key turned off by the
 * switch is not listed: the sheet shows only what works. It ends with the character-key switch
 * (WCAG 2.1.4). Mount it once inside the `ShortcutProvider`; it opens instantly, takes focus, and
 * Escape returns focus to where it was.
 */
export function ShortcutSheet({ open: openProp, onOpenChange, keys = '?', characterKeySwitch = true, labels: labelOverrides, className }: ShortcutSheetProps) {
  const uixLabels = useUixLabels();
  const labels: ShortcutLabels = { ...DEFAULT_SHORTCUT_LABELS, ...uixLabels.shortcuts, ...labelOverrides };
  const api = useShortcuts();
  const [ownOpen, setOwnOpen] = useState(false);
  const open = openProp ?? ownOpen;
  const setOpen = (next: boolean) => {
    if (openProp === undefined) setOwnOpen(next);
    onOpenChange?.(next);
  };
  // Where focus was when it opened decides which scopes are listed; read before the dialog takes focus.
  const opener = useRef<Element | null>(null);
  const wasOpen = useRef(false);
  if (open && !wasOpen.current && typeof document !== 'undefined') opener.current = document.activeElement;
  wasOpen.current = open;

  useShortcut({ id: SHORTCUT_SHEET_ID, keys: keys ?? '', enabled: keys !== null, label: labels.open, scope: 'global', handler: () => setOpen(!open) });

  const hintId = useId();
  const headingBase = useId();
  const groups = open ? api.active(opener.current) : [];
  const characterKeysOn = api.preferences.characterKeys === 'on';

  return (
    <Modal open={open} onClose={() => setOpen(false)} title={labels.title} instant className={cx('uix-shortcut-sheet', className)}>
      {groups.length > 0 ? (
        <div className="uix-shortcut-sheet__groups">
          {groups.map((group, index) => {
            const headingId = `${headingBase}-${index}`;
            return (
              <section key={`${group.scope ?? ''}-${index}`} className="uix-shortcut-sheet__group" aria-labelledby={headingId}>
                <h3 id={headingId} className="uix-shortcut-sheet__heading">{group.scope ?? labels.global}</h3>
                {byGroup(group.shortcuts).map(([name, shortcuts]) => (
                  <Fragment key={name}>
                    {name && <h4 className="uix-shortcut-sheet__subhead">{name}</h4>}
                    <dl className="uix-shortcut-sheet__list">
                      {shortcuts.map((shortcut) => (
                        <div key={shortcut.id} className="uix-shortcut-sheet__row">
                          <dt className="uix-shortcut-sheet__label">{shortcut.label}</dt>
                          <dd className="uix-shortcut-sheet__keys"><KbdCombo keys={shortcut.keys} thenLabel={labels.then} /></dd>
                        </div>
                      ))}
                    </dl>
                  </Fragment>
                ))}
              </section>
            );
          })}
        </div>
      ) : (
        <p className="uix-shortcut-sheet__empty">{labels.empty}</p>
      )}
      {characterKeySwitch && (
        <div className="uix-shortcut-sheet__settings">
          <Switch
            label={labels.characterKeys}
            checked={characterKeysOn}
            aria-describedby={hintId}
            onChange={(event) => api.setCharacterKeys(event.currentTarget.checked ? 'on' : 'off')}
          />
          <p id={hintId} className="uix-shortcut-sheet__hint">{characterKeysOn ? labels.characterKeysHint : labels.characterKeysOff}</p>
        </div>
      )}
    </Modal>
  );
}
