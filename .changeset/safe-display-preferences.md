---
"@tensor_1/react": patch
---

Escape values embedded in the display preferences inline script so a caller-controlled storage key or defaults cannot terminate its script element. This matters when an application embeds untrusted values into server-rendered script text.
