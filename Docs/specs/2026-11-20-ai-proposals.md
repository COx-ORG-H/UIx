# AI proposals v1: disclose, propose, approve, measure

Date: 2026-11-20 · Status: built in this change · Source: the enterprise-UX study, Tier 1 items #5 and #6
(`Docs/research/reports/UIx enterprise UX study.md`, "AI proposals need structural approval" and "Measure
speed and acceptance without surveilling agents"; notes in `research_notes/UIx enterprise UX study/ai_assist.md`).

## Why

UIx had nothing AI-specific, and ADR-0038 means no product can ship an AI surface until UIx does. The
first pattern the kit ships becomes the trust model for all five products, so it has to be the right one.

The research changes what "good" means. Explanations raise acceptance whether or not the AI is right and do
no better than showing confidence (Bansal et al., CHI 2021). The mere presence of sources raises trust too.
So the kit does not make AI more persuasive. It makes it **disclosed** (every AI value carries a label that
opens what, why and sources), **reversible** (an edited AI value turns human, and "Revert to AI" restores
it), and **structurally approved** (a high-consequence write has no path that skips an explicit Approve).
And it lets products **measure acceptance together with reversion** through a content-free event seam.

## What it is

| Piece | Builds on | What it does |
|---|---|---|
| `AiLabel` | `.uix-label`, `Popover` | The "AI" mark. With an explanation it is a button that opens a panel: what it is, why, the sources, "What's shared", and the limitation line |
| `SourceList` | `link.tsx` | Numbered sources that open the actual record. An empty list says so ("No sources") rather than hiding |
| `AiSuggestion` | `.uix-chip`, `AiLabel` | One suggested value with Accept, Dismiss and a "why" (the label's panel). Low and medium consequence only. Several side by side are the N-best list |
| `Field ai` + `useAiFieldValue` | `Field warning` / `Input review` | AI-filled: the label, the review border and "Filled in by AI. Check it." Edited: the field turns human and offers "Revert to AI" |
| `ProposalReview` | `DiffViewer` vocabulary, `Button` | What will happen, before/after of each change, affected records, the reversibility line, the consequence band, Approve / Edit / Reject, then Undo while the window is open |
| `AiOutputCard` | `BusyRegion`, `CopyButton`, `Spinner` | Status text, the streamed body, Stop, Retry, Copy, quiet thumbs feedback, the sources footer, and the shared announcer |
| `AiActor` | `Avatar` | "Assist (AI) · approved by Ana" for `AuditLog` `actor` and activity rows |
| `consequencePolicy(band)` | — | The band rules as data: which surface, whether auto-apply is allowed, whether approval is required |
| `uix-proposal` events | #297's `uix-feedback` | shown / accepted / dismissed / edited / reverted / undone / feedback / stopped / retried, with ids, enums and timings only |

## The bands

| Band | ITSM examples | Surface | Auto-apply | Approval |
|---|---|---|---|---|
| low | category, labels, priority | `AiSuggestion` | allowed (admin data, not UI) | one click |
| medium | assignment, duplicate link, internal work note | `AiSuggestion` or `ProposalReview` | no | one click, then an undo toast and an audit entry |
| high | resolve/close, change a CI, mass update, customer-visible reply, change approval | `ProposalReview` only | never | explicit Approve, no default focus, no keyboard shortcut |

`AiSuggestion` has no `high` band in its type, and `consequencePolicy('high').autoApply` is `false`, so a
product that reads the policy cannot wire an auto-apply path for it. `ProposalReview` never approves on
mount, on Enter inside the card, or from a timer.

## Streaming and the announcer

- One polite live region for the whole page: the kit's existing `[data-uix-announcer]` (`announcePolite`),
  created on mount so it exists, empty, before the first message.
- Tokens are never announced. At the start the status text is announced ("Summarising work notes"). While
  any card is generating, one shared heartbeat says "Loading" about every 5 s (a changed status text is
  said instead). When the card finishes, the whole message is announced once.
- `announce="final"` mutes the start and the heartbeat (secondary chatter such as tool-call steps).
- Under reduced motion there is no streaming animation: no caret, no reveal, and `useStreamingText` hands the
  body over in whole sentences instead of token by token.

## The event seam

- `uix-proposal` is a bubbling `CustomEvent` on the component's root, so `document` hears every one and a
  product can also listen on a region. Same construction as #297's `uix-feedback` (the window's
  `CustomEvent`, a no-op on the server, an exported name constant).
- `event.detail` carries only: `action`, `proposalId`, `kind` (suggestion / field / proposal / output),
  `type` (the product's own id, e.g. `incident.category`), `consequence`, `rating` (up / down), and two
  timings: `elapsedMs` since shown and `sinceAcceptMs` for a revert or undo after an accept, plus `at`.
- Ids and `type` must match `^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,127}$`. Anything else (a sentence, an email
  address, a ticket title) is refused, the event is not sent and a console warning names the field, so
  free text cannot leak into analytics by accident. There is no sink in the kit: products adapt.
- `onProposalEvent(listener, target?)` subscribes and returns the unsubscribe. `emitProposalEvent(detail)`
  is for surfaces the product builds itself (an undo toast, an "Add to composer").

Acceptance alone rewards overreliance. The docs page tells products to report acceptance next to reversion
(reverted + undone over accepted) and next to downstream correctness (reopened incidents, reassignment after
an AI assignment).

## Not in v1

N-best as one component (several chips are the list today), numeric confidence (PAIR: test before default),
an `AgentPlan` step list, a "needs approval" TaskTray state, admin autonomy settings (Tier 3 #26), and a
streaming-safe `Markdown` mode. Each needs the v1 pieces first.
