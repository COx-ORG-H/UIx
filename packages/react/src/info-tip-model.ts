import type { ReactNode } from 'react';

/* Pure helpers behind InfoTip and the `help` slots. They live outside the "use client"
 * InfoTip module on purpose: PageHeader, Card, SectionHead and Field stay server-renderable,
 * and a server component cannot call a function exported from a client module. */

/** Blank lines (any whitespace between two line breaks) separate paragraphs; empty paragraphs drop. */
export const helpParagraphs = (content: unknown): string[] =>
  typeof content === 'string'
    ? content.replace(/\r\n?/g, '\n').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
    : [];

/** True when `help` would render an InfoTip, so a slot can skip its wrapper row. */
export const hasHelp = (help: unknown): help is string => helpParagraphs(help).length > 0;

/** Default accessible name for a `help` slot: "About: <title>" for text titles. */
export const helpLabelFor = (thing: ReactNode): string => helpLabelFrom(thing);

/** A title as the topic of a ?: text only, so an element title is never sent to the client twice. */
export const helpTopic = (thing: ReactNode): string | number | undefined =>
  typeof thing === 'string' || typeof thing === 'number' ? thing : undefined;

/**
 * The accessible name of a ? for `thing` from a localised template (HAR-3100): `about` with its
 * `{title}` replaced for a text title, `more` for any other. A blank template falls back to the
 * English default, so a resolver still in flight never leaves the button without a name.
 */
export const helpLabelFrom = (thing: ReactNode, labels?: { about?: string; more?: string }): string => {
  const about = labels?.about?.trim() ? labels.about : 'About: {title}';
  const more = labels?.more?.trim() ? labels.more : 'More information';
  return typeof thing === 'string' || typeof thing === 'number' ? about.split('{title}').join(String(thing)) : more;
};
