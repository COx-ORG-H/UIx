import { useId } from 'react';
import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx.js';
import { ArriveIndexProvider } from './Arrive.js';

export interface ChartCardProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** The title is a question a person would ask in passing: "Wächst der Rückstand?". */
  question: ReactNode;
  /** The answer's number, large: `85`, `+22`, or `<Count arrive value={85} />`. */
  headline?: ReactNode;
  /** The rest of the answer, short: "offen, Prognose 140 bis 23. Nov.". */
  answer?: ReactNode;
  /** A link or a small control at the end of the question row ("Berichte →"). */
  action?: ReactNode;
  /** One line under the chart: what it covers, what the dashes mean, the key of a paired chart. */
  note?: ReactNode;
  /**
   * When there is nothing to show, one sentence instead of the answer and the chart
   * ("Keine Wartung in den nächsten 14 Tagen."); the card shrinks to fit it.
   */
  empty?: ReactNode;
  /** Heading level of the question. Default 3. */
  headingLevel?: 2 | 3 | 4;
  /** Its reading-order position in an `Arrive` stage: the card rises with the others. */
  arriveIndex?: number;
  /** The one chart: a `GlanceLineChart`, a `PairedBarChart`, a `BarList`, a `Meter`, a `StatusStrip`. */
  children?: ReactNode;
}

/**
 * A glance card (calm kit 2.56): one question, answered with a number before the plot, one
 * chart, a note line. The question names the card (`aria-labelledby`). Analysis that needs
 * reading time belongs in a report, not here.
 */
export function ChartCard({ question, headline, answer, action, note, empty, headingLevel = 3, arriveIndex, className, style, children, ...props }: ChartCardProps) {
  const id = useId();
  const Heading = `h${headingLevel}` as const;
  const arriving = typeof arriveIndex === 'number';
  const hasEmpty = empty != null && empty !== false;
  return (
    <section
      className={cx('uix-chart-card', arriving && 'uix-arrive__item', className)}
      aria-labelledby={`${id}-q`}
      style={arriving ? ({ '--uix-arrive-i': arriveIndex, ...style } as CSSProperties) : style}
      {...props}
    >
      <div className="uix-chart-card__head">
        <Heading className="uix-chart-card__question" id={`${id}-q`}>{question}</Heading>
        {action != null && <div className="uix-chart-card__action">{action}</div>}
      </div>
      {hasEmpty ? (
        <p className="uix-chart-card__empty">{empty}</p>
      ) : (
        <>
          {(headline != null || answer != null) && (
            <p className="uix-chart-card__answer">
              {headline != null && <span className="uix-chart-card__headline">{headline}</span>}
              {answer != null && <span>{answer}</span>}
            </p>
          )}
          {children != null && (
            <div className="uix-chart-card__plot">
              {arriving ? <ArriveIndexProvider index={arriveIndex}>{children}</ArriveIndexProvider> : children}
            </div>
          )}
          {note != null && <p className="uix-chart-card__note">{note}</p>}
        </>
      )}
    </section>
  );
}
