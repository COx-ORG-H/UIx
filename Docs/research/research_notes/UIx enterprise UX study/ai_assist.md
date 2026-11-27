# AI assistance inside enterprise work tools: component patterns for UIx (consumer: TENSOR ITSM)

Research date: 2026-11-20. Method: about 17 web searches and fetches. Primary sources were preferred: vendor docs, design-system docs, and CHI/MSR papers. Practitioner blogs are marked as such. Anything not backed by a fetched source is in **Gaps** or marked **[unverified]**.

---

## 1. Published guidance (PAIR, HAX, Apple HIG, Carbon for AI, vendor patterns)

### Takeaway
The published guidance agrees on six points:
- Disclose AI where it is used.
- Make outputs easy to dismiss, edit and revert.
- Put the explanation one click away, not inline by default.
- Make feedback voluntary and low-friction.
- Confirm consequential actions.
- Treat confidence display as optional and tested, never a default.

Among design systems, IBM Carbon has the most concrete component-level spec. It has an AI label that opens an explainability popover, AI variants of ordinary form and data components, and a "revert to AI" state after a user edits.

### Cited Findings

**Microsoft HAX: 18 Guidelines for Human-AI Interaction** (Amershi et al., CHI 2019), grouped by phase:
- **Initially:** G1 "Make clear what the system can do"; G2 "Make clear how well the system can do what it can do".
- **During interaction:** G3 Time services based on context; G4 Show contextually relevant information; G5 Match relevant social norms; G6 Mitigate social biases.
- **When wrong:** G7 Support efficient invocation; G8 Support efficient dismissal; G9 Support efficient correction; G10 Scope services when in doubt; G11 Make clear why the system did what it did.
- **Over time:** G12 Remember recent interactions; G13 Learn from user behavior; G14 Update and adapt cautiously; G15 Encourage granular feedback; G16 Convey the consequences of user actions; G17 Provide global controls; G18 Notify users about changes.

Sources: [MSR blog](https://www.microsoft.com/en-us/research/blog/guidelines-for-human-ai-interaction-design/). The HAX Toolkit pairs these with a Design Library of patterns and a Workbook for prioritising them ([HAX Toolkit](https://www.microsoft.com/en-us/haxtoolkit/ai-guidelines/)). The authors say the guidelines are not meant to be used as a simple checklist ([MSR publication](https://www.microsoft.com/en-us/research/publication/guidelines-for-human-ai-interaction/)).

**Google PAIR Guidebook, "Explainability + Trust" chapter**
- Confidence display options are categorical (High/Medium/Low), N-best alternatives, numeric percentages, and visualisations such as error bars.
  - For categorical, the team sets the cutoffs and should state what action each bucket should prompt.
  - N-best is "especially useful in low-confidence situations" because it prompts users to apply their own judgment.
  - Numeric needs caution: it assumes users understand probability, and "97%" can read as uncertain.
  - Source: [PAIR Explainability + Trust](https://pair.withgoogle.com/chapter/explainability-trust/).
- Don't show confidence when it doesn't change the user's decision, since fine-grained values like 85.8% vs 87% can confuse. Don't show it when a falsely high score could lead inexperienced users to accept blindly. Test confidence displays before committing to them. — [PAIR](https://pair.withgoogle.com/chapter/explainability-trust/)
- Explanations:
  - Partial explanations are the recommended default.
  - "Don't say 'what' without saying 'why' in a high stakes scenario."
  - The moment after a user acts is "the perfect time to show explanations".
  - Articulate data sources and their scope, and flag missing data.
  - Increase automation gradually as trust grows.
  - Source: [PAIR](https://pair.withgoogle.com/chapter/explainability-trust/)

**Apple HIG, Generative AI**
- "Clearly identify when and where you use AI."
- "Never trick someone into thinking they're interacting with or viewing content authored by a human."
- State known limitations up front.
- Source: [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/generative-ai)
- Agency controls:
  - "Surfacing controls like Edit, Undo, Retry, or Adjust near generated content preserves people's agency."
  - Let people dismiss content, and revert or retry transformations.
  - "Generally, ask for confirmation before performing a significant action on someone's behalf."
  - Source: [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/generative-ai)
- Alternatives: "Consider offering alternate versions of results." Also provide a non-AI fallback when the feature is unavailable or the person opts out. — [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/generative-ai)
- Feedback:
  - "Always make providing feedback voluntary."
  - Place the feedback affordance where it "doesn't interrupt the experience".
  - Thumbs up/down are suggested.
  - Source: [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/generative-ai)
- Latency:
  - Design a loading experience, or generate in the background while the person works elsewhere.
  - Use specific status text: "instead of 'Processing…', say … 'Summarizing key themes from your notes'".
  - Source: [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/generative-ai)
- Privacy: tell people their information "may be sent to a server", show "what's shared", say whether it is used for training, and "offer a clear way to opt out". — [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/generative-ai)
- Errors and harm: describe failures in plain language with a next step, and coach blocked requests with example prompts. "Avoid using AI-generated content in situations where a possible hallucination could misinform and harm someone." — [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/generative-ai)

**IBM Carbon for AI** (source for every bullet: [Carbon for AI](https://carbondesignsystem.com/guidelines/carbon-for-ai/))
- **AI label:** "a component used as an indicator of AI instances in the UI".
  - It is "the trigger for the explainability popover", which is the first layer of explanation and offers a route to more detail.
  - It can sit inside components, for example inside form inputs.
  - It was formerly called "AI slug". The rename is not yet reflected in code or Figma, which signals the component is not yet stable.
- **AI presence styling:** "brightness, glow, and gradients".
  - Glow sits on container edges, with "limited and subtle" spread.
  - It ships as tokens in the main themes, so no separate theme is needed.
  - Do not use the styling decoratively. It identifies AI use only.
- **AI variants:** Checkbox, Data table, Date picker, Dropdown, Form, Modal, Number input, Radio, Select, Tag, Text input and Tile each have one.
  - Every AI component embeds the AI label and the popover.
  - The component "still functions like the standard one".
- **Revert:** when a user manually edits AI-suggested content, the component switches back to the default (non-AI) variant. A **revert-to-AI** button restores the AI value.
- **AI chat:** offered as a separate stable component library (`@carbon/ai-chat`).
- **Disclosure scope:** show explanations only when needed or requested.

**Vendor patterns in ITSM and helpdesk tools**

ServiceNow Now Assist for ITSM:
- Incident summaries cover the issue, actions taken and resolution. They draw on short description, description, work notes, comments, and resolution notes when the incident is resolved.
- Agents can generate, refresh, copy, post the summary to work notes, and give feedback.
- Source: [ServiceNow docs](https://www.servicenow.com/docs/r/Mr7qUatbFXax1_h~z60rmA/zxdYU0fVMKmksUyPRFb1lQ)

ServiceNow resolution notes:
- They are generated when the agent selects Resolve and pre-fill the Resolution notes field, which stays editable.
- The docs advise reviewing for accuracy, but the step is labelled "Optional".
- Generation needs at least 50 words of input content.
- Changing the resolution code afterwards does not regenerate the notes.
- Admins can switch the trigger from automatic to manual.
- Sources: [ServiceNow resolution notes](https://www.servicenow.com/docs/r/MlbQAgTiiiMOLOw9T36wJg/hSdzyWv_uWsUK4IydM~SUw); [Now Assist ITSM overview](https://www.servicenow.com/docs/r/MlbQAgTiiiMOLOw9T36wJg/61GkqSgW0j3aOwiZBMJUQw)

Zendesk Copilot "auto assist":
- It suggests replies and up to four actions.
- Suggestions come from admin-authored procedures first, then help-centre articles, then similar solved tickets.
- Suggestions "require an agent's approval before being sent … or performed". They go out under the agent's name, and customers are not told AI was involved.
- Admins can mark custom actions "pre-approved", which then run automatically at that point in the procedure.
- Source: [Zendesk auto assist](https://support.zendesk.com/hc/en-us/articles/9945148867866-About-auto-assist)

Intercom Fin Copilot:
- Answers appear in a side panel. "Add to composer" inserts the answer for editing before send. Some plans also get "Add to composer & modify", with tone, rephrase, expand and translate options.
- Every answer links its top sources so agents can "validate answers directly in the inbox".
- It also shows suggested questions above the composer and suggested macros.
- Source: [Intercom help](https://www.intercom.com/help/en/articles/8587194-how-to-use-fin-ai-copilot). Several Intercom pages are beta-era, so plan gating may have changed.

Linear Triage Intelligence:
- Suggests team, project, assignee, labels, related issues and duplicates as inline suggestions.
- Hovering a suggestion shows a popover explaining why it was made, for example why a given person is the suggested assignee.
- Accept and dismiss are the feedback loop.
- Each team can set each property type to *show*, *hide* or *auto-apply*.
- Linear states it does not use customer data to train its own models.
- Sources: [Linear docs](https://linear.app/docs/triage-intelligence); [changelog: auto-apply](https://linear.app/changelog/2025-09-19-auto-apply-triage-suggestions); [blog](https://linear.app/blog/how-we-built-triage-intelligence)

### Inferences
- For TENSOR triage (category, priority, assignment group, duplicate), Linear's design maps almost one-to-one: an inline suggestion chip with a "why" popover, accept/dismiss, and per-property show/hide/auto-apply for admins. HAX G7–G11, G15 and G17 are all covered by that one design.
- Carbon's "AI variant + revert-to-AI" is the most transferable *form-field* pattern for AI pre-filled ticket fields. Provenance flips to "human" once edited, and the AI value stays recoverable.
- ServiceNow's "Optional: review" step is a cautionary data point. In consequential ITSM records, the review step should not be skippable by default. The UI needs an explicit commit, not a silent pre-fill.

### Gaps
- The PAIR patterns index and Apple HIG pages are JS-rendered and did not fetch directly. The PAIR content came from the chapter page and the Apple content from the HIG JSON endpoint.
- Microsoft Copilot (M365) Fluent "Copilot UX" component guidance was not fetched. Its specifics are unverified.
- Atlassian Rovo / JSM, Salesforce Einstein/Agentforce, GitHub Copilot UI docs, Notion AI and NN/g articles were not fetched in this pass, so no cited specifics are available for them.
  - One relevant data point surfaced in search: an Atlassian public bug, ROVO-978 "Ask Rovo: Dynamically updating content not announced for screen reader users" ([jira.atlassian.com](https://jira.atlassian.com/browse/ROVO-978)). That suggests even major vendors ship this accessibility gap. Only the title was seen.
- Whether Carbon's explainability popover has a defined field set (model, data, confidence) was not stated on the page. The page points to a Figma "AI Explainability kit (Beta)".

---

## 2. Components (labels, streaming, chips, ghost text, diff review, confidence, citations, "why", feedback, regenerate, stop)

### Takeaway
The component inventory falls out of the guidance:
- **Labels:** an AI label/badge that opens an explanation popover.
- **Suggestions:** inline suggestion chips with accept, dismiss and why.
- **Drafts:** draft-into-composer rather than auto-send.
- **Edits:** a review surface (diff, or editable pre-fill) with an explicit commit.
- **Sources:** source links on every grounded answer.
- **Feedback and regeneration:** quiet thumbs feedback, plus Retry/Regenerate and alternates.
- **Running output:** specific progress text and a Stop control while generating.

Confidence displays and explanations need care, because research shows both can raise blind acceptance (section 6).

### Cited Findings
- **AI label/badge:** mark AI instances. It doubles as the explainability trigger and can live inside inputs and table cells. — [Carbon for AI](https://carbondesignsystem.com/guidelines/carbon-for-ai/). Apple: "Clearly identify when and where you use AI." — [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/generative-ai)
- **AI-filled field state plus revert:** an edit switches the field to non-AI, and a "revert to AI" button restores the AI value. — [Carbon for AI](https://carbondesignsystem.com/guidelines/carbon-for-ai/)
- **Suggestion chip with a "why" popover:** hover reveals the reason, with accept or dismiss. — [Linear changelog/docs](https://linear.app/docs/triage-intelligence)
- **Rationale copy format:** "because you said X, I did Y", grounded in the user's own inputs. — [Smashing, Yocco, Feb 2026](https://smashingmagazine.com/2026/02/designing-agentic-ai-practical-ux-patterns/) (practitioner source)
- **Draft into composer:** "Add to composer" puts the answer in the reply editor before send, and rewrite options sit in a split-button dropdown. — [Intercom](https://www.intercom.com/help/en/articles/8587194-how-to-use-fin-ai-copilot)
- **Edit/Undo/Retry/Adjust near output:** place these controls adjacent to generated content, and give "a clear signal that their action had an effect" after adjustment. — [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/generative-ai)
- **Alternates / N-best:** offer alternate versions. N-best is preferred in low-confidence cases. — [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/generative-ai); [PAIR](https://pair.withgoogle.com/chapter/explainability-trust/)
- **Confidence display:**
  - Categorical buckets, each with a stated action, beat raw percentages for most users. Omit confidence when it doesn't change the decision. — [PAIR](https://pair.withgoogle.com/chapter/explainability-trust/)
  - A "confidence signal" should come with a **scope statement** of what the agent is designed to handle. — [Smashing, Feb 2026](https://smashingmagazine.com/2026/02/designing-agentic-ai-practical-ux-patterns/)
- **Citations/sources:** Fin links top sources on every answer for in-place validation. — [Intercom](https://www.intercom.com/help/en/articles/8587194-how-to-use-fin-ai-copilot). Zendesk grounds suggestions in procedures, then articles, then similar solved tickets. — [Zendesk](https://support.zendesk.com/hc/en-us/articles/9945148867866-About-auto-assist)
  - Caveat: Microsoft notes "the mere presence of sources can make users trust AI outputs more". — [MS Learn overreliance playbook](https://learn.microsoft.com/en-us/ai/playbook/technology-guidance/overreliance-on-ai/overreliance-on-ai) (wording relayed by search summary; page not fetched in full)
- **Summary card actions:** generate, refresh, copy, post to work notes, feedback. — [ServiceNow](https://www.servicenow.com/docs/r/Mr7qUatbFXax1_h~z60rmA/zxdYU0fVMKmksUyPRFb1lQ)
- **Feedback:** voluntary and non-interrupting; thumbs up/down. — [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/generative-ai). HAX G15 "Encourage granular feedback"; G16 "Convey the consequences of user actions". — [MSR](https://www.microsoft.com/en-us/research/blog/guidelines-for-human-ai-interaction-design/)
- **Progress/status text:** specific verbs, not "Processing…". — [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/generative-ai). Rotate phrases such as "Researching", "Thinking" or "Planning" so users don't assume a stall. — [Smashing, Bailey, Nov 2026](https://smashingmagazine.com/2026/11/making-immersive-llm-chat-experiences-more-accessible/)
- **Streaming and reduced motion:**
  - Streaming conversations and loading animations can distract users with attention or cognitive needs.
  - Provide a toggle that sets transition time to zero. It should default off under `prefers-reduced-motion`, with an option to re-enable.
  - Source: [Smashing, Nov 2026](https://smashingmagazine.com/2026/11/making-immersive-llm-chat-experiences-more-accessible/)
- **Stable layout during streaming:** a Smashing article "Designing Stable Interfaces For Streaming Content" (May 2026) exists ([link](https://smashingmagazine.com/2026/05/designing-stable-interfaces-streaming-content/)). It surfaced in search only and was not read, so its specifics are unverified.

### Inferences
Proposed UIx primitives, ranked by TENSOR leverage:
1. `AiLabel` (badge plus popover trigger).
2. `AiSuggestion` chip (value, why-popover, accept, dismiss, keyboard accept).
3. AI-state for `Field` (provenance, edited→human, revert-to-AI). This is a Carbon-style variant, not a separate component.
4. `AiDraft` composer insert (insert, insert & modify, alternates).
5. `AiOutputCard` (streaming body, status line, Stop, Retry, Copy, feedback, sources footer).
6. `SourceList` / citation chips.
7. Review/diff surface: UIx already has DiffViewer (released 2.24.0 per project memory), which could host accept/reject per hunk or field.

Further points:
- Treat a numeric confidence prop as opt-in. Default to categorical buckets with action copy, or N-best, per PAIR.
- **Ghost text** (inline completion accepted with Tab, as in GitHub Copilot) is widely known but **[unverified]** here, since no doc was fetched.
  - For ITSM reply composers, a draft-into-composer pattern (Intercom) is safer than ghost text. Tab-accept on long prose invites unreviewed acceptance. This is an inference.

### Gaps
- No primary source was found on streaming *pacing* (token-rate smoothing, chunking by word or sentence) or blinking-cursor conventions. These remain practitioner lore and are **[unverified]**.
- No fetched primary doc on GitHub Copilot ghost-text UI, Notion AI's accept/discard bar, or the Copilot "Regenerate / Stop generating" conventions.
- Diff accept/reject UX guidance (per-hunk vs all) was not found in a primary source.

---

## 3. Agentic actions (plan before execution, approvals, progress, undo/rollback, audit, background runs)

### Takeaway
The converging pattern set is:
- **Intent preview / plan** before acting, with the options Proceed, Edit plan, or Do it myself.
- **Per-task autonomy level.**
- **Approval gates** at risky steps only, not at every step.
- **Action audit timeline with undo**, including explicit time-limited undo windows.
- **Escalation/clarify** paths.

Vendor practice (Zendesk) puts agent approval on every suggested action by default, with admin-level "pre-approved" exceptions.

### Cited Findings
- **Intent Preview:**
  - A plain-language plan with proceed / edit / handle-it-myself choices.
  - Use it for irreversible actions, data sharing, and hard-to-undo changes.
  - Proposed metrics: acceptance ratio (unedited plans ÷ shown, target above 85%) and override frequency (above 10% triggers model review).
  - Source: [Smashing, Yocco, Feb 2026](https://smashingmagazine.com/2026/02/designing-agentic-ai-practical-ux-patterns/). The author calls the thresholds "representative benchmarks" and they are not empirically validated.
- **Autonomy Dial:** four levels per task: Observe & Suggest, Plan & Propose, Act with Confirmation, Act Autonomously. — [Smashing, Feb 2026](https://smashingmagazine.com/2026/02/designing-agentic-ai-practical-ux-patterns/). Linear's show/hide/auto-apply per property is a shipped three-level version. — [Linear docs](https://linear.app/docs/triage-intelligence)
- **Action Audit & Undo:**
  - A chronological timeline with status indicators and undo.
  - Time-limited undo windows are shown explicitly before an action becomes permanent.
  - Proposed metric: reversion rate above 5% for a task suggests disabling automation for it.
  - Source: [Smashing, Feb 2026](https://smashingmagazine.com/2026/02/designing-agentic-ai-practical-ux-patterns/)
- **Escalation Pathway:** the agent asks for clarification, offers options, or hands off to a human. A proposed healthy escalation rate is 5–15%. — [Smashing, Feb 2026](https://smashingmagazine.com/2026/02/designing-agentic-ai-practical-ux-patterns/). This matches HAX G10 "Scope services when in doubt". — [MSR](https://www.microsoft.com/en-us/research/blog/guidelines-for-human-ai-interaction-design/)
- **Approval gate in an ITSM/helpdesk product:**
  - Zendesk auto assist actions need agent approval and run under the agent's name.
  - Admins can mark actions "pre-approved" to auto-execute.
  - Up to four suggested actions at once.
  - Source: [Zendesk](https://support.zendesk.com/hc/en-us/articles/9945148867866-About-auto-assist)
- **Confirmation for significant actions:** "Generally, ask for confirmation before performing a significant action on someone's behalf." — [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/generative-ai)
- **Placement of oversight:** "put the human at the risky moments, not at every step". Practitioners say approval and undo buttons deserve primary-CTA design care. — practitioner sources summarised in search ([Towards AI](https://pub.towardsai.net/designing-for-ai-agents-8-ux-patterns-that-build-trust-in-2026-713a0c926933); [HatchWorks](https://hatchworks.com/blog/ai-agents/agent-ux-patterns/)); wording relayed by the search summary, not fetched.
- **Audit logs:** the NIST AI RMF Playbook recommends keeping histories and audit logs for oversight, and treats overrides and escalations as evidence that controls work. This was relayed via a search summary, and the NIST playbook was not fetched directly.
- **Background runs:** "generate in the background while a person uses another part of the app". — [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/generative-ai). Use specific progress copy. — [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/generative-ai)
- **Stop semantics:** long-running agent controls need start, stop and pause, with clear statements of what stopping does. — [HatchWorks](https://hatchworks.com/blog/ai-agents/agent-ux-patterns/) (vendor blog; relayed via search)

### Inferences
TENSOR mapping, by level of consequence:
- **Low consequence** (labels, category, priority): suggestion chips, with admin-configurable auto-apply.
- **Medium consequence** (assignment, linking as duplicate, posting a work note): one-click accept, with an undo toast.
- **High consequence:** closing or resolving incidents, changing CIs, mass updates, customer-visible replies. These need an intent preview listing the fields to change (DiffViewer-style before/after), an explicit approve control, an audit entry that names AI as proposer and a human as approver, and a time-boxed undo where the backend supports it.

UIx components this implies:
- **`AgentPlan`:** an ordered step list with per-step status (pending, running, needs-approval, done, failed, skipped) and per-step approve/skip.
- **`ApprovalCard`:** what, why, affected records, reversibility statement, Approve / Edit / Reject.
- **Activity/audit timeline entries** with an "AI-proposed" actor badge.
- **Undo toast with countdown** (relates to the UIx feedback kit).
- **Background-run entries in the task tray:** queued, running, needs-input, done, failed. "Needs approval" should be a distinct, attention-drawing state with a notification. The tray links back to the record.

Copy rule: every approval surface states reversibility ("Can be undone for 30 s" vs "Cannot be undone"). This follows Apple's confirmation guidance and the Smashing undo-window pattern.

### Gaps
- No primary vendor doc was fetched for ServiceNow Now Assist agentic workflows / AI Agents, Atlassian Rovo agents, or Salesforce Agentforce approval UX. Their plan/approval UIs are **[unverified]** here.
- No published empirical study was found on plan-preview effectiveness. The Smashing metric thresholds are illustrative, not measured.
- Undo semantics for side effects outside the system (email already sent to a customer) are not addressed by any fetched source.

---

## 4. Trust and safety UX (overreliance, automation bias, HITL for consequential ITSM actions, privacy)

### Takeaway
Overreliance, meaning accepting incorrect AI outputs, is the central risk. Many intuitive mitigations can **backfire**: explanations and the mere presence of sources raise trust even when the output is wrong. Microsoft's research recommends testing each mitigation with users.

For ITSM, put human approval on consequential, irreversible or customer-visible actions, make review non-optional for them, and disclose data flows and training use.

### Cited Findings
- Overreliance is defined as users accepting incorrect AI outputs. Passi and Vorvoreanu reviewed about 60 papers (MSR-TR-2022-12). — [MSR](https://microsoft.com/en-us/research/?p=854967)
- "Existing research makes clear that overreliance mitigations can backfire." Mitigations should be user-tested before deployment. This comes from MSR-TR-2025-4 (March 2025), which offers an "Overreliance Risk Identification and Mitigation Framework". — [MSR](https://www.microsoft.com/en-us/research/?p=1133469)
- Explanations can increase user trust even when they are incorrect, and the presence of sources can raise trust in outputs. — [MS Learn overreliance playbook](https://learn.microsoft.com/en-us/ai/playbook/technology-guidance/overreliance-on-ai/overreliance-on-ai) (via search summary)
- The 2024 GenAI appropriate-reliance synthesis of about 50 papers exists as a PDF. — [MSR PDF](https://microsoft.com/en-us/research/uploads/prodnew/2024/03/GenAI_AppropriateReliance_Published2024-3-21.pdf). Not fetched, so its specific mitigation rankings are **[unverified]**.
- In high-stakes cases, explain the reasoning, not just the result. Flag missing data so users know when to rely on their own judgment. — [PAIR](https://pair.withgoogle.com/chapter/explainability-trust/)
- Avoid AI-generated content where a hallucination "could misinform and harm someone". Say clearly that AI content may contain errors. — [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/generative-ai)
- ServiceNow docs advise reviewing AI resolution notes, but label the review "Optional". — [ServiceNow](https://www.servicenow.com/docs/r/MlbQAgTiiiMOLOw9T36wJg/hSdzyWv_uWsUK4IydM~SUw)
- Zendesk sends approved AI replies under the agent's name, and customers are not told AI was involved. — [Zendesk](https://support.zendesk.com/hc/en-us/articles/9945148867866-About-auto-assist)
  - Contrast with Apple: "Never trick someone into thinking they're interacting with or viewing content authored by a human if they're actually interacting with AI." — [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/generative-ai)
  - This is a live tension: vendor practice vs platform guidance.
- Privacy: disclose server transmission, what's shared and training use; use minimum data; offer opt-out. — [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/generative-ai). Linear states that customer data is not used to train its models. — [Linear docs](https://linear.app/docs/triage-intelligence)
- Global controls (HAX G17) and cautious updates (G14), and notify users of capability changes (G18). — [MSR](https://www.microsoft.com/en-us/research/blog/guidelines-for-human-ai-interaction-design/)

### Inferences
- UIx should not ship "explanation" or "sources" as trust *boosters*. Present them as verification aids: sources link to the actual KB article or ticket, and the "why" names the inputs used. Also give a visible path to "Do it myself".
- Where possible, low-confidence states should switch to N-best or ask for input, not show a lower number (PAIR, HAX G10).
- For consequential ITSM writes, the review step should be structurally required. That means an approval control and no pre-filled-and-saved path. The audit trail should record AI-proposed vs human-approved.
- A UIx "privacy disclosure" slot is warranted: an inline "What's shared" link in the AI label popover, and an admin-facing data/training statement. This is an inference from Apple and Linear.
- **Known failure modes** across sources:
  - Unlabelled AI content.
  - Optional or skippable review on consequential records (ServiceNow "Optional").
  - Silent auto-apply with no audit.
  - Explanations and citations raising blind trust.
  - Numeric confidence over-trusted ("97%"), or misread as uncertain.
  - Decorative AI glow diluting meaning (Carbon prohibits it).
  - Stale AI output after inputs change (ServiceNow notes are not regenerated when the resolution code changes).
  - Generic "Processing…" making users assume a stall.
  - Undisclosed AI authorship to end customers.

### Gaps
- Specific CHI studies on automation bias in IT operations or service desks were not found in this pass.
- The concrete mitigation effect sizes in the 2024 and 2025 MSR syntheses were not extracted, because the PDFs were not fetched.

---

## 5. Accessibility of streaming / live AI output

### Takeaway
Don't stream tokens into a live region. Use one dedicated, pre-existing, empty polite live region. Announce short status ("Generating…") while streaming, then announce the completed reply once, with parity to the visible text. Keep focus in the input, make messages navigable via headings, and honour reduced motion for streaming animation.

### Cited Findings
Source for every bullet: [Smashing, Eric Bailey, 5 Nov 2026](https://smashingmagazine.com/2026/11/making-immersive-llm-chat-experiences-more-accessible/)
- **Live region:**
  - Use one dedicated live region at the end of the DOM. Don't put `aria-live` on each message.
  - Don't announce text as it streams ("juddering and confusing experience").
  - Announce the full reply as soon as streaming finishes, with parity to the visible text.
  - Hold off on `ariaNotify()` for now.
- **Text-less loading:** announce "Loading" about 5 s after submit and every 5 s after that. The author says 5 s was the sweet spot in their user research. Mirror any visible loading text with a matching live announcement.
- **Secondary chatter:** let users mute announcements for reasoning or tool-call steps without removing that content.
- **Focus:**
  - Keep focus on the prompt input after submit.
  - Give each message a visually hidden heading with `tabindex="-1"` ("{Agent} said:").
  - Support F6 / Ctrl+F6 landmark cycling, landing on the last message heading.
- **Rich content:** for tables, announce a summary such as row and column counts. For code blocks, announce the file name or type and line count.
- **Reduced motion:** a toggle that sets animation time to zero, defaulting off under `prefers-reduced-motion`.

Other sources:
- Practitioner consensus (blogs) adds:
  - Keep the region in the DOM, empty, before injecting content.
  - Use `polite`, not `assertive`.
  - `aria-busy="true"` on the streaming region has inconsistent screen reader support, so don't rely on it alone.
  - Test with NVDA, JAWS and VoiceOver, since behaviour varies by pairing.
  - Sources: [azukiazusa](https://azukiazusa.dev/en/blog/accessible-streaming-chat-ui); [tianpan.co](https://tianpan.co/blog/2026-06-29-streaming-tokens-meet-the-screen-reader) (blogs, relayed via search, not fetched)
- WCAG 2.1/2.2 do not specifically address streaming AI responses. — practitioner claim via search ([kubaik](https://kubaik.github.io/3-wcag-traps-in-ai-chat-uis/)); **[unverified]**
- Atlassian has a public bug, ROVO-978, "Dynamically updating content not announced for screen reader users". — [jira.atlassian.com](https://jira.atlassian.com/browse/ROVO-978)

### Inferences
- UIx should own one shared `AiAnnouncer` live-region service rather than per-component live regions. It should handle three things:
  - **Start:** status phrases on start, with a throttled ~5 s heartbeat.
  - **Completion:** one completion announcement (for long output, possibly "Summary ready, 6 paragraphs" plus content).
  - **Opt-out:** for step or tool-call chatter.
- This fits UIx's existing motion contract (reduced-motion policy, per project memory). Under reduced motion, streaming should render in larger chunks, or all at once with no caret blink. Exact chunking is a design decision, not a sourced rule.
- The Stop control must stay keyboard-reachable without moving focus out of the input. A Stop shortcut (Esc) is an inference, not sourced.

### Gaps
- No standards-body guidance (W3C/WAI) specific to streaming LLM output was found.
- No primary source on whether to announce completed long answers in full or as a summary plus navigation.

---

## 6. Measured outcomes / research on what works

### Takeaway
Hard evidence is thin and mixed:
- **Acceptance rate** of shown suggestions is the best-validated *usage* metric, and it predicts perceived productivity (Copilot, 27% acceptance).
- **Explanations** do not improve human-AI team accuracy. They increase acceptance whether or not the AI is right.
- **Confidence display** performed at least as well as explanations.
- **Vendor efficiency claims** are marketing.
- **Agentic metric thresholds** in practitioner articles are illustrative.

### Cited Findings
- **Copilot acceptance rate:** Ziegler et al. (MAPS '22) analysed 2,631 survey responses matched to telemetry. The acceptance rate of shown completions was the best predictor of perceived productivity, and the reported Copilot acceptance rate was 27%. The authors caution that acceptance and correctness "might not tell the whole story". — [arXiv 2205.06537](https://arxiv.org/abs/2205.06537v1); [CACM](https://cacm.acm.org/research/measuring-github-copilots-impact-on-productivity)
- **Explanations:** Bansal et al., CHI 2021, ran studies where AI accuracy was comparable to human accuracy. Explanations did not improve complementary team performance. They increased acceptance of AI recommendations regardless of correctness, and did not beat simply showing AI confidence. — [arXiv 2006.14779](https://arxiv.org/abs/2006.14779v2); [MSR](https://www.microsoft.com/en-us/research/?p=728173)
- **Mitigations:** overreliance mitigations "can backfire" and should be user-tested before deployment. — [MSR-TR-2025-4](https://www.microsoft.com/en-us/research/?p=1133469)
- **Vendor outcomes:**
  - Intercom marketed Fin AI Copilot as "increase agent efficiency by 31%". — [Intercom blog](https://www.intercom.com/blog/?p=29859) (vendor claim; methodology not reviewed)
  - Linear customer Clay "accepted nearly 300 suggestions" from Triage Intelligence. — [Linear customers](https://linear.app/customers/clay) (anecdotal)
- **Proposed agentic metrics** (not empirically validated): acceptance ratio above 85%, override above 10% → review, reversion above 5% → disable automation, escalation 5–15%, calibration (confidence vs acceptance) correlation above 0.8, and a "scrutiny delta" (longer review of low-confidence plans). — [Smashing, Feb 2026](https://smashingmagazine.com/2026/02/designing-agentic-ai-practical-ux-patterns/)

### Inferences
- TENSOR should instrument per-suggestion events (shown, accepted, edited-then-accepted, dismissed, reverted, undone) by suggestion type. UIx components should emit these via callbacks (`onAccept`, `onDismiss`, `onRevert`, `onUndo`, `onFeedback`) so acceptance and reversion rates are measurable without per-screen wiring.
- Acceptance rate alone rewards overreliance. Pair it with reversion/undo rate and downstream correctness, such as reopened incidents or reassignment after an AI-suggested assignment. This inference follows from the Ziegler caveat and Bansal's finding.

### Gaps
- No peer-reviewed study was found on AI triage or categorisation accuracy and its UX effects in ITSM tools specifically.
- No measured study was found comparing ghost text with side-panel drafts, or diff review with direct apply, for acceptance quality.
- 2025–2026 CHI papers on agentic oversight UX were not reached within the search budget.
