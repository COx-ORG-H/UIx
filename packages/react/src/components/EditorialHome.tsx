import type { ReactNode, HTMLAttributes, ButtonHTMLAttributes } from 'react';
import { cx } from '../cx.js';

/*
 * Editorial-home kit — the intranet "editorial" landing patterns (INTRA-04),
 * thin wrappers over the `.uix-*` classes in editorial-home.css. All of these
 * are presentational and router-free: navigation, data, and behaviour (which
 * story is featured, what the search does) belong to the consumer, passed in
 * through ReactNode slots and standard DOM handlers.
 */

/* ── PageIntro ────────────────────────────────────────────────────────────── */

export interface PageIntroProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** Small line above the title (e.g. today's date). */
  kicker?: ReactNode;
  title: ReactNode;
  /** Supporting copy under the title. */
  lede?: ReactNode;
  /** Label shown above the search well. */
  searchLabel?: ReactNode;
  /** The search well itself (form + `.uix-searchbar` markup, or `SearchBar`-style composition). */
  search?: ReactNode;
  /** Shortcut buttons; rendered inside the `.uix-shortcut-grid` full-width row. */
  shortcuts?: ReactNode;
  /** Accessible label for the shortcuts group. */
  shortcutsLabel?: string;
}

/**
 * Editorial page intro — kicker / title / lede beside a search well, with an
 * optional full-width shortcut grid underneath (`.uix-page-intro`).
 */
export function PageIntro({
  kicker, title, lede, searchLabel, search, shortcuts, shortcutsLabel, className, children, ...props
}: PageIntroProps) {
  return (
    <section className={cx('uix-page-intro', className)} {...props}>
      <div>
        {kicker != null && <p className="uix-page-kicker">{kicker}</p>}
        <h1 className="uix-page-title">{title}</h1>
        {lede != null && <p className="uix-page-lede">{lede}</p>}
      </div>
      {search != null && (
        <div>
          {searchLabel != null && <p className="uix-intro-search__label">{searchLabel}</p>}
          {search}
        </div>
      )}
      {shortcuts != null && (
        <div className="uix-shortcut-grid" aria-label={shortcutsLabel}>{shortcuts}</div>
      )}
      {children}
    </section>
  );
}

/* ── SectionHead ──────────────────────────────────────────────────────────── */

export interface SectionHeadProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title: ReactNode;
  /** id for the `<h2>`, for `aria-labelledby` wiring on the enclosing section. */
  titleId?: string;
  /** Right-aligned slot — a `.uix-section-link` anchor, a button, a pill. */
  action?: ReactNode;
}

/** Section head — title row with an optional trailing action (`.uix-section-head`). */
export function SectionHead({ title, titleId, action, className, ...props }: SectionHeadProps) {
  return (
    <div className={cx('uix-section-head', className)} {...props}>
      <h2 className="uix-section-title" id={titleId}>{title}</h2>
      {action}
    </div>
  );
}

/* ── NoticeQueue ──────────────────────────────────────────────────────────── */

export interface NoticeQueueProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** Leading icon slot. */
  icon?: ReactNode;
  /** Bolded lead-in of the notice copy. */
  title?: ReactNode;
  /** Rest of the notice copy, after the title. */
  summary?: ReactNode;
  /** Meta line under the copy (e.g. "Needs action · Required by Friday"). */
  meta?: ReactNode;
  /** Queue position (e.g. "1 of 4 important updates"). */
  position?: ReactNode;
  /**
   * Trailing controls — previous/next arrows (put `uix-notice__arrow--previous`
   * on the previous button to flip its icon), read/view-all buttons.
   */
  actions?: ReactNode;
}

/**
 * Notice queue — the rotating "important updates" banner (`.uix-notice`). The
 * copy region is `aria-live="polite"` so queue rotation is announced.
 */
export function NoticeQueue({ icon, title, summary, meta, position, actions, className, ...props }: NoticeQueueProps) {
  return (
    <section className={cx('uix-notice', className)} {...props}>
      {icon}
      <div className="uix-notice__content" aria-live="polite">
        <p className="uix-notice__copy">
          {title != null && <strong>{title}</strong>}
          {title != null && summary != null && ' '}
          {summary}
        </p>
        {meta != null && <p className="uix-notice__meta">{meta}</p>}
      </div>
      {(position != null || actions != null) && (
        <div className="uix-notice__actions">
          {position != null && <span className="uix-notice__position">{position}</span>}
          {actions}
        </div>
      )}
    </section>
  );
}

/* ── FeaturedStage ────────────────────────────────────────────────────────── */

export interface FeaturedStageProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** Decorative visual (story signal + diagram). Hidden from AT unless `visualLabel` is set. */
  visual?: ReactNode;
  /** Accessible description of the visual; when set the visual gets `role="img"`. */
  visualLabel?: string;
  /**
   * Ordinal of the story on stage (e.g. "01"), rendered as the filled
   * `.uix-featured__now` chip in the eyebrow. Pair it with the matching
   * `FeaturedRundownItem`'s `number` — the selected item's number renders as
   * the same chip, and that pairing is what links rundown to stage on every
   * breakpoint (the divider caret only exists while the zones sit side by side).
   */
  ordinal?: ReactNode;
  eyebrow?: ReactNode;
  title: ReactNode;
  /** id for the `<h2>` title, for `aria-labelledby` wiring. */
  titleId?: string;
  description?: ReactNode;
  meta?: ReactNode;
  /** Call-to-action slot under the meta line. */
  action?: ReactNode;
}

/**
 * Featured stage — the hero story zone of the featured briefing
 * (`.uix-featured__stage`). The briefing is ONE `.uix-featured` card: put this
 * and `FeaturedRundown` directly inside it and the internal hairline, the
 * selected item's caret, and the ordinal chips connect the two zones. Content
 * is `aria-live="polite"` so swapping the featured story (from the rundown)
 * is announced.
 */
export function FeaturedStage({
  visual, visualLabel, ordinal, eyebrow, title, titleId, description, meta, action, className, ...props
}: FeaturedStageProps) {
  return (
    <article className={cx('uix-featured__stage', className)} {...props}>
      <div
        className="uix-featured__visual"
        role={visualLabel != null ? 'img' : undefined}
        aria-label={visualLabel}
        aria-hidden={visualLabel == null || undefined}
      >
        {visual}
      </div>
      <div className="uix-featured__content" aria-live="polite">
        {(eyebrow != null || ordinal != null) && (
          <p className="uix-featured__eyebrow">
            {ordinal != null && <span className="uix-featured__now">{ordinal}</span>}
            {eyebrow}
          </p>
        )}
        <h2 className="uix-featured__title" id={titleId}>{title}</h2>
        {description != null && <p className="uix-featured__description">{description}</p>}
        {meta != null && <p className="uix-featured__meta">{meta}</p>}
        {action}
      </div>
    </article>
  );
}

/* ── FeaturedRundown ──────────────────────────────────────────────────────── */

export interface FeaturedRundownProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** Uppercase line above the title (e.g. "Editorial briefing"). */
  eyebrow?: ReactNode;
  title: ReactNode;
  /** id for the `<h2>` title, for `aria-labelledby` wiring. */
  titleId?: string;
  /** Trailing head slot (e.g. a count pill). */
  meta?: ReactNode;
  /** `FeaturedRundownItem`s. */
  children?: ReactNode;
}

/**
 * Featured rundown — the story-list zone of the featured briefing
 * (`.uix-rundown`), sitting inside the single `.uix-featured` card beside (or,
 * stacked, below) the `FeaturedStage`.
 */
export function FeaturedRundown({ eyebrow, title, titleId, meta, children, className, ...props }: FeaturedRundownProps) {
  return (
    <aside className={cx('uix-rundown', className)} {...props}>
      <div className="uix-rundown__head">
        <div>
          {eyebrow != null && <p className="uix-rundown__eyebrow">{eyebrow}</p>}
          <h2 className="uix-rundown__title" id={titleId}>{title}</h2>
        </div>
        {meta}
      </div>
      <div className="uix-rundown__items">{children}</div>
    </aside>
  );
}

export interface FeaturedRundownItemProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'title'> {
  /** Ordinal label (e.g. "01"). */
  number?: ReactNode;
  /** Topic/duration line above the item title (e.g. "Company · 5 min"). */
  topic?: ReactNode;
  /** The story title. */
  title: ReactNode;
  /** Whether this story is on the stage — sets `aria-pressed` + `data-selected`. */
  selected?: boolean;
}

/**
 * One rundown story — a toggle button (`.uix-rundown__item`) whose selection
 * is conveyed with `aria-pressed` and styled through `[data-selected]`.
 */
export function FeaturedRundownItem({ number, topic, title, selected = false, className, ...props }: FeaturedRundownItemProps) {
  return (
    <button
      type="button"
      className={cx('uix-rundown__item', className)}
      aria-pressed={selected}
      data-selected={selected ? 'true' : 'false'}
      {...props}
    >
      {number != null && <span className="uix-rundown__number">{number}</span>}
      <span>
        {topic != null && <span className="uix-rundown__topic">{topic}</span>}
        <span className="uix-rundown__item-title">{title}</span>
      </span>
    </button>
  );
}

/* ── NewsLead ─────────────────────────────────────────────────────────────── */

export interface NewsLeadProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** Meta line above the title (pill + date). */
  meta?: ReactNode;
  title: ReactNode;
  summary?: ReactNode;
}

/** News lead — the top story of a news column (`.uix-news-lead`). */
export function NewsLead({ meta, title, summary, className, ...props }: NewsLeadProps) {
  return (
    <article className={cx('uix-news-lead', className)} {...props}>
      {meta != null && <p className="uix-news-lead__meta">{meta}</p>}
      <h3 className="uix-news-lead__title">{title}</h3>
      {summary != null && <p className="uix-news-lead__summary">{summary}</p>}
    </article>
  );
}

/* ── ContentList ──────────────────────────────────────────────────────────── */

export interface ContentListProps extends HTMLAttributes<HTMLUListElement> {
  /** `ContentListItem`s. */
  children?: ReactNode;
}

/** Content list — hairline-divided rows of titled items (`.uix-content-list`). */
export function ContentList({ children, className, ...props }: ContentListProps) {
  return (
    <ul className={cx('uix-content-list', className)} {...props}>{children}</ul>
  );
}

export interface ContentListItemProps extends Omit<HTMLAttributes<HTMLLIElement>, 'title'> {
  title: ReactNode;
  meta?: ReactNode;
  /** Trailing slot — an arrow glyph, a pill. */
  trailing?: ReactNode;
}

/** One content-list row — title + meta with an optional trailing slot. */
export function ContentListItem({ title, meta, trailing, className, ...props }: ContentListItemProps) {
  return (
    <li className={cx('uix-content-list__item', className)} {...props}>
      <div>
        <p className="uix-content-list__title">{title}</p>
        {meta != null && <p className="uix-content-list__meta">{meta}</p>}
      </div>
      {trailing}
    </li>
  );
}

/* ── ResourceGrid ─────────────────────────────────────────────────────────── */

export interface ResourceGridProps extends HTMLAttributes<HTMLDivElement> {
  /** Resource buttons/links (typically `.uix-btn--outline`). */
  children?: ReactNode;
}

/** Resource grid — a three-up grid of resource shortcuts (`.uix-resource-grid`). */
export function ResourceGrid({ children, className, ...props }: ResourceGridProps) {
  return (
    <div className={cx('uix-resource-grid', className)} {...props}>{children}</div>
  );
}

/* ── StatLine ─────────────────────────────────────────────────────────────── */

export interface StatLineItem {
  /** Stable identity for the item; falls back to the index when omitted. */
  id?: string;
  value: ReactNode;
  label: ReactNode;
}

export interface StatLineProps extends HTMLAttributes<HTMLDivElement> {
  items?: StatLineItem[];
  children?: ReactNode;
}

/**
 * Stat line — a compact value/label summary strip over a hairline
 * (`.uix-stat-line`). Use `items` for data-driven stats or hand-author
 * `.uix-stat-line__item` children.
 */
export function StatLine({ items, children, className, ...props }: StatLineProps) {
  return (
    <div className={cx('uix-stat-line', className)} {...props}>
      {items?.map((item, i) => (
        <div className="uix-stat-line__item" key={item.id ?? i}>
          <span className="uix-stat-line__value">{item.value}</span>
          <span className="uix-stat-line__label">{item.label}</span>
        </div>
      ))}
      {children}
    </div>
  );
}

/* ── EventRow ─────────────────────────────────────────────────────────────── */

export interface EventRowProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Calendar-block month (e.g. "Jul"). */
  month: ReactNode;
  /** Calendar-block day (e.g. "30"). */
  day: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
}

/** Event row — date block + title/meta (`.uix-event-row`). */
export function EventRow({ month, day, title, meta, className, ...props }: EventRowProps) {
  return (
    <div className={cx('uix-event-row', className)} {...props}>
      <div className="uix-event-date">
        <span className="uix-event-date__month">{month}</span>
        <span className="uix-event-date__day">{day}</span>
      </div>
      <div>
        <p className="uix-event-row__title">{title}</p>
        {meta != null && <p className="uix-event-row__meta">{meta}</p>}
      </div>
    </div>
  );
}

/* ── StatusRow ────────────────────────────────────────────────────────────── */

export interface StatusRowProps extends HTMLAttributes<HTMLDivElement> {
  /** Leading indicator slot (e.g. a `.uix-dot`). */
  indicator?: ReactNode;
  /** Service name — takes the flexible middle (`.uix-status-row__name`). */
  name: ReactNode;
  /** Trailing meta (e.g. "Healthy"), rendered as `.uix-list-meta`. */
  meta?: ReactNode;
}

/** Status row — indicator + name + trailing meta (`.uix-status-row`). */
export function StatusRow({ indicator, name, meta, className, ...props }: StatusRowProps) {
  return (
    <div className={cx('uix-status-row', className)} {...props}>
      {indicator}
      <span className="uix-status-row__name">{name}</span>
      {meta != null && <span className="uix-list-meta">{meta}</span>}
    </div>
  );
}
