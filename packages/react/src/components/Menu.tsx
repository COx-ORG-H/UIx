"use client";

import { cloneElement, createContext, isValidElement, useContext, useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent, MouseEvent, ReactElement, ReactNode } from 'react';
import { cx } from '../cx.js';
import { Popover } from './Popover.js';
import { renderUixLink } from '../link.js';
import type { UixRenderLink } from '../link.js';
import type { Placement } from '../overlay-position.js';

interface MenuContextValue { close: (refocus: boolean) => void }
const MenuContext = createContext<MenuContextValue | null>(null);

const ITEM = '[role="menuitem"]:not([aria-disabled="true"])';

export interface MenuProps {
  /**
   * The menu button, usually a `Button`. It receives `aria-haspopup="menu"`,
   * `aria-expanded`, `aria-controls` and the open/keyboard handlers.
   */
  trigger: ReactElement;
  /** `MenuItem`, `MenuGroup` and `MenuSeparator`. */
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
 * The surface is the kit `Popover`, so it escapes clipping containers.
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
    (focusOnOpen.current === 'last' ? list[list.length - 1] : list[0])?.focus();
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

export interface MenuItemProps {
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

export function MenuItem({ children, onSelect, href, renderLink, icon, shortcut, tone = 'default', disabled, className }: MenuItemProps) {
  const menu = useContext(MenuContext);
  const classes = cx('uix-menu__item', tone === 'danger' && 'uix-menu__item--danger', className);
  const body = (
    <>
      {icon != null && <span className="uix-menu__icon" aria-hidden="true">{icon}</span>}
      <span className="uix-menu__text">{children}</span>
      {shortcut != null && <span className="uix-menu__shortcut">{shortcut}</span>}
    </>
  );
  if (href != null && !disabled) {
    return <>{renderUixLink(renderLink, { href, role: 'menuitem', tabIndex: -1, className: classes, onClick: () => menu?.close(false), children: body })}</>;
  }
  return (
    <button
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
