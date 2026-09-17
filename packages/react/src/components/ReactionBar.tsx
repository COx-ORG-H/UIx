"use client";

import { cx } from '../cx.js';
import { formatLabel } from '../emoji-model.js';
import type { EmojiDataLoader, EmojiLocale } from '../emoji-model.js';
import { EditorIcon } from './EditorIcons.js';
import { useEmojiRenderer } from './EmojiGlyph.js';
import { EmojiPicker } from './EmojiPicker.js';
import type { EmojiPickerLabels } from './EmojiPicker.js';
import { Tooltip } from './Tooltip.js';

export interface ReactionSummary {
  /** Unicode emoji. */
  emoji: string;
  count: number;
  /** Whether the current user is among the reactors (chip shows pressed). */
  reactedByMe: boolean;
  /** Display names of the reactors, in the order to show them. */
  names: ReadonlyArray<string>;
}

export interface ReactionBarLabels {
  /** Accessible name of the reaction group. */
  group: string;
  /** Add-reaction button. */
  addReaction: string;
  /** Chip name and tooltip. Placeholders: `{names}`, `{emoji}`, `{count}`. */
  reactedWith: string;
  /** Used when no names are known. Placeholders: `{count}`, `{emoji}`. */
  reactedCount: string;
  /** Appended to a truncated name list. Placeholder: `{count}`. */
  others: string;
}

export const DEFAULT_REACTION_BAR_LABELS: ReactionBarLabels = {
  group: 'Reactions',
  addReaction: 'Add reaction',
  reactedWith: '{names} reacted with {emoji}',
  reactedCount: '{count} reacted with {emoji}',
  others: 'and {count} more',
};

export const DEFAULT_QUICK_REACTIONS: ReadonlyArray<string> = ['👍', '✅', '👀', '🎉', '❤️'];

export interface ReactionBarProps {
  reactions: ReadonlyArray<ReactionSummary>;
  /** Called with the emoji of a clicked chip, or of an emoji picked that the user has not reacted with yet. */
  onToggle: (emoji: string) => void;
  /** Chips and the add button stay visible but cannot be used. */
  disabled?: boolean;
  /** Emoji offered first in the add-reaction picker. */
  quickPicks?: ReadonlyArray<string>;
  labels?: Partial<ReactionBarLabels>;
  /** Labels of the add-reaction picker. */
  pickerLabels?: Partial<EmojiPickerLabels>;
  /** Language of emoji names in the picker. Default `'en'`. */
  locale?: EmojiLocale;
  loadData?: EmojiDataLoader;
  /** Same-origin folder of fallback emoji PNGs, as on EmojiPicker. Unset = native emoji only. */
  emojiImageBaseUrl?: string;
  /** Names listed before "and N more". Default 10. */
  maxNames?: number;
  className?: string;
}

/**
 * Emoji reactions over `.uix-reactions`: one toggle chip per emoji (`aria-pressed`
 * when the viewer reacted), reactor names in the tooltip and the chip's accessible
 * name, and an add-reaction picker with quick picks. Informational only — the bar
 * carries no approval semantics.
 */
export function ReactionBar({
  reactions, onToggle, disabled = false, quickPicks = DEFAULT_QUICK_REACTIONS, labels: labelOverrides,
  pickerLabels, locale, loadData, maxNames = 10, className, emojiImageBaseUrl,
}: ReactionBarProps) {
  const renderEmoji = useEmojiRenderer(emojiImageBaseUrl);
  const labels = { ...DEFAULT_REACTION_BAR_LABELS, ...labelOverrides };

  const describe = (reaction: ReactionSummary): string => {
    if (reaction.names.length === 0) {
      return formatLabel(labels.reactedCount, { count: reaction.count, emoji: reaction.emoji });
    }
    const shown = reaction.names.slice(0, maxNames).join(', ');
    const hidden = Math.max(reaction.count, reaction.names.length) - Math.min(reaction.names.length, maxNames);
    const names = hidden > 0 ? `${shown} ${formatLabel(labels.others, { count: hidden })}` : shown;
    return formatLabel(labels.reactedWith, { names, emoji: reaction.emoji, count: reaction.count });
  };

  return (
    <div className={cx('uix-reactions', className)} role="group" aria-label={labels.group}>
      {reactions.filter((r) => r.count > 0).map((reaction) => {
        const text = describe(reaction);
        return (
          <Tooltip key={reaction.emoji} label={text}>
            <button
              type="button"
              className="uix-reaction"
              aria-pressed={reaction.reactedByMe}
              aria-label={text}
              data-mine={reaction.reactedByMe || undefined}
              disabled={disabled}
              onClick={() => onToggle(reaction.emoji)}
            >
              <span aria-hidden="true">{renderEmoji(reaction.emoji)}</span>
              <span className="uix-reaction__count" aria-hidden="true">{reaction.count}</span>
            </button>
          </Tooltip>
        );
      })}
      <EmojiPicker
        quickPicks={quickPicks}
        labels={pickerLabels}
        locale={locale}
        loadData={loadData}
        emojiImageBaseUrl={emojiImageBaseUrl}
        onSelect={(emoji) => {
          if (!reactions.some((r) => r.emoji === emoji && r.reactedByMe)) onToggle(emoji);
        }}
        trigger={
          <button type="button" className="uix-reaction-add" aria-label={labels.addReaction} title={labels.addReaction} disabled={disabled}>
            <EditorIcon name="addReaction" />
          </button>
        }
      />
    </div>
  );
}
