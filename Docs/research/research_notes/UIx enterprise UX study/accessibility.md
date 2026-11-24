# Accessibility beyond WCAG AA for an enterprise design system (UIx), as of 2026-11-20

Scope: React + CSS design system used in desktop, keyboard-heavy ITSM operator apps (sometimes on VDI) and some touch apps. Research date 2026-11-20.

Source-handling legend:
- **[fetched]**: page read in full this session.
- **[search]**: from search-result snippets or summaries only, not the full page.
- **[prior knowledge]**: stable W3C or EU text known before this session. The URL is the canonical location but was not re-fetched this session. These claims are normative text that has not changed since publication, but treat them as unverified for this session.
- **UNVERIFIED**: a claim the researcher could not confirm against a primary source.

---

## 1. WCAG 2.2 new criteria in practice, common component-library failures, and WCAG 3.0 / APCA status

### Takeaway
WCAG 2.2 is the baseline: EN 301 549 V4.1.1 adopted it in September 2026, and the six new A/AA criteria are about to become EU-presumed requirements. Most of these criteria are won or lost inside components: focus rings, sticky or overlay layers, hit areas, drag alternatives, help placement and auth inputs. WCAG 3 is still a Working Draft years from Recommendation, and APCA is not part of it. Keep WCAG 2 contrast ratios as the gate.

### Cited Findings

**Status of WCAG 2.2**
- WCAG 2.2 became a W3C Recommendation on 5 Oct 2023. It removed 4.1.1 Parsing (now obsolete) and added nine success criteria: 2.4.11 (AA), 2.4.12 (AAA), 2.4.13 (AAA), 2.5.7 (AA), 2.5.8 (AA), 3.2.6 (A), 3.3.7 (A), 3.3.8 (AA), 3.3.9 (AAA). — [What's New in WCAG 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/) [prior knowledge; page surfaced in search]
- EN 301 549 V4.1.1 (published 2 Sep 2026) includes the six new A/AA criteria: 2.4.11, 2.5.7, 2.5.8, 3.2.6, 3.3.7 and 3.3.8. — [Deque, 8 Sep 2026](https://www.deque.com/blog/en-301-549-v4-1-1-is-final-what-changed-what-it-means-and-what-you-should-do/) [fetched]
- Deque advises teams to "start with the design system," because target size, dragging alternatives and focus visibility are usually fixed at component level. It also expects components that passed before to produce new findings. — [Deque](https://www.deque.com/blog/en-301-549-v4-1-1-is-final-what-changed-what-it-means-and-what-you-should-do/) [fetched]

**What each criterion means and how it typically fails in a component library**

- **2.4.11 Focus Not Obscured (Minimum), AA**
  - Requirement: when a component receives keyboard focus, author-created content must not hide it entirely. Partial obscuring passes.
  - W3C names the typical offenders: chatbots and toasts that slide up, cookie banners at the bottom of the page, and persistent user-opened content such as chat windows. — [W3C Understanding 2.4.11](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html) [search]
  - Library-level failures [prior knowledge, same Understanding doc]:
    - sticky table headers or toolbars covering the focused row when the user tabs or arrows upward;
    - sticky footers or action bars covering the last field;
    - non-modal drawers or toasts covering focused content.
  - Documented technique: CSS `scroll-padding-top` / `scroll-padding-bottom` equal to the height of the sticky region.
- **2.4.12 Focus Not Obscured (Enhanced), AAA**: no part of the focused component may be hidden. — [W3C Understanding 2.4.12](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-enhanced.html) [prior knowledge]
- **2.4.13 Focus Appearance, AAA**: the focus indicator must meet both of these:
  - area at least equal to a 2 CSS px thick perimeter of the unfocused component;
  - at least 3:1 contrast between the same pixels in the focused and unfocused states.
  - Source: [W3C Understanding 2.4.13](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html) [prior knowledge]
  - Common failures:
    - 1 px outlines;
    - focus shown only as a background tint change;
    - `outline: none` with box-shadow focus that disappears in forced-colors mode, because box-shadow is not painted there (see section 3).
- **2.5.7 Dragging Movements, AA**: any function that uses dragging must also work with a single pointer and no drag, unless dragging is essential.
  - Covers sortable lists, kanban, column resize/reorder, sliders, splitters and drag-to-upload.
  - Keyboard support alone does not satisfy it; a single-pointer alternative is needed, such as move-up/down buttons, a "Move to…" menu, or click-to-place.
  - Source: [W3C Understanding 2.5.7](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html) [prior knowledge]
- **2.5.8 Target Size (Minimum), AA**: targets are at least 24×24 CSS px, unless one of these exceptions applies:
  - spacing: a 24 px circle centred on each target does not intersect another target or its circle;
  - an equivalent control exists;
  - inline targets in text;
  - user-agent controls;
  - essential presentation.
  - Source: [W3C Understanding 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) [search]
  - Adrian Roselli's "adversarial conformance" demo shows that the spacing exception lets tiny controls pass. He argues people "twist the intent of WCAG" to claim conformance. — [Roselli, 2.5.8: Adversarial Conformance (Dec 2023)](https://adrianroselli.com/2023/12/2-5-8-adversarial-conformance.html) [search]
  - Dense operator UIs typically fail this with:
    - 16–20 px icon buttons in table rows;
    - chip remove "x" buttons;
    - pagination arrows;
    - tree disclosure triangles;
    - column-header sort and filter icons that touch each other.
- **2.5.5 Target Size (Enhanced), AAA**: 44×44 CSS px. Useful as the bar for touch-app density. — [W3C Understanding 2.5.5](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html) [prior knowledge]
- **3.2.6 Consistent Help, A**: if help mechanisms repeat across pages (contact details, a human contact mechanism, a self-help option, an automated contact such as a chatbot), they appear in the same relative order. — [W3C Understanding 3.2.6](https://www.w3.org/WAI/WCAG22/Understanding/consistent-help.html) [prior knowledge]
  - Library implication: the app shell and page-header help slots should have fixed positions.
- **3.3.7 Redundant Entry, A**: information the user already entered in the same process is auto-populated or available to select, with some exceptions (essential, security, or the earlier value is no longer valid). — [W3C Understanding 3.3.7](https://www.w3.org/WAI/WCAG22/Understanding/redundant-entry.html) [prior knowledge]
  - Relevant to multi-step wizards and "same as requester" fields in ITSM.
- **3.3.8 Accessible Authentication (Minimum), AA**: no cognitive function test in any authentication step unless one of these is available:
  - an alternative;
  - a mechanism that assists (for example password managers and paste);
  - object recognition;
  - personal content.
  - Source: [W3C Understanding 3.3.8](https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html) [prior knowledge]
  - Common failures:
    - blocking paste or `autocomplete` on password and OTP fields;
    - split OTP inputs that break paste;
    - puzzle CAPTCHAs without an alternative.
- **3.3.9 Accessible Authentication (Enhanced), AAA**: the object-recognition and personal-content exceptions are removed. — [W3C Understanding 3.3.9](https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-enhanced.html) [prior knowledge]
- **Supporting criteria often missed in operator apps** (all [prior knowledge], W3C Understanding docs):
  - 1.4.11 Non-text Contrast, AA: 3:1 for UI component boundaries and focus indicators.
  - 2.1.4 Character Key Shortcuts, A: single-key shortcuts must be possible to turn off or remap, or be active only on focus. This is critical for keyboard-heavy ITSM apps with "j/k/e/a" style shortcuts, and voice-control users trigger such shortcuts accidentally. — [Understanding 2.1.4](https://www.w3.org/WAI/WCAG22/Understanding/character-key-shortcuts.html)
  - 4.1.3 Status Messages, AA. — [Understanding 4.1.3](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)
- Testing guidance: TPGi publishes a WCAG 2.2 testing guide, "Accessibility Testing with WCAG 2.2". — [TPGi](https://www.tpgi.com/wp-content/uploads/Accessibility-Testing-with-WCAG-2.2.html) [search; contents not read]
- WCAG-EM 2.0 (evaluation methodology) was published as a W3C Group Note on 23 July 2026, according to the W3C Current Work page. — [W3C Current Work](https://www.w3.org/WAI/Technical/Activity) [search; UNVERIFIED date detail]

**WCAG 3.0 status**
- The W3C WCAG 3 intro page (updated 16 Nov 2026) says an updated Working Draft and Explainer were published in September 2026.
  - The draft has a single conformance level, "Tier 3", which requires all core requirements.
  - Core requirements are tagged as physical harm, risk, barrier or friction.
  - Tiers 1–2 and 4–6 report progress below and above conformance; Tier 6 includes organisational assertions.
  - The Explainer offers an alternative scoring approach and asks for feedback on both.
  - Source: [W3C WCAG 3 Introduction](https://www.w3.org/WAI/WCAG3) [fetched]
  - Note: older Bronze/Silver/Gold descriptions in blog posts are outdated by this draft.
- W3C says WCAG 3 "is not expected to be a completed W3C standard for a few more years." W3C also states: "WCAG 2 will not be deprecated for several years after WCAG 3 is finalized." It recommends meeting WCAG 2.2 now as the best preparation. — [W3C WCAG 3 Introduction](https://www.w3.org/WAI/WCAG3) [fetched]
- Draft history in 2026:
  - Working Draft dated 3 March 2026. — [W3C news](https://www.w3.org/WAI/news/2026-03-03/wcag3); [WD-wcag-3.0-20260303](https://www.w3.org/TR/2026/WD-wcag-3.0-20260303/) [search]
  - Explainer Draft Note dated 10 Sep 2026. — [DNOTE-wcag-3.0-explainer-20260910](https://www.w3.org/TR/2026/DNOTE-wcag-3.0-explainer-20260910/) [search]
- Projected timelines conflict:
  - one secondary source cites a Candidate Recommendation "planned for Q4 2027" (from a Feb 2026 snapshot);
  - Roselli says "perhaps 2030 at the soonest."
  - The W3C page itself gives no dates and points to an AG WG GitHub schedule.
  - Sources: [W3C](https://www.w3.org/WAI/WCAG3) [fetched]; [Roselli, Apr 2026](https://adrianroselli.com/2026/04/wcag3-contrast-as-of-april-2026.html) [fetched]

**Status of APCA and the WCAG 3 contrast model**
- APCA was marked for removal in early 2023 and pulled from the July 2023 Working Draft. The 8 April 2026 Editor's Draft states: "The contrast algorithm used in WCAG 3 is yet to be determined." — [Roselli, WCAG3 Contrast as of April 2026](https://adrianroselli.com/2026/04/wcag3-contrast-as-of-april-2026.html) [fetched]
- Roselli's advice if you use APCA anyway:
  - pick colours that also meet WCAG 2 contrast;
  - document any WCAG 2 failure and be ready to defend it.
  - Source: [Roselli](https://adrianroselli.com/2026/04/wcag3-contrast-as-of-april-2026.html) [fetched]
- In the same comment thread, the APCA developer's organisation said:
  - APCA is still draft guidance under evaluation and should not be called "WCAG 3";
  - nobody should drop WCAG 2 conformance;
  - BridgePCA passes WCAG 2 while adding APCA-based guidance.
  - Source: [Roselli comments](https://adrianroselli.com/2026/04/wcag3-contrast-as-of-april-2026.html) [fetched]
- The W3C AG WG 2026 activity page lists a "Simplified Contrast Guidelines (an alternative to APCA): Introducing DPS Contrast" proposal and an issue on halation/overstimulation. — [AG WG activity 2026](https://www.w3.org/groups/wg/ag/activity/2026/) [search; proposal only, not adopted]

### Inferences
- Treat WCAG 2.2 AA as the hard gate.
- Treat 2.4.13 (focus appearance) and 2.5.5 (44 px, touch only) as the UIx house standard, since both are cheap to meet at token level. Suggested house rule: a 2 px focus ring, offset, at 3:1 against both the component and the background.
- For dense operator tables, use the 2.5.8 spacing exception deliberately, not by accident:
  - icon buttons have a ≥24 px hit area even when the glyph is 16 px (padding or a pseudo-element);
  - document a minimum gap token.
- Single-key shortcuts in ITSM apps need a kit-level shortcut registry that can disable or remap keys (2.1.4).
- Every drag affordance needs a non-drag single-pointer path (2.5.7):
  - SortableList: move buttons or a menu;
  - column reorder: a column-menu "Move left/right";
  - splitter: double-click or keyboard plus explicit buttons.
- Make sticky layers (table headers, app bars, toasts, drawers) register their size into `scroll-padding` so focused items scroll clear (2.4.11).
- Keep contrast tooling on WCAG 2.x ratios. APCA may be an advisory second readout, but must never replace the 2.x gate.

### Gaps
- Could not read Roselli's "2.4.11: Adversarial Conformance" post contents, only its title.
- No primary W3C document confirming a WCAG 3 CR or REC date was found.
- No 2026 dataset was found on which 2.2 criteria fail most often in audits.
- UNVERIFIED: whether ISO/IEC 40500 has been updated to WCAG 2.2. The researcher believes an ISO/IEC 40500:2025 edition exists but did not confirm it this session.

---

## 2. European Accessibility Act, EN 301 549, and implications for B2B SaaS in the EU, the Balkans and Bosnia and Herzegovina

### Takeaway
The EAA (Directive 2019/882) has applied since 28 June 2025. At EU level it targets consumer-facing services, so pure B2B ITSM SaaS is arguably out of direct scope. However:
- national laws (France, Italy, Spain and others) reach internal and supplier software;
- public-sector procurement requires EN 301 549 conformance;
- enterprise buyers demand ACRs/VPATs.

EN 301 549 V4.1.1 (WCAG 2.2 AA) was published 2 Sep 2026. It is expected to gain presumption of conformity on Official Journal citation, with sources disagreeing on the date (16 Dec 2026 or 22 Jan 2027). Bosnia and Herzegovina has no EAA transposition found. It is an EU candidate country, so alignment is directional rather than binding today.

### Cited Findings

**EN 301 549 V4.1.1**
- ETSI, CEN and CENELEC published V4.1.1 on 2 Sep 2026.
  - It adds the six WCAG 2.2 A/AA criteria and reworked User Preferences requirements.
  - It updates real-time communication and RTT requirements (Clause 6, a "Total Conversation" model).
  - It adds EAA mappings in the annexes.
  - Source: [Deque](https://www.deque.com/blog/en-301-549-v4-1-1-is-final-what-changed-what-it-means-and-what-you-should-do/) [fetched]
- Until V4.1.1 is cited in the Official Journal, it "does not carry presumption of conformity."
  - Deque first estimated citation "around November 30, 2026," then updated that to 22 Jan 2027. — [Deque](https://www.deque.com/blog/en-301-549-v4-1-1-is-final-what-changed-what-it-means-and-what-you-should-do/) [fetched]
  - Ireland's NDA says legal effect is expected 16 Dec 2026. — [NDA Ireland](https://nda.ie/news/en301549-published) [search]
  - **Conflict:** the citation date is unconfirmed. V3.2.1 (WCAG 2.1) remains the operative cited version until citation. — [DWT, Sep 2026](https://www.dwt.com/insights/2026/09/european-accessibility-act-ict-standards-update) [search]
- WCAG 2.2 AA alone is not full EN 301 549 conformance. The standard has non-WCAG clauses for:
  - software and user preferences;
  - closed functionality;
  - real-time communication;
  - documentation and support.
  - Source: [search summary of DWT/Deque](https://www.dwt.com/insights/2026/09/european-accessibility-act-ict-standards-update) [search]
- EN 301 549 clause numbers relevant to a web design system (from V3.2.1; **UNVERIFIED** whether renumbered in V4.1.1):
  - Clause 9: web content (WCAG mapping).
  - Clause 11.7: user preferences — the software should use platform colour, contrast, font size and focus settings.
  - Clause 12: documentation and support services; accessibility features must be documented.
  - Source: [ETSI EN 301 549 V3.2.1](https://www.etsi.org/deliver/etsi_en/301500_301599/301549/03.02.01_60/en_301549v030201p.pdf) [prior knowledge]

**EAA scope for B2B**
- EAA = Directive (EU) 2019/882. Key provisions [prior knowledge; EUR-Lex text](https://eur-lex.europa.eu/eli/dir/2019/882/oj):
  - In-scope services in Art. 2(2) include e-commerce services, consumer banking, e-books, electronic communications, and websites/apps of passenger transport.
  - "Consumer" is defined in Art. 3.
  - Microenterprises providing services are exempt under Art. 4(5): fewer than 10 persons and annual turnover or balance sheet of €2M or less.
  - Transitional provision, Art. 32: service contracts agreed before 28 June 2025 may continue until 28 June 2030.
  - Accessibility requirements are in Annex I. Presumption of conformity via harmonised standards is in Art. 15.
- Commentators split on B2B SaaS:
  - Some say a purely B2B product with no consumer-facing element may fall outside scope.
  - Others argue scope reaches any SaaS where employees are end users.
  - Most sources here are vendor blogs.
  - Sources: [iubenda B2B guide](https://www.iubenda.com/en/help/181280-european-accessibility-act-b2b-guide); [accessibility.works](https://www.accessibility.works/blog/saas-eaa-compliance-european-accessibility-act-en-301-549-requirements/); [buildmvpfast decision tree](https://www.buildmvpfast.com/blog/european-accessibility-act-saas-decision-tree-2026) [search; vendor sources]
- Karl Groves (15 May 2025) argues a consumer-only reading is "incomplete and potentially risky." Recital 11 exempts public-sector services to professionals only at EU level. National laws go further:
  - **France**: Loi 2005-102 Art. 47 covers large private organisations (revenue above €250M), including intranets.
  - **Italy**: Legge Stanca 4/2004 covers private ICT suppliers to public administrations and requires EN 301 549.
  - **Spain**: RD 1112/2018 reaches some private platforms used by public entities.
  - **Germany**: BFSG mirrors consumer scope, but BGG §12a covers IT procured by federal bodies.
  - **Netherlands and Sweden**: EN 301 549 for public bodies, with suppliers expected to comply.
  - Source: [Karl Groves](https://karlgroves.com/the-european-accessibility-act-and-b2b-software-what-internal-platforms-must-comply-with/) [fetched]
- Enforcement in 2026 is national and uneven. Procurement pressure is a more immediate driver than fines. Single-blog claims (a French Carrefour ruling, 124 complaints in Sweden) were not verifiable. — [search summary of sota.io / siteimprove](https://siteimprove.com/en/blog/the-european-accessibility-act-frequently-asked-questions/) [search; UNVERIFIED specifics]
- Web Accessibility Directive (EU) 2016/2102 covers public-sector websites and apps. It requires an accessibility statement and a feedback mechanism, and uses EN 301 549 as the harmonised standard. — [W3C WAI EU policy page](https://www.w3.org/WAI/policies/european-union) [search / prior knowledge]

**Bosnia and Herzegovina and the Balkans**
- A 2018 BiH Communications Regulatory Agency presentation said EU-directive-based measures "are not available" in BiH. It said WCAG 2.0 is applied as the web standard and public bodies should make websites accessible. — [ITU/CRA presentation](https://www.itu.int/net4/ITU-D/CDS/InteractiveProgramme/Calendar/file_download_statement.asp?FileID=45) [search]
- A Disability World regulations page describes EU-accession-driven secondary legislation approximating the WAD and preparing for the EAA. Its URL path is "/rs/", which may mean Republika Srpska or Serbia (`rs` is Serbia's ISO code). — [Disability World /regulations/rs/](https://www.disabilityworld.org/regulations/rs/) [search; **UNVERIFIED** which jurisdiction]
- A 2025 BH Economic Forum paper evaluates BiH public-institution websites against WCAG 2.2. — [bhef.unze.ba](https://bhef.unze.ba/article/93/pdf) [search; contents not read]
- OECD Western Balkans Competitiveness Outlook tracks a BiH digital-accessibility indicator. — [OECD indicator DIGITAL_QL07/BIH](https://westernbalkans-competitiveness.oecd.org/indicators/DIGITAL_QL07/BIH) [search; value not read]
- BiH ratified the UN CRPD (Art. 9 accessibility includes ICT). It received EU candidate status in December 2022. — [UN CRPD BiH list of issues](https://digitallibrary.un.org/record/4045470/files/CRPD_C_BIH_Q_2-3-EN.pdf) [search; candidate-status date is prior knowledge, UNVERIFIED this session]

### Inferences
- For a BiH-based vendor selling B2B ITSM SaaS into the EU:
  - the practical requirement is EN 301 549 (V3.2.1 now, V4.1.1 imminent);
  - evidence comes as an ACR/VPAT (EU edition) per product;
  - public-sector or large-enterprise buyers will ask for both.
  - Design-system-level conformance documentation (per component) feeds those ACRs directly.
- EN 301 549 user-preference clauses (platform contrast, text size, focus) matter more for VDI and Windows users than WCAG alone, and line up with forced-colors and text-scaling support (section 3).
- BiH domestic law is not a driver. EU export markets and accession alignment are.
- For legal review, inventory which customer jurisdictions apply the "employee as end user" readings (France, Italy, Spain).

### Gaps
- Official Journal citation reference for V4.1.1 was not found; its date conflicts between 16 Dec 2026 and 22 Jan 2027.
- No current BiH state or entity accessibility law text was found (official gazettes not searched).
- Status of Serbia, Montenegro and North Macedonia transpositions was not researched.
- EN 301 549 V4.1.1 clause renumbering was not verified (the PDF was not read).
- The researcher is not a lawyer. Scope conclusions need legal review.

---

## 3. Screen reader testing: real-device matrix, known pattern differences, automated coverage limits

### Takeaway
Weight the desktop matrix toward JAWS and NVDA on Chrome and Edge:
- WebAIM 2026: JAWS 55% primary, NVDA 32.9%;
- top combinations: JAWS + Chrome 31.2%, NVDA + Chrome 17.3%, JAWS + Edge 17.0%.

Add VoiceOver (macOS and iOS) and TalkBack for touch apps, and Narrator as a smoke check.

Automation finds about 57% of issues by volume, but only covers about 16 of 50 WCAG 2.1 AA criteria. Comboboxes, grids, live regions and dialogs must be tested manually across AT, because support differs.

### Cited Findings

**Usage data**
- WebAIM Screen Reader User Survey #11 (July–Aug 2026, 1,780 responses, uncontrolled sample):
  - Primary desktop screen reader: JAWS 55.0%, NVDA 32.9%, VoiceOver 6.5%, ZoomText/Fusion 2.1%, Orca 1.4%, Narrator 0.4%.
  - Commonly used (multi-select): JAWS 69.2%, NVDA 59.3%, VoiceOver 42.0%, Narrator 36.1%. 70.3% use more than one desktop screen reader.
  - Source: [WebAIM SR Survey #11](https://webaim.org/projects/screenreadersurvey11/) [fetched]
- Browser and screen reader combinations in the same survey: JAWS + Chrome 31.2%, NVDA + Chrome 17.3%, JAWS + Edge 17.0%, NVDA + Firefox 9.1%, NVDA + Edge 5.4%, JAWS + Firefox 5.0%, VoiceOver + Safari 4.3%, VoiceOver + Chrome 1.6%. — [WebAIM #11](https://webaim.org/projects/screenreadersurvey11/) [fetched]
- Mobile:
  - primary platform iOS 73.3%, Android 24.0%;
  - VoiceOver 72.2% and TalkBack 29.5% commonly used;
  - 91.8% use a mobile screen reader;
  - desktop most often 42.6%, both equally 49.0%, mobile most often 8.3%.
  - Source: [WebAIM #11](https://webaim.org/projects/screenreadersurvey11/) [fetched]
- Other findings in the same survey:
  - 67.8% navigate by headings first (down from 71.6% in 2024).
  - PDFs are the top pain point (85.6%).
  - AI use is high: 60.1% use it for image descriptions; only 8.2% use no AI. — [WebAIM #11](https://webaim.org/projects/screenreadersurvey11/) [fetched]

**Published test matrices**
- GOV.UK Service Manual recommended matrix:
  - JAWS (2019+) with Chrome or Edge;
  - NVDA with Chrome, Firefox or Edge;
  - VoiceOver iOS with Safari;
  - TalkBack with Chrome;
  - Windows Magnifier or Apple Zoom;
  - Dragon 15+ with Chrome.
  - Secondary priorities: VoiceOver macOS + Safari, ZoomText, Windows High Contrast and Firefox colour settings, and Firefox with JAWS, NVDA or Dragon.
  - The matrix was last changed 21 Sep 2020; the page was reviewed 24 May 2022, so it is dated.
  - Source: [GOV.UK – Testing with assistive technologies](https://www.gov.uk/service-manual/technology/testing-with-assistive-technologies) [fetched]
- GOV.UK's per-AT test method:
  - **Screen readers**: every element and heading is read; tab through all links; landmarks work; forms can be completed.
  - **Magnifiers**: test at 4× or more; check label-to-field proximity and layout consistency; users must be alerted to changes outside the viewport (modals, errors).
  - **Speech recognition**: voice alone must reach every control and enter text.
  - Source: [GOV.UK](https://www.gov.uk/service-manual/technology/testing-with-assistive-technologies) [fetched]
- React Aria / React Spectrum test across:
  - VoiceOver macOS (Safari, Chrome);
  - JAWS and NVDA (Firefox, Chrome);
  - VoiceOver iOS;
  - TalkBack (Chrome).
  - Source: [React Aria – Accessibility](https://react-spectrum.adobe.com/react-aria/accessibility.html) [search]

**Known differences by pattern**
- Combobox: the React Aria team found "varied support across screen readers."
  - Their ComboBox deviates from the ARIA 1.2 pattern because the listbox is portalled.
  - On mobile the tray input uses `role="searchbox"` instead of combobox.
  - Their conclusion: manual testing is "irreplaceable."
  - Source: [React Aria – Building a ComboBox](https://react-spectrum.adobe.com/blog/building-a-combobox.html) [search]
- The ARIA 1.1 combobox-with-grid-popup layout has poor screen reader compatibility. — [Citizens Advice react-combo-boxes accessibility notes](https://citizensadvice.github.io/react-combo-boxes/accessibility.html) [search]
- A matrix should record expected behaviour per component × browser × AT, because a component can work in JAWS + Chrome and fail in NVDA + Chrome. — [govau design-system-components issue #951](https://www.github.com/govau/design-system-components/issues/951) [search]
- AG Grid recommends testing how different screen readers announce the grid rather than relying on one standard. — [AG Grid accessibility](https://www.ag-grid.com/react-data-grid/accessibility/) [search]
- [prior knowledge; widely documented, not re-fetched] Pattern-level traits to test explicitly:
  - **Grids**: `role="grid"` puts NVDA and JAWS into focus/forms mode, so the component owns arrow keys.
    - Virtualised grids need `aria-rowcount` / `aria-rowindex`.
    - VoiceOver macOS has weaker support for row/column index and header announcements.
    - Use `role="table"` for read-only data, and `grid` only when cells are interactive.
    - Reference: [ARIA APG Grid pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/).
  - **Live regions**: the region must exist in the DOM before content changes.
    - Announcements are dropped or merged differently by NVDA, JAWS and VoiceOver.
    - Rapid successive updates get clobbered.
    - `aria-live="assertive"` interrupts speech.
    - A kit-level single announcer with queueing is the usual mitigation.
    - Reference: [WCAG 4.1.3 Understanding](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html).
    - **UNVERIFIED**: the current cross-browser status of the proposed `ariaNotify()` API, which was trialled in Edge/Chromium.
  - **Dialogs**: native `<dialog>` with `showModal()` plus `inert` gives a correct modal boundary in current engines.
    - Historic failures: the VoiceOver iOS virtual cursor escaping a non-inert background; initial focus target and return focus on close.
    - Reference: [ARIA APG Dialog (Modal) pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).
- Cross-AT support data sources [prior knowledge]:
  - W3C [ARIA-AT](https://aria-at.w3.org/) publishes interoperability test results per pattern (combobox, menu button, grid and others) for JAWS, NVDA and VoiceOver.
  - [a11ysupport.io](https://a11ysupport.io/) (Michael Fairchild) publishes per-feature support tables.

**Automated testing limits**
- Deque's study of 2,000+ audits (13,000 pages, about 300,000 issues; March 2021): axe found 57.38% of issues by volume. By criterion, automation found issues for only 16 of 50 WCAG 2.1 AA criteria. This is a vendor-run study. — [Deque](https://www.deque.com/blog/automated-testing-study-identifies-57-percent-of-digital-accessibility-issues) [search]
- GDS (2017) tested 13 automated tools against a page with 142 deliberate barriers; the best tool found about 40%. — [GOV.UK accessibility blog, Feb 2017](https://accessibility.blog.gov.uk/2017/02/24/what-we-found-when-we-tested-tools-on-the-worlds-least-accessible-webpage/) [prior knowledge; exact percentage UNVERIFIED this session]

### Inferences
**Recommended UIx matrix (tiered)**

| Tier | When | Combinations |
|---|---|---|
| Tier 1 | Every interactive component release | NVDA + Chrome; JAWS + Chrome (or Edge); VoiceOver macOS + Safari; keyboard-only; forced-colors (Windows contrast theme) |
| Tier 2 | Per minor release or for touch-relevant components | NVDA + Firefox; VoiceOver iOS + Safari; TalkBack + Chrome; Narrator + Edge (smoke check); Dragon or Voice Access |
| Tier 3 | Periodic | JAWS older version; ZoomText/Fusion; Orca |

- JAWS needs a licence. NVDA is free and should be the CI-adjacent manual default. Guidepup or similar can automate some NVDA and VoiceOver smoke runs; **UNVERIFIED** maturity in 2026.
- Per-component docs should carry a "tested with" table (AT × browser × date × result × known issues), like Carbon's status tags and GOV.UK's known issues (see section 7).
- For operator apps, record the expected announcement per pattern (combobox selection, row change, toast, save status) as the test oracle.
- axe (via Vitest/Playwright, Storybook a11y addon) is a floor that catches regressions, not evidence of conformance.

### Gaps
- No 2026 data on Narrator-specific web differences was found.
- ARIA-AT's current results for combobox and grid were not fetched.
- Atlassian and Fluent published test matrices were not found in this session's searches.
- The current status of `ariaNotify` was not verified.

---

## 4. Forced colours / Windows contrast themes, prefers-contrast, 400% zoom and reflow, text spacing, user font size, Windows text scaling on VDI

### Takeaway
Windows contrast themes (`forced-colors: active`) are the highest-impact Windows-desktop preference, and design systems most often break them through box-shadow focus rings, background-only states and SVG icons. Reflow at 320 CSS px, text spacing overrides and rem-based type are WCAG AA. Respecting the OS or browser default font size and Windows text scale is EN 301 549 user-preference territory. On VDI each of these must be verified inside the remote session.

### Cited Findings

**Forced colours**
- The `forced-colors` media feature has two values, `active` and `none`. — [MDN forced-colors](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors) [search]
- Best practices:
  - Repair styles inside `@media (forced-colors: active)` with CSS system colours (Canvas, CanvasText, LinkText, ButtonText, ButtonFace, Highlight, HighlightText, GrayText).
  - Avoid blanket `forced-color-adjust: none`.
  - The legacy `-ms-high-contrast` query is deprecated.
  - Sources: [Microsoft Edge blog, Sep 2020](https://blogs.windows.com/msedgedev/2020/09/17/styling-for-windows-high-contrast-with-new-standards-for-forced-colors/); [Roselli, WHCM and System Colors](https://adrianroselli.com/2021/02/whcm-and-system-colors.html); [Smashing, Guide to WHCM (2022)](https://smashingmagazine.com/2022/06/guide-windows-high-contrast-mode/) [search]
- How to test:
  - Windows 11: Settings > Accessibility > Contrast themes.
  - DevTools: Rendering panel > emulate `forced-colors: active`.
  - Firefox resolves forced colours from its own settings plus the OS, so test per browser.
  - Sources: [Firefox HCM media queries doc](https://firefox-source-docs.mozilla.org/accessible/HCMMediaQueries.html); [Harvard, Deep Dive into Contrast Themes (May 2026)](https://accessibility.huit.harvard.edu/news/2026/05/deep-dive-contrast-themes) [search]
- Fluent UI publishes high-contrast guidance for its web components. — [Fluent UI web components – High contrast](https://learn.microsoft.com/pt-br/fluent-ui/web-components/design-system/high-contrast) [search]
- [prior knowledge] In forced-colours mode:
  - box-shadow is removed, background images are kept, and backgrounds are overridden;
  - therefore focus rings built from box-shadow, and selected or hover states shown only by background colour, disappear.
  - Fix: a transparent `outline` or `border` that becomes visible when the UA forces colours (the `outline: 2px solid transparent` technique), and `currentColor` in SVG icons.

**prefers-contrast**
- Values are `more`, `less`, `custom` and `no-preference`. Use it to strengthen borders and focus rings, and reduce translucent or "calm" low-contrast styling. — [MDN prefers-contrast](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-contrast) [prior knowledge]
- One Microsoft-linked resource said the `forced` value was not implemented in Chromium at time of writing. — [search summary](https://blogs.windows.com/msedgedev/?p=24504) [search; UNVERIFIED current state]

**Zoom, reflow and text spacing (WCAG)** [prior knowledge, W3C Understanding docs]
- [1.4.4 Resize Text](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html) (AA): text resizes to 200% without loss of content or function.
- [1.4.10 Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) (AA):
  - no two-dimensional scrolling at 320 CSS px width (= 1280 px at 400%) or 256 px height;
  - exceptions exist for content that requires 2D layout, such as data tables, maps, diagrams and toolbars.
  - Operator data grids qualify, but the page chrome around them does not.
- [1.4.12 Text Spacing](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html) (AA): no loss of content when users set:
  - line-height 1.5×;
  - paragraph spacing 2×;
  - letter-spacing 0.12em;
  - word-spacing 0.16em.
  - Typical failures: fixed-height chips, badges and buttons, and truncation without access to the full text.
- [1.4.13 Content on Hover or Focus](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html) (AA): tooltips must be dismissible (Esc), hoverable and persistent. Magnifier users are the main beneficiaries.

**Windows text scaling, display scaling and VDI**
- Windows offers two settings:
  - Accessibility > Text size, which scales text only;
  - Display > Scale, which scales everything.
  - Source: [Microsoft Support – Change the size of text in Windows](https://support.microsoft.com/en-US/accessibility/windows/change-the-size-of-text-in-windows) [search]
- Chromium applies an additional scale factor when Windows text zoom is on; a double-scaling bug was fixed. Chrome and Edge reportedly scale both UI and web content (a secondhand report from a Mozilla bug). — [Chromium commit](https://chromium.googlesource.com/chromium/src.git/+/eeb7bfd6cccbef9add25fa30f401b68a2efef054); [Mozilla bug 1782287](https://bugzilla.mozilla.org/show_bug.cgi?id=1782287) [search; **UNVERIFIED** exact current behaviour]
- Users report that the Windows text-size or scaling setting zooms Edge content proportionally with no independent control. — [Microsoft Tech Community thread (2021)](https://techcommunity.microsoft.com/t5/discussions/windows-10-screen-scaling-font-size-and-edge-content-zoom/m-p/2278754) [search]

### Inferences
**UIx gates suggested by the findings above:**
- **Forced colours**:
  - a Playwright project with `forcedColors: 'active'` and screenshots for every interactive component;
  - every state (focus, selected, checked, disabled, current, invalid) must stay distinguishable without colour fill, using borders, outlines, icons or text;
  - ban box-shadow-only focus rings.
- **prefers-contrast: more**: a token layer that raises border, divider and quiet-link contrast and makes translucent surfaces opaque. This is relevant to UIx "calm" and "quiet link" styles.
- **Type sizing**:
  - type in rem; never set root `font-size` in px, so the browser default font size is respected;
  - test at a browser default of 20 px and 24 px, plus 200% browser zoom.
- **Reflow**: test the app shell and dialogs at 1280×1024 at 400% (or a 320 px viewport). Grids may scroll horizontally, but headers, filters and toolbars must reflow or collapse.
- **Text spacing**: inject the 1.4.12 bookmarklet CSS in a visual-regression run.
- **VDI** (Citrix, AVD, Windows 365):
  - display scaling, contrast themes and screen readers must run inside the session;
  - magnifiers on the endpoint enlarge a compressed bitmap;
  - test UIx inside an RDP session at 150–200% scaling and with a contrast theme, and check for hairline borders vanishing at fractional DPR.
  - These are inferences; no primary VDI-specific web guidance was found.
- Avoid 1 px borders as the sole state cue at fractional device pixel ratios, which are common under 125%/150% Windows scaling.

### Gaps
- No authoritative 2026 source on how Citrix or AVD sessions pass through contrast themes and text scaling to browsers.
- The exact current Chromium handling of Windows "Text size" for web content was not verified.
- `prefers-contrast` implementation status per engine in 2026 was not verified.

---

## 5. Cognitive accessibility (W3C COGA "Making Content Usable"), timeouts, consistent navigation, plain language

### Takeaway
COGA's "Making Content Usable" (W3C Working Group Note, 29 April 2021) is the main non-normative reference. Its objectives and design patterns cover:
- helping users understand and find what they need;
- using clear content;
- helping users avoid mistakes and recover;
- helping users focus;
- not relying on memory;
- supporting adaptation and personalisation;
- testing with real users.

For operator apps, the most applicable patterns concern:
- session timeouts and data loss (WCAG 2.2.1 AA, 2.2.6 AAA);
- consistent navigation and help (3.2.3, 3.2.6);
- redundant entry (3.3.7);
- forgiving inputs and undo;
- plain-language errors.

### Cited Findings
- Making Content Usable is organised by high-level objectives, with user stories and design patterns mapped to them (Appendix A). Each design pattern ties to specific objectives and user scenarios. — [W3C, Making Content Usable for People with Cognitive and Learning Disabilities](https://www.w3.org/TR/coga-usable/) [search]
- The Note is dated 29 April 2021. — [W3C NOTE-coga-usable-20210429](https://www.w3.org/TR/2021/NOTE-coga-usable-20210429/) [search]
- The Note includes a pattern anchored "Avoid Data Loss and Timeouts". — [search snippet referencing coga-usable](https://www.w3.org/TR/coga-usable/) [search; pattern text not read]
- [prior knowledge] The eight COGA objectives:
  1. help users understand what things are and how to use them;
  2. help users find what they need;
  3. use clear and understandable content;
  4. help users avoid mistakes and know how to correct them;
  5. help users focus;
  6. ensure processes do not rely on memory;
  7. provide help and support;
  8. support adaptation and personalisation.
  - Source: [W3C COGA](https://www.w3.org/TR/coga-usable/)
- WCAG timing criteria [prior knowledge, W3C Understanding]:
  - [2.2.1 Timing Adjustable](https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html) (A): the user can turn off, adjust (≥10×), or extend the time limit, with a ≥20 s warning and a simple action. Exceptions: real-time, essential, and over 20 hours.
  - [2.2.6 Timeouts](https://www.w3.org/WAI/WCAG22/Understanding/timeouts.html) (AAA): warn users about inactivity timeouts that cause data loss, unless data is kept for more than 20 hours.
  - [3.2.3 Consistent Navigation](https://www.w3.org/WAI/WCAG22/Understanding/consistent-navigation.html) (AA).
  - [3.2.4 Consistent Identification](https://www.w3.org/WAI/WCAG22/Understanding/consistent-identification.html) (AA).
  - [3.3.4 Error Prevention (Legal, Financial, Data)](https://www.w3.org/WAI/WCAG22/Understanding/error-prevention-legal-financial-data.html) (AA): reversible, checked or confirmed.
  - [2.2.4 Interruptions](https://www.w3.org/WAI/WCAG22/Understanding/interruptions.html) (AAA): interruptions can be postponed or suppressed. Relevant to toast and notification storms in ITSM.
- The WCAG 3 draft's tags (physical harm, risk, barrier, friction) indicate W3C intends to weight cognitive "friction" items in future conformance. — [W3C WCAG 3 Introduction](https://www.w3.org/WAI/WCAG3) [fetched; the link to COGA is an inference]

### Inferences
**Kit-level cognitive features for UIx:**
- A SessionTimeout pattern:
  - warns at least 2 minutes before expiry;
  - says how long is left;
  - offers one-click extend;
  - preserves drafts so nothing is lost on expiry.
  - This meets 2.2.1 and approaches 2.2.6.
- Draft persistence and SaveStatus (already in the kit) are COGA-aligned and should be documented as such.
- Error messages state what happened, why, and how to fix it, linked to the field (3.3.1/3.3.3).
- Avoid jargon-only status chips; pair colour, icon and text.
- Use undo rather than confirm for reversible bulk actions. Use confirm plus a typed check only for destructive or irreversible actions (3.3.4).
- Fixed app-shell order for navigation, search and help (3.2.3 / 3.2.6).
- An interruption policy: toasts are batched or rate-limited; a "do not disturb" mode is available; critical alerts are distinct (2.2.4).
- Plain-language guidance belongs in UIx content and UX-writing docs. For a BiH/EU product, write it per locale (BS/HR/SR and EN).

### Gaps
- The COGA pattern text for timeouts was not fetched.
- No 2026 update to COGA was found; whether a newer revision exists is unverified.
- No research found on cognitive load specific to ITSM operators.

---

## 6. Motor: keyboard-only, switch access, voice control, and accessible names that match visible labels (2.5.3)

### Takeaway
Operator apps live or die on keyboard support:
- predictable tab order, a roving tabindex inside composite widgets, and visible focus;
- no keyboard traps;
- escape returns focus;
- remappable single-key shortcuts (2.1.4).

Voice-control users (Dragon, Windows Voice Access, macOS/iOS Voice Control, Android Voice Access) need the accessible name to contain the visible label (2.5.3), ideally at the start. Icon-only buttons need a visible tooltip whose text equals the accessible name. Switch users need large targets, no timing, and no drag-only actions.

### Cited Findings
- GOV.UK includes Dragon 15+ with Chrome in its core AT matrix. Its speech-recognition test: "use voice alone to navigate to every feature, activate every link, button and control, and enter text." — [GOV.UK Testing with AT](https://www.gov.uk/service-manual/technology/testing-with-assistive-technologies) [fetched]
- [prior knowledge, W3C Understanding docs]:
  - [2.5.3 Label in Name](https://www.w3.org/WAI/WCAG22/Understanding/label-in-name.html) (A): when a component has a visible text label, its accessible name contains that text. Best practice is that the name starts with the visible label.
    - Common failure: an `aria-label` that overrides the visible text, e.g. visible "Assign" with name "Assign ticket to me".
  - [2.1.1 Keyboard](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html) (A) and [2.1.2 No Keyboard Trap](https://www.w3.org/WAI/WCAG22/Understanding/no-keyboard-trap.html) (A).
  - [2.4.3 Focus Order](https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html) (A).
  - [2.4.7 Focus Visible](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html) (AA).
  - [2.5.1 Pointer Gestures](https://www.w3.org/WAI/WCAG22/Understanding/pointer-gestures.html) (A): multipoint and path gestures need single-pointer alternatives.
  - [2.5.2 Pointer Cancellation](https://www.w3.org/WAI/WCAG22/Understanding/pointer-cancellation.html) (A): activate on up-event.
  - [2.5.7 Dragging](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html) (AA).
  - [2.1.4 Character Key Shortcuts](https://www.w3.org/WAI/WCAG22/Understanding/character-key-shortcuts.html) (A): voice users dictating text can trigger single-letter shortcuts accidentally.
- [prior knowledge] ARIA APG keyboard conventions apply: roving tabindex or `aria-activedescendant` for listbox, menu, grid, tree, tabs and toolbar; one Tab stop per composite widget. — [ARIA APG – Developing a Keyboard Interface](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)
- [prior knowledge; **UNVERIFIED** dates] Windows Voice Access is the built-in voice-control tool on Windows 11 and supersedes Windows Speech Recognition. Like Dragon and macOS Voice Control, it targets controls by accessible name, with fallbacks such as "show numbers" or grid overlays.

### Inferences
**Per-component motor test script (Tab/Shift+Tab, arrows, Home/End, Enter/Space, Esc, type-ahead):**
1. Every action is reachable by keyboard.
2. Focus is visible at 3:1 with a 2 px ring.
3. Esc closes overlays and returns focus to the invoker.
4. No focus is lost to `<body>` after deleting a row or closing a dialog.
5. The focused element is never fully hidden by sticky UI.
6. Shortcuts are listed in a help dialog, and single-key ones can be disabled.

**Voice test** (Dragon, or Voice Access on Windows 11; Voice Control on macOS/iOS):
- say "click <visible label>" for every control;
- icon buttons need a visible tooltip or label that equals the accessible name;
- add a lint for `aria-label` not containing the visible text (axe has a `label-content-name-mismatch` rule, experimental; **UNVERIFIED** status).

**Switch access** (iOS Switch Control, Android Switch Access):
- for touch apps, verify scan order equals DOM order;
- no timeouts on menus or toasts carrying actions;
- 44 px targets.

**Virtualised grids:** keyboard navigation must not drop focus when rows recycle. Keep focus on a stable row ID.

### Gaps
- No 2026 primary source was fetched on Windows Voice Access web-control behaviour, or on Dragon's current version and Chrome extension status.
- No usage statistics were found for switch or voice users in enterprise contexts.
- Whether axe's `label-content-name-mismatch` rule is still experimental in 2026 is unverified.

---

## 7. How leading design systems document and test accessibility per component

### Takeaway
Mature systems publish per-component accessibility status and evidence, not just a WCAG claim:
- **IBM Carbon**: per-component tags (automated AVT on every change, manual keyboard and screen-reader checks with JAWS, VoiceOver and NVDA).
- **GOV.UK**: tests against the common AT × browser pairs, publishes component research and known issues, and has a formal accessibility strategy.
- **Adobe React Aria/Spectrum**: tests every component across VoiceOver (macOS/iOS), JAWS, NVDA and TalkBack, and writes up the trade-offs per pattern.

For Atlassian and Fluent, this session found no primary sources on their testing process. Their per-component docs are known from prior knowledge only.

### Cited Findings
- **IBM Carbon**:
  - automated accessibility verification tests (AVT) run on every change to the codebase;
  - manual checks, including screen-reader testing, happen periodically;
  - the status page tags each @carbon/react component (for example "manually tested"; screen-reader tag covering JAWS, VoiceOver and NVDA).
  - Source: [Carbon – Accessibility status](https://carbondesignsystem.com/components/overview/accessibility-status) [search]
- **GOV.UK Design System**:
  - regularly tested against the most common AT × browser combinations; the matrix is derived from GOV.UK's 2016 AT survey and the WebAIM survey;
  - a new accessibility strategy was published in January 2023.
  - Sources: [GOV.UK Service Manual](https://www.gov.uk/service-manual/technology/testing-with-assistive-technologies) [fetched]; [GOV.UK accessibility blog – A new accessibility strategy for the GOV.UK Design System (6 Jan 2023)](https://accessibility.blog.gov.uk/2023/01/06/a-new-accessibility-strategy-for-the-gov-uk-design-system) [search; contents not read]
- UK government departments publish known-issue registers. DWP keeps a public "Known accessibility issues" list and AT-testing how-tos. — [DWP Accessibility Manual – Known accessibility issues](https://accessibility-manual.dwp.gov.uk/tools-and-resources/known-accessibility-issues); [DWP – How to do AT testing](https://accessibility-manual.dwp.gov.uk/best-practice/assistive-technology-testing) [search]
- The UK Intelligence Community Design System publishes an assistive-technology testing guide. — [ICDS – AT testing](https://design.sis.gov.uk/accessibility/testing/assistive-tech-testing/) [search]
- **Adobe React Aria / React Spectrum**:
  - tests all components across VoiceOver macOS (Safari, Chrome), JAWS and NVDA (Firefox, Chrome), VoiceOver iOS, and TalkBack (Chrome);
  - publishes engineering write-ups of AT trade-offs, such as the ComboBox post.
  - Sources: [React Aria – Accessibility](https://react-spectrum.adobe.com/react-aria/accessibility.html); [Building a ComboBox](https://react-spectrum.adobe.com/blog/building-a-combobox.html) [search]
- **Vendor component libraries** (KendoReact, Syncfusion) publish per-component WAI-ARIA support tables listing roles, attributes and keyboard shortcuts. — [KendoReact ComboBox accessibility](https://www.telerik.com/kendo-react-ui/components/dropdowns/combobox/accessibility/wai-aria-support); [Syncfusion ComboBox accessibility](https://ej2.syncfusion.com/react/documentation/combo-box/accessibility) [search]
- [prior knowledge; **UNVERIFIED** this session]
  - Atlassian Design System component pages carry accessibility guidance (keyboard and labelling).
  - Microsoft Fluent 2 has per-component accessibility guidance and high-contrast support. — [Fluent high contrast](https://learn.microsoft.com/pt-br/fluent-ui/web-components/design-system/high-contrast) [search]

### Inferences
**Per-component accessibility documentation template for UIx** (synthesised from Carbon, GOV.UK, React Aria and vendor tables):

1. **Accessibility status badge**, with three parts:
   - automated: axe or Playwright run, clean;
   - keyboard: manually verified, with a date;
   - screen reader: AT × browser × date × pass / known issue.
2. **Keyboard map**: key, action, and focus behaviour on open, close and delete.
3. **Roles, states and properties**, plus the expected announcement text for key interactions.
4. **WCAG 2.2 criteria the component helps satisfy**, and which ones remain the consumer's responsibility. Examples: label text (2.5.3), help slot placement (3.2.6).
5. **Forced-colours and prefers-contrast screenshots.**
6. **Target-size note**: hit area versus glyph size, and the spacing token.
7. **Pointer alternatives** for drag (2.5.7).
8. **Known issues** with links, in GOV.UK/DWP style.
9. **Manual test script**: about 5–10 steps per AT, in GOV.UK form.

**Process** (Carbon model):
- automated checks gate every PR;
- manual AT passes run per minor release or per new interactive component;
- results are recorded in docs, so ACR/VPAT generation for consuming apps (TENSOR, MOTUS) can cite component evidence.
- Matches the existing UIx "UI verification bar" practice (screenshots across sizes, themes and states). Add a forced-colours theme and AT columns to it.

### Gaps
- No primary-source detail was retrieved on Atlassian's or Fluent's internal test process or AT matrix.
- GOV.UK's 2023 accessibility strategy content was not read.
- No published manual test scripts from Carbon or Spectrum were fetched verbatim. The GOV.UK per-AT test steps were fetched.
