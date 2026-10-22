---
"@tensor_1/react": patch
---

**`RelationshipGraph` at CMDB topology sizes** (HAR-1387; TENSOR B30 / A6 topology). Verified that the layered layout reads at topology sizes, so no force layout is added: with 300 and 600 configuration items over six levels (cross, lateral and back edges, a few cycles) the map opens on the focal node at the readable 75 %, columns and clusters stay legible in both themes, no items overlap, the keyboard walks every column and the list below carries the same relationships. Fixed what the measurement found: every pointer move of a drag re-rendered every item, edge and list row (95th-percentile frame 100 ms at 300 nodes, 450 ms at 600). A pan or a zoom now only moves the stage; the edges, items and list are kept until what they show changes (p95 16.7 ms at 600 nodes on the same machine).
