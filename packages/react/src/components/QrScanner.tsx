"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx.js';
import { fillLabel } from '../fill-label.js';
import { useUixLabels } from '../labels-context.js';
import { Button } from './Button.js';

/** The words of a `QrScanner` (HAR-1254). */
export interface QrScannerLabels {
  /** The viewfinder region's name. */
  viewfinder: string;
  /** Starts the camera (the browser asks for permission after it). */
  start: string;
  /** Stops the camera. */
  stop: string;
  /** While the browser's permission prompt is open. */
  asking: string;
  /** While the camera runs and nothing was read yet. */
  scanning: string;
  /** Camera access was refused. */
  deniedTitle: string;
  /** How to allow it again: the browser keeps the refusal until the person changes it. */
  deniedBody: string;
  /** No camera API (an old browser, or a page not served over HTTPS). */
  unsupportedTitle: string;
  unsupportedBody: string;
  /** No camera found, or it is in use by another app. */
  noCameraTitle: string;
  noCameraBody: string;
  /** The camera started but sends no picture. */
  noFrameTitle: string;
  noFrameBody: string;
  /** Shown after `hintAfter` ms of frames without a code. */
  unreadable: string;
  /** Tries the camera again. */
  retry: string;
  /** The torch toggle's name. */
  torch: string;
  /** Announced once when a code was read; `{value}` is the text. */
  read: string;
}

export const DEFAULT_QR_SCANNER_LABELS: QrScannerLabels = {
  viewfinder: 'Camera viewfinder',
  start: 'Use the camera',
  stop: 'Stop the camera',
  asking: 'Allow the camera in your browser’s prompt.',
  scanning: 'Point the camera at the code.',
  deniedTitle: 'The camera is blocked',
  deniedBody: 'Allow the camera for this site in the browser’s address bar or site settings, then try again. You can also type the code.',
  unsupportedTitle: 'This browser cannot use the camera here',
  unsupportedBody: 'Type the code instead, or open this page in a current browser over a secure connection.',
  noCameraTitle: 'No camera is available',
  noCameraBody: 'Connect a camera or close the app that is using it, then try again. You can also type the code.',
  noFrameTitle: 'The camera sends no picture',
  noFrameBody: 'Check that nothing covers the lens, then try again. You can also type the code.',
  unreadable: 'Still nothing read. Hold the code flat and steady, in good light, or type it.',
  retry: 'Try again',
  torch: 'Torch',
  read: 'Code read: {value}',
};

/**
 * What the scanner is doing. `idle` shows the explainer and the start button; `asking` waits for
 * the browser's prompt; `scanning` shows the picture; `denied`, `unsupported`, `no-camera` and
 * `no-frame` say what went wrong and how to go on.
 */
export type QrScannerStatus = 'idle' | 'asking' | 'scanning' | 'denied' | 'unsupported' | 'no-camera' | 'no-frame';

/** One camera frame for the consumer's decoder. It never leaves the device unless the decoder sends it. */
export interface QrScannerFrame {
  /** The frame's pixels, at most `maxFrameSize` on the long side. */
  imageData: ImageData;
  /** The live video element, for a decoder that reads it directly (`BarcodeDetector.detect(video)`). */
  video: HTMLVideoElement;
}

/** Returns the text it read, or nothing. Throwing counts as nothing read. */
export type QrScannerDecoder = (frame: QrScannerFrame) => string | null | undefined | Promise<string | null | undefined>;

export interface QrScannerProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onError'> {
  /** Your decoder (a WASM or JS QR reader, or `BarcodeDetector`). The kit ships none and calls it with frames only. */
  decode: QrScannerDecoder;
  /** Called with each new text read. The same text again is ignored for `repeatAfter` ms. */
  onResult: (value: string) => void;
  /** Why the page wants the camera, shown before the browser's own prompt (and after a refusal). */
  explainer?: ReactNode;
  /** The manual entry (a field and a button): always rendered, in every state, after the viewfinder. */
  manualEntry?: ReactNode;
  /**
   * Starts the camera without the start button when the browser says permission was already
   * given (`navigator.permissions`). Default `true`; the explainer is still shown first otherwise.
   */
  autoStart?: boolean;
  /** Called on every status change, e.g. to log it or to move focus to the manual field after a refusal. */
  onStatusChange?: (status: QrScannerStatus) => void;
  /** Milliseconds between decode attempts. Default 200. */
  interval?: number;
  /** The long side of the frame handed to the decoder, in pixels. Default 640. */
  maxFrameSize?: number;
  /** The same text read again within this many milliseconds is not reported twice. Default 2000. */
  repeatAfter?: number;
  /** Milliseconds of frames without a code before the "still nothing read" hint. Default 8000. */
  hintAfter?: number;
  /** Milliseconds after the camera started without a single frame before `no-frame`. Default 5000. */
  frameTimeout?: number;
  /** `environment` (default, the back camera) or `user`. */
  facingMode?: 'environment' | 'user';
  /** The words. Default: `UixLabelsProvider` `qrScanner`, then English. */
  labels?: Partial<QrScannerLabels>;
}


const ERROR_STATUS: Record<string, QrScannerStatus> = {
  NotAllowedError: 'denied',
  SecurityError: 'denied',
  PermissionDeniedError: 'denied',
  NotFoundError: 'no-camera',
  DevicesNotFoundError: 'no-camera',
  NotReadableError: 'no-camera',
  TrackStartError: 'no-camera',
  OverconstrainedError: 'no-camera',
};

const cameraApi = () => typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.getUserMedia === 'function';

/**
 * A camera viewfinder that reads QR codes with a decoder the product supplies (HAR-1254; SHOPx
 * SHOP-07 receipt scan, SHOP-09 till; MOTUS circulation intake). It explains why it wants the
 * camera before the browser asks, says plainly when access is blocked, missing or unsupported
 * and how to go on, and always keeps the manual entry next to it. Frames go to `decode` and
 * nowhere else: the component makes no network request. The camera stops on unmount, on Stop
 * and while the page is hidden.
 */
export function QrScanner({
  decode, onResult, explainer, manualEntry, autoStart = true, onStatusChange, interval = 200, maxFrameSize = 640, repeatAfter = 2000,
  hintAfter = 8000, frameTimeout = 5000, facingMode = 'environment', labels: labelsProp, className, ...props
}: QrScannerProps) {
  const uixLabels = useUixLabels();
  const labels: QrScannerLabels = { ...DEFAULT_QR_SCANNER_LABELS, ...uixLabels.qrScanner, ...labelsProp };
  const [status, setStatusState] = useState<QrScannerStatus>(() => (cameraApi() ? 'idle' : 'unsupported'));
  const [hint, setHint] = useState(false);
  const [torch, setTorch] = useState<boolean | null>(null);
  // "did it work": the last read, said once and shown briefly on the frame.
  const [read, setRead] = useState<{ value: string; at: number } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const runRef = useRef(0);
  // The page was hidden while scanning: scan again when it comes back.
  const resumeRef = useRef(false);
  const live = useRef({ decode, onResult, onStatusChange, interval, maxFrameSize, repeatAfter, hintAfter, frameTimeout });
  live.current = { decode, onResult, onStatusChange, interval, maxFrameSize, repeatAfter, hintAfter, frameTimeout };

  // The status the consumer last heard of: onStatusChange runs once per change, outside a state
  // updater (StrictMode runs updaters twice).
  const statusRef = useRef(status);
  const setStatus = useCallback((next: QrScannerStatus) => {
    if (statusRef.current === next) return;
    statusRef.current = next;
    setStatusState(next);
    live.current.onStatusChange?.(next);
  }, []);

  const release = useCallback(() => {
    runRef.current += 1;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setTorch(null);
    setHint(false);
  }, []);

  const start = useCallback(async () => {
    if (!cameraApi()) { setStatus('unsupported'); return; }
    release();
    const run = runRef.current;
    setStatus('asking');
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facingMode } }, audio: false });
    } catch (error) {
      if (run !== runRef.current) return;
      setStatus(ERROR_STATUS[(error as { name?: string })?.name ?? ''] ?? 'no-camera');
      return;
    }
    if (run !== runRef.current) { stream.getTracks().forEach((track) => track.stop()); return; }
    streamRef.current = stream;
    const track = stream.getVideoTracks()[0];
    setTorch((track?.getCapabilities?.() as { torch?: boolean } | undefined)?.torch ? false : null);
    track?.addEventListener('ended', () => { if (run === runRef.current) { release(); setStatus('no-frame'); } });
    setStatus('scanning');
  }, [facingMode, release, setStatus]);

  // Attach the stream and read frames while scanning.
  useEffect(() => {
    if (status !== 'scanning') return undefined;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return undefined;
    const run = runRef.current;
    video.srcObject = stream;
    void video.play?.()?.catch?.(() => undefined);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });
    const startedAt = Date.now();
    let lastHit = startedAt;
    let lastValue: { value: string; at: number } | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let sawFrame = false;
    const step = async () => {
      if (run !== runRef.current) return;
      const { decode: read, maxFrameSize: max, frameTimeout: timeout, hintAfter: hintMs, repeatAfter: repeat, interval: wait } = live.current;
      const width = video.videoWidth;
      const height = video.videoHeight;
      if (width > 0 && height > 0 && video.readyState >= 2 && context) {
        sawFrame = true;
        const scale = Math.min(1, max / Math.max(width, height));
        canvas.width = Math.round(width * scale);
        canvas.height = Math.round(height * scale);
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        let value: string | null | undefined;
        try {
          value = await read({ imageData: context.getImageData(0, 0, canvas.width, canvas.height), video });
        } catch {
          value = null;
        }
        if (run !== runRef.current) return;
        const now = Date.now();
        if (value) {
          lastHit = now;
          setHint(false);
          if (!lastValue || lastValue.value !== value || now - lastValue.at > repeat) {
            lastValue = { value, at: now };
            setRead({ value, at: now });
            live.current.onResult(value);
          }
        } else if (now - lastHit > hintMs) setHint(true);
      } else if (!sawFrame && Date.now() - startedAt > timeout) {
        release();
        setStatus('no-frame');
        return;
      }
      timer = setTimeout(() => { void step(); }, wait);
    };
    timer = setTimeout(() => { void step(); }, 0);
    return () => clearTimeout(timer);
  }, [status, release, setStatus]);

  // Ask the browser whether the camera is already allowed or refused, before showing the start button.
  useEffect(() => {
    if (status !== 'idle' || typeof navigator === 'undefined' || !navigator.permissions?.query) return undefined;
    let cancelled = false;
    navigator.permissions.query({ name: 'camera' as PermissionName }).then((result) => {
      if (cancelled) return;
      if (result.state === 'denied') setStatus('denied');
      else if (result.state === 'granted' && autoStart) void start();
    }, () => undefined);
    return () => { cancelled = true; };
    // only on mount: later visits to idle are the person's own Stop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The camera stops while the page is hidden and on unmount; it comes back when the page does.
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && streamRef.current) { release(); setStatus('idle'); resumeRef.current = true; } else if (!document.hidden && resumeRef.current) { resumeRef.current = false; void start(); }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => { document.removeEventListener('visibilitychange', onVisibility); release(); };
  }, [release, setStatus, start]);

  // The "read" mark on the frame is brief; the announcement stays in the status region.
  useEffect(() => {
    if (!read) return undefined;
    const timer = setTimeout(() => setRead((current) => (current === read ? { ...current, at: -1 } : current)), 1200);
    return () => clearTimeout(timer);
  }, [read]);

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track || torch === null) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !torch } as MediaTrackConstraintSet] });
      setTorch(!torch);
    } catch { setTorch(null); }
  };

  const problem = status === 'denied' ? [labels.deniedTitle, labels.deniedBody]
    : status === 'unsupported' ? [labels.unsupportedTitle, labels.unsupportedBody]
      : status === 'no-camera' ? [labels.noCameraTitle, labels.noCameraBody]
        : status === 'no-frame' ? [labels.noFrameTitle, labels.noFrameBody] : null;
  const message = status === 'asking' ? labels.asking : status === 'scanning' ? (hint ? labels.unreadable : labels.scanning) : null;
  const flash = read !== null && read.at >= 0;

  return (
    <div className={cx('uix-qr-scanner', className)} data-status={status} {...props}>
      <div className="uix-qr-scanner__frame" role="group" aria-label={labels.viewfinder} data-read={flash || undefined}>
        <video ref={videoRef} className="uix-qr-scanner__video" muted playsInline aria-hidden="true" hidden={status !== 'scanning'} />
        {status === 'scanning' && <span className="uix-qr-scanner__target" aria-hidden="true" />}
        {(status === 'idle' || status === 'asking' || problem) && (
          <div className="uix-qr-scanner__panel">
            {problem ? (
              <>
                <p className="uix-qr-scanner__title">{problem[0]}</p>
                <p className="uix-qr-scanner__body">{problem[1]}</p>
                {status === 'denied' && explainer != null && <div className="uix-qr-scanner__explainer">{explainer}</div>}
              </>
            ) : explainer != null && <div className="uix-qr-scanner__explainer">{explainer}</div>}
            {status === 'idle' && <Button variant="primary" onClick={() => { void start(); }}>{labels.start}</Button>}
            {status === 'asking' && <Button variant="primary" loading>{labels.start}</Button>}
            {(status === 'denied' || status === 'no-camera' || status === 'no-frame') && <Button onClick={() => { void start(); }}>{labels.retry}</Button>}
          </div>
        )}
      </div>
      {status === 'scanning' && (
        <div className="uix-qr-scanner__bar">
          <span className="uix-qr-scanner__message" data-hint={hint || undefined}>{message}</span>
          {torch !== null && (
            <Button size="sm" variant="ghost" aria-pressed={torch} onClick={() => { void toggleTorch(); }}>{labels.torch}</Button>
          )}
          <Button size="sm" onClick={() => { release(); setStatus('idle'); }}>{labels.stop}</Button>
        </div>
      )}
      {status === 'asking' && <p className="uix-qr-scanner__message">{message}</p>}
      <div role="status" className="uix-visually-hidden">
        {read ? fillLabel(labels.read, { value: read.value }) : problem ? problem[0] : ''}
      </div>
      {manualEntry != null && <div className="uix-qr-scanner__manual">{manualEntry}</div>}
    </div>
  );
}
