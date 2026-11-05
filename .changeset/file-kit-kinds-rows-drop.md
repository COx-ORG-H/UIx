---
'@tensor_1/tokens': minor
'@tensor_1/react': minor
---

File kit: a colour and a glyph per kind of file, the file row with its upload fill, and the slim drop row (variation H of the 2026-11-05 attachments study).

- Tokens: `--uix-file-{img,doc,sheet,mail,code,log,archive,other}` with `-soft` (12 % / dark 15 %), `-strong` (22 % / 26 %), `-edge` (28 % / 32 % into the line colour) and `-label`, plus `--uix-file-label-fg` (white / dark `#0A0A0A`). In light, img, doc, mail, code and log alias the calm chart slots 3, 5, 7, 2 and 6. Every kind clears 3:1 as an icon stroke in both themes. White label text on the plain light kinds was only 3.6–4.2:1, so `--uix-file-<kind>-label` deepens the kind by 14 % black in light (4.66:1 or more); the kind colours themselves are unchanged.
- `fileKind(name, mime)` maps an extension (first) or a MIME type (then) to one of eight kinds; pass `''` as the name for a drag event. `FILE_KINDS`, `FILE_KIND_EXTENSIONS`, `fileExtension`, `fileTypeLabel`, German `DEFAULT_FILE_KIND_LABELS` and `FILE_KIND_LABELS_EN`. The object form `fileKind({ name, type })` keeps its coarse kinds for `FileUpload` and `Attachment` and is now deprecated.
- `FileKindIcon` (`name`, `mime`, `kind`, `typeLabel`, `size` `sm` 30 / `md` 34 / `lg` 52 px, `label`): the kind's Lucide glyph in its colour with the type as a solid label on the corner. Server-renderable. Named `FileKindIcon` because `FileIcon` is already the plain `file` glyph in `./icons`.
- `FileRow` (`name`, `size`, `meta`, `state`, `progress`, `loaded`, `message`, `href`/`download`/`onDownload`, `onMoreActions`, `actions`, `onCancel`, `onRetry`, `onDetails`, `density`, `as`, `labels`, `kindLabels`): the kind's tint on the left edge at rest; `uploading` fills to the real progress with a leading edge ("Wird hochgeladen · 62 % · 1,5 von 2,4 MB", Abbrechen); `done` draws a check and fades the fill; `scanning` is words only; `blocked` turns amber (Details), `failed` red (Erneut versuchen). The outcome is announced once. No state loops; reduced motion keeps only the fades.
- `FileDrop` (`onFiles`, `onReject`, `accept`, `multiple`, `disabled`, `targetRef`, `labels`): "Dateien ablegen oder auswählen" on one line, backed by a real file input; while files are dragged over it, it names their kinds from the MIME types ("2 Dateien: Bild, Protokoll") and tints itself from the pointer outwards. The choose button is the keyboard path.
- German default copy; English through `UixLabelsProvider` (`fileRow`, `fileDrop`, `fileKinds`) with `FILE_ROW_LABELS_EN`, `FILE_DROP_LABELS_EN`, `FILE_KIND_LABELS_EN`.
- Icons: `file-code` (`FileCodeIcon`) and `file-terminal` (`FileTerminalIcon`). New stylesheet `components/file-kit.css`.
