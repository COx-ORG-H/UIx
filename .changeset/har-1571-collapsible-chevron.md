---
"@tensor_1/tokens": patch
"@tensor_1/react": patch
---

CollapsibleSection's chevron is now the UIx `ChevronDown` icon (an inline SVG in a fixed 16 x 16 box centred on the summary row) instead of the text character U+2304, which an OS fallback font drew narrow and distorted and which jumped about 13 px on every toggle. The chevron only rotates, about its own centre, and takes the text colour on summary hover (HAR-1571).
