---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

RichTextEditor: images in every preset, and a note where they aren't allowed (TENSOR HAR-749).

- `comment` and `template` now take pasted or dropped images, and show the toolbar image button, whenever `onUploadImage` is set. Before, only `full` did.
- New optional prop `imagesUnavailableReason`. When images are off (no `onUploadImage`) and someone pastes or drops an image, the editor inserts nothing and shows the reason in its status line (`role="status"`, which the editor names in `aria-describedby`). Unset, it shows the new label `imagesUnsupported` ("Images can't be added here."). Before, the paste vanished without a word.
- A paste that carries text next to a picture, as Office apps do, still pastes the text.
- New label key `imagesUnsupported` in `RichTextLabels`. Consumers that pass a complete label set must add it.
