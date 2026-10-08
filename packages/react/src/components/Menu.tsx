"use client";

import { cloneElement, createContext, isValidElement, useContext, useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent, MouseEvent, ReactElement, ReactNode } from 'react';
import { cx } from '../cx.js';
import { Popover } from './Popover.js';
import { CheckIcon } from '../icons/components.js';
import { renderUixLink } from '../link.js';
import type { UixRenderLink } from '../link.js';
import type { Placement } from '../overlay-position.js';

interface MenuContextValue { close: (refocus: boolean) => void }
const MenuContext = createContext<MenuContextValue | null>(null);

interface MenuRadioContextValue { value: string | undefined; onValueChange?: (value: string) => void }
const MenuRadioContext = createContext<MenuRadioContextValue | null>(null);

/** `menuitem`, `menuitemradio` and `menuitemcheckbox`. */
const ITEM = '[role^="menuitem"]:not([aria-disabled="true"])';

/** `id` and `data-*` for the item's own element (HAR-1629): a stable hook for tests, journeys and analytics. */
export interface MenuItemAttributes {
  id?: string;
  [dataAttribute: `data-${string}`]: string | number | boolean | undefined;
}

const itemAttributes = (rest: Record<string, unknown>): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(rest)) if (key === 'id' || key.startsWith('data-')) out[key] = rest[key];
  return out;
};

export interface MenuProps {
  /**
   * The menu button, usually a `Button`. It receives `aria-haspopup="menu"`,
   * `aria-expanded`, `aria-controls` and the open/keyboard handlers.
   */
  trigger: ReactElement;
  /** `MenuItem`, `MenuItemRadio`, `MenuItemCheckbox`, `MenuRadioGroup`, `MenuGroup` and `MenuSeparator`. */
  children?: ReactNode;
  /** Controlled open state; pair with `onOpenChange`. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Accessible name of the menu. Default: labelled by the trigger. */
  label?: string;
  placement?: Placement;
  className?: string;
}

/**
 * A menu button with an APG menu (HAR-1359; TENSOR C1, MOTUS B-A14): ↓/↑ move, Home/End,
 * type-to-find, Enter/Space activate, Esc and Tab close, focus returns to the trigger.
 * The surface is the kit `Popover`, so it escapes clipping containers; a menu taller than
 * the viewport is capped to it and scrolls (HAR-1613).
 */
export function Menu({ trigger, children, open: controlledOpen, defaultOpen = false, onOpenChange, label, placement = 'bottom-start', className }: MenuProps) {
  const id = useId();
  const menuId = `${id}-menu`;
  const triggerId = `${id}-trigger`;
  const triggerRef = useRef<HTMLElement | null>(null);
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = controlledOpen ?? internalOpen;
  /** Which item gets focus when the menu opens. */
  const focusOnOpen = useRef<'first' | 'last'>('first');
  const typeahead = useRef({ text: '', at: 0 });

  const setOpen = (next: boolean) => {
    if (controlledOpen === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  };
  const menu = () => document.getElementById(menuId);
  const items = (): HTMLElement[] => Array.from(menu()?.querySelectorAll<HTMLElement>(ITEM) ?? []);
  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  };

  useEffect(() => {
    const el = menu();
    if (!el) return;
    const shown = () => { try { return el.matches(':popover-open'); } catch { return false; } };
    if (!open) {
      if (shown()) { try { el.hidePopover(); } catch { /* closed */ } }
      return;
    }
    if (!shown()) { try { el.showPopover(); } catch { /* unsupported */ } }
    const list = items();
    // Opens on the checked radio item when there is one, as a native select opens on its value.
    const start = focusOnOpen.current === 'last'
      ? list[list.length - 1]
      : (list.find((item) => item.getAttribute('role') === 'menuitemradio' && item.getAttribute('aria-checked') === 'true') ?? list[0]);
    start?.focus();
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (el.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer, true);
    return () => document.removeEventListener('pointerdown', onPointer, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, menuId]);

  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const list = items();
    const index = list.indexOf(document.activeElement as HTMLElement);
    const move = (to: number) => { event.preventDefault(); list[(to + list.length) % list.length]?.focus(); };
    if (event.key === 'ArrowDown') move(index + 1);
    else if (event.key === 'ArrowUp') move(index - 1);
    else if (event.key === 'Home') move(0);
    else if (event.key === 'End') move(list.length - 1);
    else if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(true); }
    else if (event.key === 'Tab') close(false);
    else if (event.key.length === 1 && /\S/.test(event.key) && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const now = Date.now();
      typeahead.current = { text: now - typeahead.current.at > 600 ? event.key.toLowerCase() : typeahead.current.text + event.key.toLowerCase(), at: now };
      const start = index + (typeahead.current.text.length === 1 ? 1 : 0);
      const order = [...list.slice(start), ...list.slice(0, start)];
      order.find((item) => (item.textContent ?? '').trim().toLowerCase().startsWith(typeahead.current.text))?.focus();
    }
  };

  const triggerProps = isValidElement(trigger) ? (trigger.props as Record<string, unknown>) : {};
  const triggerElement = isValidElement(trigger) ? cloneElement(trigger as ReactElement<Record<string, unknown>>, {
    ref: (node: HTMLElement | null) => { triggerRef.current = node; },
    id: (triggerProps.id as string | undefined) ?? triggerId,
    'aria-haspopup': 'menu',
    'aria-expanded': open,
    'aria-controls': open ? menuId : undefined,
    onClick: (event: MouseEvent<HTMLElement>) => {
      (triggerProps.onClick as ((e: MouseEvent<HTMLElement>) => void) | undefined)?.(event);
      if (event.defaultPrevented) return;
      focusOnOpen.current = 'first';
      setOpen(!open);
    },
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      (triggerProps.onKeyDown as ((e: KeyboardEvent<HTMLElement>) => void) | undefined)?.(event);
      if (event.defaultPrevented) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        focusOnOpen.current = event.key === 'ArrowUp' ? 'last' : 'first';
        if (open) { const list = items(); (focusOnOpen.current === 'last' ? list[list.length - 1] : list[0])?.focus(); }
        else setOpen(true);
      } else if (open && event.key === 'Escape') {
        // Focus is still here when the menu has nothing to focus (every item disabled, or none).
        event.preventDefault();
        event.stopPropagation();
        close(true);
      } else if (open && event.key === 'Tab') {
        close(false);
      }
    },
  }) : trigger;

  return (
    <MenuContext.Provider value={{ close }}>
      {triggerElement}
      <Popover
        id={menuId}
        popover="manual"
        anchor={triggerRef}
        placement={placement}
        capHeight
        role="menu"
        aria-label={label}
        aria-labelledby={label ? undefined : ((triggerProps.id as string | undefined) ?? triggerId)}
        className={cx('uix-menu', className)}
        onKeyDown={onMenuKeyDown}
      >
        {open ? children : null}
      </Popover>
    </MenuContext.Provider>
  );
}

export interface MenuItemProps extends MenuItemAttributes {
  children?: ReactNode;
  /** Runs on click, Enter or Space; the menu then closes and focus returns to the trigger. */
  onSelect?: () => void;
  /** A link item; it navigates instead of running `onSelect`. */
  href?: string;
  renderLink?: UixRenderLink;
  icon?: ReactNode;
  /** Shortcut hint at the end of the row, e.g. `<KbdCombo keys={['Mod', 'D']} />`. */
  shortcut?: ReactNode;
  tone?: 'default' | 'danger';
  disabled?: boolean;
  className?: string;
}

export function MenuItem({ children, onSelect, href, renderLink, icon, shortcut, tone = 'default', disabled, className, ...rest }: MenuItemProps) {
  const menu = useContext(MenuContext);
  const classes = cx('uix-menu__item', tone === 'danger' && 'uix-menu__item--danger', className);
  const attributes = itemAttributes(rest);
  const body = (
    <>
      {icon != null && <span className="uix-menu__icon" aria-hidden="true">{icon}</span>}
      <span className="uix-menu__text">{children}</span>
      {shortcut != null && <span className="uix-menu__shortcut">{shortcut}</span>}
    </>
  );
  if (href != null && !disabled) {
    return <>{renderUixLink(renderLink, { ...attributes, href, role: 'menuitem', tabIndex: -1, className: classes, onClick: () => menu?.close(false), children: body })}</>;
  }
  return (
    <button
      {...attributes}
      type="button"
      role="menuitem"
      tabIndex={-1}
      className={classes}
      aria-disabled={disabled || undefined}
      onClick={() => {
        if (disabled) return;
        onSelect?.();
        menu?.close(true);
      }}
    >
      {body}
    </button>
  );
}

interface CheckableItemProps extends MenuItemAttributes {
  children?: ReactNode;
  icon?: ReactNode;
  shortcut?: ReactNode;
  disabled?: boolean;
  className?: string;
}

/** One row with a check column: the shared body of `MenuItemRadio` and `MenuItemCheckbox`. */
function CheckableItem({
  role, checked, onToggle, closeOnSelect, children, icon, shortcut, disabled, className, ...rest
}: CheckableItemProps & { role: 'menuitemradio' | 'menuitemcheckbox'; checked: boolean; onToggle: () => void; closeOnSelect: boolean }) {
  const menu = useContext(MenuContext);
  return (
    <button
      {...itemAttributes(rest)}
      type="button"
      role={role}
      aria-checked={checked}
      tabIndex={-1}
      className={cx('uix-menu__item', className)}
      aria-disabled={disabled || undefined}
      onKeyDown={(event) => {
        // APG: Space changes the state and leaves the menu open; Enter (a click) may close it.
        if (event.key !== ' ' || disabled) return;
        event.preventDefault();
        onToggle();
      }}
      onKeyUp={(event) => { if (event.key === ' ') event.preventDefault(); }}
      onClick={() => {
        if (disabled) return;
        onToggle();
        if (closeOnSelect) menu?.close(true);
      }}
    >
      <span className="uix-menu__check" aria-hidden="true">{checked && <CheckIcon />}</span>
      {icon != null && <span className="uix-menu__icon" aria-hidden="true">{icon}</span>}
      <span className="uix-menu__text">{children}</span>
      {shortcut != null && <span className="uix-menu__shortcut">{shortcut}</span>}
    </button>
  );
}

export interface MenuRadioGroupProps {
  /** The `value` of the checked `MenuItemRadio`. */
  value?: string;
  onValueChange?: (value: string) => void;
  /** Visible group heading; it also names the group. */
  label?: ReactNode;
  /** Names the group when there is no visible `label`. */
  'aria-label'?: string;
  children?: ReactNode;
}

/** One choice out of several inside a `Menu`: wraps `MenuItemRadio` rows and holds their value (HAR-1629). */
export function MenuRadioGroup({ value, onValueChange, label, 'aria-label': ariaLabel, children }: MenuRadioGroupProps) {
  const id = useId();
  return (
    <MenuRadioContext.Provider value={{ value, onValueChange }}>
      <div role="group" aria-labelledby={label != null ? id : undefined} aria-label={label != null ? undefined : ariaLabel}>
        {label != null && <div id={id} className="uix-menu__label">{label}</div>}
        {children}
      </div>
    </MenuRadioContext.Provider>
  );
}

export interface MenuItemRadioProps extends MenuItemAttributes {
  /** Checked when it equals the surrounding `MenuRadioGroup`'s `value`. */
  value: string;
  /** For a radio item used without a `MenuRadioGroup`. */
  checked?: boolean;
  /** Runs when the item is chosen, after the group's `onValueChange`. */
  onSelect?: () => void;
  /** Close the menu after a click or Enter. Default `true`. Space never closes it. */
  closeOnSelect?: boolean;
  children?: ReactNode;
  icon?: ReactNode;
  shortcut?: ReactNode;
  disabled?: boolean;
  className?: string;
}

/** A `role="menuitemradio"` row with `aria-checked` and a check mark for the current choice. */
export function MenuItemRadio({ value, checked, onSelect, closeOnSelect = true, ...rest }: MenuItemRadioProps) {
  const group = useContext(MenuRadioContext);
  return (
    <CheckableItem
      {...rest}
      role="menuitemradio"
      checked={checked ?? (group != null && group.value === value)}
      closeOnSelect={closeOnSelect}
      onToggle={() => { group?.onValueChange?.(value); onSelect?.(); }}
    />
  );
}

export interface MenuItemCheckboxProps extends MenuItemAttributes {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  /** Close the menu after a click or Enter. Default `false`: several boxes are usually ticked in a row. */
  closeOnSelect?: boolean;
  children?: ReactNode;
  icon?: ReactNode;
  shortcut?: ReactNode;
  disabled?: boolean;
  className?: string;
}

/** A `role="menuitemcheckbox"` row with `aria-checked`; the menu stays open while boxes are ticked. */
export function MenuItemCheckbox({ checked, onCheckedChange, closeOnSelect = false, ...rest }: MenuItemCheckboxProps) {
  return (
    <CheckableItem
      {...rest}
      role="menuitemcheckbox"
      checked={checked}
      closeOnSelect={closeOnSelect}
      onToggle={() => onCheckedChange?.(!checked)}
    />
  );
}

export interface MenuGroupProps {
  label: ReactNode;
  children?: ReactNode;
}

export function MenuGroup({ label, children }: MenuGroupProps) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id}>
      <div id={id} className="uix-menu__label">{label}</div>
      {children}
    </div>
  );
}

export function MenuSeparator() {
  return <div role="separator" className="uix-menu__sep" />;
}
