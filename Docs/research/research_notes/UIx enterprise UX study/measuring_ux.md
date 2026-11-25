# Measuring UX quality for enterprise operator software and design systems (UIx + TENSOR), as of 2026-11-20

Scope: UIx (React + CSS design system) and TENSOR (desktop ITSM SaaS used all day by service-desk agents). Effort ratings are S (under a week for one engineer), M (2-4 weeks), L (a quarter or recurring program). Effort ratings and the "for TENSOR/UIx" fit notes are my inferences, not sourced claims. Items tagged **[unverified this session]** come from background knowledge and were not re-checked against a live source during this research pass.

## 1. Task-level UX metrics for productivity tools (time-on-task, clicks/keystrokes, errors/recovery, SUS/UMUX-Lite/UX-Lite, SEQ, HEART, task success) and how B2B products report them

### Takeaway
For an all-day operator tool, the core set is task success, time-on-task (or predicted expert time via KLM), error/recovery rate, and the post-task SEQ. Add one periodic questionnaire (UX-Lite or SUS) and organise everything with HEART's Goals-Signals-Metrics process. Published benchmarks exist (SEQ mean ~5.5, SUS mean 68, UX-Lite median ~78.8). I found no primary-source public reports of how Atlassian, Salesforce or Shopify report task-level UX metrics.

### Cited Findings
- HEART was introduced in Rodden, Hutchinson & Fu, "Measuring the User Experience on a Large Scale: User-Centered Metrics for Web Applications" (CHI 2010). It stands for Happiness, Engagement, Adoption, Retention, Task success. The authors designed it to complement the business-oriented PULSE metrics, which they found weak at measuring UX quality and at producing actionable data. — [Google Research pub 36299](https://research.google/pubs/measuring-the-user-experience-on-a-large-scale-user-centered-metrics-for-web-applications/); [PDF](https://research.google.com/pubs/archive/36299.pdf)
- HEART comes with a Goals → Signals → Metrics process. Signals are user actions that show whether a goal is met, and they should be sensitive and specific to that goal. — [Amplitude on HEART](https://amplitude.com/en-us/blog/heart-framework-software-ux.md); [Pratt IXD summary](https://ixd.prattsi.org/2018/12/googles-heart-framework-measuring-and-tracking-progress-towards-key-goals/). Secondary sources; I did not re-read the paper's full text this session.
- Secondary sources say the paper applied HEART to "more than 20" Google products and recommend at most 3 goals per project. Neither claim was confirmed in the paper. — [Rework HEART summary](https://resources.rework.com/libraries/growth-frameworks/heart-framework) **[unverified]**
- SEQ (Single Ease Question, 7-point, asked after each task): MeasuringU puts the historical mean across several hundred tasks at about 5.5. A score of about 4 sits near the 25th percentile. — [MeasuringU "70+ UX metrics"](https://measuringu.com/get-comfortable-with-four-ux-metrics/) (figures via search snippet; secondary sources citing Sauro give the same numbers)
- SUS historical average = 68. — [MeasuringU UX-Lite grading](https://measuringu.com/grading-scales-for-the-ux-lite)
- UX-Lite is MeasuringU's successor to UMUX-Lite: two items, rescaled to 0-100. It runs about 3 points higher than SUS collected at the same time, and the reference-group median is 78.8. MeasuringU publishes a curved grading scale for it. — [MeasuringU, Grading Scales for the UX-Lite](https://measuringu.com/grading-scales-for-the-ux-lite)
- A SUS value estimated from UMUX-Lite by regression is not an observed SUS score, so any conversion should be labelled as such. — [MeasuringU UX-Lite grading](https://measuringu.com/grading-scales-for-the-ux-lite); see also [UXPA Journal: SUS vs UMUX-LITE vs UEQ-S](https://uxpajournal.org/?p=6228)
- MeasuringU's "four core metrics" are completion rate, task time, errors, and a satisfaction/ease measure. — [MeasuringU](https://measuringu.com/get-comfortable-with-four-ux-metrics/) **[title verified; list from background knowledge]**
- Keystroke-Level Model (KLM, Card/Moran/Newell) predicts error-free task time for an *expert* doing a routine task. You list the low-level operators (keystroke, point, home, mental) and sum their standard times. — [Wikipedia: Keystroke-level model](https://en.wikipedia.org/wiki/Keystroke-level_model); [Kieras KLM tutorial (UMD)](https://www.cs.umd.edu/~golbeck/INST631/KSM.pdf)
- KLM predicts experienced-user task time to within 10-30% of actual. A composite-operator variant tested with 26 users on two enterprise web apps came within 10% of mean observed time. — [UX Magazine, "Evaluating UX by measuring task efficiency"](https://uxmag.com/articles/evaluating-ux-by-measuring-task-efficiency); [Springer paper via Unpaywall](https://unpaywall.org/10.1007%2F978-3-642-02574-7_40)
- KLM assumes expert users and ignores learning time. — [Calabro, GOMS-KLM](https://trevorcalabro.substack.com/p/goms-klm-calculating-time-on-task?open=false). CogTool (CMU HCII) automates KLM predictions from mockups. — [Wikipedia: KLM](https://en.wikipedia.org/wiki/Keystroke-level_model)
- B2B reporting: I found no Atlassian, Salesforce or Shopify primary sources for task-level UX metrics. One talk by an Atlassian design-system manager lists "We don't measure adoption ... anymore" as a lesson, but the context was fragmentary. — [noti.st talk](https://noti.st/skougs1/Ompfp4/present)

### Inferences
- **Inventory: task-level metrics for TENSOR**

| Metric | What / how | Why for agents | Effort |
|---|---|---|---|
| Task success rate (binary or partial) | Pass/fail per scripted task in benchmarks. In the field, measured as "ticket reached resolved state without reopen within N days". | Primary HEART "T" signal; ties to SLA outcomes | S (lab) / M (field event definitions) |
| Time-on-task (field) | Instrument start/end events per core flow (triage, assign, resolve, merge, bulk-edit). Report the median and p75, not the mean (times are skewed). | Small per-task savings multiply across hundreds of tickets per agent per day | M |
| Interactions per task (clicks + keystrokes + pointer travel) | Count per flow in telemetry. Pair with a KLM baseline. | Expert operators are keyboard-first; a rising count means friction or a regression | M |
| KLM predicted expert time | Model the 10-15 highest-frequency flows. Re-run on design changes before shipping. | Usable in design review without users; fits a small team | S per flow |
| Error / recovery rate | Validation errors, undo use, "reopen ticket", cancel-after-open, back-navigation loops | Errors in ITSM have downstream cost (misrouted tickets) | M |
| SEQ after each benchmark task | 7-point, one question | Cheap, has a published benchmark (~5.5) | S |
| UX-Lite (or SUS) quarterly, in-app | 2 items (UX-Lite) keep survey fatigue low for daily users | Trend line; compare against the 68 / 78.8 references | S |
| HEART sheet per area (queue, ticket detail, knowledge, reporting) | Goals → Signals → Metrics, at most about 3 goals per area | Keeps metrics tied to goals rather than vanity counts | S |

- For an all-day tool, Engagement and Retention in HEART are mostly fixed by the employer and say little about UX. Weight Happiness, Task success and Adoption of *new features/shortcuts* instead.
- UX-Lite beats SUS for frequent in-app pulses (2 items versus 10). Keep SUS for annual benchmarks if you want comparability with the broad SUS literature.

### Gaps
- No primary sources for how Atlassian, Salesforce or Shopify publicly report task-level UX metrics. Salesforce has historically published usability material on its UX blog, but I did not retrieve any this session.
- I did not verify the exact SEQ percentile table or the latest UX-Lite grading cut-points (MeasuringU pages were seen via snippets only).
- Not found: published benchmarks specifically for ITSM or service-desk task times.

## 2. Performance as UX: Core Web Vitals for authenticated SPAs, INP field measurement, LoAF, RUM, CI budgets, low-end/VDI hardware

### Takeaway
INP is the metric that matters for an all-day SPA. Measure it in the field with `web-vitals/attribution`, whose INP attribution includes Long Animation Frame entries showing which scripts, style and layout work caused slow interactions. Soft-navigation support changed in 2026. The Soft Navigations API launched in Chrome 151, and from the October 2026 release CrUX publishes *experimental* per-soft-navigation LCP/INP/CLS. These are expected to graduate in May 2027. CrUX does not cover authenticated TENSOR pages anyway, so self-hosted RUM is mandatory. Lab CI cannot measure INP directly. Use TBT plus scripted interaction timings as proxies and gate bundle size.

### Cited Findings
- `onINP` from `web-vitals/attribution` adds diagnostics: INP subparts (input delay, processing, presentation delay), scripts run during the interaction, and style/layout durations. The library finds the LoAF entries that overlap the interaction and exposes them as `attribution.longAnimationFrameEntries`. An interaction can span several frames. — [web.dev, Find slow interactions in the field](https://web.dev/articles/find-slow-interactions-in-the-field); [Chrome, Identify causes of poor INP](https://developer.chrome.com/docs/modern-web-guidance/guides/performance/identify-inp-causes)
- Google recommends the web-vitals library if no other RUM solution is in place. LoAF support was listed as Chrome 123 / Edge 123, not Firefox or Safari, at time of writing. — [web.dev, Find slow interactions in the field](https://web.dev/articles/find-slow-interactions-in-the-field); [Google codelab: Measuring INP](https://codelabs.developers.google.com/measuring-inp)
- INP thresholds: good ≤200 ms, poor >500 ms, assessed at the 75th percentile. INP replaced FID as a Core Web Vital in March 2024. — web.dev INP docs **[unverified this session; well established]**
- Soft Navigations: Chrome ran a final origin trial from Chrome 147 to 149, announced 20 April 2026. — [Chrome blog, Final Soft Navigations origin trial](https://developer.chrome.com/blog/final-soft-navigations-origin-trial)
- web.dev (13 Oct 2026) refers to "the launch of the Soft Navigations web platform API in Chrome 151". CrUX publishes `experimental_largest_contentful_paint_with_softnavs`, `experimental_interaction_to_next_paint_with_softnavs` and `experimental_cumulative_layout_shift_with_softnavs` in BigQuery, the CrUX API and the History API from the October 2026 release. FCP and navigation-type variants are planned for November. Google aims to graduate them from experimental in May 2027, and stable CWV are unchanged meanwhile. — [web.dev, Experimental soft navigation metrics now available in CrUX](https://web.dev/blog/crux-experimental-soft-navs/)
- With soft navs, INP and CLS are segmented per soft navigation instead of being attributed to the initial page load for the whole SPA session. Most SPAs will see similar numbers, but SPAs with many follow-up navigations will differ more. — [web.dev CrUX soft navs](https://web.dev/blog/crux-experimental-soft-navs/); [Chrome blog](https://developer.chrome.com/blog/final-soft-navigations-origin-trial)
- The final origin trial introduced `InteractionContentfulPaint` entries for LCP after an interaction, emitted for all interactions. — [Chrome blog, Final Soft Navigations OT](https://developer.chrome.com/blog/final-soft-navigations-origin-trial) (via search snippet). MDN documents `PerformanceSoftNavigation`. — [MDN](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceSoftNavigation)
- Lab/CI: Lighthouse's INP audit runs only in timespan (user-flow) mode, so plain `lhci autorun` navigation runs cannot report it. Total Blocking Time is the recommended lab proxy. Lighthouse CI assertions guard outcomes (scores, LCP), budgets guard inputs (KB of JS), and `assertMatrix` applies different assertions per URL pattern. — [qaskills Lighthouse CI budgets guide 2026](https://qaskills.sh/blog/lighthouse-ci-performance-budgets-guide-2026); [Unlighthouse budgets](https://unlighthouse.dev/learn-lighthouse/lighthouse-ci/budgets.md) (third-party guides, not official docs)
- In Playwright you can read LCP/CLS from PerformanceObserver in authenticated flows. A scripted click-to-next-frame timing is a smoke signal, not a substitute for field INP. — [qaskills CWV testing guide 2026](https://qaskills.sh/blog/core-web-vitals-testing-guide-2026) (third-party)
- VDI: Google's guidance for Chrome on virtual desktops suggests about 1 GB RAM and 2-4 vCPUs per desktop. — [Google, Optimize Chrome browser on virtual desktops](https://support.google.com/chrome/a/answer/9303118). Login VSI found CPU-only Edge rendering peaked at 100% CPU, and GPU offload prevented saturation. — [Login VSI, GPU vs CPU in Microsoft Edge](https://www.loginvsi.com/resources/blog/gpu-vs-cpu-in-microsoft-edge/). Citrix warns that the browser may not use the GPU in a remote session, so web benchmarks run there can mislead. — [Citrix HDX benchmarking caveats](https://support.citrix.com/external/article/202160/hdx-benchmarking-known-incompatibilities.html)
- RUM options: commercial products (e.g. Datadog RUM, Sentry, SpeedCurve, DebugBear, Grafana Faro) all ingest web-vitals-style data. Grafana's frontend-observability session replay leaves consent and masking to the customer. — [Grafana session replay data privacy](https://grafana.com/docs/grafana-cloud/observe-and-act/monitor-applications/frontend-observability/session-replay/data-privacy.md); the vendor list itself is **[unverified this session]**

### Inferences
- **Inventory: performance for TENSOR/UIx**

| Item | What / how | Why | Effort |
|---|---|---|---|
| Self-hosted RUM with `web-vitals/attribution` | Send INP/LCP/CLS plus attribution (target selector, LoAF script URLs, subparts) to own endpoint or EU-hosted RUM. Tag by route, tenant size and UIx component. | CrUX does not see logged-in pages. Attribution turns "INP is bad" into "DataWorkspace sort handler costs 180 ms" | M |
| Soft-nav segmentation | Behind a feature check, use `PerformanceSoftNavigation` / web-vitals soft-nav support where available. Otherwise tag metrics by router route. | INP per view is more actionable than per session for an app left open 8 hours | S-M |
| LoAF sampling | Raw `long-animation-frame` observer for frames >200 ms, sampled. Aggregate `scripts[].sourceURL`/`invoker`. | Finds jank that isn't tied to an interaction (polling, websocket bursts, re-renders) | S |
| Long-session health metrics | JS heap trend (`performance.memory` in Chromium), DOM node count, and INP p75 per hour since load | Agents keep tabs open all day; leaks show up as INP worsening over the day | M |
| CI: bundle-size budget | size-limit or equivalent per UIx entry point and per TENSOR route chunk; fail PR on regression | Cheapest reliable gate | S |
| CI: Lighthouse CI timespan / Playwright interaction timings | Scripted flows (open ticket, filter queue of 5k rows, open drawer) at 4x CPU throttle. Assert TBT and custom marks. | Lab proxy for INP; catches regressions before field data arrives | M |
| UIx component perf benches | Storybook or Playwright stories rendering large data (Table 1k rows, Select 5k options). Track render and interaction marks per release. | Puts responsibility at the design-system layer where fixes multiply | M |
| Low-end / VDI test lane | One CI or nightly lane with CPU throttling, plus a quarterly manual run on a real customer-like VDI image (no GPU, 2 vCPU) | Many service desks run browsers in Citrix/AVD; GPU often unavailable, so CSS-heavy effects (blur, large shadows, animated filters) cost CPU | M |

- CSS effects that are GPU-cheap on dev laptops (backdrop-filter blur, large box-shadow animations) can saturate CPU on GPU-less VDI. UIx motion rules should be checked on a no-GPU profile. This is inferred from the Login VSI and Citrix findings.
- Set TENSOR's internal target stricter than the public threshold (e.g. p75 INP ≤150 ms on core flows), because operators make hundreds of interactions per day. This is a judgement call, not a sourced standard.

### Gaps
- I did not confirm whether the web-vitals library (v5.x) has shipped stable soft-navigation support as of Nov 2026. Check the GoogleChrome/web-vitals changelog.
- Firefox/Safari support for LoAF and the Soft Navigations API in late 2026 is unverified (the web.dev table may be stale).
- No authoritative source found for CPU-throttling multipliers that mimic VDI clients. The 4x throttle is a common convention, not a validated mapping.
- Official Lighthouse docs on timespan INP were not fetched; the claims come from third-party guides.

## 3. Usability testing with expert operators: moderated sessions, contextual inquiry, diary studies, think-aloud with shadowing, small-n benchmarks, recruiting internal agents, remote tools

### Takeaway
Split the work into qualitative find-and-fix studies and quantitative benchmarks. Find-and-fix uses about 5 users per round, often via contextual inquiry and shadowing of real agents. Quantitative benchmarks need about 40 users for roughly ±15% precision, or about 65 for under 10% margin at 90% confidence, which is hard for a niche operator population. For small-n operator panels, prefer within-subject comparisons and KLM, and report numbers with confidence intervals or not at all.

### Cited Findings
- NN/g: quantitative studies need about 40 participants for a reasonably trustworthy prediction, based on a 15% margin of error. Fewer can be justified in some cases. — [NN/g, Summary of quant sample sizes](https://www.nngroup.com/articles/summary-quant-sample-sizes/); [NN/g video, Why 40 participants](https://www.nngroup.com/videos/why-40-participants-quantitative-research/)
- NN/g: "5 users" is for qualitative testing, not quantitative. — [NN/g video, 5 users okay for qual, wrong for quant](https://www.nngroup.com/videos/test-5-users-qual-vs-quant/). NN/g also advises against reporting numbers from small qualitative studies. — [NN/g video](https://www.nngroup.com/videos/numbers-small-ux-studies/)
- MeasuringU: benchmarks need larger samples than formative studies. A standalone benchmark targeting under 10% margin of error at 90% confidence should plan for about 65 participants. Comparing UX-Lite against a fixed benchmark has its own sample-size tables. — [MeasuringU](https://measuringu.com/?p=596); [MeasuringU, UX-Lite sample sizes for comparison to a benchmark](https://measuringu.com/ux-lite-sample-sizes-for-comparison-to-a-benchmark)
- NN/g's quantitative research study guide collects their methods for benchmarking. — [NN/g quantitative research study guide](https://www.nngroup.com/articles/quantitative-research-study-guide/)
- Method definitions not re-verified this session **[unverified this session]**: contextual inquiry (observe and interview in the user's real workplace, master-apprentice model; Beyer & Holtzblatt), diary studies (self-reported longitudinal logs; NN/g has guidance), retrospective think-aloud (recommended when concurrent talking would disturb fast expert work).

### Inferences
- **Inventory: methods for service-desk agents**

| Method | How | Why / when | Effort |
|---|---|---|---|
| Shadowing + contextual inquiry | 2-4 h sitting with agents (or remote screen share) during real shifts. Note workarounds, second monitors, sticky notes, copy-paste between tools. | Experts can't verbalise automated habits; observation finds the real workflow and the workarounds | M per round (5-6 agents) |
| Retrospective think-aloud | Record a real session, replay it with the agent, and ask "what were you doing here?" | Concurrent think-aloud slows experts and distorts task time | S per session |
| Moderated task-based tests (formative) | 5 agents per round with realistic seeded tenant data; iterate | Find-and-fix before release | S-M per round |
| Small-n within-subject benchmarks | Same 8-12 agents run old vs new flow, counterbalanced. Measure time, errors, SEQ. Report CIs. | Paired designs need far fewer users than between-subject benchmarks | M |
| Diary study (1-2 weeks) | Agents log friction moments via a lightweight form or Slack/Teams prompt | Captures rare and peak-load issues (major incident days) that sessions miss | M |
| Internal operator panel | Recruit customer agents via CSMs plus any internal service desk (dogfooding). Rotate to avoid panel fatigue; compensate via vouchers or customer-approved time. | Access is the bottleneck for B2B. A standing panel cuts recruitment time | L (program) |
| Remote tools | Video calls with recording (Teams/Zoom/Lookback-type tools) and unmoderated platforms (UserTesting/Maze-type) for non-expert tasks only | Unmoderated generalist panels are not experts, so they are useful for first-use or learnability, not expert speed | S |

- For expert-speed claims, combine KLM predictions with telemetry rather than running a 40-person lab benchmark. Experts are scarce, and field telemetry gives large n for free.
- Seed realistic data volumes (thousands of tickets, long threads). Operator tools fail at scale, not on empty demo tenants.

### Gaps
- I did not retrieve current (2026) NN/g articles on contextual inquiry, diary studies or think-aloud with experts. Method descriptions above are background knowledge.
- No sources found on recruiting practices of specific B2B vendors (Atlassian/ServiceNow/Zendesk research panels).
- Remote tool vendor landscape in late 2026 not verified.

## 4. Design-system health metrics: adoption/coverage scanning (Omlet, react-scanner), component usage analytics, drift/override detection, consistency audits, visual regression, a11y regression trends

### Takeaway
Measure adoption from code, not surveys alone. Tools such as react-scanner, Omlet or custom AST scans give per-component and per-prop usage, deprecated-component counts and coverage depth. Usage counts are known to mislead, so pair them with coverage (share of UI built from the system), override and drift signals (custom CSS on system components, hard-coded values instead of tokens), and trends from visual and a11y regression. Productboard, Webflow, Twilio, Brevo, Pinterest, Uber and Morningstar have published approaches. I found no primary Atlassian, Primer, Polaris or Salesforce metric write-ups.

### Cited Findings
- Productboard measures adoption from code. It uses react-scanner for component usage and deprecated-component instances, plus ESLint and stylelint for typography adherence, with dashboards in Looker across the monorepo. It chose react-scanner over writing its own AST parser. — [Productboard, How we measure adoption of a design system](https://productboard.com/blog/how-we-measure-adoption-of-a-design-system-at-productboard)
- zeroheight's guide (citing Twilio's approach) clones each repo and runs react-scanner to count imports and usage. It warns that component usage alone is not a full picture of adoption. — [zeroheight, How to measure the dev side of a design system](https://zeroheight.com/help/guides/how-to-measure-the-dev-side-of-a-design-system/)
- Jimdo's open-source `components-stats` wraps react-scanner to report usage of a package's components. — [GitHub Jimdo/components-stats](https://github.com/Jimdo/components-stats)
- Omlet (by Zeplin) has a CLI that scans the codebase locally and uploads only metadata, not code. It counts unique usage per component (repeat uses inside the same parent count once). Config goes in `.omletrc.js` for aliases or packaged design systems. Commands include `npx @omlet/cli analyze`, with `--dry-run` that writes locally without uploading. There is a web dashboard and a VS Code extension. — [npm @omlet/cli](https://www.npmjs.com/package/@omlet/cli); [Zeplin: Optimizely uses Omlet](https://blog.zeplin.io/optimizely-harmony-session-2023). Vendor-reported; sources disagree on the exact init command.
- Webflow's pipeline runs a GitHub Action that writes into a Google Sheet, which feeds Looker Studio. There is one dashboard per major component, showing source system, where it renders in the app, and prop/value usage. — [Webflow, Observability tooling for design systems](https://webflow.com/blog/design-system-observability)
- Brevo cloned and parsed project codebases to find component usage per project. — [Brevo engineering](https://engineering.brevo.com/how-to-track-design-system-adoption/)
- Pinterest Gestalt added a design-side adoption metric because the code metric was limited by platform. — [designsystems.com, How Pinterest measures adoption](https://www.designsystems.com/how-pinterests-design-systems-team-measures-adoption)
- Uber's "Base Counter" gives deterministic measurement of design-system adoption with visual highlights. — [Uber, Design system at scale](https://www.uber.com/blog/design-system-at-scale)
- Morningstar has tracked adoption since 2017 with surveys, coverage assessments and team engagement. It cautions that usage does not mean coverage or quality. — [Morningstar Design System blog](https://designsystem.morningstar.com/whats-new/blog/tracking-system-adoption-and-usage)
- Usage shows breadth (which components, how often). Coverage shows depth (share of UI built from the system). — [Design Systems Collective, visual coverage analyzer](https://www.designsystemscollective.com/measuring-design-system-adoption-building-a-visual-coverage-analyzer-b5d9ae410d42)
- Figma Library Analytics covers components, variables and styles on the design side. — [Figma, Make the most of Design System Analytics](https://www.figma.com/best-practices/make-the-most-of-design-system-analytics/); [Figma, Design systems 104: making metrics matter](https://www.figma.com/blog/design-systems-104-making-metrics-matter/)
- Productboard used a secondary visual check that colours every design-system component in one colour. — [Productboard blog](https://productboard.com/blog/how-we-measure-adoption-of-a-design-system-at-productboard) (via search summary)

### Inferences
- **Inventory: UIx health metrics**

| Metric | What / how | Why | Effort |
|---|---|---|---|
| Component usage (breadth) | react-scanner in TENSOR CI (or Omlet if a SaaS dashboard is wanted), producing per-component and per-prop counts as a JSON artifact over time | Shows unused components (deprecation candidates) and prop values nobody uses (API simplification) | S |
| Coverage (depth) | Share of rendered JSX elements, or of route screens, built from `@uix/*` versus raw HTML or local components. Visual variant: a dev-only CSS outline on `[data-uix]` elements, screenshot per route. | Distinguishes "imports UIx somewhere" from "screens are built from UIx" | M |
| Local-shadow components | AST scan for TENSOR components whose names or structure duplicate UIx (e.g. local `Button`, `Modal`) | Main drift source; feeds the UIx backlog (missing capability or not adopted) | S-M |
| Override / drift signals | stylelint and AST rules counting: `className`/`style` passed to UIx components, CSS targeting UIx internal classes, `!important`, raw hex or px instead of `--uix-*` tokens. Trend per release. | Overrides are what consumers do when the system lacks something; each cluster is a candidate issue | M |
| Version lag | Pinned UIx version per consumer versus latest; days behind; count of consumers on deprecated majors | Matches the existing "TENSOR adoption pending" pattern in UIx release notes | S |
| Deprecated-API usage | Count usages of `@deprecated` props or components (TS + react-scanner) | Measures migration progress per release | S |
| Visual regression | Playwright `toHaveScreenshot` or a hosted service on stories × themes × sizes. Track the diff-approval rate. | Prevents unreviewed visual drift. Note from UIx memory: local Windows snapshots are unreliable, so trust CI. | Existing / S |
| A11y regression trend | axe-core per story and per TENSOR route in CI. Chart violation counts by rule and impact over releases, not just pass/fail. | A trend shows whether UIx changes reduce consumer violations | S-M |
| Runtime component telemetry (optional) | Lightweight `data-uix-component` attribute that the RUM layer can aggregate, e.g. INP attributed to which UIx component's target | Links UX performance to design-system components | M |
| Consumer satisfaction | Twice-yearly developer survey (adoption friction, docs quality) | Morningstar-style complement to code metrics | S |

- Usage counts reward large surfaces, so normalise per route or screen and watch trend direction rather than absolute numbers.

### Gaps
- No primary sources found for Atlassian, GitHub Primer, Shopify Polaris or Salesforce SLDS adoption-metric methods. A Brad Frost link to "Tracking Polaris – Shopify UX" exists but its content was not retrieved. — [bradfrost.com link](https://bradfrost.com/blog/link/tracking-polaris-shopify-ux)
- Omlet pricing, current status in late 2026, and whether it supports CSS-only or token usage are unverified.
- react-scanner maintenance status in 2026 is unverified.

## 5. Privacy-respecting product analytics instrumentation (EU/GDPR): event taxonomies, session replay caveats

### Takeaway
Use a small, typed event taxonomy (object-action naming, explicit properties, no free text, pseudonymous IDs) collected first-party and EU-hosted. Treat session replay as high-risk. CNIL's February 2026 draft recommendation says replay needs prior consent, a dedicated CMP purpose, easy withdrawal, and tiered masking (M0-M3). Because TENSOR users are employees, add employment-context concerns on top of that: data minimisation, worker information and possibly works-council involvement.

### Cited Findings
- CNIL launched a public consultation (draft dated February 2026) on a recommendation for session replay tools. — [CNIL draft PDF](https://www.cnil.fr/sites/default/files/2026-02/recommendation_draft_session_replay.pdf); [CNIL announcement](https://cnil.fr/en/node/168205); [Clifford Chance, March 2026](https://www.cliffordchance.com/insights/resources/blogs/talking-tech/en/articles/2026/03/session-replay-tools-under-scrutiny--cnil-launches-public-consul.html)
- In the draft, session replay does not qualify for the consent exemptions (strictly necessary or audience measurement), so prior consent is required. It should appear as its own CMP purpose, not under a broad analytics category. Withdrawal must be as easy as giving consent, and reads of previously placed trackers must stop immediately. — [ppc.land summary of CNIL draft](https://ppc.land/frances-cnil-puts-session-replay-tools-under-the-privacy-microscope/); [Clifford Chance](https://www.cliffordchance.com/insights/resources/blogs/talking-tech/en/articles/2026/03/session-replay-tools-under-scrutiny--cnil-launches-public-consul.html)
- The draft introduces tiered masking levels M0-M3. I did not retrieve the tier definitions. — [CNIL draft PDF](https://www.cnil.fr/sites/default/files/2026-02/recommendation_draft_session_replay.pdf)
- The consultation is listed as "[Closed]". I did not find whether a final recommendation was adopted by Nov 2026. — [CNIL node](https://cnil-d10.cnil.fr/en/node/168205)
- Vendors: Matomo says its heatmaps and session recordings are outside the CNIL consent-exempt scope. — [Matomo FAQ](https://matomo.org/faq/heatmap-session-recording/data-masking-in-heatmaps-and-session-recordings). Contentsquare's "exemption mode" disables replay when operating under the CNIL audience-measurement exemption. — [Contentsquare](https://support.contentsquare.com/hc/en-us/articles/37271814283025-Exemption-mode). Grafana puts consent and masking on the customer. — [Grafana docs](https://grafana.com/docs/grafana-cloud/observe-and-act/monitor-applications/frontend-observability/session-replay/data-privacy.md)
- CNIL publishes a self-assessment tool for audience-measurement exemption (2025). — [CNIL self-assessment PDF](https://cnil.fr/sites/default/files/2025-07/outil_d_auto-evaluation_mesure_d_audience.pdf)

### Inferences
- **Inventory: instrumentation for TENSOR**

| Item | What / how | Why | Effort |
|---|---|---|---|
| Typed event taxonomy | `object_action` names (`ticket_assigned`, `queue_filtered`) defined in one TS schema shared by emitter and warehouse. Allow-listed properties only (IDs, enums, counts, durations). Never free text or ticket content. | Prevents PII leakage by construction; makes HEART signals queryable | M |
| Flow instrumentation | `flow_started` / `flow_completed` / `flow_abandoned` with `flow_id` and a duration for each core task | Gives time-on-task and success rate in the field | M |
| Pseudonymous identity | Hashed or rotating agent ID per tenant. Aggregate reporting by default, with minimum group sizes for per-team views. | Avoids the tool becoming employee performance surveillance | S |
| Tenant controls | Per-tenant opt-out/opt-in for product analytics; DPA terms; EU data residency | B2B customers are controllers for agent data; procurement will ask | M |
| Session replay (if any) | Opt-in per tenant and per user, all text and inputs masked by default, no recording of ticket bodies, short retention. Or prefer DOM-free "interaction traces" (event sequences) instead of replay. | Aligns with the CNIL draft. Ticket content often contains end-user PII from third parties. | M-L |

- Consent obtained from employees by their employer is generally viewed as weak under GDPR because of the power imbalance. Product analytics in TENSOR will likely rest on legitimate interest or contract with strict minimisation, while replay sits uneasily. **[legal inference, not sourced; needs counsel review]**
- ePrivacy Art. 5(3) (storage/access on the terminal) applies regardless of lawful basis. First-party, cookieless, in-memory event batching reduces but does not remove the question. **[inference]**

### Gaps
- Whether the CNIL session-replay recommendation was finalised by Nov 2026, and the exact M0-M3 definitions.
- No sources retrieved on EDPB or German works-council (BetrVG §87(1)6) treatment of in-product employee telemetry. This matters for DACH customers.
- Not researched: specific EU-hosted analytics vendors' 2026 offerings.

## 6. Turning findings into a backlog: UX scorecards, NN/g severity ratings, heuristic evaluation

### Takeaway
Rate each finding with NN/g's 0-4 severity scale, which combines frequency, impact and persistence, plus market impact. Average at least three raters, because single-rater severity is unreliable. Roll findings and metrics into a per-area UX scorecard (HEART metrics, SEQ/UX-Lite, INP p75, a11y violations, UIx coverage) that is reviewed each release and feeds Linear issues with severity as a priority input.

### Cited Findings
- NN/g severity combines frequency (common or rare), impact (easy or hard to overcome) and persistence (one-time or repeatedly bothersome), with market impact assessed separately. — [NN/g, Severity ratings for usability problems](https://www.nngroup.com/papers/heuristic/severityrating.html); [NN/g, How to rate the severity of usability problems](https://www.nngroup.com/articles/how-to-rate-the-severity-of-usability-problems/)
- Scale: 0 = not a usability problem, 1 = cosmetic only, need not be fixed unless extra time is available. The remaining levels (2 = minor, low priority; 3 = major, high priority; 4 = usability catastrophe, imperative to fix before release) are from background knowledge and the search snippet was cut off. — [NN/g severityrating](https://www.nngroup.com/papers/heuristic/severityrating.html) **[levels 2-4 unverified this session]**
- Severity ratings from a single evaluator are too unreliable. The mean of three evaluators is satisfactory for many practical purposes. — [NN/g severityrating](https://www.nngroup.com/papers/heuristic/severityrating.html)
- A CHI 2016 late-breaking paper reports large discrepancies between experts' individual severity ratings. — [Herr et al., CHI 2016 LBW](https://cml.hci.uni-bamberg.de/~gross/publ/chi16_herr_et_al_severity_rating_scales__proceedings.pdf)
- MeasuringU offers an alternative severity-assignment approach. — [MeasuringU problem severity](https://measuringu.com/tag/problem-severity)
- Heuristic evaluation uses Nielsen's 10 usability heuristics with 3-5 evaluators working independently. — NN/g **[unverified this session; well established]**

### Inferences
- **Inventory: backlog machinery**

| Item | What / how | Why | Effort |
|---|---|---|---|
| Severity rubric | NN/g 0-4, rated independently by 3 people (designer, engineer, support or CS rep) and averaged. Add a "frequency for agents" multiplier: a severity-2 issue hit 200 times a day outranks a severity-3 issue hit monthly. | Single-rater severity is unreliable; operator volume changes priorities | S |
| Heuristic evaluation per release | 3 evaluators per major surface, using Nielsen heuristics plus operator-specific heuristics (keyboard reachability, density, state persistence, bulk actions, interruption recovery). The workspace's `ui-enterprise-baseline` rubric can serve as the operator heuristics. | Cheap, catches most issues before user testing | S per surface |
| UX scorecard | One row per TENSOR area (queue, ticket, knowledge, reporting, admin) with columns for task success, median time on top flow, SEQ, UX-Lite (quarterly), INP p75, a11y violations, UIx coverage %, and open sev-3/4 count. RAG thresholds set against baselines. | One view for product, engineering and design-system decisions. Trends matter more than absolutes. | M to set up; S per release |
| Issue routing | Each finding goes to Linear tagged `ux-severity-N`, `source:{heuristic, test, telemetry, diary}`, `layer:{UIx, TENSOR}`. Findings tagged layer:UIx go to the UIx backlog. | Separates design-system gaps from consumer misuse | S |
| Closing the loop | Re-measure the metric that triggered the issue after the fix ships (before/after in the scorecard) | Shows the measurement program changes outcomes | S |

### Gaps
- No public example found of a B2B operator product (ServiceNow, Zendesk, Atlassian JSM) publishing its UX scorecard format.
- NN/g severity levels 2-4 wording and the current state of their heuristic-evaluation guidance were not re-verified this session.
