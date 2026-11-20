---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

AI proposals v1 and a content-free event seam (enterprise-UX study, Tier 1 #5 and #6).

- `AiLabel` marks AI content in the info accent (never a glow) and opens what, why, sources, "What is shared" and the limitation line; `SourceList` numbers the records an answer is based on and says "No sources" when there are none.
- `AiSuggestion`: one suggested value with Accept, Dismiss and the "why" panel, for the low and medium bands only.
- `Field ai` and `useAiFieldValue`: AI-filled takes the `Input warning` review state and the AI mark; an edit makes the value the person's; "Revert to AI" restores it. `Field` stays server-renderable.
- `ProposalReview`: the approval card. What will happen, every change before and after, what it touches, whether it can be undone, the consequence band; Approve, Edit, Reject, then Undo inside `undoSeconds`. It never approves by itself.
- `AiOutputCard` with `startAiGeneration` and `useStreamingText`: specific status text, Stop, Retry, Copy, quiet thumbs, sources. One shared polite region says the status once, "Loading" about every 5 s and the whole answer once, never tokens; no caret and sentence-sized text under reduced motion.
- `AiActor`: "Proposed by Assist AI, approved by Ana" for audit and activity entries.
- `consequencePolicy(band)` and the `uix-proposal` DOM event (`emitProposalEvent`, `onProposalEvent`, `PROPOSAL_EVENT`, `ID_PATTERN`): ids, enums and timings only; a detail with free text in an id is refused.
- Tokens: `components/ai-assistance.css`.
