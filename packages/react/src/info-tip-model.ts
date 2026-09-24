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
export const helpLabelFor = (thing: ReactNode): string =>
  typeof thing === 'string' || typeof thing === 'number' ? `About: ${thing}` : 'More information';
