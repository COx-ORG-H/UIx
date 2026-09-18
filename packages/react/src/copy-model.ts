/** The part of the async Clipboard API that CopyButton needs. */
export interface ClipboardWriter {
  writeText(text: string): Promise<void>;
}

/**
 * Copies `value` and reports whether the write succeeded. It never throws: there may be no
 * clipboard (an insecure context or an old browser), or the write may be refused (no
 * permission, or the document isn't focused).
 */
export async function copyText(
  value: string,
  clipboard: ClipboardWriter | undefined = globalThis.navigator?.clipboard,
): Promise<boolean> {
  if (!clipboard || typeof clipboard.writeText !== 'function') return false;
  try {
    await clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}
