"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx.js';
import { useUixLabels } from '../labels-context.js';
import { DEFAULT_AI_LABELS } from '../ai-labels.js';
import type { AiLabels } from '../ai-labels.js';
import { fillLabel } from '../fill-label.js';
import { renderUixLink } from '../link.js';
import { isSafeSourceHref } from '../url-policy.js';
import type { UixRenderLink } from '../link.js';
import type { Placement } from '../overlay-position.js';
import { Popover } from './Popover.js';
import { announcePolite } from '../announce.js';

// useLayoutEffect warns during SSR; fall back to useEffect on the server.
const useIsomorphicLayoutEffect = typeof document !== 'undefined' ? useLayoutEffect : useEffect;

/** The AI words in effect: the defaults, then `UixLabelsProvider` `ai`, then the instance's own. */
export function useAiLabels(own?: Partial<AiLabels>): AiLabels {
  return { ...DEFAULT_AI_LABELS, ...useUixLabels().ai, ...own };
}

/** One record an AI answer or suggestion was based on. */
export interface AiSource {
  /** Stable id, for the key. */
  id: string;
  /** What the person sees: "KB-204 Reset a locked account", "INC-0977". */
  title: string;
  /**
   * Opens the record itself, so the person can check it there. Only `http(s)` and relative URLs
   * become links; anything else (`javascript:`, `data:` …) shows the title as plain text.
   */
  href?: string;
  /** What kind of record: "Knowledge article", "Similar incident". */
  kind?: string;
  /** One more line: when it was updated, the excerpt it came from. */
  detail?: ReactNode;
}

/**
 * The first layer of explanation (Carbon for AI, Apple HIG): what the AI made, why, from which
 * sources, and what is shared with it. Name the inputs it used ("From the description and 3
 * similar incidents"), not how confident it is: explanations raise acceptance whether or not the AI
 * is right (Bansal et al. 2021), so they are there to help check it, not to persuade.
 */
export interface AiExplanation {
  /** What it is: "Category suggested by Assist". */
  what?: ReactNode;
  /** Why, in terms of the person's own inputs: "The description mentions VPN and a timeout". */
  why?: ReactNode;
  /** The records it was based on. An empty list says "No sources". Leave it out to say nothing. */
  sources?: readonly AiSource[];
  /** "What is shared with the AI": the product's page about data sent and training use. `http(s)` or relative only; anything else is left out. */
  sharedHref?: string;
}

export interface SourceListProps extends Omit<HTMLAttributes<HTMLElement>, 'children' | 'title'> {
  sources: readonly AiSource[];
  /** The heading. Default `labels.sourceList` ("Sources"); `null` for none (a parent already names it). */
  title?: ReactNode | null;
  /** Your router's link, for sources with `href`. */
  renderLink?: UixRenderLink;
  labels?: Partial<AiLabels>;
}

/**
 * The records an AI answer was based on, numbered, each opening the record itself (Intercom Fin,
 * Zendesk). Sources help check an answer; they are not a trust badge (the mere presence of sources
 * raises trust: Microsoft's overreliance playbook), so each must open what it names. With no
 * sources it says so: an answer that is not grounded in a record is flagged, not hidden (PAIR).
 */
export function SourceList({ sources, title, renderLink, labels: own, className, ...props }: SourceListProps) {
  const labels = useAiLabels(own);
  const headingId = `${useId()}-sources`;
  const heading = title === undefined ? labels.sourceList : title;
  return (
    <section className={cx('uix-source-list', className)} aria-labelledby={heading != null ? headingId : undefined} {...props}>
      {heading != null && <p className="uix-source-list__title" id={headingId}>{heading}</p>}
      {sources.length === 0 ? (
        <p className="uix-source-list__empty">{labels.noSources}</p>
      ) : (
        <ol className="uix-source-list__items">
          {sources.map((source) => (
            <li key={source.id} className="uix-source-list__item">
              <span className="uix-source-list__body">
                {isSafeSourceHref(source.href)
                  ? renderUixLink(renderLink, { href: source.href, className: 'uix-source-list__link', children: source.title })
                  : <span className="uix-source-list__name">{source.title}</span>}
                {(source.kind || source.detail) && (
                  <span className="uix-source-list__meta">
                    {source.kind}{source.kind && source.detail ? ' · ' : null}{source.detail}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export interface AiLabelProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** What the panel says. Without it the label is a plain mark with nothing to open. */
  explanation?: AiExplanation;
  /** What the label marks, for its accessible name ("AI: about the category suggestion"). */
  subject?: string;
  /** Preferred panel placement. Default `'bottom-start'`. */
  placement?: Placement;
  renderLink?: UixRenderLink;
  labels?: Partial<AiLabels>;
}

const isShown = (el: Element | null) => {
  try { return !!el?.matches(':popover-open'); } catch { return false; }
};

/**
 * Marks AI content (Carbon's AI label; Apple: "Clearly identify when and where you use AI"). It is
 * a small "AI" mark in the info accent, never a glow or a gradient: AI styling identifies AI use,
 * it does not decorate. With an `explanation` it is a button that opens a panel (what, why,
 * sources, what is shared, and that AI can be wrong). The panel is a non-modal dialog in the top
 * layer: focus moves into it, Esc or a click outside closes it and focus returns to the mark.
 */
export function AiLabel({ explanation, subject, placement = 'bottom-start', renderLink, labels: own, className, ...props }: AiLabelProps) {
  const labels = useAiLabels(own);
  if (!explanation) {
    return <span className={cx('uix-ai-label', className)} {...props}>{labels.mark}</span>;
  }
  return <AiLabelButton explanation={explanation} subject={subject} placement={placement} renderLink={renderLink} labels={labels} className={className} {...props} />;
}

function AiLabelButton({
  explanation, subject, placement, renderLink, labels, className, ...props
}: Omit<AiLabelProps, 'labels'> & { explanation: AiExplanation; labels: AiLabels }) {
  const id = useId();
  const panelId = `${id}-panel`;
  const titleId = `${id}-title`;
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const wasOpen = useRef<boolean | null>(null);
  const panel = () => document.getElementById(panelId);

  const hide = (refocus: boolean) => {
    const p = panel();
    if (p && isShown(p)) { try { p.hidePopover(); } catch { /* already closed */ } }
    setOpen(false);
    if (refocus) buttonRef.current?.focus();
  };
  const show = () => {
    const p = panel();
    if (p && !isShown(p)) { try { p.showPopover(); } catch { /* unsupported */ } }
    setOpen(true);
    // into the panel, so its links are the next Tab stops (it sits in the top layer, not after the button)
    window.setTimeout(() => panel()?.focus(), 0);
  };

  // A light dismiss (a click outside) closes the popover natively: follow it. Focus still in the
  // panel goes back to the mark rather than to the body; a click that focused something else wins.
  useEffect(() => {
    const p = panel();
    if (!p) return undefined;
    const onToggle = (event: Event) => {
      if ((event as Event & { newState?: string }).newState !== 'closed') return;
      setOpen(false);
      const active = document.activeElement;
      if (active && p.contains(active)) buttonRef.current?.focus();
    };
    p.addEventListener('toggle', onToggle);
    return () => p.removeEventListener('toggle', onToggle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelId]);

  // Esc is the panel's alone (as InfoTip, HAR-2415): taken in the capture phase, so a Drawer or
  // Modal around the label does not close as well.
  useIsomorphicLayoutEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      hide(true);
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => () => {
    const p = panel();
    if (p && isShown(p)) { try { p.hidePopover(); } catch { /* noop */ } }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const name = fillLabel(labels.explain, { subject: subject?.trim() || labels.subjectDefault });
  return (
    <span className={cx('uix-ai-label-wrap', className)} data-open={open || undefined} {...props}>
      <button
        ref={buttonRef}
        type="button"
        className="uix-ai-label uix-ai-label--button"
        aria-label={name}
        aria-expanded={open}
        aria-controls={panelId}
        // A press on the mark is "outside" the panel, so the browser light-dismisses it before the
        // click: remember that it was open, or the click would open it again at once.
        onPointerDown={() => { wasOpen.current = isShown(panel()); }}
        onClick={() => {
          const opened = wasOpen.current ?? open;
          wasOpen.current = null;
          if (opened) hide(false); else show();
        }}
      >
        {labels.mark}
      </button>
      <Popover
        id={panelId}
        role="dialog"
        aria-labelledby={titleId}
        tabIndex={-1}
        popover="auto"
        anchor={buttonRef}
        placement={placement}
        className="uix-ai-panel"
      >
        <p className="uix-ai-panel__title" id={titleId}>
          <span className="uix-ai-label" aria-hidden="true">{labels.mark}</span>
          {labels.panelTitle}
        </p>
        {(explanation.what != null || explanation.why != null) && (
          <dl className="uix-ai-panel__facts">
            {explanation.what != null && <div><dt>{labels.what}</dt><dd>{explanation.what}</dd></div>}
            {explanation.why != null && <div><dt>{labels.why}</dt><dd>{explanation.why}</dd></div>}
          </dl>
        )}
        {explanation.sources && <SourceList sources={explanation.sources} title={labels.sources} renderLink={renderLink} labels={labels} />}
        {isSafeSourceHref(explanation.sharedHref) && (
          <p className="uix-ai-panel__shared">
            {renderUixLink(renderLink, { href: explanation.sharedHref, children: labels.shared })}
          </p>
        )}
        <p className="uix-ai-panel__limitation">{labels.limitation}</p>
      </Popover>
    </span>
  );
}

/** Field's AI message ("Filled in by AI. Check it."), read here so `Field` stays server-renderable. Internal. */
export function FieldAiNote({ labels: own }: { labels?: Partial<AiLabels> }) {
  return <>{useAiLabels(own).fieldFilled}</>;
}

/**
 * Field's AI parts in the label row: the mark while filled, "Revert to AI" once edited. After a
 * revert the button goes, so focus moves to the control and the restore is announced. Internal.
 */
export function FieldAiParts({ ai, label, controlId }: {
  ai: { state: 'filled' | 'edited'; explanation?: AiExplanation; onRevert?: () => void; labels?: Partial<AiLabels> };
  label: string;
  controlId?: string;
}) {
  const labels = useAiLabels(ai.labels);
  if (ai.state === 'filled') return <AiLabel explanation={ai.explanation} subject={label} labels={ai.labels} />;
  if (!ai.onRevert) return null;
  const revert = () => {
    ai.onRevert?.();
    const target = controlId ? document.getElementById(controlId) : null;
    target?.focus();
    announcePolite(labels.reverted, target);
  };
  return (
    <button
      type="button"
      className="uix-btn uix-btn--ghost uix-btn--xs uix-field__revert"
      aria-label={fillLabel(labels.revertFor, { label })}
      onClick={revert}
    >
      {labels.revert}
    </button>
  );
}
