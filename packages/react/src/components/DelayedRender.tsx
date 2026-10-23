"use client";

import type { ReactNode } from 'react';
import { useDelayedPending } from '../hooks/useDelayedPending.js';

/**
 * Renders `children` only once they have been mounted for `delay` ms (HAR-2580). The client
 * half of `Spinner delay` and `LoadingState delay`, so those stay server-renderable: a
 * loader whose work ends inside the delay never appears. Inserting the loader after the
 * delay is what announces it, as it always has.
 */
export function DelayedRender({ delay, children }: { delay: number; children?: ReactNode }) {
  const shown = useDelayedPending(true, { delay, minVisible: 0 });
  return shown ? <>{children}</> : null;
}
