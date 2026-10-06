import { Children, cloneElement, isValidElement } from 'react';
import type { HTMLAttributes, LiHTMLAttributes, ReactElement, ReactNode } from 'react';
import { cx } from '../cx.js';
import { renderUixLink } from '../link.js';
import type { UixRenderLink } from '../link.js';

export type StepState = 'complete' | 'current' | 'upcoming' | 'waiting' | 'error';

/** The state words read after each step's title (state is never colour alone). */
export interface StepStateLabels {
  complete: string;
  current: string;
  upcoming: string;
  waiting: string;
  error: string;
}

export const DEFAULT_STEP_STATE_LABELS: StepStateLabels = {
  complete: 'Completed',
  current: 'Current step',
  upcoming: 'Not started',
  waiting: 'Waiting',
  error: 'Needs attention',
};

export interface StepsProps extends HTMLAttributes<HTMLOListElement> {
  /**
   * `horizontal` (default) lays the steps in a row and stacks them below 40rem;
   * `vertical` always stacks, with descriptions under each title.
   */
  orientation?: 'horizontal' | 'vertical';
  /** Names the list, e.g. "Intake progress". */
  label?: string;
  stateLabels?: Partial<StepStateLabels>;
  /** `Step` elements, in order. */
  children?: ReactNode;
}

export interface StepProps extends Omit<LiHTMLAttributes<HTMLLIElement>, 'title'> {
  title: ReactNode;
  description?: ReactNode;
  state?: StepState;
  /** Marker content. Default: the step number; ✓ when complete; ! on error. */
  marker?: ReactNode;
  /** A navigable step (a wizard you can jump back in). */
  href?: string;
  renderLink?: UixRenderLink;
  onSelect?: () => void;
  /** Set by `Steps`. */
  index?: number;
  /** Set by `Steps`. */
  last?: boolean;
  /** Set by `Steps`. */
  stateLabels?: StepStateLabels;
}

const CSS_STATE: Record<StepState, string | undefined> = { complete: 'done', current: 'active', upcoming: undefined, waiting: 'waiting', error: 'error' };

const Check = () => (
  <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" /></svg>
);

/** Numbered progress through a multi-step flow (HAR-1362; TENSOR C13, MOTUS C-9). */
export function Steps({ orientation = 'horizontal', label, stateLabels, className, children, ...props }: StepsProps) {
  const labels = { ...DEFAULT_STEP_STATE_LABELS, ...stateLabels };
  const steps = Children.toArray(children).filter(isValidElement) as ReactElement<StepProps>[];
  return (
    <ol aria-label={label} className={cx('uix-steps', 'uix-steps--list', `uix-steps--${orientation}`, className)} {...props}>
      {steps.map((step, index) => cloneElement(step, { index, last: index === steps.length - 1, stateLabels: labels }))}
    </ol>
  );
}

export function Step({ title, description, state = 'upcoming', marker, href, renderLink, onSelect, index = 0, last = false, stateLabels = DEFAULT_STEP_STATE_LABELS, className, ...props }: StepProps) {
  const glyph = marker ?? (state === 'complete' ? <Check /> : state === 'error' ? '!' : index + 1);
  const name = (
    <>
      <span className="uix-step__title">{title}</span>
      <span className="uix-visually-hidden">, {stateLabels[state]}</span>
    </>
  );
  const titled = href != null
    ? renderUixLink(renderLink, { href, className: 'uix-step__action', children: name })
    : onSelect ? <button type="button" className="uix-step__action" onClick={onSelect}>{name}</button>
      : <span className="uix-step__action">{name}</span>;
  return (
    <li className={cx('uix-step', className)} data-state={CSS_STATE[state]} aria-current={state === 'current' ? 'step' : undefined} {...props}>
      <span className="uix-step__marker" aria-hidden="true">{glyph}</span>
      <span className="uix-step__text">
        {titled}
        {description != null && <span className="uix-step__desc">{description}</span>}
      </span>
      {!last && <span className="uix-step__connector" aria-hidden="true" data-done={state === 'complete' || undefined} />}
    </li>
  );
}
