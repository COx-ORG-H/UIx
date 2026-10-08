import { Children, cloneElement, isValidElement, useId } from 'react';
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
   * `vertical` always stacks, with descriptions under each title. Steps that hold
   * content (`progress={false}`) are always vertical.
   */
  orientation?: 'horizontal' | 'vertical';
  /**
   * `true` (default): a progress indicator. Every step has a state, which is read after its
   * title, and the current one carries `aria-current="step"`.
   * `false`: a numbered list of sections that are all on screen at once (an intake form in
   * four parts). No state is drawn or announced, and each `Step`'s children are its content,
   * in a group named by the step's title (HAR-1628).
   */
  progress?: boolean;
  /** Render each step's title as a heading of this level (for `progress={false}` sections). */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
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
  /**
   * The step's content: fields, text, a table. Rendered under the title in a group named by
   * it. Meant for `<Steps progress={false}>`; in a progress indicator keep steps to a title
   * and a description.
   */
  children?: ReactNode;
  /** Set by `Steps`. */
  index?: number;
  /** Set by `Steps`. */
  last?: boolean;
  /** Set by `Steps`. */
  stateLabels?: StepStateLabels;
  /** Set by `Steps`. */
  progress?: boolean;
  /** Set by `Steps`. */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
}

const CSS_STATE: Record<StepState, string | undefined> = { complete: 'done', current: 'active', upcoming: undefined, waiting: 'waiting', error: 'error' };

const Check = () => (
  <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" /></svg>
);

/**
 * Numbered progress through a multi-step flow (HAR-1362; TENSOR C13, MOTUS C-9), or with
 * `progress={false}` a numbered list of sections that each hold content (HAR-1628).
 */
export function Steps({ orientation = 'horizontal', progress = true, headingLevel, label, stateLabels, className, children, ...props }: StepsProps) {
  const labels = { ...DEFAULT_STEP_STATE_LABELS, ...stateLabels };
  const steps = Children.toArray(children).filter(isValidElement) as ReactElement<StepProps>[];
  const direction = progress ? orientation : 'vertical';
  return (
    <ol aria-label={label} className={cx('uix-steps', 'uix-steps--list', `uix-steps--${direction}`, !progress && 'uix-steps--sections', className)} {...props}>
      {steps.map((step, index) => cloneElement(step, { index, last: index === steps.length - 1, stateLabels: labels, progress, headingLevel }))}
    </ol>
  );
}

export function Step({
  title, description, state = 'upcoming', marker, href, renderLink, onSelect, children,
  index = 0, last = false, stateLabels = DEFAULT_STEP_STATE_LABELS, progress = true, headingLevel, className, ...props
}: StepProps) {
  const titleId = useId();
  const glyph = marker ?? (!progress ? index + 1 : state === 'complete' ? <Check /> : state === 'error' ? '!' : index + 1);
  const Title = headingLevel ? (`h${headingLevel}` as 'h2') : 'span';
  const name = (
    <>
      <Title id={children != null ? titleId : undefined} className="uix-step__title">{title}</Title>
      {progress && <span className="uix-visually-hidden">, {stateLabels[state]}</span>}
    </>
  );
  // A heading is not phrasing content: it cannot sit inside a link or a button.
  const titled = headingLevel ? name
    : href != null ? renderUixLink(renderLink, { href, className: 'uix-step__action', children: name })
      : onSelect ? <button type="button" className="uix-step__action" onClick={onSelect}>{name}</button>
        : <span className="uix-step__action">{name}</span>;
  const Text = headingLevel || children != null ? 'div' : 'span';
  return (
    <li
      className={cx('uix-step', className)}
      data-state={progress ? CSS_STATE[state] : undefined}
      aria-current={progress && state === 'current' ? 'step' : undefined}
      {...props}
    >
      <span className="uix-step__marker" aria-hidden="true">{glyph}</span>
      <Text className="uix-step__text">
        {titled}
        {description != null && <span className="uix-step__desc">{description}</span>}
        {children != null && <div className="uix-step__content" role="group" aria-labelledby={titleId}>{children}</div>}
      </Text>
      {!last && <span className="uix-step__connector" aria-hidden="true" data-done={(progress && state === 'complete') || undefined} />}
    </li>
  );
}
