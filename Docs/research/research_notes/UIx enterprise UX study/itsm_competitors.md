# ITSM / service-desk competitors: agent-facing UX teardown for TENSOR (as of 2026-11-20)

Scope: ServiceNow (Next Experience / Service Operations Workspace (SOW) / Now Assist), Jira Service Management (JSM), Freshservice (Freddy), Zendesk (Agent Workspace), HaloITSM, TOPdesk, Ivanti Neurons, ManageEngine ServiceDesk Plus, and AI-first newcomers (Serval, Atomicwork, Siit, Ravenna, Unthread, Linear Asks).
Method: about 20 web searches and fetches. Most primary sources are vendor docs, release notes and community threads. horizon.servicenow.com returned HTTP 403, so the ServiceNow Horizon design system could not be read directly. Several search summaries carried inconsistent "days ago" labels, so dated claims are flagged where that matters. Claims marked **[vendor]** are marketing or self-description. Claims marked **[unverified]** come from secondary or aggregator sources.

## 1. Queue and inbox UX (lists, SLA timers, assignment, triage, bulk, saved views, keyboard)

### Takeaway
Every leader has converged on the same queue model: rule-defined saved views/queues, J/K plus Enter keyboard traversal, multi-select bulk edit in a side panel or slider, and SLA breach time as a sortable column. The 2026 changes add view types (list/board/calendar over one queue in JSM), cross-project unified queues, and grouped OR-of-AND filters (Halo). Nobody has a clearly superior queue. Gaps remain around column ergonomics (JSM queues can't resize columns) and around shortcuts that are per-user opt-in and incomplete.

### Cited Findings
**Jira Service Management**
- Queue shortcuts: J or Down moves to the next work item, K or Up to the previous one, and O or Enter selects or opens. Shortcuts can be switched off from Help → keyboard shortcuts dialog — [Atlassian: Use keyboard shortcuts in your queues](https://support.atlassian.com/jira-service-management-cloud/docs/use-keyboard-shortcuts-in-your-queues/)
- Queues are the triage mechanism. They are rule-based lists of requests for agents — [Atlassian: Use queues to triage requests](https://support.atlassian.com/jira-service-management-cloud/docs/triage-customer-requests-for-your-agents-with-queues/)
- The "updated agent view" added one-click queue sorting, starred queues, sorting by SLA breach time, and "consolidated request details that minimize clutter so it's easy for agents to scan" **[vendor]** — [Atlassian blog: Supercharging the agent experience](https://www.atlassian.com/blog/jira-service-management/supercharging-the-agent-experience)
- Feb 2026: list, board and calendar views for queues — [Atlassian Cloud changes Feb 16–23, 2026](https://confluence.atlassian.com/cloud/blog/2026/02/atlassian-cloud-changes-feb-16-to-feb-23-2026). Jul 2026: queues from several projects can appear in one unified list view — [Atlassian Cloud changes Jul 2026](https://confluence.atlassian.com/cloud/blog/2026/07/atlassian-cloud-changes-jul-20-to-jul-27-2026) (exact week attribution of these items is **[unverified]** because the search summary mixed dates)
- Bulk edit pattern (Jira platform): selecting items brings up a toolbar, which opens a "Bulk Edit" **side panel**. Bulk select now covers up to 1,000 work items in the navigator — [Atlassian Cloud changes Jul 2026](https://confluence.atlassian.com/cloud/blog/2026/07/atlassian-cloud-changes-jul-13-to-jul-20-2026). Feb 2026: the bulk edit panel gained a "Find my fields" search box, and previously unsupported fields (Affected Services, People, Forge app fields) became editable — [Atlassian Cloud changes Feb 2026](https://confluence.atlassian.com/cloud/blog/2026/02/atlassian-cloud-changes-jan-26-to-feb-2-2026)
- Bulk AI triage: Atlassian Intelligence can suggest new request types for multiple work items at once — [Atlassian: AI features in JSM](https://support.atlassian.com/organization-administration/docs/atlassian-intelligence-features-in-jira-service-management/)

**Freshservice**
- Ticket-list shortcuts: `j`/↓ next, `k`/↑ previous, Enter opens, `x` selects (Shift selects all), Shift+? opens the full shortcut panel. Shortcuts work only when focus is outside a text field — [Freshservice: Keyboard shortcuts](https://support.freshservice.com/support/solutions/articles/234433-keyboard-shortcuts-in-freshservice); [older guide](https://support.freshservice.com/support/solutions/articles/197569-using-keyboard-shortcuts-in-your-it-service-desk)
- The ticket table refresh lists starring a favourite view, a "row indicator as accessible focus indicator", a bulk update **slider** (side sheet), and an "Assign to" dropdown — [Freshservice: Ticket table view refresh](https://support.freshservice.com/support/solutions/articles/50000003871-ticket-table-view-refresh-what-s-changing-)
- Scenario automations (multi-field macros) can run in bulk from the ticket list — [Freshworks community: Product enhancements](https://community.freshworks.com/product-updates/414)

**Zendesk**
- Views are rule-defined ticket buckets configured in Admin, with shared and personal views (legacy docs; current Agent Workspace behaviour not re-verified) — [Zendesk: Intro to the Support agent interface](https://support.zendesk.com/hc/en-us/articles/4408883355546-Introduction-to-the-Support-agent-interface-standard-agent-interface)
- New Agent Workspace shortcuts: Ctrl+Alt+Q accepts a chat, Ctrl+Alt+E ends it, Ctrl+Shift+1–9 switches among the first nine **tabs** (Zendesk uses a browser-like multi-ticket tab model) — [Zendesk: Announcing new keyboard shortcuts in Agent Workspace](https://support.zendesk.com/hc/en-us/articles/9285444325914-Announcing-new-keyboard-shortcuts-in-Agent-Workspace)

**HaloITSM**
- 2026 Second Release (v2.236, screenshots dated May–June 2026) added grouped dynamic filters. Each group holds up to three AND criteria, and groups are OR'd, so one saved view can show "assigned to me OR new unassigned" — [Halo: What's New 2026 Second Release](https://www.usehalo.com/product-updates/whats-new-in-haloitsm-2026-second-release)
- OLA breach notifications fire at up to three thresholds (percentage of time elapsed or working hours remaining), each able to trigger a notification, webhook or runbook. Trigger dates recalculate on pause and unpause — [same](https://www.usehalo.com/product-updates/whats-new-in-haloitsm-2026-second-release)
- SLA response and resolution breach criteria shown inside ticket lists, plus a built-in view "Open Tickets (Including SLA Hold)" — [Halo product updates](https://www.usehalo.com/product-updates/whats-new-in-haloitsm-q3-2025) **[unverified: aggregated from the search summary across Halo update pages]**
- Action-button redesign: a "Request Info" action messages the user **and** sets status to "With User", pausing SLA resolution in one step — [Halo product updates (Q3 2025)](https://www.usehalo.com/product-updates/whats-new-in-haloitsm-q3-2025) **[unverified page attribution]**

**ServiceNow SOW**
- Zurich: CAB Workbench, CAB calendar/meetings/definitions and change approvals moved into SOW — [ServiceNow Community: CAB Workbench in SOW](https://www.servicenow.com/community/itsm-forum/cab-workbench-integration-with-service-operations-workspace-sow/m-p/3469427); [Perspectium Zurich overview](https://www.perspectium.com/blog/servicenow-zurich-release-key-features/)
- Zurich blogs mention "more intuitive SLA visualisation" and enhanced activity timelines **[unverified, third-party blog]** — [Virtuxient: What's New in Zurich](https://www.virtuxient.com/whats-new-in-the-servicenow-zurich-release-2025)

### Inferences
- Keyboard queue traversal (J/K/Enter/X, ? for help) is table stakes (JSM, Freshservice). TENSOR should match it exactly so muscle memory transfers, and make shortcuts on by default. Zendesk's per-user opt-in (see §3) is the anti-pattern.
- Adopt: bulk edit in a **side panel with field search** (JSM's "Find my fields") rather than a modal. That scales to custom and CMDB fields.
- Adopt: Halo's OR-of-AND grouped filters for saved views ("mine + unassigned new" in one view). This is a real gap in simpler query builders.
- Adopt: compound "status + SLA pause + message" actions (Halo's Request Info) as first-class quick actions. They kill a three-step sequence.
- Adopt: multiple view types over one queue definition (list/board/calendar, JSM 2026). For TENSOR, list plus calendar matters most for changes.
- Avoid: queues that are second-class to search/filters (JSM's queue UI is called "primitive" next to filters, with no column resize; see §7).

### Gaps
- No primary source found for ServiceNow SOW list-view specifics (SLA timer rendering, inline edit, bulk actions, keyboard support in SOW lists). From background knowledge, SOW lists are configurable list pages with highlighted values and an SLA timer component **[unverified]**.
- TOPdesk, Ivanti Neurons and ManageEngine ServiceDesk Plus queue UX: no 2026 primary documentation retrieved.
- Assignment UX (round-robin and skills-based routing surfaced to agents) was not compared from primary sources.

## 2. Record (ticket) view: layout, activity feed, related records, CMDB, approvals, change calendar

### Takeaway
The dominant layout is a three-zone record: fields on the left or top, an activity/conversation stream in the centre, and a **contextual side panel** on the right that hosts customer info, apps, AI assist, knowledge and related records. ServiceNow and Zendesk both make that right panel the extension point. ServiceNow's 2025–26 investment is pulling change/CAB and network/CMDB visualisation *into* the agent workspace instead of sending agents to separate modules.

### Cited Findings
- **ServiceNow SOW contextual side panel**: Agent Assist lives in the contextual side panel and searches Incident, Problem, Change, Outages, Knowledge and Case tables by default. Search sources can be split across several Agent Assist tabs in the panel. Panel contents vary per customer configuration — [Aisera docs: Agent Assist in SOW](https://docs.aisera.com/agent-assist/how-to-setup-agent-assist/integrating-agent-aisera-assist-within-servicenows-service-operations-workspace); [ServiceNow Community: What is Agent Assist](https://www.servicenow.com/community/itsm-blog/what-is-agent-assist/ba-p/2294049)
- Other SOW side-panel tabs include "Expert on Call" and "Record Information", and admins routinely ask how to hide them (a clutter signal) — [ServiceNow Community: hide Expert on Call tab](https://www.servicenow.com/community/incident-management-sow-forum/hide-disable-quot-expert-on-call-quot-contextual-side-panel-tab/td-p/2906264)
- Zurich "Converged Service Operations Workspace" adds integrated network visualisation with drill-down to details — [ServiceNow Zurich Release Notes (PDF)](https://downloads.docs.servicenow.com/pdf/enus/servicenow-zurich-release-notes-enus.pdf)
- Zurich: related-record lists in SOW use an "enhanced layout" for readability (customer go-live note) — [NC State OIT: Zurich upgrade notes](https://ncsu.service-now.com/kb_view.do?sys_kb_id=22874da7c327b654666d4245df013179)
- Zurich: pop-out work notes and comments, and lazy loading on by default for workspace pages **[unverified, third-party blog]** — [Virtuxient](https://www.virtuxient.com/whats-new-in-the-servicenow-zurich-release-2025)
- Zurich: CAB Workbench (calendar, meetings, approvals) inside SOW — [ServiceNow Community](https://www.servicenow.com/community/itsm-forum/cab-workbench-integration-with-service-operations-workspace-sow/m-p/3469427)
- **Zendesk** context panel (far right) shows user info, knowledge search, apps and **side conversations** (threads to Finance or vendors from inside the ticket). New features such as panel resizing, native redaction and colour support ship only to Agent Workspace — [GitLab handbook: Zendesk Agent Workspace](https://handbook.gitlab.com/handbook/support/readiness/operations/docs/zendesk/agent_workspace)
- **HaloITSM** 2026: a "Cluster Matched Tickets" tab on the record shows other tickets in the same AI cluster. Approvals gained parallel approval groups and risk-score-based routing. A call screen offers inline caller security-question verification — [Halo 2026 Second Release](https://www.usehalo.com/product-updates/whats-new-in-haloitsm-2026-second-release)
- **JSM** Aug 2026: faster comment processing and a refreshed look for comments — [Atlassian Cloud changes Aug 10–17, 2026](https://confluence.atlassian.com/cloud/blog/2026/08/atlassian-cloud-changes-aug-10-to-aug-17-2026)
- **Freshservice**: the ticket opens by clicking the subject line in the list. I found no documented split view — [Freshservice ticket table refresh](https://support.freshservice.com/support/solutions/articles/50000003871-ticket-table-view-refresh-what-s-changing-)

### Inferences
- Adopt the right-hand contextual panel as TENSOR's extension surface (CI relationships, AI assist, KB, similar tickets). Ship it **tabbed and resizable**, with sensible defaults. ServiceNow admins actively hide tabs, so defaults must be sparse.
- Adopt "similar / clustered tickets" as a record tab (Halo, Freshservice). For ITSM this is the bridge from incident to problem.
- Bring change calendar/CAB and CMDB topology *into* the record context. ServiceNow's Zurich direction says agents don't want to leave the workspace for these.
- Side conversations (Zendesk) map well to ITSM "consult vendor / other team" threads that stay out of the requester-visible feed.
- A peek/split list-to-record layout is not clearly documented by any leader. That is a potential differentiator for a keyboard-first desktop product.

### Gaps
- Primary ServiceNow docs on SOW record page layout (tabs vs. sections, activity stream filters) were not retrieved. Background knowledge: SOW uses a tabbed record page with an activity stream and a related-list tab **[unverified]**.
- No primary evidence on how any competitor renders CMDB relationship maps in the agent record (besides ServiceNow's Zurich network visualisation line).
- TOPdesk, Ivanti and ManageEngine record layouts not covered.

## 3. Speed features: macros, canned responses, quick actions, command palettes, shortcuts

### Takeaway
"/" in the composer to insert macros (Zendesk) and canned responses with placeholders (Freshservice) are standard. Multi-field "scenario" macros that run in bulk are Freshservice's strongest speed feature. Global command palettes are notably absent from the incumbents' docs: ServiceNow's shortcuts are opt-in via accessibility preferences, and Zendesk's shortcuts are per-user opt-in and incomplete. A keyboard-first, command-palette-centred ITSM is still open whitespace.

### Cited Findings
- Zendesk: typing "/" in the composer lists macro and chat shortcuts. Keyboard shortcuts are enabled or disabled **per user only**, with no admin or global setting. Agents report most legacy shortcuts are unsupported in Agent Workspace, and a Zendesk PM said there were "no plans" for more in the short term — [Zendesk community: Keyboard Shortcuts Agent Workspace](https://support.zendesk.com/hc/ja/community/posts/4482937748634-Keyboard-Shortcuts-Agent-Workspace); [Zendesk: Viewing and disabling keyboard shortcuts](https://support.zendesk.com/hc/en-us/articles/4408832849946-Viewing-and-disabling-keyboard-shortcuts); [Zendesk community: Macros keyboard shortcut](https://support.zendesk.com/hc/en-us/community/posts/5040354680730-Announcing-Macros-keyboard-shortcut-We-need-your-feedback-)
- Freshservice: a canned-response icon in the reply box lets agents pick shared or personal responses rendered inline in an accordion (no page change), with placeholders for requester name, ticket ID and URL. Scenario automation and canned-response settings were redesigned for cross-workspace access — [Freshworks community: Product enhancements](https://community.freshworks.com/product-updates/414); [Freshservice ITSM cheat sheet](https://www.freshworks.com/freshservice/resources/ebooks/itsm-cheat-sheet/)
- ServiceNow Next Experience: shortcuts are enabled via Profile → Preferences → Accessibility ("Special Keyboard Shortcuts", user preference `glide.ui.keyboard.shortcuts.enabled`). The shortcut modal is context-sensitive, showing shortcuts for the current screen. Linux was "not currently supported" (Xanadu doc) — [ServiceNow KB1658839: Next Experience keyboard shortcuts](https://support.servicenow.com/kb?id=kb_article_view&sysparm_article=KB1658839); [ServiceNow Community: Next Experience UI keyboard shortcuts](https://www.servicenow.com/community/itsm-articles/next-experience-ui-keyboard-shortcuts/ta-p/3519813); [RapDev: ServiceNow's special keyboard shortcuts](https://www.rapdev.io/blog/servicenows-special-keyboard-shortcuts)
- JSM: queue J/K/O shortcuts (above). Shortcuts can be disabled by the user — [Atlassian](https://support.atlassian.com/jira-service-management-cloud/docs/use-keyboard-shortcuts-in-your-queues/)

### Inferences
- Adopt: shortcuts **on by default** with a context-sensitive "?" overlay (ServiceNow's per-screen modal idea is good. Hiding it behind an accessibility preference is not).
- Adopt: "/" in the composer as the single entry for macros, KB snippets and AI drafts. Placeholders must be first-class.
- Adopt: scenario-style macros (set fields + add note + change state) that run on one ticket or in bulk from the list.
- Differentiate: a global Cmd/Ctrl+K palette that covers navigation, record actions, CI lookup and macros. No incumbent source documents one for the agent workspace.

### Gaps
- Whether ServiceNow SOW or Polaris has a global command palette (the Next Experience unified navigation has a global search with filters) was not confirmed from primary sources **[unverified]**.
- JSM and Atlassian-wide command palette status in 2026 not confirmed.

## 4. Background work and notifications (imports, discovery, bulk updates, notification centre)

### Takeaway
Thin public evidence. What exists is threshold-driven SLA/OLA notifications (Halo), browser notifications for live-chat requests (Halo), and bulk updates through side panels or sliders (JSM, Freshservice). No competitor doc retrieved describes an agent-visible background-job tray for imports, discovery runs or bulk jobs. That is likely whitespace, or simply not marketed.

### Cited Findings
- Halo: OLA breach notifications at up to three thresholds can trigger notifications, webhooks or runbooks. A new "Live Chat Notification" type plus a "New Live Chat Request (From User)" trigger produce browser notifications — [Halo 2026 Second Release](https://www.usehalo.com/product-updates/whats-new-in-haloitsm-2026-second-release)
- JSM bulk edit up to 1,000 items through a side panel (async completion UX not described) — [Atlassian Cloud changes Jul 2026](https://confluence.atlassian.com/cloud/blog/2026/07/atlassian-cloud-changes-jul-13-to-jul-20-2026)
- Freshservice bulk update slider — [Freshservice ticket table refresh](https://support.freshservice.com/support/solutions/articles/50000003871-ticket-table-view-refresh-what-s-changing-)
- ServiceNow Zurich: lazy loading is on by default for workspace pages, a perceived-performance measure **[unverified]** — [Virtuxient](https://www.virtuxient.com/whats-new-in-the-servicenow-zurich-release-2025)

### Inferences
- A persistent background-task tray (bulk update progress, import, discovery, export) with partial-failure reporting is a plausible TENSOR differentiator. Validate against ServiceNow's notification panel before claiming it.
- SLA/OLA warnings should be **multi-threshold** (for example 50/75/90%) and configurable per team, not a single "breached" red state.

### Gaps
- ServiceNow Next Experience notification centre (bell, in-app notifications) and Discovery/import progress UX not retrieved.
- No source on how JSM or Freshservice surface async bulk-job completion or failure.

## 5. AI features in the agent workspace and how they're surfaced

### Takeaway
Three surfacing patterns dominate: (1) **summaries and draft notes** in a side panel or composer (Now Assist, Freddy Copilot); (2) **AI suggestions inside the composer** (Zendesk's 2026 auto-assist composer redesign); (3) **background triage/routing agents** that set type, priority and assignee before a human sees the ticket (JSM Request Router, Halo clustering and AI agents in runbooks). In 2026 the trend moved from suggest to execute: Zendesk auto assist can run pre-approved actions without agent approval. AI-first entrants (Serval, Atomicwork) skip the agent console and put the agent in Slack or Teams.

### Cited Findings
**ServiceNow Now Assist**
- Incident summarisation reads short description, description, work notes and related records, and outputs the issue, SLAs, impacted services and actions taken. Resolution-note generation produces a standardised format — [ServiceNow Learning Labs 2026: Incident Summarization](https://servicenow-events-or-lab-guidebo.gitbook.io/world-forums-learning-labs-2026/world-forums-and-summits-learning-labs/put-ai-to-work-shop-for-service-operations/section-3.-now-assist-for-the-agent-persona/section-3.1-incident-summarization); [ServiceNow: Now Assist for Incident Resolution](https://www.servicenow.com/au/ai/use-cases/incident-resolution.html) **[vendor]**
- Australia release: governance moved to enforcement. Unapproved MCP servers and AI agents are hidden from selection in AI Agent Studio **[unverified, partner blog]** — [Quintica: Australia release](https://www.quintica.com/servicenow-australia-release-everything-you-need-to-know/)
- Practitioner view: incident summarisation is "the clearest win", while agentic features "only pay off if your CMDB is accurate" **[secondary review]** — [StackScout: ServiceNow AI Review 2026](https://stackscout.co/blog/servicenow-ai-review-2026/)

**Jira Service Management**
- Request Router (formerly Service Triage Agent), a Rovo agent, analyses content and sentiment, sets request type, urgency and priority, and can suggest SLA-based escalation. It is invoked from automation rules. Supervised mode requires an agent to approve each plan **[secondary summary of Atlassian material]** — [Workativ: Jira AI agents 2026](https://workativ.com/it/blog/jira-ai-agent-guide-2026-how-to-automate-it-support-with-jira-service-management); [Atlassian: AI for Service Management guide](https://www.atlassian.com/software/jira/service-management/product-guide/tips-and-tricks/artificial-intelligence)
- Claim that AI routes 93% of Atlassian's own tickets at 95% accuracy **[unverified, secondhand]** — [Titanapps](https://titanapps.io/blog/jira-bug-management)

**Zendesk (2026 release notes)**
- Auto assist can execute pre-approved custom actions and action flows **without agent approval**, up to seven actions per suggestion. It detects attachments per comment. Procedures gained draft mode and version control in Knowledge admin. The auto-assist **composer redesign** makes AI suggestions "a natural part of replying" (rollout from June 22). Live call transcripts and AI-agent call recordings appear in Agent Workspace — [Zendesk release notes through 2026-07-17](https://support.zendesk.com/hc/en-us/articles/11032643564442-Release-notes-through-2026-07-17); [through 2026-09-25](https://support.zendesk.com/hc/en-us/articles/11298618235290-Release-notes-through-2026-09-25); [through 2026-10-23](https://support.zendesk.com/hc/en-us/articles/11423451105946-Release-notes-through-2026-10-23) (which item sits in which note is **[unverified]**, because the search summary flattened them)

**Freshservice Freddy**
- Copilot: reply drafting, thread summaries, similar-ticket suggestions, field auto-fill, tone and rephrase, translation. Knowledge content recommendations came in Nov 2025 — [Freshworks Nov 2025 launch](https://www.freshworks.com/theworks/company-news/november-2025-launch/); [Freshworks: Freddy AI](https://www.freshworks.com/freshservice/ai-itsm/) **[vendor]**; feature list corroborated by [eesel: Freshservice Copilot](https://www.eesel.ai/blog/freshservice-copilot) **[third-party]**
- "Resolves up to 80% of common queries" **[vendor claim]** — [Freshworks: Freddy AI](https://www.freshworks.com/freshservice/ai-itsm/)

**HaloITSM**
- AI ticket clustering, with an AI-written description and resolution per cluster and a record tab. AI Agents and AI Abilities run as runbook steps that call Halo functions (read tickets, search KB, add actions). Each AI agent authorises as a configured "Halo Application" (scoped identity) — [Halo 2026 Second Release](https://www.usehalo.com/product-updates/whats-new-in-haloitsm-2026-second-release)

**AI-first entrants**
- Serval: two agents, Catalyst (plain-language to automation) and a Help Desk Agent operating in Slack, Teams, email and portal. $75M Series B at $1B valuation (Dec 2025) **[secondary]** — [Macha: What is Serval](https://www.getmacha.com/blog/serval-complete-guide); [Serval blog](https://www.serval.com/blog/ai-native-it-service-management) **[vendor]**
- Atomicwork: AI agent "Atom" in Slack, Teams, email and browser — [Expert Insights: AI-native ITSM 2026](https://expertinsights.com/it-management/best-ai-native-service-management-solutions)
- Siit (chat-based, standalone or overlay), Ravenna ("agentic service desk"), and Unthread appear in 2026 category lists — [Ravenna: best AI service desk tools](https://ravenna.ai/blog/best-ai-service-desk-tools) **[vendor-authored list]**
- Linear Asks: intake from Slack, email and (since Apr 2026) web forms. Requests land in the team's **Triage** queue for review, prioritisation and assignment, with automation routing — [Linear changelog: web forms for Asks (2026-04-02)](https://linear.app/changelog/2026-04-02-web-forms-for-linear-asks); [Linear docs: Asks](https://linear.app/docs/linear-asks)

### Inferences
- Surface AI in three places TENSOR can map onto UIx primitives: a summary card at the top of the record (collapsible), suggestions inline in the composer ("/" or ghost text), and a triage inbox where AI-proposed type, priority and assignee render as **accept/reject chips**.
- Adopt the supervised/autonomous dial (JSM supervised mode; Zendesk pre-approved actions) as an explicit per-action setting with an audit trail in the activity feed.
- Adopt scoped AI identities (Halo "Application") so AI actions show as a distinct actor in the worklog.
- The AI-first entrants' threat is channel, not console: agents and requesters stay in Slack or Teams. TENSOR's desktop console should still expose chat-originated context cleanly.
- AI value depends on CMDB quality (StackScout). TENSOR's CMDB-native angle is a credible AI story.

### Gaps
- No primary 2026 docs on TOPdesk, Ivanti Neurons (GenAI/"Neurons" bots) or ManageEngine (Zia) agent-workspace AI.
- No independent accuracy or adoption data for any AI triage claim.

## 6. Design systems behind them (public scope, density, accessibility)

### Takeaway
Zendesk Garden and the Atlassian Design System are fully public. Garden documents per-component compact sizes, three table sizes and a base-4 spacing scale. ADS states contrast minimums and built-in keyboard/ARIA support but names no WCAG conformance level on its accessibility page. ServiceNow's Horizon site blocked automated fetch. Density in ServiceNow is a user preference ("compact spacing mode") rather than a design-system token story that can be cited.

### Cited Findings
- Garden: input groups and menus have a compact size (`isCompact`, reduced vertical padding). Tables come in three sizes, with "small" for higher density. Components use a base-4 system for type and spacing — [Garden: Input group](https://garden.zendesk.com/components/input-group/); [Garden: Menu](https://garden.zendesk.com/components/menu/); [Garden: Tables basic formatting](https://garden.zendesk.com/patterns/tables/basic-formatting/); [Zendesk dev: UI design fundamentals](https://developer.zendesk.com/documentation/apps/app-design-guidelines/ui-design-fundamentals/)
- Garden colour: 12 shades per hue with consistent contrast distribution, so every hue at the same shade (for example 500) has the same contrast ratio against a given background — [Garden: Color](https://garden.zendesk.com/design/color/)
- Garden is open source on GitHub — [zendeskgarden repositories](https://github.com/orgs/zendeskgarden/repositories)
- ADS: components "ship with built-in accessibility features, such as keyboard support and sensible ARIA usage". Contrast 4.5:1 for text, 3:1 for large text and graphics. Reflow enabled across screen sizes (links WCAG 2.1 reflow). Advises testing with people with disabilities. **No explicit conformance level** on the page — [Atlassian Design: Accessibility](https://atlassian.design/foundations/accessibility)
- ServiceNow: "Polaris" is the former name for Next Experience UI. A "Use compact spacing mode" user preference exists (updated in San Diego) — [ServiceNow Community: Next Experience UI overview](https://www.servicenow.com/community/next-experience-articles/next-experience-ui-overview/ta-p/2332080)
- horizon.servicenow.com returned HTTP 403 to automated fetch (2026-11-20).

### Inferences
- Garden's equal-contrast-per-shade palette is a strong pattern for UIx status colours (SLA green/amber/red at the same step having equal contrast).
- Density as a per-component prop (Garden) and a user preference (ServiceNow) suggests UIx should offer both: a global density token set and component-level overrides. ITSM agents skew toward compact.
- ADS's public stance stops at "built-in keyboard + ARIA" and contrast. A UIx claim with a stated WCAG 2.2 AA target plus a published keyboard map would outclass it on paper.

### Gaps
- ServiceNow Horizon DS public scope, tokens, density and WCAG claims: blocked (403). Background knowledge says Horizon has a public site with components and guidelines **[unverified]**.
- ADS spacing base unit and any compact mode: not retrieved (Spacing page not fetched).
- No public DS for Freshworks (Crayons was its historical public DS **[unverified, background knowledge]**), Halo, TOPdesk, Ivanti or ManageEngine was checked.

## 7. Common user complaints about agent UX (reviews, community)

### Takeaway
Complaints cluster on **performance of heavy workspaces** (ServiceNow SOW pulls lots of data and agents report freezes), **clutter and learning curve** (JSM), **dated UI** (Ivanti, TOPdesk), and **lost keyboard parity in UI migrations** (Zendesk). Halo and ServiceDesk Plus get comparatively positive UI comments, though from thin and affiliate-heavy sources. I found no Reddit threads.

### Cited Findings
- ServiceNow SOW: a service desk reports intermittent slowness and freezes after the Utah upgrade and finds SOW harder to use than the classic Call module. A commenter attributes it to SOW fetching "the plethora of information" (thread is about two years old) — [ServiceNow Community: Does anyone else find SOW slow?](https://www.servicenow.com/community/incident-management-forum/does-anyone-else-find-service-operations-workspace-slow/m-p/2604329)
- Capterra (ServiceNow CSM): "Agent workspace – Performance is Slow. UI can be improved" — [Capterra: ServiceNow CSM reviews](https://www.capterra.com/p/225960/ServiceNow-Customer-Service-Management/reviews?page=2)
- JSM G2 (about 4.3, about 986 reviews): top dislikes are a steep learning curve and a complex, overwhelming UI. "Sometimes the interface can feel a bit cluttered… takes a little time to get used to where everything is." Crowding grows with plugins and custom fields — [G2: JSM reviews](https://www.g2.com/products/jira-service-management)
- JSM PeerSpot: the queue interface looks primitive compared with filters, and columns can't be resized — [PeerSpot: JSM reviews](https://origin.peerspot.com/products/jira-service-management-reviews/page-2)
- Zendesk: agents say most legacy shortcuts are unsupported in Agent Workspace. Zendesk PM: no near-term plans for more — [Zendesk community thread](https://support.zendesk.com/hc/ja/community/posts/4482937748634-Keyboard-Shortcuts-Agent-Workspace)
- Halo: a Gartner Peer Insights review (Feb 2026) flags a confusing workflow for solving tickets, while G2 users call it intuitive (small sample) — [Gartner: Halo vs Ivanti](https://www.gartner.com/reviews/market/it-service-management-platforms/compare/halo-service-solutions-vs-ivanti); [G2: Halo vs Ivanti](https://www.g2.com/compare/halo-service-desk-vs-ivanti-neurons-for-itsm)
- Ivanti Neurons: called dated with a steep learning curve. TrustRadius reviewers rate agent and admin power highly but the portal config as limited — [TrustRadius: Ivanti vs ServiceDesk Plus](https://www.trustradius.com/compare-products/ivanti-neurons-for-itsm-vs-servicedesk-plus); [G2 compare](https://www.g2.com/compare/halo-service-desk-vs-ivanti-neurons-for-itsm)
- TOPdesk: "dated interface" listed as a con **[affiliate-style comparison]** — [Migratex: TOPdesk alternatives](https://migratex.com/blog/topdesk-alternatives)
- ServiceDesk Plus: ease of use and interface listed as pros, G2 4.2 from 253 reviews **[roundup, unverified]** — [thecxlead: best ITSM help desk software](https://thecxlead.com/tools/best-itsm-help-desk-software/)

### Inferences
- TENSOR's wedge against ServiceNow is **perceived speed**: progressive loading of side-panel tabs, no blocking full-record fetch, and instant list-to-record navigation.
- Against JSM, the wedge is **calm density**: progressive disclosure of custom fields, with configurable sections that stop custom-field sprawl from flooding the record.
- Never ship a UI migration that drops keyboard parity (the Zendesk lesson). Treat the shortcut map as a versioned contract.

### Gaps
- No Reddit (r/servicenow, r/sysadmin) threads surfaced in search. Sentiment there is unverified.
- Gartner Peer Insights review text was not fetched directly. Only comparison-page summaries were seen.
- No quantitative click-count or task-time benchmarks across products were found.
