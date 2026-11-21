# Comment threads

Use `Comments` for the conversation log. Each `CommentThread` takes one root, chronological replies and an optional composer. Pass system events directly to `Comments` as sibling comments. Use the same components on mobile.

```tsx
<Comments aria-label="Arbeitsprotokoll">
  <CommentThread
    root={
      <Comment author="Sophie Wagner" avatar={false}
        audience={{ kind: 'external', label: 'Von der Meldenden per E-Mail' }}
        actions={messageActions}>
        Können Sie heute noch eine Einschätzung geben?
      </Comment>
    }
    label="Antworten an diese Nachricht"
    summary="1 Antwort, davon 1 intern"
    replies={[{
      id: 'reply-mia',
      unread: true,
      content: (
        <Comment author="Mia Koch" avatar={false} unreadLabel="Neu"
          audience={{ kind: 'internal', label: 'Intern' }}>
          Der Betreiber hat den Rückruf noch nicht bestätigt.
        </Comment>
      ),
    }]}
    showEarlierLabel={(count) => `${count} weitere Antworten`}
    hideEarlierLabel="Frühere Antworten ausblenden"
    composer={
      <CommentComposer
        audience={audience}
        audienceLabel="Wer sieht die Antwort?"
        internal={{
          label: 'Intern',
          hint: 'Sophie Wagner sieht das nicht.',
          submitLabel: 'Intern speichern',
        }}
        external={{
          label: 'An Sophie Wagner',
          hint: 'Geht per E-Mail an Sophie Wagner.',
          submitLabel: 'An Sophie Wagner senden',
        }}
        onAudienceChange={setAudience}
        onSubmit={submitDraft}
        submitDisabled={!draft.trim()}
        pending={sending}
        feedback={sendStatus}
      >
        <label htmlFor="reply-sophie">Antwort</label>
        <textarea id="reply-sophie" value={draft} onChange={(e) => setDraft(e.target.value)} />
      </CommentComposer>
    }
  />
  <CommentUnreadDivider label="1 neue Antwort weiter oben" previous={{
    label: 'Zur neuen Antwort',
    onClick: () => document.getElementById('reply-mia')?.focus(),
  }} />
</Comments>
```

- For a root with internal visibility, omit `external`. The kit displays a lock label and no audience switch. The consumer still enforces authorization and visibility at the server boundary.
- The consumer owns draft state by root and supplies navigation/discard guards. Folding keeps the composer mounted. The latest three replies and any older unread replies are always visible. The fold button keeps focus when you use it. Set the active search result as `revealReplyId` so it can receive focus even if it was folded.
- During a pending send, keep the recipient and input stable and supply a localized error or status as `feedback`. Retry and email delivery belong to the consumer.
- Put a released `ActionPanel` and any `CommentReaction` in `actions`. Use `FileRow` in the comment body for attachments. The caller supplies pluralized labels, including the reaction count in its accessible name.
- These additions are opt-in. Existing flat comments, reply quotes and system events still render through the original API.
