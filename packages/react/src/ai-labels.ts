/**
 * The words of the AI primitives (`AiLabel`, `SourceList`, `AiSuggestion`, `Field ai`,
 * `ProposalReview`, `AiOutputCard`, `AiActor`). In a module of its own, with no "use client", so a
 * server component can import the defaults as plain values. Translate them once through
 * `UixLabelsProvider` (`ai`) or per instance through `labels`. `{name}` placeholders are filled in.
 *
 * Accessible names keep the visible word inside them (WCAG 2.5.3 Label in Name): the "AI" button
 * is "AI: about this suggestion", so a speech-input user who says "click AI" reaches it.
 */
export interface AiLabels {
  /** The visible mark. Default "AI". */
  mark: string;
  /** The mark's accessible name when it opens an explanation. `{subject}`. */
  explain: string;
  /** `{subject}` when none is given. */
  subjectDefault: string;
  /** The panel's heading. */
  panelTitle: string;
  what: string;
  why: string;
  sources: string;
  /** The "What's shared" link: what is sent, and whether it is used for training. */
  shared: string;
  /** The limitation line every panel ends with. */
  limitation: string;
  /** The heading of a `SourceList` when it has none of its own. */
  sourceList: string;
  /** Said when there are no sources: the answer is not grounded in a record. */
  noSources: string;
  /** A suggestion chip's group name. `{value}`. */
  suggestion: string;
  /** `{value}` */
  accept: string;
  /** `{value}` */
  dismiss: string;
  /** The message under an AI-filled field. */
  fieldFilled: string;
  /** The button on an edited field that restores the AI value. */
  revert: string;
  /** Its accessible name. `{label}` (the field's label). */
  revertFor: string;
  /** Said after a revert. */
  reverted: string;
  /** `ProposalReview`: the band names. */
  bandLow: string;
  bandMedium: string;
  bandHigh: string;
  /** Shown on a high-consequence proposal. */
  needsApproval: string;
  changes: string;
  before: string;
  after: string;
  affected: string;
  /** Reversibility lines. `{seconds}`. */
  undoFor: string;
  undoable: string;
  notUndoable: string;
  approve: string;
  edit: string;
  reject: string;
  undo: string;
  /** Status lines of a proposal. */
  applying: string;
  applied: string;
  rejected: string;
  undone: string;
  failed: string;
  /** `AiOutputCard` */
  generating: string;
  /** The heartbeat while generating. Default "Loading". */
  loading: string;
  stop: string;
  retry: string;
  copy: string;
  copied: string;
  copyFailed: string;
  stopped: string;
  error: string;
  /** Said once when the output is complete. `{title}`, `{text}`. */
  done: string;
  /** The feedback group and its two toggles. */
  feedback: string;
  helpful: string;
  notHelpful: string;
  /** Said after feedback. */
  thanks: string;
  /** `AiActor`: the AI tag after the name, and the approval clause. `{name}`. */
  actorTag: string;
  proposedBy: string;
  approvedBy: string;
}

export const DEFAULT_AI_LABELS: AiLabels = {
  mark: 'AI',
  explain: 'AI: about {subject}',
  subjectDefault: 'this content',
  panelTitle: 'Made with AI',
  what: 'What it is',
  why: 'Why',
  sources: 'Sources',
  shared: 'What is shared with the AI',
  limitation: 'AI can be wrong. Check it before you rely on it.',
  sourceList: 'Sources',
  noSources: 'No sources: this is not based on a record you can check.',
  suggestion: 'AI suggestion: {value}',
  accept: 'Accept {value}',
  dismiss: 'Dismiss {value}',
  fieldFilled: 'Filled in by AI. Check it.',
  revert: 'Revert to AI',
  revertFor: 'Revert to AI: {label}',
  reverted: 'AI value restored',
  bandLow: 'Low impact',
  bandMedium: 'Medium impact',
  bandHigh: 'High impact',
  needsApproval: 'Needs your approval',
  changes: 'What changes',
  before: 'Now',
  after: 'After',
  affected: 'Affected',
  undoFor: 'Can be undone for {seconds} s',
  undoable: 'Can be undone',
  notUndoable: 'Cannot be undone',
  approve: 'Approve',
  edit: 'Edit',
  reject: 'Reject',
  undo: 'Undo',
  applying: 'Applying…',
  applied: 'Applied',
  rejected: 'Rejected',
  undone: 'Undone',
  failed: 'Could not apply it',
  generating: 'Generating',
  loading: 'Loading',
  stop: 'Stop',
  retry: 'Retry',
  copy: 'Copy',
  copied: 'Copied',
  copyFailed: 'Could not copy. Select the text instead.',
  stopped: 'Stopped',
  error: 'Something went wrong',
  done: '{title} ready. {text}',
  feedback: 'Was this helpful?',
  helpful: 'Helpful',
  notHelpful: 'Not helpful',
  thanks: 'Thanks for the feedback',
  actorTag: 'AI',
  proposedBy: 'Proposed by {name}',
  approvedBy: 'approved by {name}',
};
