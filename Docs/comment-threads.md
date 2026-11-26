# Comment threads

Use `Comments` for the conversation log. Each `CommentThread` takes one root, chronological replies and an optional composer: one level only, replies on a rail with smaller avatars. Pass system events directly to `Comments` as sibling comments. Use the same components on mobile. The live specimen is on the docs site's CRM / ITSM route ("Comment threads").

The parts have no words of their own. Wrap the page in `UixLabelsProvider` with a label pack (`@tensor_1/react/locales/de` and the others) or your own `comments` words; English is only the fallback. The fold count, the new count and the leave question pick their plural form in the pack's locale.

```tsx
import { de } from '@tensor_1/react/locales/de';

const drafts = useCommentDrafts();

<UixLabelsProvider labels={de}>
  <Comments aria-label="Arbeitsprotokoll">
    <CommentThread
      root={
        <ActionPanelScope name="Nachricht von Sophie Wagner" tabIndex={0} role="group"
          aria-label="Nachricht von Sophie Wagner" actions={messageActions}>
          <Comment author="Sophie Wagner" avatar={false}
            audience={{ kind: 'external', label: 'Von der Meldenden · per E-Mail' }}
            actions={<>
              {replyButton}{reactions}
              <Button ref={moreRef} variant="ghost" size="sm" icon aria-label="Aktionen anzeigen"
                aria-haspopup="dialog" onClick={() => setActionsOpen(true)}>
                <MoreHorizontalIcon size={16} aria-hidden />
              </Button>
              <ActionPanel open={actionsOpen} onOpenChange={setActionsOpen} anchor={moreRef}
                name="Nachricht von Sophie Wagner" actions={messageActions} />
            </>}>
            Können Sie heute noch eine Einschätzung geben?
          </Comment>
        </ActionPanelScope>
      }
      summary="1 Antwort · davon 1 intern"
      replies={[{
        id: 'reply-mia',
        unread: true,
        content: (
          <Comment author="Mia Koch" avatar={false}
            audience={{ kind: 'internal' }}
            attachments={<ul className="uix-file-rows"><FileRow as="li" name="rueckruf.msg" size={96_000} /></ul>}>
            Der Betreiber hat den Rückruf noch nicht bestätigt.
          </Comment>
        ),
      }]}
      draft={replyOpen ? undefined : drafts.get('sophie')}
      onResumeDraft={() => setReplyOpen(true)}
      composer={replyOpen && (
        <CommentComposer
          recipient="Sophie Wagner"
          external
          audience={audience}
          onAudienceChange={setAudience}
          onSubmit={(event) => send(new FormData(event.currentTarget).get('audience'))}
          submitDisabled={!drafts.has('sophie')}
          pending={sending}
          feedback={sendStatus}
          footerActions={<Button variant="ghost" onClick={() => drafts.discard('sophie', {
            recipient: audience === 'external' ? 'Sophie Wagner' : undefined,
            onDiscard: () => { setReplyOpen(false); replyButtonRef.current?.focus(); },
            onKeep: () => document.getElementById('reply-sophie')?.focus(),
          })}>Abbrechen</Button>}
        >
          <label htmlFor="reply-sophie">Antwort</label>
          <textarea id="reply-sophie" value={drafts.get('sophie')}
            onChange={(e) => drafts.set('sophie', e.target.value)} />
        </CommentComposer>
      )}
    />
    <CommentNewNotice count={newIds.length} current={at + 1}
      onShow={() => document.getElementById(newIds[at])?.focus()}
      onStep={(step) => setAt((i) => (i + step + newIds.length) % newIds.length)} />
  </Comments>
  {drafts.dialog}
</UixLabelsProvider>
```

## Audience

- Every message says who can see it, never by colour alone: internal has a filled lock badge ("Intern") and a hairline outline; outside has an outlined envelope badge ("An Sophie Wagner · per E-Mail", "Von der Meldenden") and a filled bubble. Neutral only: amber and red stay for attention and breakage.
- `audience={{ kind: 'internal' }}` takes "Intern" from the labels. Name the person on an outside message with `label`.
- Read the audience to send with from the submitted form, `new FormData(form).get('audience')` (or `form.dataset.audience`), never from your own state alone. The kit owns the field named `audience`: do not add one of your own. A thread without `external` is locked internal and submits `internal` whatever `audience` says.
- The composer's choice is always in the same order, internal first. The line under it says who will see the message, the commit button names the audience ("Intern speichern" / "An Sophie Wagner senden"), and the frame restyles with the audience. Pass `recipient` and `external` (true, or your own words per field) to offer the outside choice. For a root with internal visibility, omit `external`: the kit shows a lock label and no switch. The consumer still enforces authorization and visibility at the server boundary.
- The commit button is filled for the outside audience and bordered for internal. A page whose one filled action sits elsewhere (an incident header's next step) passes `submitVariant="secondary"`: the button stays bordered for both audiences and still names the person and carries the envelope (one primary per screen).
- The field can be a plain `textarea` or the kit `RichTextEditor` (field variant). As a direct child of the composer the editor draws no frame of its own: the composer's frame and focus ring hold it, so there is no box in a box.

## New entries

- Mark a reply the viewer has not seen with `unread` and the viewer's own replies with `own`, on the `CommentThread` reply. The `Comment` inside takes both from the thread, so the chip and the fold always agree; an own entry never shows "Neu" and never stays unfolded for being new. Outside a thread (a root, a flat list), set `isNew` and `own` on the `Comment`; an explicit prop always wins.
- Render one `CommentNewNotice` per conversation, where the new entries begin: the divider "Neu seit Ihrem letzten Besuch", then one row with the count and "Anzeigen ↑". The stepper ("2 von 3", previous, next) shows only when there is more than one new entry and `onStep` is given. `summary` replaces the count line ("3 neue Antworten in 2 früheren Threads"); `direction="below"` turns the arrow. `onShow` moves focus to the entry, which keeps its `tabIndex={-1}` target in the thread.
- `CommentUnreadDivider` (2.71) still renders but is deprecated: use `CommentNewNotice`.

## Fold

- The latest three replies and every new reply that is not the viewer's own are always visible; earlier ones sit behind "N weitere Antworten". The fold button keeps focus when you use it. Set the active search result as `revealReplyId` so it can receive focus even if it was folded.

## Drafts

- `useCommentDrafts()` keeps one draft per thread ID while the person moves between threads, folds replies or switches the audience. `discard(threadId, { recipient, onDiscard, onKeep })` asks "Ungesendete Antwort verwerfen?" before an unsent reply is thrown away, and discards a blank draft at once. While any thread holds text, reloading or closing the page gets the browser's own prompt, and `confirmLeave(proceed, stay)` asks before in-app navigation, wired to your router as `useLeaveGuard`'s `confirm`. Render `drafts.dialog` once. Call `clear(threadId)` after a send succeeded.
- While a thread's composer is closed (`composer` is `null`, `undefined` or `false`), pass its draft as `draft`: the thread shows "Entwurf" and the start of its first line (at most 120 characters); `onResumeDraft` makes the line a button that reopens the composer.
- After "Verwerfen" the button that asked is usually gone with the composer: move focus in `onDiscard` to what opened it (the thread's reply button), and back to the field in `onKeep`.

## Actions, reactions, attachments

- Give a message its actions twice over, as the example does: `ActionPanelScope` around the `Comment` for the keyboard (Strg+K on it opens the `ActionPanel`; name the scope with `role="group"` and `aria-label`, it is a tab stop), and a visible ⋯ button in `actions` that opens a controlled `ActionPanel` anchored to it, for pointer and touch. Put the visible reply button and any `CommentReaction` in `actions` too. A reaction is an icon from the kit and a count (`glyph={<ThumbsUpIcon size={14} />}` from `@tensor_1/react/icons`), named with the count and who reacted ("Daumen hoch, 1, Mia Koch").
- Put `FileRow`s in `attachments`, as `<ul className="uix-file-rows">` of `FileRow as="li"`: each row carries its kind icon.
- During a pending send, keep the recipient and input stable and supply a localized error or status as `feedback`. Retry and email delivery belong to the consumer.
- `Comments.tsx` is a client module since 2.73 (`Comment` reads `UixLabelsProvider`). A server component can still render `Comments` and `Comment` with server-rendered children; it cannot call `useCommentLabels`.
- These additions are opt-in. Existing flat comments, reply quotes and system events still render through the original API.
