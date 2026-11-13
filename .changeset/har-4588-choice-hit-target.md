---
"@tensor_1/tokens": patch
"@tensor_1/react": patch
---

HAR-4588: a radio's dot, a switch's track and a radio card's check no longer take the click meant for their hidden input (`pointer-events: none`), as the checkbox box already did. A person's click always worked, because the span is inside the label. Anything that targets the input itself was blocked, though. Playwright's `check()` on a UIx radio, for example, kept reporting that the dot "intercepts pointer events", ever since the dot was drawn over the input in 2.60. A new contract test (`packages/tokens/tests/choice-hit-target.test.mjs`) finds every drawing styled off a hidden choice input, so a new choice control can't skip the rule.
