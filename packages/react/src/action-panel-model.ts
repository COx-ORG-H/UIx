/* Pure model for the per-row action panel (enterprise UX study, roadmap #10; spec
 * Docs/specs/2026-11-20-action-panel.md): which actions a query finds, in which order and groups,
 * which one Enter runs, and which ones must be confirmed. Matching is the command palette's
 * (`filterCommandItems`: case and diacritics folded, label prefix first). Destructive actions are
 * always last, after every other match, so a loose query and Enter never reach Delete first. */
import type { ReactNode } from 'react';
import { filterCommandItems } from './command-palette-model.js';
import type { CommandPaletteItem } from './command-palette-model.js';
import type { ShortcutBinding } from './shortcut-model.js';

/** What a destructive action asks before it runs. */
export interface ActionPanelConfirm {
  /** The question, e.g. "Delete INC-0412?". Default: `ActionPanelLabels.confirmTitle` with the action's label. */
  title?: string;
  /** What happens, e.g. "The ticket and its history are removed. This cannot be undone." Default: `ActionPanelLabels.confirmBody`. */
  description?: string;
  /** The confirming button. Default: the action's label. */
  confirmLabel?: string;
}

/** One action of an item (a ticket row, a card): a row of the action panel, and optionally a key. */
export interface ActionPanelAction {
  /**
   * The command's stable id, e.g. `ticket.assign`. It is also the id the action's `keys` are
   * registered under, so a person's remap, a `MenuItem` / `Button` `shortcutId` hint and a
   * palette item with this `shortcutId` all find it. Namespace it: remaps are kept by id.
   */
  id: string;
  label: string;
  /** The heading it is listed under. Actions without one are listed first, without a heading. */
  group?: string;
  /** More words that find it but are not shown (synonyms, an old name). */
  keywords?: readonly string[];
  /** A second line, e.g. why it is disabled. Not searched. */
  description?: string;
  /** Leading icon (decorative). */
  icon?: ReactNode;
  /**
   * Its own keys, registered in the item's scope (`'A'`, `'Shift+D'`, `'G S'`): they work only
   * while focus is on the item, the `?` sheet lists them there, and the single-key switch and remaps
   * apply (WCAG 2.1.4). The panel shows the keys in force next to the action.
   */
  keys?: ShortcutBinding;
  /** Runs the action. Called after the panel has closed and focus is back on the item. */
  onSelect: () => void;
  /** Shown, not choosable, skipped by the arrow keys; its keys do nothing. */
  disabled?: boolean;
  /** Enter on the item runs it (without opening the panel). At most one; listed first. */
  primary?: boolean;
  /**
   * Removes or breaks something: drawn as a danger row, always listed last, and confirmed before it
   * runs unless it is `undoable`.
   */
  destructive?: boolean;
  /** `onSelect` offers its own undo (e.g. `toast.undoable`), so a destructive action runs without asking. */
  undoable?: boolean;
  /** Ask before running, with these words (`true`: the default words). Default: `true` for a destructive action that is not `undoable`. */
  confirm?: boolean | ActionPanelConfirm;
}

/** A group of found actions, in display order. */
export interface ActionPanelGroup {
  /** The heading; `undefined` for actions without a group (and for the destructive group). */
  label: string | undefined;
  /** The trailing group of destructive actions. */
  destructive: boolean;
  actions: ActionPanelAction[];
}

/** The action Enter runs on the item: the enabled one marked `primary`, else none. */
export function primaryAction(actions: readonly ActionPanelAction[] | null | undefined): ActionPanelAction | null {
  return actions?.find((action) => action.primary && !action.disabled) ?? null;
}

/** Whether choosing `action` asks first: `confirm`, else a destructive action that is not `undoable`. */
export function needsConfirm(action: ActionPanelAction): boolean {
  if (action.confirm != null) return action.confirm !== false;
  return action.destructive === true && action.undoable !== true;
}

const asItem = (action: ActionPanelAction, index: number): CommandPaletteItem & { index: number } => ({
  id: action.id, label: action.label, keywords: action.keywords, group: action.group, index,
});

/**
 * The actions `query` finds, grouped for the panel: with an empty query, the primary action first,
 * then the others in their groups (each group where its first action is, as given), then the
 * destructive ones in a trailing group of their own. With a query, the best matches first (the
 * palette's ranking) and the destructive matches still last.
 */
export function groupActionPanelActions(actions: readonly ActionPanelAction[], query = ''): ActionPanelGroup[] {
  const found = filterCommandItems(actions.map(asItem), query) as (CommandPaletteItem & { index: number })[];
  const ordered = found.map((item) => actions[item.index]);
  const searching = query.trim() !== '';
  const safe = ordered.filter((action) => !action.destructive);
  const danger = ordered.filter((action) => action.destructive);
  // The primary action leads while nothing is typed (Raycast lists it first, with ↵).
  if (!searching) {
    const at = safe.findIndex((action) => action.primary && !action.disabled);
    if (at > 0) safe.unshift(...safe.splice(at, 1));
  }
  const groups: ActionPanelGroup[] = [];
  if (searching) {
    // One flat list in rank order, as Raycast filters across sections.
    if (safe.length) groups.push({ label: undefined, destructive: false, actions: safe });
  } else {
    const byLabel = new Map<string | undefined, ActionPanelGroup>();
    for (const action of safe) {
      // The primary action keeps the lead, outside any heading.
      const label = action.primary && !action.disabled ? undefined : action.group;
      let group = byLabel.get(label);
      if (!group) { group = { label, destructive: false, actions: [] }; byLabel.set(label, group); groups.push(group); }
      group.actions.push(action);
    }
  }
  if (danger.length) groups.push({ label: undefined, destructive: true, actions: danger });
  return groups;
}
