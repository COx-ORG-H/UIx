---
"@tensor_1/tokens": patch
"@tensor_1/react": patch
---

`OrgChart` initials (HAR-1807): bracketed parts and titles are no longer initials. "Tenant Admin (dev)" showed "T(", "[TST] Sofia Rossi (acme)" "[(" and "Dr. Anna-Maria Koenig" "DK"; they now show "TA", "SR" and "AK". A word that ends in a full stop before the last name ("Dr.", "Prof.", a middle initial) is skipped, and the first letter of a word is its first letter in any script, never a quote or bracket in front of it.
