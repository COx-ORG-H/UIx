---
"@tensor_1/tokens": patch
"@tensor_1/react": patch
---

`OrgChart` initials (HAR-1807): bracketed parts and titles are no longer initials. "Tenant Admin (dev)" showed "T(", "[TST] Sofia Rossi (acme)" "[(" and "Dr. Anna-Maria Koenig" "DK"; they now show "TA", "SR" and "AK". A word that ends in a full stop before the last name ("Dr.", "Prof.", a middle initial) is skipped, and the first letter of a word is its first letter in any script, never a quote or bracket in front of it.

`Drawer` and `Modal`: `onClose` gets the click again. Since 2.42 the close button, a `DialogClose`, the drawer's backdrop and "Discard" called `onClose()` with no argument, so a consumer that tells a person's close request (an event) from the browser closing the dialog by itself (no argument) stopped reacting to the close button: TENSOR's `ConfirmAction` ignored it while the dialog was still open. `onClose` is now typed `(event?: DialogCloseEvent) => void`; Escape on a clean dialog and `<form method="dialog">` still call it with no argument, as before 2.42.
