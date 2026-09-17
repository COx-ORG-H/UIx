/* Same-origin emoji fallback images (RTE-01, on-prem edition).
 *
 * Locked-down clients (Citrix/VDI, thin clients) often have no colour emoji font. When a
 * host passes `emojiImageBaseUrl`, emoji the device cannot draw are shown as
 *
 *   `${emojiImageBaseUrl}/${emojiImageFileName(emoji)}`
 *
 * UIx ships no image set and never builds a URL on its own: without the prop, emoji are
 * native text only. The base must be same-origin (a path starting with "/" or "./");
 * anything with a scheme or a protocol-relative "//" is ignored.
 *
 * File naming — one PNG per emoji, named after every code point of the emoji as
 * lowercase hex, joined with "-", including ZWJ (200d), variation selectors (fe0f)
 * and skin-tone modifiers:
 *
 *   👍   → 1f44d.png            ❤️   → 2764-fe0f.png
 *   👩‍💻 → 1f469-200d-1f4bb.png  🇩🇪 → 1f1e9-1f1ea.png
 *
 * Image sets that drop "fe0f" from file names (e.g. Twemoji) need a copy or symlink
 * under the full name; `emojiImageFileName` is exported for generating that mapping.
 */

declare const process: { env: { NODE_ENV?: string } } | undefined;

const warned = new Set<string>();
const devWarn = (message: string) => {
  if (warned.has(message) || typeof process === 'undefined' || process.env.NODE_ENV === 'production') return;
  warned.add(message);
  console.warn(message);
};

/**
 * The usable base path, or `undefined` for unset/rejected values. Accepts "/path" and
 * "./path"; rejects schemes ("https:", "data:", "javascript:"), protocol-relative
 * "//host", backslashes and whitespace. Trailing slashes are removed.
 */
export function normalizeEmojiImageBaseUrl(value: string | undefined): string | undefined {
  if (value === undefined || value === '') return undefined;
  const sameOrigin = /^(?:\/(?![/\\])|\.\/)/.test(value) && !/[\\\s]/.test(value) && !/^[^/?#]*:/.test(value);
  if (!sameOrigin) {
    devWarn(`uix: emojiImageBaseUrl "${value}" was ignored — only same-origin paths starting with "/" or "./" are allowed.`);
    return undefined;
  }
  return value.replace(/\/+$/, '') || '/';
}

/** `👩‍💻` → `1f469-200d-1f4bb.png` */
export function emojiImageFileName(emoji: string): string {
  return `${Array.from(emoji, (ch) => ch.codePointAt(0)!.toString(16)).join('-')}.png`;
}

export function emojiImageSrc(base: string, emoji: string): string {
  return `${base === '/' ? '' : base}/${emojiImageFileName(emoji)}`;
}

const support = new Map<string, boolean>();
let context: CanvasRenderingContext2D | null | undefined;
const SIZE = 20;

/**
 * Whether this device draws `emoji` in colour. Draws it on a small canvas and looks for a
 * coloured pixel: a missing glyph (tofu) or a monochrome fallback font is drawn in plain
 * black. Without a DOM or canvas (server, tests) the answer is `true`, so nothing is
 * swapped for an image there. Results are cached per emoji.
 */
export function canRenderEmoji(emoji: string): boolean {
  const cached = support.get(emoji);
  if (cached !== undefined) return cached;
  if (typeof document === 'undefined') return true;
  if (context === undefined) {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = SIZE;
      canvas.height = SIZE;
      context = typeof canvas.getContext === 'function' ? canvas.getContext('2d', { willReadFrequently: true }) : null;
    } catch {
      context = null;
    }
  }
  if (!context) return true;
  let result = true;
  try {
    context.clearRect(0, 0, SIZE, SIZE);
    context.fillStyle = '#000';
    context.textBaseline = 'top';
    context.font = `${SIZE - 4}px sans-serif`;
    context.fillText(emoji, 0, 0);
    const { data } = context.getImageData(0, 0, SIZE, SIZE);
    result = false;
    for (let i = 0; i < data.length; i += 4) {
      const [r, g, b, a] = [data[i]!, data[i + 1]!, data[i + 2]!, data[i + 3]!];
      if (a > 0 && (Math.abs(r - g) > 12 || Math.abs(g - b) > 12)) { result = true; break; }
    }
  } catch {
    result = true;
  }
  support.set(emoji, result);
  return result;
}

/** Test hook: forget cached answers and the canvas. */
export function resetEmojiSupportCache(): void {
  support.clear();
  context = undefined;
}

/**
 * Emoji sequences in text: RGI emoji where the engine supports the `v` flag, otherwise
 * pictographs with their modifiers, ZWJ joins and flag pairs.
 */
export function emojiPattern(): RegExp {
  try {
    return new RegExp('\\p{RGI_Emoji}', 'gv');
  } catch {
    return /\p{Regional_Indicator}{2}|(?:\p{Extended_Pictographic}|[#*0-9]️?⃣)(?:️|\p{Emoji_Modifier})*(?:‍\p{Extended_Pictographic}(?:️|\p{Emoji_Modifier})*)*/gu;
  }
}
