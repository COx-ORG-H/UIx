---
"@tensor_1/tokens": minor
"@tensor_1/react": minor
---

New `FileUpload` and `Attachment` / `AttachmentList` (HAR-984/985; TENSOR C15 attachments panel, MOTUS C-7 photo intake). `FileUpload` checks picked or dropped files against `accept`, `maxSize` and `maxFiles` and hands the accepted ones to the product, which uploads them and reports progress, success and failure through `items`. It has a real "Choose files" button, a rejection alert, per-file progress, Retry, remove, thumbnails and optional alt text. `Attachment` is a stored-file row: the name as a link or download, size, meta, a state slot, actions, remove, and `loading`/`error`/`forbidden` statuses. It's server-renderable. New pure helpers: `formatFileSize`, `fileMatchesAccept`, `partitionFiles`, `fileKind`. Tokens: `.uix-file-upload*` rules in `components/file-upload` and list rules in `components/attachment` (`.uix-attachments--list`, `__body`, `__line`, `__meta`, `__error`, `__actions`). Existing `.uix-dropzone`, `.uix-filelist` and `.uix-attachment` rules are unchanged.
