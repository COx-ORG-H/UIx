# Property Management SaaS for BiH — Product Brief

Oct 21, 2026 · @Haris Dizdarevic

A multi-tenant property-management platform for Bosnia and Herzegovina that combines the strongest features of \~60 German Hausverwaltung products with BiH law, banking and utilities, treats shared flats (WG) as a first-class rental model, and runs its web UI on UIx v2.

## Product at a glance

One platform with one ledger, one data model and four workspaces. Each user sees only the workspaces their role grants.

| Workspace | Primary users | Surface | Core jobs |
| --- | --- | --- | --- |
| Manager (Upravljanje) | Licensed building managers (*upravnik/upravitelj*), property-management firms, RS owner associations (ZEV) and their volunteer managers | Desktop web (UIx) | Buildings, owners, fees, reserve funds, annual plans and reports, owner votes, contractor orders, accounting |
| Landlord (Iznajmljivanje) | Private landlords with 1–50 units, diaspora owners, small rental companies, student-housing operators | Web + installable PWA | Leases, rooms and shared flats, rent collection, utilities pass-through, handovers, tax helpers |
| Resident (Stanar) | Tenants, roommates, condo owners | Mobile-first PWA | Pay, see balance and documents, report damage, vote, read the notice board, chat |
| Field (Teren) | Caretakers, inspectors, contractors | Native app (Expo), offline-capable | Meter photos, handover protocols, tickets, access codes, invoices |

**Account types.** A *tenant* (customer org) is a management firm, a ZEV or an individual landlord. One person can hold roles in several orgs with one login. A tenant in Sarajevo and an owner in Munich see the same building from different sides.

**Modules.** Master data · Shared flats (WG) · Rental management · Building management · Finance and accounting · Utilities and cost allocation · Communication and portals · Technical management · Smart building · Letting · Reporting · AI assistant.

## Design principles

Each principle answers a recurring complaint from German reviews and tests (trusted.de, Trustpilot, Capterra).

1. **Every number traces to its source.** Any figure on a statement, balance or report opens the bookings and documents behind it. German users went back to Excel when statement figures could not be explained.
2. **Automation proposes, people confirm.** Bank matching, invoice capture, AI drafts and bulk updates land in a review queue with an undo and an audit trail. One immocloud sync silently overwrote cost categories and cost a user six hours.
3. **Effective dating everywhere.** Floor area, occupants, rent, allocation keys and ownership shares carry valid-from/valid-to dates, so mid-year changes and pro-rata splits are computed, not hand-fixed (Lexware's best idea).
4. **Contract-first onboarding.** Uploading a lease PDF or a building's owner list creates units, people and contracts (hallowalter's best idea). Migration effort is usually underestimated by 50–100%.
5. **No core feature behind an add-on.** Portal, bank import, accounting export and dunning ship with the product. Paid add-ons for these are the most-cited German complaint.
6. **Password-less access for occasional users.** Owners vote and tenants view statements through a QR code or magic link (ETV+ pattern). Lockouts and lost invite codes are a top portal complaint.
7. **Fast at 1,000 units.** Lists virtualize, search is global, and creation wizards have a bulk path. Several German tools degrade beyond \~50 units.
8. **Field work belongs on the phone.** Meter readings, handovers, receipts and tickets are done on site, offline if needed. Reviewers call figures-only mobile apps useless.
9. **Preview what others will see.** Managers can view any page as a tenant or owner and preview every outgoing message before it is sent (Immoware24 Portal24 pattern).
10. **Open by default.** A public REST API, webhooks and a full JSON/CSV export. Fragmented 3–5-tool stacks are the norm in Germany.

## Domain model

The spatial hierarchy is **Property → Building → Entrance (ulaz) → Unit → Room**, with shared spaces as siblings of rooms. Contracts attach to a unit or to one or more rooms. Each building carries a jurisdiction profile that switches the legal rules.

| Entity | Key attributes | Notes |
| --- | --- | --- |
| Org (customer) | Type (management firm / ZEV / private landlord), JIB, PDV number, licence number and expiry, bank accounts | ZEV is a legal entity with its own JIB and account in RS |
| Property | Name, address (geocoded), cadastral data: *katastarska općina*, *k.č.* number, *ZK uložak*, *posjedovni list*, entity (FBiH/RS/BD) | Deep links to katastar.ba and e-Grunt; no scraping |
| Building | Jurisdiction profile, year built, lift / pressure pump flags, floor area totals, inter-owner agreement status and date | Lift and pump flags drive fee coefficients (e.g. Travnik) |
| Entrance (ulaz) | Number, own sub-account and sub-ledger (optional) | Una-Sana law requires a sub-account per building **and per entrance** |
| Unit | Type (flat, business space, garage, storage), useful floor area, ownership share, rooms count, furnishing | All area and share fields effective-dated |
| Room | Floor area, furnishing, lock device, own meter (optional), max occupants | Lettable on its own in the WG module |
| Shared space | Kind (kitchen, bathroom, toilet, hall, living room, balcony), floor area, rooms it serves | Feeds the common-area share in rent splits |
| Person | Name, JMBG (encrypted, masked), ID document, contacts, preferred language and channel, country of residence | One person can be owner, tenant and contact at once |
| Ownership | Person/org → unit, share, valid from/to, power of attorney (*punomoć*) holder | Supports diaspora owners acting through a relative |
| Contract | Kind (lease, room lease, sublease, management contract, service contract), parties, term, notice period, auto-renewal, rent model, deposit, payment reference | KS law: written lease is mandatory, auto-renews unless objected to within 30 days |
| Occupancy | Person → unit/room, from/to, counted for allocation (yes/no) | Drives per-person keys and pro-rata splits |
| Meter | Kind (electricity, water, heat, gas, heat-cost allocator), serial, location (unit/room/building), utility account, calibration expiry, AES key (encrypted) | Calibration-expiry reminders (Lexware) |
| Utility account | Provider, customer number, holder, unit(s) served, billing basis (meter, m², per person, flat) | Usually stays in the owner's name |
| Charge plan | Line items (rent, utilities advance, fee, reserve), amount or formula, cadence, allocation key, valid from/to | Generates the monthly debit postings |
| Allocation key | Basis (area, persons, units, ownership share, consumption, equal, custom weights), scope | Effective-dated; previewable before use |
| Document | Type, entity links, retention class, signature status, version | Stored in EU object storage, WORM for archived records |
| Ticket | Category, location, priority, status, photos, assignee, costs | Links to contractor order and invoice |

**Jurisdiction profile.** A versioned rule set per canton, municipality or entity: fee floor per m² and coefficients, manager and representative remuneration caps, account rules, plan and report deadlines, voting quorums, required filings, lease-law defaults, tax rules and terminology. Profiles ship as data, not code, so a new cantonal law is a profile release. First profiles: Kanton Sarajevo, Una-Sana, Republika Srpska, then Tuzla, Zenica-Doboj, Central Bosnia and Herzegovina-Neretva.

## Shared-flat (WG) module

A shared flat is a unit whose rooms are let to several people who share the kitchen, bathroom and other spaces. Almost no German product supports this properly (only INtex, MietTool and the service firm COLYO touch it), and in BiH it is common for students and workers but mostly informal. Here it is a first-class model, configured with four independent settings: **contract model**, **rent model**, **split and vacancy rule** and **utilities mode**.

### 1. Contract model

| Model | Who signs | Who the landlord bills | Liability | Typical use |
| --- | --- | --- | --- | --- |
| Joint lease (*zajednički ugovor*) | All flatmates on one contract | The household as one debtor; per-person shares shown for information | Joint and several | Friends renting together |
| Room leases (*ugovor po sobi*) | Each flatmate signs for their room plus use of shared spaces | Each person, own payment reference | Individual, for own room | Student flats, worker housing, landlord-run WGs |
| Main tenant + subtenants (*podzakup*) | Main tenant with landlord; subtenants with main tenant | Main tenant only | Main tenant to landlord | One person holds the flat and fills rooms |
| Bed places | Each person signs for a bed in a shared room | Each person | Individual | Dorm-style and seasonal-worker housing |

For subletting, the landlord's written permission is recorded on the main lease: in Kanton Sarajevo unauthorized subletting is a ground for termination. The main tenant gets a household view to bill their subtenants with the same rent and utility tools as a landlord.

### 2. Rent model

- **Fixed total, shared.** The flat costs a set amount (e.g. 900 KM). Current occupants split it by the split rule. This is the "part of a set rent" case.
- **Fixed per person.** Each person pays a set amount (e.g. 280 KM) however many live there. Landlord income moves with occupancy; a maximum occupancy per room and per flat is enforced.
- **Fixed per room.** Each room has its price; a second person in the same room adds an optional surcharge.
- **Base plus per person.** A base for the flat plus an amount for each occupant, for flats where costs rise with headcount.

### 3. Split and vacancy rules (fixed-total model)

**Split rules:**

- **Equal:** total ÷ number of occupants.
- **Area-weighted:** each room's area plus an equal share of shared space.
- **Custom weights:** set by the landlord or agreed by the flatmates.
- **Person-days:** pro rata for partial months.

Rounding uses the largest-remainder method, so the shares always add up exactly to the total.

```latex
share_i = Total \cdot \frac{A_i + A_{shared}/n}{\sum_{j=1}^{n} \left(A_j + A_{shared}/n\right)}
```

Here A\_i is room i's area, A\_shared is the shared area and n is the number of let rooms.

**Vacancy rules:** what happens when a room is empty.

- **Remaining flatmates absorb.** The total stays fixed and the shares rise. This suits joint leases.
- **Landlord absorbs.** Each share is frozen at its full-occupancy value, and the vacant share is the landlord's loss. This suits room leases.
- **Leaver pays until replaced.** The leaver pays until a replacement moves in, or until the notice period ends, whichever comes first.

**Mid-month moves** are pro-rated by calendar days. A 30-day month convention is available as an option.

### 4. Worked example

Flat in Sarajevo with three rooms: A 16 m², B 12 m², C 10 m². Shared space is 34 m²: kitchen 8, bathroom 5, hall 6, living room 15. Monthly amounts in KM:

| Scenario | Room A | Room B | Room C | Landlord receives |
| --- | --- | --- | --- | --- |
| Fixed total 900, equal split | 300.00 | 300.00 | 300.00 | 900.00 |
| Fixed total 900, area-weighted | 341.67 | 291.67 | 266.66 | 900.00 |
| Fixed 280 per person | 280.00 | 280.00 | 280.00 | 840.00 |
| Room C empty — total 900, flatmates absorb | 450.00 | 450.00 | — | 900.00 |
| Room C empty — total 900, landlord absorbs | 300.00 | 300.00 | — | 600.00 |
| Room C empty — 280 per person | 280.00 | 280.00 | — | 560.00 |

In the area-weighted row, each room carries 11.33 m² of shared space (34 ÷ 3), giving weights of 27.33, 23.33 and 21.33.

### 5. Utilities mode (režije), per contract

- **Included flat rate (*paušal*).** Utilities are part of the rent. An optional fair-use cap per month triggers an overage charge, split by the same rule.
- **Pass-through monthly.** The actual bills of the month are split and charged with the next rent.
- **Advance plus true-up.** A monthly advance is collected and settled quarterly or yearly against real bills.
- **Split keys per utility.**
  - Electricity: equal, person-days, or room submeter.
  - Heating: room area. Sarajevo district heating often bills per m².
  - Water: person-days.
  - Internet: equal.
  - Waste: as the provider bills it (per m² or per person).

### 6. Living-together features

- **Occupancy timeline.** Rooms × months, showing who lives where, notice dates and gaps. It feeds the vacancy view and person-day keys.
- **Per-person statement.** Generated from the flat-level statement and showing exactly which bills and keys produced each person's amount.
- **Deposits per person.** Damage is assigned to one room or, for shared spaces, split by a chosen key at move-out. Each person sees their own deposit ledger.
- **Inventory and handover per room and for shared spaces.** A new flatmate signs for their room and a shared-space check, not the whole flat.
- **Replacement flow.**
  1. The leaver gives notice.
  2. The room is listed.
  3. Applicants are shortlisted.
  4. Current flatmates comment or vote (optional).
  5. The landlord approves.
  6. The new contract is signed.
  7. The room is handed over.
  8. The deposit is returned or transferred.
- **Flatmate space (private to the flatmates).**
  - A cleaning rota with reminders.
  - A house-rules acknowledgement.
  - A shared shopping ledger for groceries and supplies, Splitwise-style, that the landlord cannot see.
- **Per-person access.** Each flatmate gets their own smart-lock or keypad code, revoked automatically when their contract ends (see Smart building).
- **Residence paperwork per person.**
  - The landlord's certified consent for registering a temporary address (*boravište*). BiH citizens have 15 days to register.
  - A 48-hour address-registration reminder for foreign flatmates.

## Rental management

This module runs a lease from signature to final deposit return and generates every charge automatically.

- **Lease builder.** Templates per jurisdiction profile carry the legally required clauses. Kanton Sarajevo's *Zakon o zakupu stana* requires:
  - the parties and the unit;
  - the rent and how it is paid;
  - which utilities the tenant pays, and how;
  - maintenance and use of common areas;
  - handover;
  - notice.

  Defaults follow the profile: a notice period of 3 months if not agreed otherwise, and auto-renewal unless the landlord objects in writing within 30 days of expiry. The renewal deadline becomes a task. Output is a PDF plus e-signature (see Communication).
- **Monthly charges.** The charge plan posts rent, utility advances and other items on a set day. Each contract gets its own payment reference (*poziv na broj*) for automatic matching.
- **Rent changes.** Supported change types:
  - Stepped rent (fixed future amounts).
  - Index-linked rent, using the BiH Agency for Statistics consumer price index. The app suggests the adjustment date and drafts the notice letter, as immocloud's index-rent assistant does.
  - One-off agreed increases, with a letter generator.
- **Deposits.** Held per person. The ledger records receipt, deductions with photo evidence, offsets against open items and refund. Local practice is usually one month's rent; there is no statutory cap, so the maximum is a profile setting.
- **Dunning (*opomene*).**
  - Three configurable levels, each with its own wait days, fees and channels.
  - An open-items view showing due date, dunning date and level.
  - Automatic offset of credits against open items.
  - Payment plans, where the tenant proposes one in the app and the landlord accepts.
  - Kanton Sarajevo's termination ground of more than 3 months' arrears with a 30-day cure period is pre-configured as the final level.
  - Missing dunning is a common complaint about simple German tools.
- **Handover protocol.** Captured on the field app (tablet) and covering:
  - rooms and fixtures, with their condition;
  - meter readings with photos;
  - keys and access codes issued;
  - signatures from both sides.

  It produces the landlord's certified consent for address registration, the equivalent of hallowalter's automatic Wohnungsgeberbestätigung.
- **Tenant registration helpers.**
  - BiH citizens: a pack for registering a temporary address (*boravište*) within 15 days.
  - Foreigners: address registration ("white card") within 48 hours of entering BiH. The landlord prepares the ID copy, CIPS residence certificate and a certified accommodation statement.
  - The app generates the documents and tracks completion. It does not file with the authorities.
- **Short-term rental variant.** For flats let on Airbnb or Booking:
  - categorization decision on file;
  - tourist tax per night or as an annual lump sum per bed (Kanton Sarajevo: 3 KM per night, 4 KM in peak periods, or 50 KM per bed per year for household providers);
  - guest registration;
  - a channel manager connection (phase 4).
- **Tax helpers for private landlords.** An annual or monthly summary of rental income and costs per jurisdiction:
  - **FBiH:** forms PIP-1034 and PRIM-1054; 10% tax; 30% standard deduction or actual costs.
  - **Republika Srpska:** filed monthly by the 10th for the previous month; 13% tax per the consolidated law, with a 20% deduction. A tenant that is a company withholds the tax.
  - **Brčko:** 10% tax, 30% deduction; notify the tax office within 8 days of starting to rent.

  The app prepares the figures and a filled form. The owner files, since FBiH e-filing needs a qualified certificate.

## Building management (upravnik / ZEV)

This module is the BiH counterpart of German WEG management. It runs a co-owned building's monthly fee, reserve fund, annual cycle and owner decisions, with the rules taken from the building's jurisdiction profile.

### Rules the first three profiles encode

| Rule | Kanton Sarajevo | Una-Sana (Bihać, Cazin, Velika Kladuša) | Republika Srpska |
| --- | --- | --- | --- |
| Law | *Zakon o upravljanju zajedničkim dijelovima zgrade* (Sl. novine KS 19/17); new draft adopted Feb 2026 | Law on use, management and maintenance of common parts of buildings (2024) | *Zakon o održavanju zgrada* (Sl. glasnik RS 101/11) |
| Who manages | Licensed legal entity or sole trader, 4-year ministry licence; mandatory at 3+ owners | Licensed manager; mayor appoints a forced manager after 60 days without one | Owners' association (ZEV) as a legal entity; manager usually an owner elected for 4 years |
| Monthly fee | Government sets a minimum per m² | City or municipal council sets a minimum per m², with coefficients for age, location and equipment | Set by the ZEV assembly |
| Manager / representative pay | Up to 17% / 12.5% of the minimum fee, excl. VAT | Up to 15% / 10% (per 2024 draft) | Set by the assembly |
| Money | Sub-account per building or dedicated account; payments co-signed by manager and owners' representative | Sub-account per building **and per entrance**; co-signed | ZEV's own bank account (needs PURS tax registration) |
| Annual cycle | Plan by 31 Dec, report by 30 Mar, owners' meeting by end of March; deemed adopted if no meeting | Same dates; deemed adopted if no response by end of April | Assembly decides |
| Votes | >50% of floor area for most matters; unanimity to convert common areas | Same | Per law and ZEV statute |
| Filings | Management contract to ministry within 30 days; annual work report on prescribed form | Contract to ministry within 10 days; notarized inter-owner agreement | Municipal ZEV register |

Other FBiH cantons publish fee floors of about 0.20–0.35 KM/m² per month. For example, Travnik sets 0.22 KM/m² without a lift, 0.25 KM/m² with a lift or pressure pump, and 0.33 KM/m² for business space.

### Features

- **Fee engine.**
  - Rate per m² multiplied by unit-type and building coefficients, with an owner-approved surcharge on top of the legal minimum.
  - Debits are posted monthly to each owner's account.
  - The split between manager pay, representative pay and reserve is calculated automatically against the caps.
- **Reserve fund (*zajednička rezerva / pričuva*).**
  - A separate fund per building, with a target versus actual view.
  - Voluntary contributions, special levies and rental income from common areas (e.g. rooftop antenna leases).
  - Funds are segregated in the ledger so they are protected from the manager's own creditors.
- **Accounts and sub-ledgers.**
  - One manager bank account with one sub-ledger per building and per entrance, or a real sub-account per building where the law or owners require it.
  - Bank fees are posted per building, a pain point raised in Una-Sana.
- **Dual approval.** A payment from building funds needs the manager and the owners' representative to approve in the app before it is exported to e-banking.
- **Annual cycle board.** A per-building checklist with deadlines from the profile:
  - maintenance plan;
  - owners' meeting;
  - annual report;
  - ministry filing;
  - representative's quarterly reports.

  The plan and report are generated from the ledger and the ticket history. Each item records whether it was adopted, deemed adopted or rejected.
- **Owner decisions.**
  - Meetings in person, online or hybrid: agenda, invitations with proof of delivery, attendance, proxies, live voting weighted by floor area or share, and quorum checks against the profile.
  - Decisions by collecting signatures, which Kanton Sarajevo and Una-Sana allow outside a meeting.
  - Owners join through a QR code or magic link, with no account needed (ETV+ pattern).
  - AI draft minutes from the meeting audio, approved by the manager.
  - A register of decisions per building.
- **Owners' representative role.** A read-and-approve role covering receipts and invoices, payment co-signing, quarterly reports and decision follow-up. It mirrors the German advisory-board review.
- **Inter-owner agreement tracker.** Status per building, signatures collected, notarization pending. Remote signing and power-of-attorney support for owners abroad.
- **ZEV mode (Republika Srpska).** The customer is the ZEV itself, with:
  - its own tax ID (JIB) and bank account;
  - a registration checklist (municipal register, then PURS, then bank);
  - a mandate-expiry warning for the elected manager (more than half of ZEV mandates had lapsed per the 2024 audit);
  - a simplified screen set for volunteers.
- **Handover between managers.** A complete export of the building (ledger, reserve balance, documents, open items, decisions) as one package, because a handover record is legally required in Kanton Sarajevo.

## Finance and accounting

Rent collection rests on statement import and unique payment references, not open banking.

- BiH has no live account-access APIs yet. The FBiH and RS payment-services laws were adopted in 2026, but bylaws and API standards are still pending.
- Aggregator coverage is a single bank here and there. GoCardless, Enable Banking and Tink do not list BiH.

### Ledger

- **Double-entry and immutable.**
  - Journal entries balance to zero.
  - Corrections are made only by reversal.
  - Amounts are stored in integer fening, with KM and EUR side by side.
  - The peg is fixed at 1 EUR = 1.95583 KM, and the rate is stored on each posting.
- **Account tree.** Org → property/building → unit → contract. Sub-ledgers exist for:
  - each tenant, owner and flatmate;
  - the reserve fund per building;
  - cost accounts per allocation key;
  - deposits held.
- **Open-item accounting.**
  - Every debit is an open item until matched.
  - One payment can cover several items or contracts.
  - Credits are offset automatically.

### Getting money in

- **Payment reference per contract.**
  - Structure: a check-digit reference (MOD 97-10, like the IBAN check) placed in both the purpose text and the *poziv na broj* field.
  - Printed on every invoice and payment slip.
  - This mirrors the virtual-account method that gives German ERPs near-100% automatic matching.
- **Bank statement import.** Pluggable parsers for:
  - the Halcom fixed-width TXT export, used by several BiH banks;
  - bank-specific CSV and XLS;
  - MT940;
  - camt.053, once banks offer it.

  First parsers: Raiffeisen, UniCredit, Intesa Sanpaolo, Sparkasse, NLB, ASA, BBI, Addiko, ProCredit, Nova banka, KIB banka (Velika Kladuša). An e-mail inbox per org accepts statements forwarded from e-banking.
- **Matching queue.**
  - The reference gives an exact match.
  - Otherwise fuzzy rules on name, amount and period produce suggestions with a confidence score.
  - Rules learn from confirmations, like SCALARA's posting suggestions.
  - Nothing is posted below the auto-post threshold without a click.
- **Instant payments.** The CBBH's instant-payment system (IPS BiH) went live on 20 Jul 2026. Major banks join by the end of 2026 and the rest by July 2027.
  - Same-second settlement means a payment can mark a rent as paid the day it arrives.
  - The invoice layout reserves space for a payment QR code, ready for when the CBBH publishes a standard.
- **Card payments via Monri** (Sarajevo-founded; BAM supported). Used for:
  - pay-by-link on any open item;
  - saved cards for recurring rent;
  - diaspora owners paying from abroad.

  Stripe does not serve BiH businesses.
- **Standing orders and bank e-bills.**
  - Guided setup of a standing order (*trajni nalog*) per tenant.
  - Management firms can register as a biller in bank e-bill programmes such as UniCredit e-uplatnica and BBI eRežija. BBI already lists a building manager (OKI Upravitelj) as a biller.

### Money out

- **Incoming invoices.**
  - Arrive via e-mail inbox, upload or photo.
  - AI extracts: supplier, JIB, PDV number, IBAN, *poziv na broj*, due date, amount.
  - Approval workflow, with the owners' representative for building funds.
  - Output is a payment-order batch file for e-banking import (Halcom format).
- **Contractor and utility payments** are posted to cost accounts and allocation keys, so they flow into statements without re-entry.

### Invoicing and fiscalization

- **Outgoing documents.** Rent invoices, fee invoices and management-fee invoices are numbered per series.
  - VAT (PDV, 17%) is applied where the org is registered. The threshold is 100,000 KM turnover.
  - Long-term residential leases are treated as VAT-exempt, subject to UIO confirmation.
- **FBiH, today.** Under the fiscal systems law (81/09), registered businesses fiscalize every sale, including bank transfers. A management company's invoice must carry a fiscal receipt number, so the app connects to the org's certified fiscal device or software.
- **FBiH, from 2027.** Under the new *Zakon o fiskalizaciji transakcija* (Sl. novine FBiH 9/26):
  - certified fiscal software (ESET) reports each transaction in real time to the Tax Administration's central platform, which returns a verification number and QR code;
  - B2B and B2G invoices become EN 16931 e-invoices;
  - application starts by 12 Aug 2027.

  The product either becomes a certified ESET or integrates one. All invoices are generated as UBL 2.1 / EN 16931 from day one.
- **RS.** Fiscalization law 15/22 also covers non-cash sales. A connector is needed for RS-registered management firms.
- **Private landlords** renting long-term are not fiscalized. They get plain receipts and the tax helpers.

### Exports

- A configurable journal export (CSV/XLSX) mapped to the FBiH and RS chart of accounts (*kontni okvir*), with cost centres per property.
- Planned connectors for PANTHEON (Datalab) and Minimax, the accounting packages common in the region.
- A full GL, open-items and VAT-book export for the org's accountant.

## Utilities and cost allocation (režije)

No BiH utility offers a public API, so bills enter the system through three routes and are then allocated by effective-dated keys. BiH also has no equivalent of Germany's heating-cost ordinance, so allocation rules are configured per jurisdiction rather than hard-coded.

### Bill capture

All three routes produce the same structured bill record (provider, account, period, consumption, amount, due date), linked to its utility account and unit.

1. **Forwarded e-bills.**
   - Each org gets an inbox address. EP BiH, Toplane Sarajevo, ViK and others send PDF bills to it.
   - The PDF is parsed and the customer number is matched to a utility account.
2. **Photo or upload**, with AI extraction.
3. **Manual entry**, using a fast grid with the previous period's values filled in.

### Allocation

- **Keys per cost type:**
  - floor area;
  - persons or person-days;
  - units;
  - ownership share;
  - consumption from meters;
  - equal;
  - custom weights;
  - direct to one unit.
- **Splitting one bill.** A single bill can be split across several cost types with a template, for example a building electricity bill split into lift and stairwell lighting.
- **Preview first.** Before any statement is issued, the preview shows the per-unit and per-person result and the key behind each line.
- **Statement types:**
  - utilities settlement for tenants (advance against actual);
  - building cost statement for owners;
  - per-flatmate statement (WG).

  Each line drills down to the bill and the meter readings behind it.
- **Plausibility guards:**
  - a key that would charge a vacant unit to tenants;
  - consumption more than 3× the prior period;
  - a reading lower than the previous one;
  - a settlement deadline that is approaching.

### Meters and readings

- **Meter register.**
  - Full reading history.
  - Interim readings at every move-in and move-out.
  - Calibration-expiry reminders.
- **Photo reading.**
  - The tenant or caretaker photographs the meter.
  - A multimodal model reads the value and serial number.
  - The plausibility check runs against history.
  - A person confirms, and the photo is stored as evidence.
  - Tenants get a monthly reminder to submit a reading.
- **Automatic readings** come from submeters (see Smart building). Tenants see monthly consumption with a comparison, as German EU-directive tenant portals show it.
- **District heating.** Many Sarajevo buildings without heat-cost allocators are billed per m². The heating key defaults to area. Consumption share is available where allocators or heat meters exist, with the consumption/fixed split (for example 70/30) configurable.

## Communication, portals and e-signature

Viber is the main messaging channel in BiH, and the platform treats it that way. Every message goes through one notification service with per-person channel preferences and a fallback chain. Legally relevant notices always also go out as e-mail with a PDF.

### Resident portal (PWA)

- **Home.** The resident's balance, next payment with reference and Monri pay button, latest notices and open tickets.
- **Documents.**
  - Lease, statements, house rules, meeting minutes.
  - Released by the manager, individually or in bulk.
  - Residents can upload into private folders.
- **Damage reports.**
  - Category, location in the building, photos and a voice note.
  - The resident sees status updates until the job is closed.
- **Structured requests.** Each request is a short form that creates a typed ticket:
  - payment plan;
  - parking spot;
  - certificate for address registration;
  - key replacement.
- **Notice board.**
  - Colour-coded info / warning / danger posts per building or entrance.
  - Emergency directory: plumber, locksmith, utilities' fault lines.
- **Votes and meetings.** Owners join, vote and sign from the portal.
- **Consumption.** Monthly readings and comparison where meters exist.
- **Install and alerts.** The portal installs to the home screen and sends web push. iOS supports web push only for an installed PWA (iOS 16.4+).

### Owner and diaspora features

- **Language and currency.** The portal works in German and English as well as the local languages, and shows EUR equivalents. About 1.6 million BiH-born people live abroad, mostly in Germany, Austria, Slovenia and Switzerland.
- **Remote participation.**
  - Signatures and votes collected remotely.
  - A power-of-attorney (*punomoć*) record that lets a relative act locally.
  - Pay by card through Monri, or by SEPA once BiH is admitted. The CBBH says first SEPA transactions can come no earlier than 6 months after admission.
- **Monthly owner report.**
  - Rent received, costs, open items, tickets, vacancy.
  - Sent by e-mail, with WhatsApp as an option.
- **Tax reminders.** Reminders for the owner's BiH filing deadlines, with the figures prepared.

### Manager inbox

- **Unified case inbox.** E-mail, portal messages, Viber, WhatsApp and phone notes become cases. Each property gets its own mailbox address (hallowalter pattern).
- **Message preview.** Every bulk or automated message is previewed as its recipient will see it before sending.
- **Rate limits** per recipient prevent notification floods, a casavi complaint.
- **Serial letters.** Templates with merge fields. Output as PDF, by e-mail, or printed and posted through a print-and-mail provider.

### Channels

| Channel | Provider | Use | Note |
| --- | --- | --- | --- |
| Viber Business Messages | Infobip | Reminders, payment confirmations, notices to local residents | Per-message pricing by country |
| Viber chatbot | Viber REST Bot API | Two-way chat, reading submission, ticket intake | €100/month per bot plus paid bot-initiated messages |
| WhatsApp | WhatsApp Business Cloud API | Diaspora owners, foreign tenants | Utility templates free inside a 24h service window |
| SMS | Infobip | Fallback, one-time passwords | BiH needs a registered sender ID with a signed authorization letter; no generic senders |
| E-mail | Amazon SES (Frankfurt) or Brevo/Mailjet | Statements, legal notices, invitations | Separate transactional and bulk streams |
| Push | Expo (field app), Web Push (PWA) | Everything time-sensitive | — |

### E-signature and identity

| Level | Used for | How |
| --- | --- | --- |
| Simple, with OTP | House rules, handover protocols, minor amendments | In-app signature plus one-time code by SMS or Viber |
| Advanced, with ID check | Leases, room leases, deposit agreements | Microblink BlinkID scan of the BiH ID card, a selfie check, then a signature with an audit trail |
| Qualified (QES) | Inter-owner agreements, powers of attorney, commercial leases | eID Easy API (includes Halcom One, which works for BiH users) or an IDDEEA remote certificate |

The qualified route matters because qualified e-signatures in BiH carry the weight of a handwritten one. IDDEEA has offered remote qualified certificates since July 2024. Where a law requires a notary, the app prepares the documents and tracks the appointment.

## Technical management

This module takes a reported defect through to a paid, documented repair, and keeps recurring inspections on schedule.

- **Tickets.**
  - Fields: category, location (building, entrance, unit, room or shared space), priority, SLA, photos, voice notes and status.
  - A Kanban board and a list view.
  - Duplicate detection, so ten reports of one broken lift become one case.
  - Urgent categories (water leak, gas smell, lift entrapment) page the on-call contact by SMS and Viber.
- **Contractor portal.** Based on Mareon's model, without the integration overhead.
  1. The contractor receives the order by link: no account, with a QR or magic link.
  2. They accept, propose a time, upload before and after photos, and log their hours and materials.
  3. They submit an invoice, which enters the approval queue already linked to the ticket.
  4. They get a time-boxed access code for the building or flat (see Smart building).

  Contractors are rated per job, and the ratings feed a contractor directory per org.
- **Maintenance and inspection planner.** Recurring tasks per building with due dates and certificates attached:
  - lift service and inspection;
  - fire extinguishers and hydrants;
  - chimney;
  - electrical installation check;
  - lightning protection;
  - pressure pump;
  - roof and gutters;
  - pest control.

  Overdue tasks surface on the dashboard and in the annual report. Recurring legal-safety duties are rarely modelled well in German tools.
- **Equipment register.** Lifts, pumps, boilers, intercoms and locks, each with manufacturer, install date, warranty, service contract and ticket history.
- **Insurance claims.** A claim is opened from a ticket, with photos, the insurer's reference, its status and the payout posted to the ledger.
- **Keys.** A register of physical keys and smart-lock credentials per person, with issue and return logged at handover.

## Smart building and IoT

No mainstream German Hausverwaltung product ships native smart-lock integration, so this is an open field. The platform talks to devices only through two internal interfaces, so a brand change never touches business logic:

- **`AccessProvider`:** `listDevices`, `grantCode(person, window)`, `revokeCode`, `unlock`, plus event webhooks.
- **`MeterSource`:** `listMeters`, `readings(since)`, plus push events.

Where a building has no reliable internet or a vendor cloud is unsuitable, a small **edge agent** sits in the building and connects outward to the platform over MQTT with TLS. It is a container on a Raspberry Pi-class box, or Home Assistant.

### Access

| Provider | Covers | Why | Note |
| --- | --- | --- | --- |
| Seam | Nuki, Tedee, igloohome, TTLock, Yale, Salto KS, 2N and 15 more lock brands through one API | Fastest broad coverage | $5 per device per month (5 actions/day); expensive at BiH rent levels, so a bridge until direct connectors exist |
| Nuki Web API | Euro-cylinder retrofit locks and Keypad PINs | Fits standard BiH doors; OAuth2 REST | First direct connector |
| igloohome algoPIN | Keyboxes, padlocks, deadbolts | Offline time-bound PINs that need no Wi-Fi at the door | Codes cannot be deleted remotely; keep their windows short |
| Salto KS Connect | Building entrances, garages | Multi-door, multi-user | Partner programme; installed through dealers |
| 2N / My2N | Intercoms | Entrance codes and call-to-phone | Local HTTP API; also via Seam |
| TTLock | Cheap locks many BiH landlords already own | Covers the existing base | Through Seam |

**Access automations.**

- **Contract lifecycle.** A code is created on move-in and revoked at move-out.
- **Viewings.** An applicant gets a one-time code for a booked slot.
- **Contractors.** A code valid only for the job's window.
- **Short stays.** A code per booking.

Every unlock event is written to the unit's log.

### Metering

| Source | Devices | Path into the platform |
| --- | --- | --- |
| Wireless M-Bus / OMS radio meters | Kamstrup, Diehl (Sappel/IZAR), Zenner, Itron, Qundis, Engelmann water, heat meters and heat-cost allocators | Lobaro Gateway V4 (wM-Bus to NB-IoT/LTE-M or LoRaWAN), or the edge agent running wmbusmeters |
| LoRaWAN meters | Same brands, LoRaWAN variants | Per-building gateway (Milesight, RAK, Kerlink) to ChirpStack (self-hosted) or The Things Stack EU, then webhook or MQTT |
| Electricity submeters | Shelly Pro 3EM / Pro EM (Bulgarian, sold widely in the region) | Shelly Integrator API (cloud WebSocket, after user consent) or local RPC through the edge agent |
| Camera readers | ESP32-CAM with AI-on-the-edge firmware on old water meters | MQTT through the edge agent |
| Photos | Any meter | Photo reading in the resident and field apps |

Two procurement rules apply:

- Radio meters encrypt their telegrams, so the per-meter AES keys must be part of every meter purchase contract.
- Use MID-certified meters where a submeter reading is billed to a tenant.

### Sensors and alarms

- **Water leak, smoke and CO sensors.**
  - Zigbee devices (Aqara, Heiman, Sonoff) through the edge agent.
  - Netatmo through its Connect API.
  - Ajax Systems, the dominant security brand in the region, through a monitoring partner that holds Ajax Enterprise API access. Ajax grants that API only to companies serving thousands of systems.
- **Alarm handling.** An alarm creates an urgent ticket, notifies the resident, caretaker and on-call contractor, and can grant the plumber a door code.
- **Thermostats.**
  - Danfoss Ally TRVs are worth supporting for district-heated flats.
  - Do not build on tado°: its unofficial API is limited to 100 requests/day without a subscription.
  - Matter/Thread devices are supported only through the edge agent, since Matter has no cloud API.

## AI features

Every AI feature drafts or proposes; a person approves before anything is booked, sent or changed. This is the shared pattern of SCALARA LARA, hallowalter and Aareon KIAAN. Each AI action is logged with its input, its output and who approved it.

| Feature | What it does | Model / service |
| --- | --- | --- |
| Contract-first onboarding | Reads lease PDFs and owner lists and proposes units, people, contracts and charge plans | Multimodal LLM with JSON schema |
| Invoice and bill capture | Extracts supplier, JIB (13 digits), PDV number (12), IBAN, *poziv na broj*, period, consumption and amount; proposes the cost account and key | Azure Document Intelligence (Croatian/BiH locale) with LLM fallback; confidence-based review queue |
| Meter photo reading | Reads value and serial, checks plausibility | Multimodal LLM |
| Inbox triage and draft replies | Classifies a message into a case, links the right unit, drafts a reply using the property's documents | LLM with retrieval over the org's documents |
| Assistant (command bar) | "Who is behind on rent in Building 3?", "Prepare the 2027 maintenance plan for Ferhadija 12", "Draft an index increase letter for all leases due in January" — answers with links, and for actions shows the change set to confirm | LLM with tool calls into the public API, scoped to the user's permissions |
| Meeting minutes and motions | Drafts motions from a topic or voice note; drafts minutes from meeting audio | Speech-to-text plus LLM |
| Statement checker | Flags unusual keys, missing bills and cost jumps before a statement is issued | Rules plus LLM explanation |
| Listing composer | Writes listing text in Bosnian, German and English from unit data and photos | LLM |
| Translation | Tenant ↔ owner messages across Bosnian/Croatian/Serbian, German and English | Google Cloud Translation or Azure Translator. DeepL's API does not list Bosnian, Croatian or Serbian |

Models run in EU regions: Anthropic through AWS Bedrock or Vertex AI EU, Azure OpenAI EU Data Zone, or Mistral. Org data is never used for training. Cyrillic output is tested for RS users.

## Letting

This module takes a unit or room from vacant to signed. Its funnel follows Immomio and wohnungshelden.

1. **Vacancy detected.** A notice is received or a room's end date is near. The unit or room appears in the vacancy view with its expected free date.
2. **Listing.**
   - The AI listing composer, with photos and a floor plan.
   - A public listing page per unit on the org's sub-domain.
   - One-click copy and export for OLX.ba, nekretnine.ba and similar portals, which have no public APIs. Feeds follow where portals agree.
3. **Applicants.**
   - A form on the listing page: self-disclosure, documents, preferred move-in date.
   - An applicant database that asks applicants to reconfirm and deletes stale profiles automatically, for data protection.
   - The landlord controls the stage at which applicants may send messages.
4. **Viewings.**
   - Self-service slot booking.
   - A one-time door code for unattended viewings.
   - Optionally, the outgoing tenant shows the flat.
   - For a WG room, current flatmates can join and comment.
5. **Screening.** Identity is checked with BlinkID. BiH has no SCHUFA-style credit bureau open to landlords, so screening relies on:
   - an employment certificate or proof of income;
   - a previous landlord's reference;
   - optionally, a guarantor.
6. **Contract.** The lease is generated from the profile template, signed electronically, the deposit is collected by Monri link, and the handover appointment is booked.

## Reporting and dashboards

Every tile and chart drills through to the records behind it, and every list exports to XLSX.

- **Manager dashboard.**
  - Collection rate this month.
  - Arrears by age (0–30, 31–90, 90+ days).
  - Reserve balance against target per building.
  - Overdue annual-cycle items and inspections.
  - Open tickets by SLA state.
  - Unmatched bank lines.
- **Landlord dashboard.**
  - Rent expected versus received.
  - Vacancy rate and vacant days per unit or room.
  - 12-month cash flow.
  - Net yield per property.
  - Upcoming lease ends and index dates.
- **WG view.** Occupancy timeline, vacancy cost by vacancy rule, and per-person balances.
- **Building reports.** The annual report and maintenance plan in the format each jurisdiction prescribes, the representative's quarterly report, and the owners' balance list.
- **List builder.** Ad-hoc lists over any master data, with saved views and deep links back into the records (PowerHaus Report Pro pattern).
- **Contractor performance.** Response time, cost per job and resident rating.

## Integration and API catalogue

The table lists every external system the brief relies on. The phase column refers to the release phases further down. Sorted by phase, then by area.

| Area | Provider / standard | Mechanism | Phase | Notes |
| --- | --- | --- | --- | --- |
| Bank statements | Halcom TXT, bank CSV/XLS, MT940 | File import + e-mail inbox | 1 | One parser per bank; camt.053 when offered |
| Payment orders out | Halcom e-banking batch format | File export | 1 | Building payments after dual approval |
| Card payments | [Monri](https://ipg.monri.com/en/documentation/payment_api) | REST, pay-by-link, saved-card tokens, callbacks | 1 | BAM; test environment available |
| E-mail | Amazon SES eu-central-1 / Brevo / Mailjet | SMTP/API + inbound parsing | 1 | Separate transactional and bulk streams |
| SMS | [Infobip](https://www.infobip.com/docs/essentials/europe-registration/bosnia-and-herzegovina-letter-of-authorization-loa-guidelines) | REST | 1 | Sender-ID authorization letter for BiH |
| PDF | Gotenberg (HTML→PDF/A), Typst (invoices, statements) | Internal services | 1 | Deterministic layouts |
| Geocoding | HERE Geocoding & Search or Google Maps | REST | 1 | HERE lists full BiH house-number coverage; FBiH address register is being loaded into Google Maps |
| Maps | MapLibre GL + OpenFreeMap/Protomaps | Vector tiles | 1 | Low cost |
| Document AI | Azure AI Document Intelligence v4 + LLM | REST | 1 | Croatian invoice model with BiH locale |
| LLM | Anthropic via AWS Bedrock / Vertex AI EU, Azure OpenAI EU, Mistral | REST | 1 | EU processing, no training on customer data |
| Accounting export | FBiH/RS chart of accounts (*kontni okvir*) CSV/XLSX | File | 1 | — |
| Viber | Infobip Viber Business Messages; [Viber chatbot](https://help.viber.com/hc/en-us/articles/15383950711197) | REST | 2 | €100/month bot fee |
| WhatsApp | WhatsApp Business Cloud API | REST + webhooks | 2 | Diaspora owners |
| ID verification | Microblink BlinkID | SDK (web, React Native) | 2 | Check BiH ID version support |
| E-signature | [eID Easy](https://www.eideasy.com) (incl. Halcom One QES) | REST | 2 | SES/AES/QES under one API |
| Translation | Google Cloud Translation / Azure Translator | REST | 2 | Bosnian, Croatian, Serbian (Latin and Cyrillic) |
| Smart locks | [Seam](https://www.seam.co/docs) | REST + webhooks | 3 | 22 lock brands, $5/device/month |
| Smart locks | [Nuki Web API](https://developer.nuki.io/t/nuki-web-api/25) | OAuth2 REST | 3 | Direct connector |
| Offline PINs | igloohome algoPIN (via Seam) | REST | 3 | Contractor and viewing codes |
| Electricity submeters | [Shelly Integrator API](https://shelly-api-docs.shelly.cloud/integrator-api) | WebSocket, user consent | 3 | Apply via Shelly support |
| Radio meters | [Lobaro](https://manuals.lobaro.com) gateways, [wmbusmeters](https://github.com/wmbusmeters/wmbusmeters) | wM-Bus → MQTT/webhook | 3 | AES keys from meter supplier |
| LoRaWAN server | ChirpStack v4 / The Things Stack EU1 | MQTT/webhooks | 3 | One gateway per building or cluster |
| Edge agent | Home Assistant or own container | MQTT over TLS | 3 | Zigbee sensors, local Shelly, Matter |
| Accounting connectors | PANTHEON (Datalab), Minimax | REST | 3 | Confirm Minimax availability in BiH |
| Instant-payment QR | CBBH IPS QR (when published) | Invoice QR | 3 | No national standard yet |
| Open banking | Salt Edge (Raiffeisen BiH listed) and others as coverage grows | AIS API | 4 | After FBiH/RS bylaws |
| Security alarms | Ajax Enterprise API via monitoring partner | Server-to-server, SQS events | 4 | Ajax grants API access only to large operators |
| Building access | [Salto KS Connect](https://developer.saltosystems.com/ks/connect-api/) | REST, partner programme | 4 | Entrances, garages |
| Short-term channels | [Channex](https://docs.channex.io) | REST | 4 | $130/month platform fee + $0.50/unit |
| Fiscalization FBiH | Central Fiscalization Platform (ESET) | Real-time API (specs pending) | 4 | Law applies by 12 Aug 2027 |
| Fiscalization RS | RS fiscal system | Certified device/software | 4 | For RS management firms |
| Bank e-bill programmes | UniCredit e-uplatnica, BBI eRežija | Bank-specific onboarding | 4 | Per bank, per biller |

**Public API of the product itself.**

- REST plus OpenAPI 3.1, with OAuth2 client credentials.
- Webhooks for: payment matched, ticket created, contract signed, meter reading, statement issued.
- Scoped tokens per org, and rate limits per token.

## Technology stack

The stack is TypeScript end to end, so UIx, the API and the field app share types and validation schemas. It runs on Postgres with row-level security and is hosted in the EU.

&#91;embedded content: system architecture · 4 clients, 8 domain services, 8 external providers\]

All four apps call the same API. Every write runs in one Postgres transaction under the caller's tenant, and an outbox event drives notifications, webhooks and device commands.

| Layer | Choice | Why / alternative |
| --- | --- | --- |
| Web frontend | React 19 + TypeScript, Vite, **UIx v2** (`@tensor_1/react`, `@tensor_1/tokens`), TanStack Router + Query, react-hook-form + zod, i18next | UIx is already React 18/19 with a token contract and a Tailwind preset; Next.js only if public listing pages need SSR |
| Resident app | Same codebase as a PWA (installable, Web Push, offline read cache) | One build for all phones; no app-store friction for occasional users |
| Field app | Expo (React Native), PowerSync for offline Postgres↔SQLite sync, camera, BLE, BlinkID SDK | Offline handovers and meter photos; UIx tokens via `@tensor_1/tokens/ts` |
| API | NestJS (or Fastify) with OpenAPI 3.1, zod schemas shared with clients | .NET is the alternative if the team prefers it for accounting work |
| Database | PostgreSQL 17+, Drizzle ORM | `pg_trgm` + `unaccent` for č/ć/š/đ/ž search |
| Multi-tenancy | Row-level security: `tenant_id` on every table, `FORCE ROW LEVEL SECURITY`, `SET LOCAL app.tenant_id` per transaction, non-owner app role | Safe with PgBouncer transaction pooling; a large customer can later move to its own database |
| Ledger | Own double-entry tables in Postgres (journal, postings, deferred zero-sum constraint) | Keeps money in the same transaction and RLS scope as business data; Formance/Blnk as design references |
| Jobs and workflows | pg-boss or Graphile Worker; Temporal for long workflows (dunning, annual cycle, lease lifecycle) | Postgres-native jobs to start |
| Events | Transactional outbox, then NATS JetStream; EMQX as MQTT broker for IoT | Reliable webhooks and notifications |
| Search | Postgres full-text first; Meilisearch for global typo-tolerant search | Index filtered by tenant |
| Files | S3-compatible EU object storage, presigned uploads, server-side encryption, a write-once bucket for archived records | Hetzner, OVHcloud or Scaleway |
| Documents | Gotenberg (HTML→PDF/A), Typst for invoices and statements, EU DSS for signature validation | — |
| Auth | Zitadel or Keycloak 26 (organizations, roles per org, passkeys, magic links, SSO for large firms) | Managed alternative: WorkOS or Clerk |
| Observability | OpenTelemetry → Grafana (Prometheus/Loki/Tempo), Sentry EU; every trace tagged with tenant ID | — |
| Hosting | Hetzner (DE/FI) with CloudNativePG, or OVHcloud/Scaleway for managed Postgres; Exoscale (Vienna/Sofia) as the nearest managed EU option | Cloudflare R2 has an EU jurisdiction setting but is a US company |
| CI/CD | GitHub Actions, Playwright E2E + axe accessibility tests (as in UIx), Changesets | Matches the UIx repository setup |

**Money and dates.** Amounts are integers in minor units. Dates are stored as `date` (not timestamps) for every effective-dated attribute, and the time zone is Europe/Sarajevo. Number format is `1.234,56 KM`; date format is `21.10.2026.`

## UIx mapping

UIx v2 (`@tensor_1/react` 2.42, React 18/19) already covers nearly every manager and landlord screen. The product needs a new theme file and six new components.

### Theme

- **Brand slots.** The product gets its own `themes/<product>.tokens.json` that overrides only `--uix-brand` and `--uix-brand-fg`, as for TENSOR, POSx and ShopX.
- **Per-customer branding.** A management firm's logo and colour on the resident portal is set at runtime through the same two slots. `BrandProfiles` can manage the profiles.
- **Dark mode** comes from `data-theme`.

### Screen → components

| Screen | UIx components |
| --- | --- |
| App frame, navigation, global search | `AppShell`, `Sidebar`, `NavFavourites`, `Breadcrumbs`, `CommandPalette` (also the AI assistant entry), `SearchSuggest` |
| Property tree (property → building → entrance → unit → room) | `Tree` with lazy children, `EntityPicker` |
| Unit / contract / person detail | `DetailPage`, `DetailLayout`, `PageHeader`, `DescriptionList`, `Tabs`, `InlineEdit`, `StatusPill`, `Chip`, `RelatedLinks`, `Peek` |
| Lists (units, tenants, open items, bills) | `Table`, `TableControls`, `FilterEditor`, `ViewMenu`, `useVirtualRows`, `Pagination` |
| Bank matching queue | `MatchReview`, `Table`, `AsyncOperationStatus` (import progress), `Toast` |
| WG occupancy timeline | `SchedulingTimeline` (rooms × months) |
| Viewings, inspections, contractor slots | `SchedulingCalendar`, `SchedulingTimeGrid`, `SchedulingAgenda` |
| Tickets board | `Kanban`, `Comments`, `Composer`, `Attachment`, `Lightbox` |
| Manager inbox | `Inbox`, `Composer`, `RichTextEditor`, `Markdown` |
| Activity and audit trail | `Timeline`, `RelativeTime`, `DiffViewer` / `TextDiff` (contract versions, master-data changes) |
| Allocation keys, automation rules, dunning levels | `RuleBuilder`, `Segmented`, `RadioCard`, `MetricInput`, `ToggleRow` |
| Annual cycle, lease wizard, onboarding | `Steps`, `Pipeline`, `CollapsibleSection`, `SaveStatus`, `DiscardPrompt` |
| Dashboards | `DashboardGrid`, `Stat`, `InsightCard`, `Meter` (reserve vs target), `Progress`, `Chart` from `chart/preset` and `chart/analytic` |
| Ownership and power-of-attorney map | `RelationshipGraph` |
| Device status (locks, gateways) | `Heartbeat`, `StatusPill` |
| Documents and uploads | `FileUpload`, `Attachment`, `FileIcon`, `Lightbox` |
| Forms everywhere | `Field`, `Input`, `Select`, `Combobox`, `DatePicker`, `DateRangePicker`, `Checkbox`, `Switch`, `Textarea`, `InfoTip` |
| Dialogs and empty states | `Modal`, `Drawer`, `Dialogs`, `States`, `Alert` |
| Printable statements | `usePrinting` hook for browser print; PDFs come from the server |

### Gaps to build

The six new components:

| Component | Need | Note |
| --- | --- | --- |
| `MoneyInput` / `MoneyDisplay` | KM/EUR with `1.234,56` formatting and minor-unit values | Could extend `MetricInput` |
| `SignaturePad` | Handover and simple signatures | — |
| `QrCode` | Payment QR, magic-link join, contractor links | — |
| `FloorPlan` | Rooms and shared spaces on a simple plan, for WG setup and tickets | SVG, click a room to open it |
| `CameraCapture` | Meter and damage photos in the PWA | Field app uses Expo camera |
| `VotePanel` | Live vote with share-weighted tally and quorum bar | Composed from `Meter` + `RadioCard` |

Other gaps:

- **Native field app.** UIx components are web-only. The Expo app uses `@tensor_1/tokens/ts` for colours, spacing and type, with its own thin native components.
- **Labels.** Ship bs / hr / sr-Latn / sr-Cyrl / de / en label sets through `labels-context`.
- **Fonts.** Check that the Inter / IBM Plex weights loaded include Cyrillic subsets.
- **Mobile.** Run the visual and accessibility suites at 360 px width for the resident PWA.

## Security, privacy and compliance

BiH's new data protection law (*Zakon o zaštiti ličnih podataka*, Sl. glasnik BiH 12/25) has applied since 4 Oct 2025. It is closely modelled on the GDPR, with fines up to 40 million KM. The product is built to GDPR standard throughout, so EU-resident owners are covered by the same controls.

- **Isolation.** Postgres row-level security per tenant; separate encryption keys per tenant for documents; tenant ID on every log line and trace.
- **Sensitive identifiers.**
  - JMBG, ID document numbers and bank details are encrypted at field level and masked in the UI.
  - Revealing one requires a permission and is logged.
  - ID scans are deleted after verification unless a retention rule applies.
- **Roles.** Built-in roles, plus custom roles with field-level permissions:
  - org admin, manager, accountant;
  - owners' representative (read and approve);
  - owner, tenant, flatmate;
  - caretaker, contractor (job-scoped);
  - auditor (read-only, time-boxed).
- **Audit trail.**
  - Append-only log of every create, update, delete, login, export and AI action, with before and after values.
  - The ledger itself is immutable.
  - Logs are exportable for a ministry or court request.
- **Data-subject rights.** Export and erasure requests are handled as tracked cases. Erasure respects the retention classes: accounting and tax records stay for the statutory period, and everything else is deleted or anonymized.
- **Records of processing and agreements.** The product ships a processor agreement, a list of sub-processors and a template record of processing. Transfers to EU hosting are documented as the law's transfer chapter requires.
- **Authentication.** Passkeys or TOTP for staff, magic links for occasional residents, SSO for larger firms, and session and device management.
- **Hosting and backups.** EU data centres, encrypted point-in-time backups, restore tested monthly, and a write-once archive bucket for signed documents.
- **Engineering.** OWASP ASVS level 2 as the target; dependency scanning (Renovate, as in UIx); annual penetration test; ISO 27001-aligned controls from the start, since several German competitors advertise certification.

## Localization

The product ships six UI languages. The legal vocabulary follows the building's jurisdiction profile, not the user's language.

- **Languages.**
  - Bosnian, Croatian, Serbian Latin and Serbian Cyrillic, with a script toggle. RS institutions use both scripts.
  - German and English for diaspora owners and foreign tenants.
  - Generated documents use the language and script of the recipient, or of the authority where the document is filed.
- **Terminology set per profile:**

| Concept | Kanton Sarajevo | Una-Sana / Croatian usage | Republika Srpska |
| --- | --- | --- | --- |
| Building manager | upravnik | upravitelj | upravnik (of the ZEV) |
| Reserve fund | zajednička rezerva | pričuva | rezervni fond (to confirm) |
| Owners | etažni vlasnici | suvlasnici | zajednica etažnih vlasnika |
| Lease | ugovor o zakupu | ugovor o najmu | ugovor o zakupu |
| Rent | zakupnina / kirija | najamnina | zakupnina / kirija |
| Utilities | režije | režije | režije |

- **Formats.**
  - Dates `dd.mm.yyyy.`, decimal comma, thousands dot.
  - Currency `KM` in UI and `BAM` in files.
  - IBAN `BA` plus 18 digits, validated with MOD 97-10.
  - JIB 13 digits, PDV number 12 digits.
- **Search** ignores diacritics (*č ć š đ ž*), and works across Latin and Cyrillic by transliterating the index.

## Release phases

The phases follow dependencies: each one needs the ledger and data model of the one before.

1. **Phase 1: core.**
   - Master data with the first jurisdiction profiles (Kanton Sarajevo, Una-Sana, RS).
   - Rental management and the WG module.
   - Building fees and reserve fund.
   - Ledger, statement import, payment references and the matching queue.
   - Monri pay-by-link.
   - Utilities capture and allocation, and photo meter readings.
   - Tickets.
   - Resident PWA.
   - E-mail and SMS.
   - AI invoice capture and contract-first onboarding.
   - Accounting export.
2. **Phase 2: engagement.**
   - Viber and WhatsApp.
   - E-signature at all three levels, and BlinkID.
   - Owner meetings and voting.
   - Annual cycle board.
   - Contractor portal.
   - Letting funnel.
   - Field app (Expo, offline).
   - Translation.
   - AI inbox triage and assistant.
3. **Phase 3: smart building.**
   - Seam, Nuki and igloohome access automations.
   - Shelly and radio-meter submetering, the edge agent, and LoRaWAN.
   - Accounting connectors.
   - IPS QR codes once the standard exists.
4. **Phase 4: regulated and extended.**
   - FBiH fiscalization (ESET) before 12 Aug 2027, and the RS fiscal connector.
   - Open banking once the bylaws are live.
   - Salto entrances.
   - Ajax through a partner.
   - Short-term rental channels.
   - Bank e-bill programmes.
   - Profiles for the remaining cantons.

## Open questions

These facts could not be verified and change product rules. Confirm each before encoding it.

- [ ] Kanton Sarajevo's current minimum fee in KM/m² (Sl. novine KS 26/17) and the content of the Feb 2026 draft law
- [ ] Final text of the Una-Sana law (2024) versus the draft: remuneration caps, notarization, per-entrance sub-accounts
- [ ] Fee decisions and building laws for Tuzla, Zenica-Doboj and Herzegovina-Neretva; whether Brčko has a building law
- [ ] Status of a new RS law on owners' associations (ZEV), mentioned for 2026
- [ ] VAT exemption wording for long-term residential leases (UIO)
- [ ] RS rental income tax rate in practice: 13% per the consolidated law vs 10% in some 2025 sources
- [ ] FBiH advance-payment rhythm for rental income tax
- [ ] Whether an RS ZEV must fiscalize its fee receipts
- [ ] FBiH central fiscalization platform: API specs and ESET certification process
- [ ] Bylaws and dates for third-party account access under the 2026 FBiH and RS payment-services laws
- [ ] Statement export formats per bank (MT940 availability, CSV layouts)
- [ ] Whether the data protection agency treats EU hosting as an adequate transfer destination
- [ ] Commercial terms: Nuki Web API, Shelly Integrator, Infobip Viber rates for BiH, Monri recurring payments
- [ ] BlinkID support for the current BiH ID card versions
- [ ] Whether OLX.ba offers an agency import or partner feed

## Sources

**German market**

- [systemhaus.com — Hausverwaltungssoftware (60 vendors)](https://systemhaus.com/hausverwaltungssoftware)
- [hallowalter — Hausverwaltungssoftware](https://hallowalter.com/hausverwaltungssoftware/)
- [humbee — Software für Hausverwaltungen](https://humbee.de/loesungen/branchen/software-fuer-hausverwaltungen/)
- [softwareabc24 — Hausverwaltung Software online](https://www.softwareabc24.de/hausverwaltung-software/online)
- [software24 — Hausverwaltung Software: darauf kommt es an](https://www.software24.com/blog/allgemein/hausverwaltung-software-darauf-kommt-es-an/)
- [trusted.de — Hausverwaltungssoftware test](https://trusted.de/hausverwaltungssoftware)
- [Immoware24 Portal24 handbook](https://content.immoware24.de/content/manual/Handbuch-Portal24_2.pdf)
- [Aareon PowerHaus specification](https://www.aareon.de/hubfs/Aareon%20-%20Documentencenter/powerhaus/final_073_Leistungsbeschreibung_PowerHaus_202605.pdf)
- [Lexware hausverwaltung data sheet](https://lex-blog.de/wp-content/uploads/2024/06/20240606_2025_Lexware_hausverwaltung_Datenblatt.pdf)
- [SCALARA](https://www.scalara.de/)
- [wg-gesucht — Nebenkostenabrechnung für eine WG](https://www.wg-gesucht.de/artikel/die-nebenkostenabrechnung-fuer-eine-wg)

**BiH law, tax and payments**

- [KS Zakon o upravljanju zajedničkim dijelovima zgrade](https://www.paragraf.ba/propisi/kantona-sarajevo/zakon-o-upravljanju-zajednickim-dijelovima-zgrade.html)
- [KS draft law, Feb 2026](https://www.paragraf.ba/dnevne-vijesti/11022026/11022026-vijest3.html)
- [USK draft law (Bosanska Krupa)](https://gradbosanskakrupa.ba/wp-content/uploads/2024/05/Nacrt-Zakon-o-koristenju.pdf)
- [Radio Bihać on the USK law](https://www.radiobihac.com/vijest/upravitelji-i-etazni-vlasnici-tvrde-novi-zakon-je-neprovodiv/11521)
- [Travnik fee decision](https://opcinatravnik.com.ba/images/doc/1446.pdf)
- [RS audit report on building maintenance RU001-23](https://gsr-rs.org/wp-content/uploads/2024/09/RU001-23_Lat.pdf)
- [KS Zakon o zakupu stana](https://skupstina.ks.gov.ba/sites/skupstina.ks.gov.ba/files/zakon_o_zakupu_stana_1.pdf)
- [FBiH rental income tax (Paragraf)](https://www.paragraf.ba/dnevne-vijesti/15082024/15082024-vijest2.html)
- [Brčko income tax law](https://www.paragraf.ba/propisi/brcko/zakon-o-porezu-na-dohodak.html)
- [Residence law for BiH citizens](https://www.paragraf.ba/propisi/bih/zakon-o-prebivalistu-i-boravistu-drzavljana-bosne-i-hercegovine.html)
- [KS tourist tax 2025](https://www.paragraf.ba/dnevne-vijesti/05112024/05112024-vijest3.html)
- [RS payment services law](https://www.paragraf.ba/dnevne-vijesti/27032026/27032026-vijest3.html)
- [FBiH payment laws](https://www.paragraf.ba/dnevne-vijesti/25052026/25052026-vijest2.html)
- [IPS BiH launch](https://fena.ba/article/1689023/the-central-bank-of-bosnia-and-herzegovina-launches-the-instant-payment-system)
- [CBBH on SEPA](https://cbbh.ba/press/ShowNews/1808)
- [CBBH IBAN structure](https://cbbh.ba/Content/Read/609?lang=en)
- [Halcom BiH payment and statement formats](https://support.halcom.com/app/uploads/2021/11/Formati_PPD_BA.pdf)
- [BBI eRežija](https://bbi.ba/en/online-services/erezija/)
- [Open Banking Tracker — BiH aggregators](https://www.openbankingtracker.com/country/ba/aggregators)
- [Stripe global availability](https://stripe.com/global)
- [FBiH fiscal systems law 81/09](https://fuzip.gov.ba/wp-content/uploads/2022/09/Zakon_o_fiskalnim_sistemima_sl_novine_fbih_broj_81_2009-9.pdf)
- [FBiH new fiscalization law (Unija)](https://unija.com/bs/novi-zakon-o-fiskalizaciji-fbih/)
- [RS fiscalization law](https://www.paragraf.ba/propisi/republika-srpska/zakon-o-fiskalizaciji.html)
- [BiH data protection law](https://www.paragraf.ba/savjetovanje-strane/novi-zakon-zastita-licnih-podataka-gdpr.html)
- [BiH qualified e-signature issuers (FENA)](https://www.fena.ba/article/1639705/qualified-electronic-signature-in-bih-available-through-four-authorized-issuers)
- [IDDEEA remote qualified signature](https://www.paragraf.ba/dnevne-vijesti/03072024/03072024-vijest3.html)
- [Diaspora and remittances (RFE)](https://www.slobodnaevropa.org/a/doznake-inostranstvo-dijaspora-bih/33819114.html)

**Integrations**

- [Seam docs](https://www.seam.co/docs/device-and-system-integration-guides) · [Seam pricing](https://seam.co/pricing)
- [Nuki Web API](https://developer.nuki.io/t/nuki-web-api/25) · [Tedee API](https://tedee-tedee-api-doc.readthedocs-hosted.com) · [Salto KS Connect](https://developer.saltosystems.com/ks/connect-api/)
- [Ajax Enterprise API](https://ajax.systems/support/posts/what-is-enterprise-api/) · [tado° API limits](https://support.tado.com/en/articles/12165739-limitation-for-rest-api-usage)
- [Shelly Integrator API](https://shelly-api-docs.shelly.cloud/integrator-api) · [Lobaro manuals](https://manuals.lobaro.com) · [wmbusmeters](https://github.com/wmbusmeters/wmbusmeters)
- [Monri payment API](https://ipg.monri.com/en/documentation/payment_api)
- [Viber chatbot fees](https://help.viber.com/hc/en-us/articles/15383950711197) · [Infobip BiH sender ID](https://www.infobip.com/docs/essentials/europe-registration/bosnia-and-herzegovina-letter-of-authorization-loa-guidelines) · [WhatsApp pricing](https://developers.facebook.com/docs/whatsapp/pricing)
- [eID Easy + Halcom One](https://www.eideasy.com/blog/halcom-one-now-integrated-with-eid-easy-powering-users-and-businesses-across-slovenia-serbia-and-bosnia-and-herzegovina)
- [Azure Document Intelligence languages](https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/language-support/prebuilt?view=doc-intel-4.0.0) · [DeepL language support](https://www.deepl.com/en/pro-service-specifications)
- [HERE geocoding coverage](https://docs.here.com/geocoding-and-search/docs/geocode-local-coverage) · [FGU e-Grunt / katastar](https://fgu.com.ba/en/newse-reader/internet-presentation-regarding-land-registry-data-held.html)
- [Channex pricing](https://channex.io/pricing.md)
