"use client";

import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx.js';
import { fillLabel } from '../fill-label.js';
import { useUixLabels } from '../labels-context.js';
import { renderUixLink } from '../link.js';
import type { UixRenderLink } from '../link.js';
import { ButtonLink } from './Button.js';

/** The words of a `ContactCard` (HAR-1379). */
export interface ContactCardLabels {
  /** The email action's visible text. */
  email: string;
  /** The phone action's visible text. */
  call: string;
  /** The email action's accessible name; `{name}` is the contact's name. Starts with the visible text (WCAG 2.5.3). */
  emailName: string;
  /** The phone action's accessible name; `{name}`. */
  callName: string;
  /** Shown in place of the name when the person's data was erased and no name is left. */
  purgedName: string;
  /** The line under the name of an erased contact. */
  purged: string;
  /** The line under the name of a contact whose details cannot be shown (no access, or not loaded). */
  unavailable: string;
}

export const DEFAULT_CONTACT_CARD_LABELS: ContactCardLabels = {
  email: 'Email',
  call: 'Call',
  emailName: 'Email {name}',
  callName: 'Call {name}',
  purgedName: 'Removed contact',
  purged: 'Personal data erased',
  unavailable: 'Contact details unavailable',
};

/**
 * `active` shows everything given. `purged`: the person's data was erased; a neutral
 * placeholder, no details and no actions. `unavailable`: the name stays, the details and actions
 * do not (no access, or they could not be loaded).
 */
export type ContactCardState = 'active' | 'purged' | 'unavailable';

export interface ContactCardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'role'> {
  /** The person's or the organisation's name. Leave it out for an erased contact. */
  name?: string;
  /** Role or relation, e.g. "Practice manager · Dom zdravlja Centar". */
  role?: ReactNode;
  /** An `Avatar` (size `lg` reads best). An erased contact always gets the placeholder. */
  avatar?: ReactNode;
  /** Shown as text and offered as a `mailto:` action. */
  email?: string;
  /** Shown as written and offered as a `tel:` action (spaces, dashes and brackets are dropped from the link). */
  phone?: string;
  /** More actions after Email and Call, e.g. a `ButtonLink` to the record. */
  actions?: ReactNode;
  /** Figures under the role (`.uix-contact__stats`). */
  stats?: ReactNode;
  /** The name as a link to the person's record. */
  href?: string;
  /** Your router's link for `href`. */
  renderLink?: UixRenderLink;
  /** The element of the name: a heading when the card stands for a section. Default `div`. */
  nameAs?: 'h2' | 'h3' | 'h4' | 'div';
  state?: ContactCardState;
  /** Without the card frame, for a peek, a popover or a sidebar that is already a surface. */
  bare?: boolean;
  /** The words. Default: `UixLabelsProvider` `contactCard`, then English. */
  labels?: Partial<ContactCardLabels>;
}

/** The digits and a leading + of a phone number, for a `tel:` link. */
export const telHref = (phone: string) => {
  // An extension ("ext. 12", "x12", "#12", "lok. 12") is not part of the number: it goes after
  // it as RFC 3966's `;ext=`, so a dialler does not call +387 61 234 56712 (review of PR #166).
  const extension = /[\s,;]*(?:ext\.?|extn\.?|extension|x|#|lok(?:al)?\.?)\s*:?\s*(\d+)\s*$/i.exec(phone);
  const number = (extension ? phone.slice(0, extension.index) : phone).trim().replace(/(?!^\+)[^\d]/g, '');
  return `tel:${number}${extension ? `;ext=${extension[1]}` : ''}`;
};

const PersonGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </svg>
);

/**
 * A person or an organisation at a glance (HAR-1379; MOTUS C-15, TENSOR incident people card):
 * avatar, name, role, the email address and phone number as text, and Email / Call actions as
 * `mailto:` / `tel:` links. An erased contact (`state="purged"`) shows a neutral placeholder
 * and no way to reach anyone, so a purge is never undone on screen by a stale address.
 */
export function ContactCard({
  name, role, avatar, email, phone, actions, stats, href, renderLink, nameAs: NameTag = 'div', state = 'active', bare = false,
  labels: labelsProp, className, ...props
}: ContactCardProps) {
  const uixLabels = useUixLabels();
  const labels: ContactCardLabels = { ...DEFAULT_CONTACT_CARD_LABELS, ...uixLabels.contactCard, ...labelsProp };
  const purged = state === 'purged';
  const reachable = state === 'active';
  const shownName = purged ? labels.purgedName : name ?? '';
  const note = purged ? labels.purged : state === 'unavailable' ? labels.unavailable : null;
  const nameContent = href && !purged ? renderUixLink(renderLink, { href, children: shownName }) : shownName;
  const hasActions = reachable && (email || phone || actions);

  const contact = (
    <div className={cx('uix-contact', bare && 'uix-contact--bare', bare && className)} data-state={state} {...(bare ? props : {})}>
      {purged || avatar == null
        ? <span className="uix-avatar uix-avatar--lg uix-contact__placeholder" aria-hidden="true"><PersonGlyph /></span>
        : avatar}
      <NameTag className="uix-contact__name">{nameContent}</NameTag>
      {role != null && !purged && <div className="uix-contact__role">{role}</div>}
      {note && <div className="uix-contact__note">{note}</div>}
      {reachable && (email || phone) && (
        <div className="uix-contact__details">
          {email && <span className="uix-contact__detail">{email}</span>}
          {phone && <span className="uix-contact__detail">{phone}</span>}
        </div>
      )}
      {stats != null && !purged && <div className="uix-contact__stats">{stats}</div>}
      {hasActions && (
        <div className="uix-contact__actions">
          {email && <ButtonLink href={`mailto:${email}`} size="sm" variant="primary" aria-label={fillLabel(labels.emailName, { name: shownName })}>{labels.email}</ButtonLink>}
          {phone && <ButtonLink href={telHref(phone)} size="sm" aria-label={fillLabel(labels.callName, { name: shownName })}>{labels.call}</ButtonLink>}
          {actions}
        </div>
      )}
    </div>
  );
  if (bare) return contact;
  return <div className={cx('uix-card', className)} {...props}>{contact}</div>;
}
