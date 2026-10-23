"use client";

import { useMemo } from 'react';
import type { HTMLAttributes, SVGAttributes } from 'react';
import { cx } from '../cx.js';
import { useUixLabels } from '../labels-context.js';
import { encodeQr, qrPath, QrCapacityError } from '../qr-model.js';
import type { QrErrorCorrection, QrMatrix } from '../qr-model.js';

/** The words of a `QrCode` (HAR-1251). */
export interface QrCodeLabels {
  /** Shown in place of the symbol when `value` does not fit in a QR code at the chosen level. */
  tooLong: string;
}

/** The English words of `QrCode`, the base `UixLabelsProvider` `qrCode` and `labels` override. */
export const DEFAULT_QR_CODE_LABELS: QrCodeLabels = { tooLong: 'Too long for a QR code' };

/** The quiet zone the standard asks for: four light modules on every side. */
const QUIET_ZONE = 4;

export interface QrCodeProps extends Omit<SVGAttributes<SVGSVGElement>, 'children' | 'width' | 'height' | 'viewBox'> {
  /** The text to encode, e.g. the campaign URL. Encoded as UTF-8 bytes. */
  value: string;
  /**
   * The symbol's accessible name, e.g. "QR code: open the summer campaign". Say where it leads;
   * the image itself tells a screen-reader user nothing.
   */
  label: string;
  /**
   * `L` 7 %, `M` 15 % (default), `Q` 25 %, `H` 30 % of the symbol may be lost and still read.
   * Use `Q` or `H` for a poster that may be creased, scuffed or partly covered.
   */
  errorCorrection?: QrErrorCorrection;
  /**
   * The rendered width and height, quiet zone included: a number of CSS pixels (default 160) or
   * any CSS length (`'32mm'` on paper). Keep at least 2 px per module on a screen and 0.4 mm per
   * module on paper: a 30-character URL at `M` is version 3, 37 modules with the quiet zone, so
   * at least 74 px or 15 mm.
   */
  size?: number | string;
  /** The smallest version to use, so a set of posters gets symbols of one size. */
  minVersion?: number;
  /** Mark non-ASCII text as UTF-8 with an ECI designator (see `QrEncodeOptions.eci`). Default false. */
  eci?: boolean;
  /** The words. Default: `UixLabelsProvider` `qrCode`, then English. */
  labels?: Partial<QrCodeLabels>;
}

/**
 * A scannable, print-safe QR code (HAR-1251; SHOPx PRE-01 poster, voucher): `value` as an SVG
 * with the standard four-module quiet zone, dark modules on light paper in every theme, in print
 * and in forced colours (scanners read dark on light; an inverted symbol fails many of them).
 * The encoder is the kit's own (`encodeQr`), so nothing is fetched and no library is added.
 */
export function QrCode({ value, label, errorCorrection = 'M', size = 160, minVersion, eci = false, labels: labelsProp, className, style, ...props }: QrCodeProps) {
  const uixLabels = useUixLabels();
  const labels: QrCodeLabels = { ...DEFAULT_QR_CODE_LABELS, ...uixLabels.qrCode, ...labelsProp };
  const matrix = useMemo<QrMatrix | undefined>(() => {
    try {
      return encodeQr(value, { errorCorrection, minVersion, eci });
    } catch (error) {
      if (error instanceof QrCapacityError) return undefined;
      throw error;
    }
  }, [value, errorCorrection, minVersion, eci]);
  const length = typeof size === 'number' ? `${size}px` : size;

  // No symbol: words, not an image. A screen reader hears what the code was for and why it is
  // missing; an `img` named like a working code hid the "too long" (review of PR #166).
  if (!matrix) {
    return (
      <span {...(props as HTMLAttributes<HTMLSpanElement>)} className={cx('uix-qr-code', 'uix-qr-code--error', className)} style={{ inlineSize: length, ...(style as object) }}>
        <span className="uix-visually-hidden">{label}: </span>{labels.tooLong}
      </span>
    );
  }
  const extent = matrix.size + QUIET_ZONE * 2;
  return (
    <svg
      className={cx('uix-qr-code', className)}
      role="img"
      aria-label={label}
      viewBox={`0 0 ${extent} ${extent}`}
      width={length}
      height={length}
      shapeRendering="crispEdges"
      data-version={matrix.version}
      data-error-correction={matrix.errorCorrection}
      style={style}
      {...props}
    >
      <rect className="uix-qr-code__paper" width={extent} height={extent} />
      <path className="uix-qr-code__ink" d={qrPath(matrix, QUIET_ZONE)} />
    </svg>
  );
}
