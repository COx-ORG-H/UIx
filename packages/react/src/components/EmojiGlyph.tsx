"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { canRenderEmoji, emojiImageSrc, normalizeEmojiImageBaseUrl } from '../emoji-image.js';

/**
 * Returns a renderer for emoji glyphs. Without a (valid, same-origin) `emojiImageBaseUrl`
 * it returns the emoji text unchanged. With one, emoji this device cannot draw become a
 * same-origin `<img class="uix-emoji-img">` after mount (the server render is always text).
 */
export function useEmojiRenderer(emojiImageBaseUrl: string | undefined): (emoji: string) => ReactNode {
  const base = useMemo(() => normalizeEmojiImageBaseUrl(emojiImageBaseUrl), [emojiImageBaseUrl]);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (base) setMounted(true);
  }, [base]);
  return useCallback((emoji: string): ReactNode => {
    if (!base || !mounted || canRenderEmoji(emoji)) return emoji;
    return <img className="uix-emoji-img" src={emojiImageSrc(base, emoji)} alt={emoji} draggable={false} decoding="async" />;
  }, [base, mounted]);
}
