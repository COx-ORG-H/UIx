"use client";

import { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, HTMLAttributes, KeyboardEvent, ReactNode } from 'react';
import { cx } from '../cx.js';
import { renderUixLink } from '../link.js';
import type { UixRenderLink } from '../link.js';

interface SegmentedContextValue {
  value?: string;
  onChange?: (value: string) => void;
  /** Inside a `Segmented`: options are one tab stop, in `selection` mode. */
  selection?: 'toggle' | 'radio' | 'link';
  renderLink?: UixRenderLink;
}

const SegmentedCtx = createContext<SegmentedContextValue>({});

const OPTION = '.uix-segmented__option';

export interface SegmentedProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** The currently-selected option value. */
  value?: string;
  /** Fires with the option's value when a different option is chosen. */
  onChange?: (value: string) => void;
  /**
   * How the choice is exposed to assistive technology (HAR-1604).
   * `'toggle'` (default): `role="group"` of buttons with `aria-pressed`, for a view or filter
   * toggle bar. `'radio'`: `role="radiogroup"` of `role="radio"` with `aria-checked`, for a
   * setting with exactly one value (theme, density, language). Name the group with
   * `aria-label` or `aria-labelledby` in either mode. The keyboard model is the same in both.
   *
   * `'link'` (HAR-1380): navigation, not a choice, such as a language switcher where each
   * option is a URL. A `<nav>` (named by your `aria-label`) around a list of links, each
   * option needs an `href`, and the one whose `value` is `value` carries `aria-current="page"`.
   * The same pill look; every link is its own tab stop and Enter follows it, like any nav.
   */
  selection?: 'toggle' | 'radio' | 'link';
  /** `selection="link"`: renders each option's link with your router. Default: `<a>`. */
  renderLink?: UixRenderLink;
  children?: ReactNode;
}

/**
 * Segmented single-select over `.uix-segmented` — the compact 2–3 way toggle
 * (density, audience, view mode …) that reads as one pill with a lifted active
 * segment. Selection state is shared with `<SegmentedOption>` via context, so
 * the caller only wires `value` + `onChange` once.
 *
 * Keyboard (HAR-1604): the group is ONE tab stop, on the selected option (the first enabled
 * one when nothing is selected). Arrow Right/Down and Left/Up move to the next / previous
 * enabled option and select it, wrapping at the ends; Home and End jump; Left/Right swap in
 * a right-to-left group. Before 2.32.0 every option was its own tab stop.
 */
export function Segmented({ value, onChange, selection = 'toggle', renderLink, children, className, onKeyDown, ...props }: SegmentedProps) {
  const ref = useRef<HTMLDivElement>(null);
  const contextValue = useMemo(() => ({ value, onChange, selection, renderLink }), [value, onChange, selection, renderLink]);

  // Roving tabindex, enforced on the DOM after every render like Tabs: exactly one tab stop —
  // the selected enabled option, else the first enabled one (with no selection every option
  // renders tabIndex -1, which would make the group unreachable).
  useEffect(() => {
    const group = ref.current;
    if (!group || selection === 'link') return;
    const all = Array.from(group.querySelectorAll<HTMLButtonElement>(OPTION));
    const enabled = all.filter((o) => !o.disabled);
    const current = enabled.find((o) => o.getAttribute('aria-pressed') === 'true' || o.getAttribute('aria-checked') === 'true') ?? enabled[0];
    for (const o of all) o.tabIndex = o === current ? 0 : -1;
  });

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    const group = ref.current;
    const from = (event.target as HTMLElement).closest<HTMLButtonElement>(OPTION);
    if (!group || !from || !group.contains(from)) return;
    const options = Array.from(group.querySelectorAll<HTMLButtonElement>(`${OPTION}:not(:disabled)`));
    const index = options.indexOf(from);
    if (index < 0) return;
    const rtl = getComputedStyle(group).direction === 'rtl';
    let next: number;
    switch (event.key) {
      case 'ArrowDown': next = index + 1; break;
      case 'ArrowUp': next = index - 1; break;
      case 'ArrowRight': next = index + (rtl ? -1 : 1); break;
      case 'ArrowLeft': next = index + (rtl ? 1 : -1); break;
      case 'Home': next = 0; break;
      case 'End': next = options.length - 1; break;
      default: return;
    }
    event.preventDefault();
    // Ours: a surrounding toolbar or menu must not also move on the same key.
    event.stopPropagation();
    const target = options[(next + options.length) % options.length];
    if (!target || target === from) return;
    target.focus();
    target.click();
  };

  if (selection === 'link') {
    // Navigation: a named <nav> around a plain list of links; Tab moves between them.
    return (
      <SegmentedCtx.Provider value={contextValue}>
        <nav className={cx('uix-segmented-nav', className)} onKeyDown={onKeyDown} {...props}>
          <ul className="uix-segmented" role="list">{children}</ul>
        </nav>
      </SegmentedCtx.Provider>
    );
  }

  return (
    <SegmentedCtx.Provider value={contextValue}>
      <div ref={ref} role={selection === 'radio' ? 'radiogroup' : 'group'} className={cx('uix-segmented', className)} onKeyDown={handleKeyDown} {...props}>
        {children}
      </div>
    </SegmentedCtx.Provider>
  );
}

export interface SegmentedOptionProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'value' | 'onChange'> {
  value: string;
  /** In a `selection="link"` group: where the option goes. Required there, ignored otherwise. */
  href?: string;
  /** In a `selection="link"` group: the target's language, e.g. `de` on a locale switcher. */
  hrefLang?: string;
  children?: ReactNode;
}

/**
 * One option in a `<Segmented>`. Active state is derived from the parent's
 * `value`; the selected segment lifts to the surface via
 * `.uix-segmented__option[aria-pressed="true"]` (or `[aria-checked="true"]` in a
 * `selection="radio"` group).
 */
export function SegmentedOption({
  value,
  href,
  hrefLang,
  children,
  className,
  onClick,
  ...props
}: SegmentedOptionProps) {
  const ctx = useContext(SegmentedCtx);
  const selected = ctx.value === value;
  const radio = ctx.selection === 'radio';
  if (ctx.selection === 'link') {
    // Button-only attributes have no meaning on a link; everything else (lang, aria-label, data-*) passes.
    const { type: _type, disabled: _disabled, form: _form, formAction: _formAction, name: _name, ...linkProps } = props;
    return (
      <li>
        {renderUixLink(ctx.renderLink, {
          ...(linkProps as AnchorHTMLAttributes<HTMLAnchorElement>),
          href: href ?? '#',
          hrefLang,
          className: cx('uix-segmented__option', className),
          'aria-current': selected ? 'page' : undefined,
          onClick: (event) => {
            ctx.onChange?.(value);
            (onClick as AnchorHTMLAttributes<HTMLAnchorElement>['onClick'])?.(event);
          },
          children,
        })}
      </li>
    );
  }
  return (
    <button
      type="button"
      role={radio ? 'radio' : undefined}
      className={cx('uix-segmented__option', className)}
      aria-pressed={radio ? undefined : selected}
      aria-checked={radio ? selected : undefined}
      // One tab stop per group; `Segmented` moves it to the first option when none is selected.
      tabIndex={ctx.selection ? (selected ? 0 : -1) : undefined}
      onClick={(e) => {
        ctx.onChange?.(value);
        onClick?.(e);
      }}
      {...props}
    >
      {children}
    </button>
  );
}

export interface LocaleSwitcherLocale {
  /** BCP 47 code: `de`, `bs`, `en-GB`. Sets the link's `lang` and `hreflang`. */
  code: string;
  /** What the option shows: "Deutsch", or a short "DE". */
  label: ReactNode;
  /** This page in that language. */
  href: string;
}

export interface LocaleSwitcherProps extends Omit<HTMLAttributes<HTMLElement>, 'children' | 'onChange'> {
  /** One link per language, in the order shown. */
  locales: readonly LocaleSwitcherLocale[];
  /** The code of the page's language; that link is `aria-current="page"`. */
  current: string;
  /** Names the navigation, in the page's language: "Language", "Sprache". */
  label: string;
  /** Renders each link with your router (locale-aware links keep client navigation). */
  renderLink?: UixRenderLink;
}

/**
 * A language switcher (HAR-1380; MOTUS C-12): a `Segmented selection="link"` whose links carry
 * `lang` and `hreflang`, so each language's name is read in that language.
 */
export function LocaleSwitcher({ locales, current, label, renderLink, ...props }: LocaleSwitcherProps) {
  return (
    <Segmented selection="link" value={current} aria-label={label} renderLink={renderLink} {...props}>
      {locales.map((locale) => (
        <SegmentedOption key={locale.code} value={locale.code} href={locale.href} hrefLang={locale.code} lang={locale.code}>
          {locale.label}
        </SegmentedOption>
      ))}
    </Segmented>
  );
}
