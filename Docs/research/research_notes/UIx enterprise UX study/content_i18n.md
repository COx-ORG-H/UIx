# UI writing (content design) and internationalisation for UIx — practices inventory (as of 2026-11-20)

Context: UIx is a React + CSS design system. Consumers ship English (en) and German (de). Home market is Bosnia and Herzegovina: Bosnian (bs), Croatian (hr), Serbian (sr) in Latin (sr-Latn) and Cyrillic (sr-Cyrl).

Marking convention: every bullet in "Cited Findings" was checked against the linked page during this session (2026-11-20). Items tagged **[unverified]** come from prior knowledge and were NOT re-fetched; treat them as leads, not facts. Each inventory item is shaped as what / where / why / source where possible.

## 1. Content design systems: voice and tone, button labels, errors, empty states, confirmations, destructive actions, notifications

### Takeaway
The major systems converge on the same rules: sentence case; specific imperative verb (+ noun) labels instead of "OK"/"Yes"; error copy that says what happened and how to fix it, addresses the user as "you", and avoids blame, "please", "sorry", "oops", "invalid"; empty states as one title + 1–2 sentences + one verb CTA; destructive actions that name the object and require confirmation. These are encodable as component defaults, prop shapes and lint rules in UIx.

### Cited Findings
**Error messages — Atlassian Design System (atlassian.design/foundations/content/designing-messages/error-messages)**
- What: optional title of 3–4 words in sentence case that does not tell people what to do; body of 1–2 sentences covering why the error happened, what to do, and what happens if they don't act. Why: scannable, prescriptive help for confused readers. — [Atlassian: Error messages](https://atlassian.design/foundations/content/designing-messages/error-messages)
- If the cause is unknown, don't invent one; say something went wrong and offer a next step. Leave technical detail out (link to support content if unavoidable). — [Atlassian: Error messages](https://atlassian.design/foundations/content/designing-messages/error-messages)
- CTA: 1–2 words, imperative verb that describes the action ("Save", "Remove"); avoid vague "OK"; offer dismiss/cancel when a choice is involved. — [Atlassian: Error messages](https://atlassian.design/foundations/content/designing-messages/error-messages)
- Tone: empathetic, calm, urgency proportional to severity; address the reader as "you" rather than "we"; avoid "sorry" and "please" except when consequences are severe or irreparable. — [Atlassian: Error messages](https://atlassian.design/foundations/content/designing-messages/error-messages)
- Error vs warning distinction: error = problem already happened; warning = condition that could cause one later. Multiple causes: lead with the most likely/simplest fix, second sentence offers a fallback such as contacting support. — [Atlassian: Error messages](https://atlassian.design/foundations/content/designing-messages/error-messages)
- Atlassian publishes sibling message-type pages: empty state, warning, success, info, feature discovery, voice and tone. — [Atlassian: Error messages (related links)](https://atlassian.design/foundations/content/designing-messages/error-messages)

**Error messages — GOV.UK Design System (design-system.service.gov.uk/components/error-message)**
- Placement: message after question + hint, next to the field, red border links message to field; all errors also summarised in an Error summary at top of page using the same text as the inline message. — [GOV.UK: Error message](https://design-system.service.gov.uk/components/error-message/)
- Never clear form fields on error (keep correct and incorrect answers). — [GOV.UK: Error message](https://design-system.service.gov.uk/components/error-message/)
- A11y + i18n: the component injects a visually hidden "Error:" prefix for screen readers, and the prefix is overridable for other languages (Welsh cited). Directly relevant to UIx: hidden a11y prefixes are translatable strings too. — [GOV.UK: Error message](https://design-system.service.gov.uk/components/error-message/)
- Don't use field error messages for ineligibility, missing permissions or service problems; route to dedicated "problem with the service" / "page not found" / "service unavailable" pages. — [GOV.UK: Error message](https://design-system.service.gov.uk/components/error-message/)
- Wording: instruction for empty fields ("Enter your first name"), description for invalid entries ("Name must be 35 characters or less"); different message per failure type (empty, too long, too short, disallowed characters, wrong format); mirror the field label's language; don't repeat hint-text examples. — [GOV.UK: Error message](https://design-system.service.gov.uk/components/error-message/)
- Banned words/patterns: jargon ("form post error"), "forbidden", "illegal", "prohibited", "you forgot", "please", "sorry", "valid/invalid", "oops"/humour, and generic "An error occurred" / "This field is required". — [GOV.UK: Error message](https://design-system.service.gov.uk/components/error-message/)
- Track how often users see each error to improve content and journeys. — [GOV.UK: Error message](https://design-system.service.gov.uk/components/error-message/)

**Empty states — Atlassian**
- Two types: "empty state" (after finishing a task or clearing data, e.g. empty inbox) and "blank slate" (feature not yet used). The page does not cover no-results/search-empty states. — [Atlassian: Empty state](https://atlassian.design/foundations/content/designing-messages/empty-state)
- Structure: short sentence-case title without end punctuation (unless a question); body 1–2 sentences giving the reason and where to go next, not repeating the title; CTA 1–2 words starting with an imperative verb ("Create", "Try"), matching the title, with a dismiss option; avoid button clutter. — [Atlassian: Empty state](https://atlassian.design/foundations/content/designing-messages/empty-state)
- Frequency rule: messages people see often should be shorter and less playful; playfulness belongs to larger, optimistic moments. — [Atlassian: Empty state](https://atlassian.design/foundations/content/designing-messages/empty-state)

**Voice vs tone — Mailchimp Content Style Guide**
- Voice is constant (plainspoken, genuine, translator of jargon, dry humour); tone adapts to the reader's emotional state; "it's always more important to be clear than entertaining"; when unsure, keep a straight face. Active voice, plain English, positive language. — [Mailchimp: Voice and tone](https://styleguide.mailchimp.com/voice-and-tone/)
- License: CC BY-NC 4.0 — UIx can adapt its structure with attribution but not copy it for commercial redistribution without care. — [Mailchimp: Voice and tone](https://styleguide.mailchimp.com/voice-and-tone/)

**Shopify Polaris**
- The legacy Polaris React docs site (polaris.shopify.com / polaris-react.shopify.com, including /content/actionable-language and /patterns/common-actions) now 301-redirects to shopify.dev/docs/api/polaris (observed 2026-11-20). Older content-guideline URLs are effectively retired; cite archived copies or npm READMEs. — [redirect observed from polaris.shopify.com](https://polaris.shopify.com/patterns/common-actions/best-practices)
- Older Polaris Button README (v1.x/2.x): use destructive styling when an action deletes merchant data or is hard to recover from, and such actions should open a confirmation first; sample label "Delete theme". — [Polaris 1.12.2 Button README (unpkg)](https://unpkg.com/@shopify/polaris@1.12.2/docs/components/Button/README.md) (historical; via search snippet, not fully fetched)
- Shopify POS extension docs recommend a [verb] + [item] formula for button labels. — [Shopify.dev POS Button](https://Shopify.dev/docs/api/pos-extensions/ui-extensions-reference/components/button) (via search snippet)

**[unverified] — not re-fetched this session**
- Polaris "actionable language": labels as {verb}+{noun} ("Add product", "Delete order"), avoid "Yes/No/OK/Submit"; confirmation modal title as a question naming the object ("Delete 'Dark Blue Tee'?"), body states consequence ("This can't be undone"), primary button repeats the verb ("Delete product"). Search snippets point to this but the canonical page now redirects.
- Microsoft Writing Style Guide (learn.microsoft.com/style-guide): sentence-style capitalisation in UI; "bigger ideas, fewer words"; error messages avoid blaming and "please"; global-communications section advises against concatenation and recommends leaving room for expansion. Note: the URL /style-guide/global-communications/software-considerations returned 404 on 2026-11-20 — the page has moved or been removed.
- Salesforce Lightning Design System (lightningdesignsystem.com, "Voice and tone" / "Content" guidelines): voice = clear, concise, conversational; destructive confirmations name the object and consequence. Not fetched.
- GOV.UK Button component: start buttons use "Start now"; button text is a verb describing the action, sentence case. Not fetched this session.

### Inferences
- UIx can encode these as defaults rather than guidelines: `ConfirmDialog` requires `confirmLabel` (no "OK"/"Yes" default for destructive variant), `tone="danger"` requires an object name; `EmptyState` with `title`, `description` (max 2 sentences), single `action`; `FieldError` copies to an `ErrorSummary` with identical text.
- A copy-lint (in the styleguide's check gates) could flag banned tokens per GOV.UK/Atlassian ("please", "sorry", "oops", "invalid", "OK" as button text, "An error occurred") in en, with equivalent lists for de/bs/hr/sr ("bitte", "leider", "ungültig"; "molimo", "nažalost", "nevažeći") — the local-language lists are my proposal, not sourced.
- German and BCS UI conventionally use a formal address (de "Sie"; BCS "Vi" capitalised in direct address is common in formal letters) — whether to use du/Sie and ti/Vi is a product-voice decision UIx should document per locale. [unverified]

### Gaps
- Could not fetch current Polaris content pages (redirected) or Microsoft's moved global-communications page; Salesforce content guidance not fetched.
- No source found on notification/toast copy rules beyond Atlassian's sibling pages (success/info/warning), which were listed but not fetched.

## 2. How design systems ship copy: default labels, providers, translatable defaults, plurals, gender, Intl formatting

### Takeaway
The proven pattern (React Aria) is: components ship their own internal strings (close, clear, loading, pagination, sort, hidden "Error:" prefixes) translated for many locales, resolved by a locale provider (`I18nProvider`/`useLocale`) that also exposes direction; anything content-specific is a prop. Plurals must use CLDR categories — bs/hr/sr need one/few/other, which an English-only "count === 1" pattern silently breaks.

### Cited Findings
- React Aria ships localized built-in strings for "30+ languages", auto-detects the user's language, lets apps override with `I18nProvider locale="…"`, and `useLocale()` returns `locale` and `direction` to set `lang`/`dir` on `<html>`. — [React Aria: Quality / Internationalization](https://react-aria.adobe.com/quality#internationalization)
- React Aria's locale list includes Croatian (`hr-HR`), Serbian (listed as `sr-SP`) and German (`de-DE`); Bosnian is not listed. Note `sr-SP` is not a valid BCP 47 region (SP is not an ISO 3166 code) — a legacy .NET-style tag. — [React Aria: Quality / Internationalization](https://react-aria.adobe.com/quality#internationalization)
- React Aria handles dates/numbers across many calendar and numbering systems and RTL interactions (keyboard navigation mirroring). — [React Aria: Quality / Internationalization](https://react-aria.adobe.com/quality#internationalization)
- GOV.UK makes even visually hidden a11y strings (the "Error:" prefix) overridable per language. — [GOV.UK: Error message](https://design-system.service.gov.uk/components/error-message/)
- CLDR cardinal plural rules: bs, hr and sr share the same rules — `one` (1, 21, 31, 101; also fractions 0.1, 1.1), `few` (2–4, 22–24, 102; fractions 0.2–0.4), `other` (0, 5–19, 100, 1000, and many decimals). en and de have only `one` (integer 1, no decimals) and `other`. — [Unicode CLDR Language Plural Rules](https://www.unicode.org/cldr/charts/latest/supplemental/language_plural_rules.html)
- CLDR ordinal rules: bs/hr/sr and de have only `other` (ordinals written as "15."), while en has one/two/few/other (1st/2nd/3rd/4th). — [Unicode CLDR Language Plural Rules](https://www.unicode.org/cldr/charts/latest/supplemental/language_plural_rules.html)
- Unicode MessageFormat 2.0 became Stable in CLDR 47 (released 2025-03-13), giving implementations stability guarantees. — [Unicode blog: CLDR 47 / MF2 stable](https://blog.unicode.org/2025/03/unicode-cldr-47-release-messageformat-2.html)
- The `messageformat` npm package (v4) implements MF2 and states its API is current as of LDML 48.2 (March 2026). — [messageformat@4.1.0 README](https://unpkg.com/messageformat@4.1.0/README.md) (via search snippet)
- TC39 `Intl.MessageFormat` (champions Eemeli Aro, Ujjwal Sharma) is not yet shipped in browsers; a locize post (May 2026) says it is at Stage 2 and needs more production MF2 adoption before Stage 2.7 — third-party claim, not verified against TC39 records. — [tc39/proposal-intl-messageformat](https://www.github.com/tc39/proposal-intl-messageformat); [locize: MessageFormat 2 and i18next](https://www.locize.com/blog/messageformat-2-i18next)

**[unverified] — prior knowledge, not re-fetched**
- `Intl.PluralRules(locale).select(n)` returns the CLDR category; `Intl.NumberFormat`, `Intl.DateTimeFormat`, `Intl.RelativeTimeFormat` ("prije 3 dana"/"vor 3 Tagen"), `Intl.ListFormat` ("A, B i C"/"A, B und C"), `Intl.DisplayNames`, `Intl.Segmenter` (grapheme-safe truncation) and `Intl.DurationFormat` are all available in evergreen browsers; DurationFormat reached Baseline in 2025. MDN: developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl.
- Number formats: de/bs/hr/sr use "." as group and "," as decimal (1.234,56); currency BAM ("KM") symbol placement after the number in bs/hr/sr locales; dates in BCS commonly "20. 11. 2026." with trailing dot — verify the exact CLDR output per locale in the browser rather than hardcoding.
- Gender: ICU `select` (`{gender, select, female {…} male {…} other {…}}`) is the standard mechanism; BCS past-tense verbs agree with gender of the subject ("Ana je uredila" / "Marko je uredio"), so activity-feed strings like "{name} edited" need gender or neutral rewording.
- BCS nouns decline by case after numbers (1 dan, 2 dana, 5 dana) — the plural category alone picks the form; this is why one/few/other is mandatory.

### Inferences
- UIx should own a small internal string table (per component) with a provider (e.g. `UixI18nProvider` / `useUixStrings`) and a `labels` override prop on each component; ship en + de + bs/hr/sr-Latn/sr-Cyrl defaults; fall back via locale chain (bs → hr → sr-Latn is linguistically plausible but must be reviewed by native speakers — mutual intelligibility does not mean acceptable).
- Never hardcode `count === 1 ? "item" : "items"` in UIx; route counts through `Intl.PluralRules` or ICU messages. Test with 1, 2, 5, 11, 21, 22, 25, 1.5 for bs/hr/sr.
- If React Aria is used under UIx, its `sr-SP` key should be aliased from `sr-Latn`/`sr` and Bosnian mapped to a fallback explicitly, otherwise bs users get English defaults.

### Gaps
- Exact current React Aria string-bundling mechanism (the old `@react-aria/optimize-locales-plugin`) not confirmed this session.
- Did not verify whether React Aria's Serbian strings are Latin or Cyrillic.

## 3. Text expansion, compounds, hyphenation, truncation, line breaking, pseudo-localisation

### Takeaway
Size for expansion by string length, not a flat percentage: short labels expand most (up to 200–300 % per IBM via W3C), long text ~130 %. German compounds don't wrap, so containers must allow reflow and `hyphens: auto` with a correct `lang`. Pseudo-localisation (accented + padded + RTL variants) is built into FormatJS and Lingui and catches hard-coded and concatenated strings before translation.

### Cited Findings
- IBM guideline (via W3C), English → European languages, average size of translation relative to source: up to 10 chars 200–300 %; 11–20 180–200 %; 21–30 160–180 %; 31–50 140–160 %; 51–70 151–170 % (non-monotonic, possibly a typo in source); over 70 130 %. — [W3C: Text size in translation](https://www.w3.org/International/articles/article-text-size)
- Conflicting IBM figure set (IBM Power Systems docs, extra space to add): ≤10 chars +100–200 %; 11–20 +80–100 %; 21–30 +60–80 %; 31–50 +40–60 %; 51–70 +31–40 %; >70 +30 %. The two tables express the same idea in different bases (total vs added). — [IBM: Text translation design](https://www.ibm.com/support/knowledgecenter/en/ssw_ibm_i_72/nls/rbagstextdatatransdesign.htm) (via search snippet); compare [W3C](https://www.w3.org/International/articles/article-text-size)
- German example: Flickr "views" → "-mal angesehen" ≈ 2.8× the English. Compound "Eingabeverarbeitungsfunktionen" (vs "Input processing features") is one word and will not wrap automatically. — [W3C: Text size in translation](https://www.w3.org/International/articles/article-text-size)
- W3C design implications: allow reflow, avoid small fixed-width containers, don't fit text tightly into graphics, keep font size/line height adaptable, size DB fields for expansion, avoid space-saving abbreviations. Some scripts need ~150 % vertical space (Thai example). — [W3C: Text size in translation](https://www.w3.org/International/articles/article-text-size)
- CSS `hyphens`: `none` / `manual` (initial; breaks only at U+2010 or soft hyphen `&shy;`) / `auto` (browser dictionaries). `auto` requires a correct `lang` attribute and an available dictionary for that language; `hyphenate-character` changes the hyphen glyph; `word-break: break-all` suppresses hyphens; `<wbr>` breaks without a hyphen. Baseline "Widely available" since September 2023. — [MDN: hyphens](https://developer.mozilla.org/en-US/docs/Web/CSS/hyphens)
- FormatJS CLI `compile --pseudo-locale` (requires `--ast`): `xx-LS` pads with trailing S (length), `xx-AC` uppercases, `xx-HA` prefixes a marker, `en-XA` accents + brackets, `en-XB` wraps in RTL control characters. Placeholders preserved. Extraction supports `--flatten` to hoist selectors so translators see whole sentences. — [FormatJS CLI docs](https://formatjs.github.io/docs/tooling/cli/)
- Lingui pseudolocalization: add e.g. `"pseudo-LOCALE"` to `locales`, set `pseudoLocale: { locale: "pseudo-LOCALE" }` (array form allows multiple, with `rightToLeft: true` variant); generated at `compile`; can derive from a fallback locale; to test in a browser pick a valid but unused BCP 47 tag (e.g. `zu-ZA`). Plain-string `pseudoLocale` is deprecated. Lingui docs list a 5.x → 6.x migration guide. — [Lingui: Pseudolocalization](https://lingui.dev/guides/pseudolocalization)

**[unverified]**
- Browser hyphenation dictionary coverage: Chromium and Firefox ship German hyphenation; Croatian/Serbian/Bosnian dictionary availability varies by browser and OS (Firefox ships hr and sr; Chromium on desktop historically had limited dictionaries; Safari uses OS). Must be tested; fall back to `&shy;` in key labels or `overflow-wrap: anywhere` for compounds.
- `text-wrap: balance` / `pretty` help headings and short paragraphs; `overflow-wrap: anywhere` prevents overflow of unbreakable compounds in narrow cells.
- Truncation: prefer wrapping for labels and buttons; truncate only data cells with a tooltip/full-text access; truncate on grapheme boundaries (`Intl.Segmenter`) so "č"/"dž" sequences entered as combining marks aren't split. Middle truncation for file names/IDs.
- German typically quoted at +30–35 % vs English for running text — consistent with W3C's ">70 chars ≈130 %" row; no primary German-specific figure found.

### Inferences
- UIx components should never set fixed widths on buttons, tabs, segmented controls, badges, menu items or table headers; test each at en-XA/xx-LS pseudo-locale and with real German strings.
- Put `hyphens: auto` on body/description text and narrow table headers (with `lang` from the provider), but not on buttons/labels where a hyphenated verb hurts scanning; there prefer wrap to two lines.
- A UIx visual-regression lane per pseudo-locale (en-XA + xx-LS + en-XB) would catch clipping and RTL issues in CI.

### Gaps
- No primary source found for a German-specific expansion percentage; the IBM/W3C tables are language-agnostic for European languages.
- Current per-browser hyphenation dictionary list for hr/sr/bs not verified.

## 4. Script and locale specifics: sr-Latn/sr-Cyrl, transliteration, fonts, collation, diacritic-insensitive search, BCP 47

### Takeaway
Tag content precisely (`sr-Latn`, `sr-Cyrl`, `bs`, `hr`, `de`) because hyphenation, OpenType `locl` glyph forms and screen readers depend on `lang`. Serbian Cyrillic needs fonts with Serbian/Macedonian `locl` forms (italic б г д п т differ from Russian). Latin → Cyrillic transliteration is not 1:1 (lj/nj/dž digraphs vs. letter pairs) and needs exception lists; Cyrillic → Latin is safe. Search should use `Intl.Collator` with `sensitivity: "base"` and `usage: "search"` for diacritic-insensitive matching, though digraph-aware matching needs extra normalisation.

### Cited Findings
- BCP 47 "golden rule": keep tags as short as possible; add subtags only when they distinguish. Script subtag is 4 letters right after language (e.g. `az-Latn`, `zh-Hans`); only one allowed. Region subtag only when needed (`it`, not `it-IT`). Conventions: language lowercase, Script title case, REGION uppercase — but matching must be case-insensitive. Use `lang` in HTML; it inherits to descendants. — [W3C: Language tags in HTML and XML](https://www.w3.org/International/articles/language-tags/)
- W3C's article gives no Serbian example; `sr-Latn`/`sr-Cyrl` follow the `az-Latn` pattern by the stated rules. — [W3C: Language tags](https://www.w3.org/International/articles/language-tags/)
- Serbian italic/cursive Cyrillic б, г, д, п, т differ from Russian forms; fonts expose them via the OpenType `locl` feature triggered by `lang="sr"` (or forced with `font-feature-settings: "locl" 1`); font coverage is uneven (e.g. one Alegreya report: only б substituted, г д п т missing). — [TypeDrawers: Alegreya Serbian italic glyphs](https://typedrawers.com/discussion/comment/32962); [MyFonts: Cyrillic script variations](https://www.myfonts.com/a/font/content/cyrillic-script-variations-and-the-importance-of-localisation) (via search snippets)
- Historical renderer bugs: WebKit's FreeType backend did not apply `locl`; Mozilla bug asked for `locl` to follow `lang`; GIMP and LibreOffice had Serbian `locl` failures. — [WebKit bug 37984](https://bugs.webkit.org/show_bug.cgi?id=37984); [GIMP issue 2509](https://gitlab.gnome.org/GNOME/gimp/issues/2509) (via search snippets)
- Gaj's Latin alphabet treats dž, lj, nj as single letters (affecting dictionary ordering), but they can span morpheme boundaries; Latin → Cyrillic conversion therefore needs exceptions: "džep" → џеп but "nadživjeti/nadživeti" → надживети (д+ж), "injekcija" → инјекција (н+ј) not ињекција. — [Wikipedia: Gaj's Latin alphabet](https://en.wikipedia.org/wiki/Gaj%27s_Latin_alphabet); [Lexilogos Serbian converter](https://www.lexilogos.com/keyboard/serbian_conversion.htm); [turanjanin/serbian-transliterator](https://packagist.org/packages/turanjanin/serbian-transliterator) (via search snippets)
- Reverse conversion Latin → Cyrillic "sometimes requires knowledge of Serbian"; ASCII-stripped text adds homograph ambiguity. — [Wikipedia: Romanization of Serbian](https://www.wikiwand.com/en/articles/Romanization_of_Serbian) (via search snippet)
- `Intl.Collator` sensitivity: `base` (a = á = A), `accent` (a = A, a ≠ á), `case` (a = á, a ≠ A), `variant` (default for sort). `usage: "search"` is for equality matching only (use result === 0, never the sign); MDN recommends `base` for search. `numeric: true` gives 1, 2, 10 order; `caseFirst`; `collation` variants; locale extension keys `co`, `kn`, `kf` (options win). — [MDN: Intl.Collator constructor](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Collator/Collator)

**[unverified]**
- CLDR collation for hr/bs/sr-Latn sorts č, ć, dž, đ, lj, nj, š, ž as separate letters after their base (c < č < ć < d < dž < đ …), so `new Intl.Collator("hr")` and `new Intl.Collator("en")` order the same list differently — sort with the UI locale, not "en". Check whether `bs` and `sr-Latn` inherit hr-style tailoring in the shipped ICU.
- Diacritic-insensitive search: `base` sensitivity treats č/ć/c, š/s, ž/z as equal (good for users typing on US keyboards), but "đ" commonly typed as "dj" and "dž" as "dz" are not handled by collation — add an explicit fold map (đ→dj, Đ→Dj) on both query and data. A cheap substring-capable alternative is `str.normalize("NFD").replace(/\p{M}/gu, "")` + lowercase, but "đ" has no decomposition and survives NFD, so the fold map is still needed. Cross-script search (user types Latin, data is Cyrillic) needs Cyrillic→Latin transliteration of the index.
- Font coverage: UIx must verify its font stack covers Latin Extended-A (č ć đ š ž Č Ć Đ Š Ž, plus Dž/Lj/Nj titlecase digraph code points U+01C4–U+01CC rarely used) and Cyrillic incl. Serbian letters ђ ј љ њ ћ џ, with `locl` Serbian forms in italic. Many popular variable UI fonts (Inter, Roboto Flex, IBM Plex Sans) cover Cyrillic; Serbian italic `locl` must be checked per font.
- `Intl.Locale("sr-Latn").maximize()` → `sr-Latn-RS`; `new Intl.Locale("sr").maximize()` → `sr-Cyrl-RS` (CLDR likely-subtags default for Serbian is Cyrillic) — an app passing bare `sr` gets Cyrillic formatting; for BiH a bare `sr` default may be wrong. Similarly `bs` maximises to `bs-Latn-BA`.
- `lang` affects screen-reader voice selection; `sr-Cyrl` vs `sr-Latn` text should be tagged so TTS pronounces correctly.

### Inferences
- UIx's locale provider should normalise to explicit-script tags for Serbian (`sr-Latn`, `sr-Cyrl`) and never rely on bare `sr`; expose a `script` toggle only at the app level (content is translated per script, transliteration is a generation step reviewed by a human, Cyrillic → Latin is safe to automate, Latin → Cyrillic needs an exception list).
- Provide a `uix/text` utility: `foldForSearch(str, locale)` (NFD strip + đ→dj + script transliteration) and `compareFor(locale)` (cached `Intl.Collator` with `numeric: true`), used by Combobox, Table sort, SearchSuggest, Command palette.
- Add Serbian italic glyph check (render "бгдпт" with `lang="sr"` vs `lang="ru"` in italic) to the visual test catalogue.

### Gaps
- Did not fetch CLDR collation charts for hr/sr/bs to confirm the exact tailoring and inheritance.
- No authoritative, current browser `locl` support table found; behaviour should be verified in target browsers.

## 5. RTL readiness (baseline)

### Takeaway
Even without an RTL locale today, using CSS logical properties and direction from the locale provider costs little and is validated by an RTL pseudo-locale (FormatJS `en-XB`, Lingui `rightToLeft: true`).

### Cited Findings
- React Aria: `useLocale()` exposes `direction`; set `dir` on `<html>`; flex and grid mirror automatically; CSS logical properties adapt margins/padding/borders; keyboard navigation is RTL-aware. — [React Aria: Quality / Internationalization](https://react-aria.adobe.com/quality#internationalization)
- FormatJS `en-XB` pseudo-locale wraps messages in RTL control characters to simulate bidi text. — [FormatJS CLI](https://formatjs.github.io/docs/tooling/cli/)
- Lingui supports an RTL pseudolocale via `rightToLeft: true`. — [Lingui: Pseudolocalization](https://lingui.dev/guides/pseudolocalization)

**[unverified]**
- Use `margin-inline-start`, `padding-inline`, `inset-inline-end`, `border-start-start-radius`, `text-align: start`; mirror directional icons (chevrons, back arrows) but not media/clock icons; use `<bdi>`/`dir="auto"` for user-generated names inside UI strings; a stylelint rule (e.g. `stylelint-use-logical`) can enforce logical properties.

### Inferences
- A UIx check gate rejecting physical `left/right` properties in component CSS (with an allowlist) is the cheapest durable guard.

### Gaps
- Did not fetch MDN logical-properties or W3C bidi articles this session.

## 6. Tools: Lingui, FormatJS/react-intl, i18next, Fluent, pseudo-localisation, MT review

### Takeaway
For a design system, the library choice matters less than: ICU/MF-style messages (plural/select in-string), compile-time extraction with stable IDs and translator context, pseudo-locales in CI, and a native-speaker review step for MT output. FormatJS and Lingui both compile ICU messages and generate pseudo-locales; MF2 is now a stable Unicode spec but not yet a browser built-in.

### Cited Findings
- FormatJS CLI: `extract` (glob → JSON catalog; `--id-interpolation-pattern` for content-hash IDs; `--flatten`; custom component/function names) and `compile` (validates ICU syntax; `--ast` pre-parses messages; `--pseudo-locale`). Compile uses native Rust bindings with no JS fallback (fails with "Native @formatjs/cli-lib binding is unavailable"). — [FormatJS CLI](https://formatjs.github.io/docs/tooling/cli/)
- Lingui: config via `defineConfig` in `lingui.config.{ts,js}`; extract → compile pipeline; pseudolocales generated at compile; 5.x → 6.x migration guide exists (Lingui 6 likely current; not confirmed). — [Lingui: Pseudolocalization](https://lingui.dev/guides/pseudolocalization)
- MF2: stable in CLDR 47 (2025-03); `messageformat` v4 tracks LDML 48.2 (2026-03); locize documents MF2 with i18next. — [Unicode blog](https://blog.unicode.org/2025/03/unicode-cldr-47-release-messageformat-2.html); [locize blog](https://www.locize.com/blog/messageformat-2-i18next)

**[unverified]**
- i18next uses its own JSON format with suffix-based plurals (`key_one`, `key_few`, `key_other`) driven by `Intl.PluralRules`; ICU via `i18next-icu`; react-i18next provides `useTranslation`/`Trans`.
- Mozilla Fluent (projectfluent.org, `@fluent/react`): asymmetric localisation — translators can add variants (plural, gender, case) the source language doesn't have; terms (`-brand-name`) with grammatical attributes; well suited to case-declining languages like BCS, but smaller ecosystem and TMS support than ICU.
- Pseudo-localisation alternatives: `pseudo-localization` npm package (DOM-level, no catalog needed), Chrome/Android `en-XA`/`ar-XB` pseudo-locales.
- MT review workflow: MT/LLM first pass → native-speaker review in a TMS (Crowdin, Lokalise, Phrase, Weblate) with screenshots/context and glossary (term base: "Dashboard" → "Kontrolna tabla" (sr) vs "Nadzorna ploča" (hr) vs "Kontrolna ploča" (bs)), plus length constraints per key; DeepL supports German, Serbian is not a DeepL language as of my knowledge — verify. Terminology differs across bs/hr/sr (e.g. hr "tjedan" vs sr "nedelja/sedmica", bs "sedmica"; hr month names "studeni" vs sr/bs "novembar"), so one shared "BCS" catalog is not acceptable to Croatian users.
- CLDR month names for hr use Croatian native names ("studeni" for November) while sr-Latn/bs use "novembar" — `Intl.DateTimeFormat` handles this automatically if the right tag is passed.

### Inferences
- Recommended UIx stance: UIx internal strings stored as ICU messages in a tiny per-component catalog (no runtime dependency on a consumer's i18n library); expose `labels`/provider overrides so consumers using Lingui, react-intl or i18next can pipe their own translations in. Ship pseudo-locales (en-XA accented, xx-LS long, en-XB RTL) in the styleguide's locale switcher and visual tests.
- Separate catalogs for bs, hr, sr-Latn, sr-Cyrl (sr-Cyrl generated from sr-Latn by transliteration + exception list + review) rather than one "BCS" catalog.

### Gaps
- Fluent, i18next, Weblate/Crowdin and DeepL language support not fetched this session; all related claims above are [unverified].
- Current Lingui major version and React Aria bundling mechanism not confirmed.
