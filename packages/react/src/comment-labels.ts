import type { UixCountLabel } from './plural.js';

/**
 * The words of `Comment`, `CommentThread`, `CommentComposer`, `CommentNewNotice` and
 * `useCommentDrafts` (HAR-4713). In a module of its own, with no "use client", so a server
 * component can import the defaults as plain values. Set them once with `UixLabelsProvider`
 * `comments`; an explicit prop on one instance still wins.
 *
 * `{name}` is the person a message goes to or comes from, e.g. "Sophie Wagner".
 */
export interface CommentLabels {
  /** Byline of a `variant="system"` entry with no author. */
  system: string;
  /** Label on the quote of the message a reply answers. */
  replyTo: string;
  /** Badge on an internal message, and the internal choice in the composer. */
  internal: string;
  /** Badge on a message that went out or came in by e-mail and names nobody. */
  external: string;
  /** The marker on an entry the viewer has not seen. Never shown on the viewer's own entries. */
  new: string;
  /** The name of a thread's list of replies. */
  replies: string;
  /** The fold button while earlier replies are hidden; `{count}` is how many. */
  showEarlier: UixCountLabel;
  /** The fold button while earlier replies are shown. */
  hideEarlier: string;
  /** The marker on a thread that holds an unsent reply. */
  draft: string;
  /** The name of the composer's audience choice. */
  audience: string;
  /** The internal hint when the composer knows no outside person. */
  internalHint: string;
  /** The internal hint that names the person who will not see it; `{name}`. */
  internalHintNamed: string;
  /** The commit button while the audience is internal. */
  saveInternal: string;
  /** The outside choice; `{name}`. */
  externalOption: string;
  /** The outside hint; `{name}`. */
  externalHint: string;
  /** The commit button while the audience is outside; `{name}`. */
  send: string;
  /** The outside hint when no person is named. */
  externalHintUnnamed: string;
  /** The commit button while the audience is outside and no person is named. */
  sendUnnamed: string;
  /** The divider above the new entries. */
  newSince: string;
  /** The count line of the new-since notice; `{count}`. */
  newCount: UixCountLabel;
  /** The notice's button that brings the new entry into view (the arrow is an icon). */
  show: string;
  /** The stepper's position; `{current}` and `{count}`. */
  step: string;
  /** The stepper's previous button. */
  previousNew: string;
  /** The stepper's next button. */
  nextNew: string;
  /** The question before an unsent reply is thrown away. */
  discardTitle: string;
  /** What is lost, when the reply names nobody. */
  discardDescription: string;
  /** What is lost, when the reply goes to someone; `{name}`. */
  discardDescriptionNamed: string;
  /** The question before the page is left with unsent replies. */
  leaveTitle: string;
  /** What is lost when the page is left with unsent replies; `{count}`. */
  leaveDescription: UixCountLabel;
  /** The safe choice of the discard question. It has focus when the question opens. */
  keepWriting: string;
  /** Throws the unsent reply away. */
  discard: string;
}

export const DEFAULT_COMMENT_LABELS: CommentLabels = {
  system: 'System',
  replyTo: 'In reply to',
  internal: 'Internal',
  external: 'By email',
  new: 'New',
  replies: 'Replies',
  showEarlier: { one: '{count} more reply', other: '{count} more replies' },
  hideEarlier: 'Hide earlier replies',
  draft: 'Draft',
  audience: 'Who sees the reply?',
  internalHint: 'Only your team sees this.',
  internalHintNamed: '{name} will not see this.',
  saveInternal: 'Save internally',
  externalOption: 'To {name}',
  externalHint: 'Goes to {name} by email.',
  send: 'Send to {name}',
  externalHintUnnamed: 'Goes out by email.',
  sendUnnamed: 'Send by email',
  newSince: 'New since your last visit',
  newCount: { one: '{count} new reply', other: '{count} new replies' },
  show: 'Show',
  step: '{current} of {count}',
  previousNew: 'Previous new reply',
  nextNew: 'Next new reply',
  discardTitle: 'Discard the unsent reply?',
  discardDescription: 'Your reply has not been sent.',
  discardDescriptionNamed: 'Your reply to {name} has not been sent.',
  leaveTitle: 'Leave without sending?',
  leaveDescription: { one: '{count} reply has not been sent.', other: '{count} replies have not been sent.' },
  keepWriting: 'Keep writing',
  discard: 'Discard',
};
