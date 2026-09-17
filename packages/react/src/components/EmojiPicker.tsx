"use client";

import { cloneElement, isValidElement, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, MouseEvent, ReactElement, ReactNode } from 'react';
import { cx } from '../cx.js';
import { Popover } from './Popover.js';
import type { Placement } from '../overlay-position.js';
import {
  DEFAULT_RECENT_KEY, emojiGridMove, loadEmojiData, pushRecentEmoji, readRecentEmoji, searchEmoji,
} from '../emoji-model.js';
import type { EmojiData, EmojiDataLoader, EmojiLocale } from '../emoji-model.js';
import { useEmojiRenderer } from './EmojiGlyph.js';

export interface EmojiPickerLabels {
  /** Accessible name of the picker dialog. */
  dialog: string;
  /** Search field label and placeholder. */
  search: string;
  /** Heading of the recently-used section. */
  recent: string;
  /** Heading of the quick-pick section. */
  quickPicks: string;
  /** Accessible name of the category navigation. */
  categories: string;
  /** Shown when a search matches nothing. */
  noResults: string;
  /** Shown while the emoji data loads. */
  loading: string;
  /** Shown when the emoji data cannot be loaded. */
  loadFailed: string;
}

export const DEFAULT_EMOJI_PICKER_LABELS: EmojiPickerLabels = {
  dialog: 'Choose an emoji',
  search: 'Search emoji',
  recent: 'Recently used',
  quickPicks: 'Frequently used',
  categories: 'Emoji categories',
  noResults: 'No emoji found',
  loading: 'Loading emoji…',
  loadFailed: 'Emoji could not be loaded.',
};

export interface EmojiPickerProps {
  /** Called with the chosen emoji as Unicode text. The picker then closes. */
  onSelect: (emoji: string) => void;
  /** The button that opens the picker. It receives `aria-haspopup`, `aria-expanded` and a click handler. */
  trigger: ReactElement;
  labels?: Partial<EmojiPickerLabels>;
  /** Language of emoji names and search terms. Default `'en'`. */
  locale?: EmojiLocale;
  /** Emoji shown first, before recents and categories. */
  quickPicks?: ReadonlyArray<string>;
  /**
   * Same-origin folder of fallback PNGs for emoji this device cannot draw (see
   * `emojiImageFileName` for the naming). Unset = native emoji only.
   */
  emojiImageBaseUrl?: string;
  /**
   * Replace the emojibase loader (tests, or another bundled dataset). The default loads
   * a bundled chunk through dynamic `import()`; it never fetches a URL.
   */
  loadData?: EmojiDataLoader;
  /** localStorage key for recently used emoji. */
  recentStorageKey?: string;
  placement?: Placement;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

/** Fixed column count; the CSS grid uses the same number. */
export const EMOJI_GRID_COLUMNS = 8;

interface Section {
  key: string;
  title: string;
  emojis: ReadonlyArray<string>;
}

/**
 * Emoji picker in a native popover: search, quick picks, recently used and the
 * Unicode categories, with names in English or German. The emoji dataset loads on
 * first open. The grid is one tab stop; arrow keys, Home and End move within it.
 */
export function EmojiPicker({
  onSelect, trigger, labels: labelOverrides, locale = 'en', quickPicks, loadData = loadEmojiData,
  recentStorageKey = DEFAULT_RECENT_KEY, placement = 'bottom-start', onOpenChange, className, emojiImageBaseUrl,
}: EmojiPickerProps) {
  const renderEmoji = useEmojiRenderer(emojiImageBaseUrl);
  const labels = { ...DEFAULT_EMOJI_PICKER_LABELS, ...labelOverrides };
  const id = useId();
  const popoverId = `${id}-picker`;
  const anchorRef = useRef<HTMLSpanElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const pointerWasOpen = useRef<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<EmojiData | null>(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState<string[]>([]);
  const [active, setActive] = useState(0);

  const popoverEl = () => (typeof document === 'undefined' ? null : document.getElementById(popoverId));
  const isOpen = (el: Element | null | undefined): boolean => {
    try { return !!el?.matches(':popover-open'); } catch { return false; }
  };

  useEffect(() => {
    const el = popoverEl();
    if (!el) return;
    const onToggle = (event: Event) => {
      const { newState } = event as Event & { newState?: string };
      const nowOpen = newState ? newState === 'open' : isOpen(el);
      setOpen(nowOpen);
      onOpenChange?.(nowOpen);
      if (nowOpen) {
        setRecent(readRecentEmoji(recentStorageKey));
        setQuery('');
        setActive(0);
        requestAnimationFrame(() => searchRef.current?.focus());
      } else if (el.contains(document.activeElement) || document.activeElement === document.body) {
        focusTrigger();
      }
    };
    el.addEventListener('toggle', onToggle);
    return () => el.removeEventListener('toggle', onToggle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popoverId, recentStorageKey, onOpenChange]);

  useEffect(() => {
    if (!open || data?.locale === locale) return;
    let live = true;
    setFailed(false);
    loadData(locale).then(
      (loaded) => { if (live) setData(loaded); },
      () => { if (live) setFailed(true); },
    );
    return () => { live = false; };
  }, [open, locale, loadData, data?.locale]);

  const focusTrigger = () => {
    const el = anchorRef.current?.querySelector<HTMLElement>('button, [href], [tabindex]');
    el?.focus();
  };

  const hide = () => {
    const el = popoverEl();
    if (el && isOpen(el)) el.hidePopover();
  };

  const sections: Section[] = useMemo(() => {
    if (query.trim()) {
      return data ? [{ key: 'results', title: labels.search, emojis: searchEmoji(data, query).map((e) => e.emoji) }] : [];
    }
    const list: Section[] = [];
    if (quickPicks?.length) list.push({ key: 'quick', title: labels.quickPicks, emojis: [...new Set(quickPicks)] });
    if (recent.length) list.push({ key: 'recent', title: labels.recent, emojis: recent });
    if (data) {
      data.groups.forEach((group, index) => {
        list.push({ key: group.key, title: group.name, emojis: data.emojis.filter((e) => e.group === index).map((e) => e.emoji) });
      });
    }
    return list;
  }, [query, data, quickPicks, recent, labels.search, labels.quickPicks, labels.recent]);

  const flat = useMemo(() => sections.flatMap((s) => s.emojis), [sections]);
  const sectionStart = useMemo(() => {
    const starts = new Map<string, number>();
    let at = 0;
    for (const section of sections) { starts.set(section.key, at); at += section.emojis.length; }
    return starts;
  }, [sections]);
  const activeIndex = Math.min(active, Math.max(flat.length - 1, 0));

  const choose = (emoji: string) => {
    setRecent(pushRecentEmoji(emoji, recentStorageKey));
    onSelect(emoji);
    hide();
  };

  const focusCell = useCallback((index: number) => {
    setActive(index);
    const find = () => gridRef.current?.querySelector<HTMLButtonElement>(`[data-emoji-index="${index}"]`);
    // Move now when the cell is rendered, so a fast Enter acts on it; otherwise after the next render.
    const cell = find();
    if (cell) cell.focus();
    else requestAnimationFrame(() => find()?.focus());
  }, []);

  const onGridKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const index = Number(target.dataset.emojiIndex ?? -1);
    if (index < 0) return;
    const next = emojiGridMove(index, event.key, flat.length, EMOJI_GRID_COLUMNS);
    if (event.key === 'ArrowUp' && next === null) {
      event.preventDefault();
      searchRef.current?.focus();
      return;
    }
    if (next === null) return;
    event.preventDefault();
    focusCell(next);
  };

  const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // A search field consumes Escape to clear itself; in the picker Escape always closes.
    if (event.key === 'Escape') {
      event.preventDefault();
      hide();
    } else if (event.key === 'ArrowDown' && flat.length) {
      event.preventDefault();
      focusCell(0);
    } else if (event.key === 'Enter' && query.trim() && flat[0]) {
      event.preventDefault();
      choose(flat[0]);
    }
  };

  const toggleFromTrigger = (event: MouseEvent<HTMLElement>) => {
    const el = popoverEl();
    if (!el || event.defaultPrevented) return;
    const was = pointerWasOpen.current;
    pointerWasOpen.current = null;
    // A pointer press outside an open auto popover already closed it (light dismiss).
    if (was === true) return;
    if (isOpen(el)) el.hidePopover();
    else el.showPopover();
  };

  const triggerProps = isValidElement(trigger) ? (trigger.props as Record<string, unknown>) : {};
  const triggerEl = isValidElement(trigger)
    ? cloneElement(trigger as ReactElement<Record<string, unknown>>, {
        'aria-haspopup': 'dialog',
        'aria-expanded': open,
        'aria-controls': popoverId,
        onPointerDown: (event: MouseEvent<HTMLElement>) => {
          pointerWasOpen.current = isOpen(popoverEl());
          (triggerProps.onPointerDown as ((e: MouseEvent<HTMLElement>) => void) | undefined)?.(event);
        },
        onClick: (event: MouseEvent<HTMLElement>) => {
          (triggerProps.onClick as ((e: MouseEvent<HTMLElement>) => void) | undefined)?.(event);
          toggleFromTrigger(event);
        },
      })
    : trigger;

  const names = data?.names;
  let offset = 0;
  const status: ReactNode = failed
    ? labels.loadFailed
    : !data && open
      ? labels.loading
      : query.trim() && data && flat.length === 0
        ? labels.noResults
        : '';

  return (
    <span ref={anchorRef} className={cx('uix-emoji-picker__anchor', className)}>
      {triggerEl}
      <Popover
        id={popoverId}
        anchor={anchorRef}
        placement={placement}
        className="uix-emoji-picker-popover"
        role="dialog"
        aria-label={labels.dialog}
      >
        {open ? (
          <div className="uix-emoji-picker uix-emoji-picker--full" lang={locale}>
            <input
              ref={searchRef}
              type="search"
              className="uix-input uix-emoji-picker__search"
              aria-label={labels.search}
              placeholder={labels.search}
              value={query}
              onChange={(event) => { setQuery(event.target.value); setActive(0); }}
              onKeyDown={onSearchKeyDown}
              autoComplete="off"
              spellCheck={false}
            />
            {data && !query.trim() ? (
              <div className="uix-emoji-picker__nav" role="group" aria-label={labels.categories}>
                {sections.map((section) => (
                  <button
                    key={section.key}
                    type="button"
                    className="uix-emoji-picker__nav-btn"
                    aria-label={section.title}
                    title={section.title}
                    onClick={() => {
                      const start = section.emojis.length ? sectionStart.get(section.key) ?? -1 : -1;
                      gridRef.current?.querySelector(`[data-section="${section.key}"]`)?.scrollIntoView({ block: 'start' });
                      if (start >= 0) focusCell(start);
                    }}
                  >
                    <span aria-hidden="true">{section.emojis[0] ? renderEmoji(section.emojis[0]) : null}</span>
                  </button>
                ))}
              </div>
            ) : null}
            <div className="uix-emoji-picker__grid" ref={gridRef} onKeyDown={onGridKeyDown}>
              {sections.map((section) => {
                const start = offset;
                offset += section.emojis.length;
                if (!section.emojis.length) return null;
                const headingId = `${id}-${section.key}`;
                return (
                  <section key={section.key} className="uix-emoji-picker__section" data-section={section.key} aria-labelledby={headingId}>
                    <h3 id={headingId} className="uix-emoji-picker__heading">{section.title}</h3>
                    <div className="uix-emoji-picker__cells" role="group" aria-labelledby={headingId}>
                      {section.emojis.map((emoji, i) => {
                        const index = start + i;
                        return (
                          <button
                            key={`${section.key}-${emoji}`}
                            type="button"
                            className="uix-emoji-picker__btn"
                            data-emoji-index={index}
                            tabIndex={index === activeIndex ? 0 : -1}
                            aria-label={names?.get(emoji) ?? emoji}
                            title={names?.get(emoji)}
                            onClick={() => choose(emoji)}
                            onFocus={() => setActive(index)}
                          >
                            {renderEmoji(emoji)}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
            <p className="uix-emoji-picker__status" role="status">{status}</p>
          </div>
        ) : null}
      </Popover>
    </span>
  );
}
