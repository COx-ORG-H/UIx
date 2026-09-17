// @tensor_1/react/emoji — EmojiPicker and ReactionBar (RTE-01).
// The default data loader needs the optional peer `emojibase-data`; the dataset is
// imported dynamically when a picker first opens.
export { EmojiPicker, DEFAULT_EMOJI_PICKER_LABELS, EMOJI_GRID_COLUMNS } from './components/EmojiPicker.js';
export type { EmojiPickerProps, EmojiPickerLabels } from './components/EmojiPicker.js';
export type { Placement, Side, Align } from './overlay-position.js';
export { ReactionBar, DEFAULT_REACTION_BAR_LABELS, DEFAULT_QUICK_REACTIONS } from './components/ReactionBar.js';
export type { ReactionBarProps, ReactionBarLabels, ReactionSummary } from './components/ReactionBar.js';
export { buildEmojiData, loadEmojiData, searchEmoji } from './emoji-model.js';
export { canRenderEmoji, emojiImageFileName, normalizeEmojiImageBaseUrl } from './emoji-image.js';
export type {
  EmojiData, EmojiDataLoader, EmojiEntry, EmojiGroup, EmojiLocale, CompactEmoji, EmojiMessages,
} from './emoji-model.js';
