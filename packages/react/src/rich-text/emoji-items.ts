import { emojis } from '@tiptap/extension-emoji';
import type { EmojiItem } from '@tiptap/extension-emoji';

/**
 * The emoji list the editor configures `@tiptap/extension-emoji` with (RTE-01, on-prem).
 *
 * Upstream's default list carries a `fallbackImage` on a public CDN for nearly every
 * entry, and its GitHub list adds image-only custom emoji. Either would make a browser
 * request third-party images for emoji the device cannot draw. This list keeps only
 * Unicode emoji and drops every image URL, so the editor never builds a remote URL.
 * Same-origin fallback images are opt-in through `emojiImageBaseUrl`.
 */
export const OFFLINE_EMOJI_ITEMS: ReadonlyArray<EmojiItem> = Object.freeze(
  emojis
    .filter((item) => typeof item.emoji === 'string' && item.emoji !== '')
    .map(({ fallbackImage: _remote, ...item }) => item as EmojiItem)
    .filter((item) => !/https?:|\/\//i.test(JSON.stringify(item))),
);
