/**
 * The overlays that answer Escape and a press outside, oldest first (HAR-1831). Only the newest
 * one answers: a `Popconfirm` opened from inside another closes first, and the one below it
 * waits for the next Escape. Plain module state: the order is the order of opening, across every
 * React root on the page.
 */
const layers: object[] = [];

/** Register an open overlay; the returned function removes it (call it when it closes). */
export function pushLayer(token: object): () => void {
  layers.push(token);
  return () => {
    const i = layers.lastIndexOf(token);
    if (i >= 0) layers.splice(i, 1);
  };
}

/** Whether `token` is the newest open overlay. */
export const isTopLayer = (token: object): boolean => layers[layers.length - 1] === token;
