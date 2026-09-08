# Workflows, pipelines, and charts implementation plan

**Date:** 2026-09-07
**Branch:** `codex/release-uix-2-13-0`
**Status:** complete

This document is the resumable source of truth for the workflow/pipeline and chart-quality pass requested against `packages/tokens/index.html#workflows-pipelines`. Update the completion log as implementation and verification land.

## Definition of Ready

### Problem and audience

UIx already exposes workflow CSS, a compact pipeline bar, chart framing, and an ECharts React adapter, but the examples and component anatomy are too basic for an operational product. The immediate audience is the Mission Control operator and the engineers building its project rail, checkpoint history, throughput, and run-health views. They need richer, reusable primitives that communicate stage, ownership, timing, trend, and failure without relying on colour, while remaining consistent with the existing UIx token contract.

### Non-goals

- Do not edit Mission Control or any sibling repository.
- Do not add data fetching, persistence, orchestration logic, drag/drop behavior, or product-specific checkpoint semantics to UIx.
- Do not introduce another chart runtime; retain ECharts behind the existing optional chart entry points.
- Do not alter the DTCG token contract unless existing tokens prove insufficient. The planned design uses the current surface, text, status, spacing, radius, shadow, and chart tokens.
- Do not rewrite the existing builder, relationship graph, or historical workflow examples wholesale; keep backwards-compatible selectors and examples working.
- Do not touch the unrelated dirty documentation-site files already present in the checkout.

### Acceptance criteria

1. The Workflows & pipelines section presents a production-like operational run surface with a clear header, run metadata, stage progression, current/failed/waiting states, owners, durations, and an accessible next action.
2. Existing `.uix-pipeline`, `.uix-flow`, and `.uix-node` markup remains valid. New detailed variants are additive and use existing `--uix-*` tokens only.
3. `@tensor_1/react` exports presentational `Pipeline`, `PipelineStage`, `Flow`, and `FlowNode` wrappers with typed, domain-neutral props and accessible current/state semantics.
4. Chart cards gain reusable header, metric, legend, plot, annotation, footer, loading, and empty-state anatomy. Chart examples include operational time-series, stacked throughput, categorical distribution, and compact signal/tick treatments suited to Mission Control.
5. The existing ECharts adapters remain optional entry points, respond correctly to current UIx theme tokens, and expose reusable chart chrome rather than requiring consumers to rebuild card anatomy.
6. Light/dark themes, narrow layouts, keyboard focus, reduced motion, and colour-independent status text remain usable. Serious/critical axe findings are zero on covered styleguide pages.
7. Generated CSS and React artifacts are fresh; typecheck, unit/build, contract/parity, API, accessibility, and relevant visual gates pass or any environment-only limitation is documented precisely.

### Stack and architecture decision

- Preserve the static HTML/CSS/ES-module styleguide, token-first CSS architecture, npm workspaces, React 18/19 peer range, TypeScript wrappers, ECharts 5 optional peer, SVG renderer, and separate full/preset chart entry points.
- Keep workflow and pipeline components presentational. Consumers supply labels, states, timing, links, icons, and graph geometry; UIx owns semantics, class contracts, responsive layout, and visual states.
- Keep charts as a layered composition: UIx chart card/chrome + consumer-owned ECharts options. This avoids hiding analytical meaning inside generic presets while still eliminating repeated headers, legends, metrics, and state shells.
- Use existing tokens throughout. Component-intrinsic geometry such as connector thickness or chart swatch size may remain local CSS values under the existing contract rules.

### Top risks and early checks

1. **The polish becomes page-only.** Add React wrappers and document the new class/API contract; verify packed exports, not only the static demo.
2. **Dense visuals stop working at narrow widths.** Make detailed pipelines horizontally scrollable with a visible overflow affordance and provide compact stacking for chart headers/footers; exercise narrow visual coverage.
3. **Status becomes colour-only.** Render explicit state text, `aria-current`, accessible group labels, and patterns/icons where helpful; run axe and inspect greyscale behavior.
4. **The chart adapter drifts from theme changes.** Keep token resolution at render time and refresh ECharts options on theme changes in the guide; do not freeze raw colours in reusable APIs.
5. **Public API/generated output becomes stale.** Update API reports, package docs/roadmap, smoke imports, generated CSS, and run the repository gates.

### Data, security, compliance, and production-readiness constraints

UIx receives already-authorized display data and performs no I/O. No credentials, PII, tenant identifiers, persistence, analytics, network calls, or mutations are introduced. Accessibility and dependency/package integrity are owned by this change; authorization, audit history, observability, recovery, and data retention remain consumer responsibilities.

### Existing inventory and reuse

- CSS sources: `packages/tokens/styles/components/pipeline.css`, `flow.css`, and `chart.css`.
- Static showcase: `packages/tokens/index.html`; ECharts examples: `packages/tokens/guide/charts.js`.
- React chart adapter: `packages/react/src/components/ChartCore.tsx` with `chart.ts` and `chart-preset.tsx` entry points.
- The current roadmap explicitly lists Pipeline and Flow wrappers as planned, so this pass closes those known gaps rather than creating parallel primitives.
- Mission Control's current project-hub plan calls for checkpoint residence, discrete throughput ticks, explicit freshness, and colour-independent status. UIx will provide generic presentation pieces only; Mission Control retains those derivations and domain names.

## Implementation sequence

- [x] 1. Upgrade pipeline/flow/chart CSS with additive detailed anatomy and responsive/accessibility states.
- [x] 2. Add typed React Pipeline/Flow wrappers and reusable chart chrome; export them through the correct public entries.
- [x] 3. Replace the basic styleguide examples with an operational run board and richer chart gallery, preserving deterministic data.
- [x] 4. Add focused unit/render/API/smoke coverage and update roadmap/readmes.
- [x] 5. Regenerate package outputs and run focused then full verification, including artifact inspection.
- [x] 6. Record exact results, remaining limitations, and changed-file inventory below.

## Rollback and compensation

The change is additive and local to UIx. Reverting the implementation commit restores the former examples and CSS/API. No schema, data, deployment, or remote product state is changed.

## Completion log

- 2026-09-07: Read workspace guidance, ADR-0000, Definition of Ready, UI/UX/test/verification lessons, Sites environment guidance, the current UIx code and roadmap, and Mission Control's current project-hub/UIx adoption plans. Confirmed unrelated dirty documentation files will remain untouched.
- 2026-09-07: Added additive detailed Pipeline and Flow CSS, typed React wrappers, richer Chart card composition and explicit loading/empty states, and retained the existing compact and optional-renderer APIs.
- 2026-09-07: Replaced the basic chart and workflow specimens with deterministic operational examples covering checkpoint residence, stacked throughput, run outcomes, discrete ticks, provenance/freshness, and a detailed release-stage rail.
- 2026-09-07: Added dedicated Chart, Pipeline, and Flow references to the new documentation explorer, including Mission Control integration boundaries, import examples, state guidance, and accessibility notes. Links target the explorer's consolidated example routes.
- 2026-09-07: Regenerated CSS and React API reports and recorded the deliberate component CSS size baseline: Chart 5,514 raw / 1,462 gzip bytes; Pipeline 5,936 / 1,464; Flow 12,036 / 3,083.
- 2026-09-07: Verification passed for the React suite (110 tests), React typecheck, token parity (214 declarations), contract, API reports, CSS/package size budgets, docs unit suite (18 tests), packed-package smoke with React 18/19, the two Linux index visual goldens in Playwright 1.61, and all six new Chart/Pipeline/Flow documentation axe runs. The full axe run reported two unrelated existing Phase 46.9 specimen defects (`aria-meter-name` and `nested-interactive`); 14 other light/dark cases passed.

## Changed-file inventory

- Component sources: `packages/tokens/styles/components/{chart,flow,pipeline}.css`.
- React sources and tests: `packages/react/src/components/{ChartCore,Chart,Flow,Pipeline}.tsx`, public entry files, and `packages/react/src/workflow-chart-components.test.mjs`.
- Showcase and charts: `packages/tokens/index.html`, `packages/tokens/guide/{charts.js,guide.css}`, and generated CSS under `packages/tokens/build/css/`.
- Documentation: `packages/tokens/docs/docs.js`, package readmes, `Docs/design-system.md`, and `Docs/component-roadmap.md`.
- Release and verification: `.changeset/rich-flows-visualize.md`, API reports, smoke fixtures, CSS size baseline, accessibility coverage, visual harness, and Linux index goldens.
