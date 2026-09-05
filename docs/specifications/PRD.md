PRD — GST Flow Prototype
Audience: the coding agent. Written imperatively. Follow exactly; where this doc conflicts with older chat mockups, THIS DOC WINS.


0. Read me first
What this is. A hackathon prototype that redesigns the Indian GST filing + refund experience for e-invoice-enabled B2B taxpayers (> ₹5 crore AATO). No AI features — deterministic rules, transparent calculations, explicit confirmations only. The refund flow (inverted duty structure, RFD-01) is the flagship.

Canonical companion docs (read all three before writing code):

TECHNICAL.md — DB schema, seed data (canonical numbers), API contracts, backend flows, formulas.
DESIGN.md — tokens, components, per-screen layout rules. The approved HTML files listed there are the visual source of truth.
user-flow-complete.html — the screen map. Every route in this PRD appears there.

Existing code (do not rebuild): Next.js + Supabase Auth; tables users, taxpayer_profiles, taxpayer_places_of_business, taxpayer_authorised_signatories, taxpayer_bank_accounts, taxpayer_derived_attributes, taxpayer_filing_history, taxpayer_hsn_sac_codes; GET /api/profile (bearer-token validated, service-role reads, masked fields); POST /api/profile/demo provisioner; profile page UI. Reuse this auth/data-access pattern for every new route.

Honesty principle (judged criterion — do not violate): anything mocked is labelled mocked, in the UI, in small grey text. Never present a simulated action as real. The footer strip "This is a GST Portal redesign prototype, not the actual GST portal. All data is synthetic, and filing information is simulated." appears on every page.

Priorities. P0 = demo breaks without it. P1 = strongly expected. P2 = build only if P0+P1 done.

#
Feature
Priority
F1
Auth shell + 3 demo users + app navigation
P0
F2
Dashboard
P0
F3
Returns hub (FY/Quarter/Period → actions → all-categories table)
P0
F4
Excel template + upload + validation report
P0
F5
Review & fix placement (auto-categorisation with override)
P0
F6
GSTR-1 workspace: category detail, auto Table 12/13, file
P0
F7
E-invoice import + IRN badge/sever + UTP mode demo
P1 (UTP toggle P2)
F8
Purchases / IMS review + GSTR-2B finalize
P0
F9
GSTR-3B: auto-prepared, offset, pay, file
P0
F10
Ledgers page (Credit / Cash / Liability tabs)
P0
F11
Refund flow R1–R7 (flagship)
P0
F12
Annual return — thin GSTR-9
P1
F13
Profile additions (AATO, e-invoice chip)
P2
F14
Officer demo panel (advance ARN states)
P1
F15
Payments (dummy records)
P1


Explicitly out of scope (do not build): manual invoice-entry form; vendor scan card; event-driven alerts; dynamic AATO derivation; other refund categories besides IDS; supplier-side liability write-back on CN rejection (warning text only); interest/late-fee computation (all seed filings are on time); GSTR-9C; notices (DRC-01B/C); QRMP/IFF.


1. Users & demo scripts
Three seeded logins (exact data in TECHNICAL.md §3):

User
GSTIN
Story
Aarohan Systems Pvt Ltd
29AAHCA3412R1Z5 (Karnataka)
Runs the full monthly filing loop: Excel upload → review → GSTR-1 → IMS → GSTR-3B → payment → ledgers. Months Apr–Jun 2026 fully filed; July mid-flow.
Meridian Packaging Pvt Ltd
27AAFCM0000K1Z5 (Maharashtra)
Runs the refund flagship. All returns filed through July 2026; ₹17,97,211 IDS refund claimable.
New user (clean)
any
Shows empty states everywhere.


Demo script A (Aarohan, ~3 min): login → dashboard to-dos → Returns hub → Upload Excel (Use sample data) → validation report → Review & fix (1 error) → commit → workspace shows all categories + auto Table 12/13 → file GSTR-1 → banner routes to IMS → deemed-acceptance preview banner → bulk accept matched, reject 1, keep 1 pending → finalize → GSTR-3B pre-filled → offset → file → open Ledgers, point at the entries that just appeared.

Demo script B (Meridian, ~3 min): login → dashboard saffron card ₹17,97,211 → R2 green pre-checks + 2-year countdown → R3 classify (capital-goods flag) → R4 inversion evidence cards → R5 computation with visible working and lowest-of-three → R6 statements rendered with zero typing → consequence modal → file → R7 tracker → officer panel advances to Provisional 90% → ledger shows debit + timeline shows clocks.


2. Features
F1 — Auth shell, demo users, navigation (P0)
Purpose. One shell for the whole app in the approved government style; three one-click demo logins.

Requirements.

/login: email+password (existing Supabase Auth) plus three demo cards (Aarohan / Meridian / New user) that sign in with pre-created credentials in one click. Card copy: company name, GSTIN, one line ("Monthly filing story" / "Refund story" / "Empty account").
On first login, the demo provisioner (TECHNICAL.md §3.4) seeds that user's data if absent (same pattern as existing /api/profile/demo).
App shell on every authenticated page: navy header (emblem, "Goods and Services Tax", company + GSTIN right, Logout), navy nav bar: Dashboard · Returns · Purchases / IMS [badge] · Ledgers · Refunds · Annual Return + search placeholder (non-functional, visual only). Active item = white underline. IMS badge = count of pending inward invoices for the current period.
Navy footer + the prototype sub-footer strip on every page.
Replace the current dummy navbar everywhere.

Acceptance.

All three demo logins land on their own dashboard with their own data; no cross-user leakage (verified by switching users).
Nav renders identically on all pages; active state correct; badge count live.
Works at 1366×768 without horizontal scroll.


F2 — Dashboard (P0)
Route /dashboard. Layout = approved dashboard-design-v2.html adapted to the v3.1 shell (see DESIGN.md §4.1). Keep the copy discipline: chip + words + date; short sentences.

Requirements.

To-do list for the current period (July 2026), numbered rows, computed from data:
GSTR-1 row: Filed chip + date if filed, else Due chip + "Open" button → /returns.
IMS row: "N invoices unchecked" + the deemed-acceptance sentence with the real sum ("If you do nothing… ₹X across N invoices… including M not in your purchase records") → /purchases.
GSTR-3B row: due date + days left + one-line summary (liability, cash needed) → /returns/gstr3b/{period}.
Refund row (only when the user has a claimable amount, i.e., Meridian): saffron, amount, "Start refund claim" → /refunds. Aarohan and the clean user never see saffron on the dashboard.
Money boxes (3): Cash ledger balance, Credit ledger balance (+ "grew by ₹X in {month}" when positive delta), Refund claimable (saffron; Meridian only — for others the third box becomes "Tax liability outstanding ₹0"). All values from ledger_entries sums.
Coming due dates table: GSTR-3B current period, next GSTR-1, refund 2-year deadline (Meridian), GSTR-9. Days-left computed from a fixed "demo today" constant (TECHNICAL.md §6.8) so the demo is stable.
Clean user: friendly empty state per section ("Nothing due yet — upload your first invoices from Returns").

Acceptance.

Every number on the dashboard is queried, not hardcoded in the component (hardcoding lives only in seed data).
To-do rows change state live: after filing GSTR-1 in the same session, row 1 flips to Filed without reseeding.
Saffron appears on Meridian's dashboard only.


F3 — Returns hub (P0)
Route /returns. Layout = approved returns-page-design-v2-final.html exactly. No status banner.

Requirements.

Selector card: Financial Year / Quarter / Period selects with red-dot mandatory labels + navy SEARCH button. Quarter filters the Period options. Default: FY 2026-27, Q2, July.
On SEARCH → period card: title "GSTR-1 — {Month Year}", sub "Sales return · due {date}", right side exactly two chips: GSTR-1 status, GSTR-3B status. Actions row: ⬆ Upload invoices (Excel) (primary) · Import e-invoices · ⬇ Download Excel template · File Nil return (plain). If GSTR-1 already filed, primary action becomes View filed return and Upload is disabled with tooltip "Return already filed".
All-categories table: all 11 invoice categories + Table 12 + Table 13 rows, in the fixed order of the approved HTML. Per row: category name + table number + one-line "placed here when", document count, taxable value, tax, Open. Empty categories greyed, count 0, no Open link. Table 12 row: chip "Prepared automatically from your invoice lines" + View. Table 13 row: chip "Series counted automatically" + Confirm chip when unconfirmed. Totals footer.
File Nil return: confirmation dialog ("This declares zero sales for {period}. You cannot undo this.") → marks the period NIL_FILED. Only enabled when zero committed documents exist.
Past periods (Apr–Jun for Aarohan): SEARCH shows the same layout in read-only filed state.

Acceptance.

Category counts/values always equal the sum of committed documents (one query source shared with F6).
All 11 categories render even at zero.
Nil filing blocked (with reason in words) when documents exist.


F4 — Excel template + upload + validation (P0)
Routes /returns/gstr1/{period}/upload, template served at /api/template/gstr1.

Requirements.

Template (xlsx, generated per TECHNICAL.md §8): one Invoices sheet, one row per invoice line; fixed columns mirroring the upload JSON schema; a Read me sheet with per-column instructions and 3 example rows; dropdown data-validation on doc_type, supply_type, note_type, reason_for_note, place_of_supply.
Upload page = the two-step pattern from gstr1-filing-design-v1.html Step 1, reduced: (a) Download template, (b) drop-zone + Use sample data button (loads the seeded sample batch — the demo must never depend on a file picker).
On upload: parse with SheetJS → validate every row (rules in TECHNICAL.md §6.2) → create an upload_batches record + staged documents. Show the validation report in plain words: "31 rows read · 24 invoices found · 1 row needs fixing", then an error list: row number, the problem, the fix ("Row 12: HSN is 3 digits — HSN must be 4, 6 or 8 digits").
A file where every row fails stays on this page with the list. A partly-valid file proceeds; broken rows carry into Review as error rows.
JSON upload: an "Advanced: upload JSON" link accepting the exact schema of the provided gstr1-invoice-upload-schema.json. Same pipeline.
Re-upload before commit replaces the staged batch (old batch marked REPLACED).

Acceptance.

Template opens in Excel/LibreOffice with working dropdowns.
Use sample data produces the full seeded batch in <2s with zero picker interaction.
Every validation failure message names the row, the field, and the fix — no codes, no jargon.


F5 — Review & fix placement (P0)
Route /returns/gstr1/{period}/review.

Purpose. The trust moment: never silently classify. Show the decision, the reason, allow override.

Requirements.

Error rows first, each with the inline fix control (e.g., HSN input, port-code select). Fixing revalidates the row live.
Then invoices grouped by assigned category. Group header: category name, count, value. Each invoice row: number, date, party, value, tax, and a category dropdown pre-set to the system's choice with the reason as helper text ("GSTIN present → B2B"). Changing it sets category_overridden = true and re-groups.
Categories the routing can never produce for that invoice are absent from its dropdown (e.g., an invoice with a GSTIN cannot become B2CS).
B2CS shows as one consolidated preview row per state+rate with "combined from N sales".
Sticky commit bar: "Commit 24 invoices into 10 categories" — disabled while any error row remains, reason in words next to it.
Commit → documents become COMMITTED → redirect to /returns/gstr1/{period} with toast "24 invoices saved".

Acceptance.

No invoice is ever committed to a category the user hasn't at minimum seen.
Overrides survive: reopening review before filing shows the overridden category, not the recomputed one.
Commit blocked with a plain-words reason until errors are zero.


F6 — GSTR-1 workspace + Table 12/13 + file (P0)
Route /returns/gstr1/{period}.

Requirements.

Same all-categories table as F3 (shared component). Open on a row expands the invoice list for that category inline (number, date, party, taxable, tax, source badge).
Table 12 (HSN summary) — fully derived (TECHNICAL.md §6.4), rendered read-only in B2B/B2C tabs with the caption "Prepared automatically from your invoice lines — on the government portal you type this yourself." No edit UI.
Table 13 (Documents issued) — series auto-detected from committed invoice numbers. Shows detected series (prefix, from, to, total). User confirms with one click; may edit cancelled count only. Unconfirmed = filing blocked.
File: Preview return (PDF) (simple print-view page is acceptable) + File GSTR-1 with EVC/DSC button. Disabled until: zero error rows AND Table 13 confirmed — the disabled state lists the outstanding reasons in words. Filing = simulated: confirmation dialog → status FILED, ARN generated, documents FILED, return_filings updated. Confirmation screen shows ARN + date + a banner: "Next: review your purchases before GSTR-3B → " linking /purchases.
After filing, the workspace is read-only with the Filed chip and ARN.

Acceptance.

Table 12 totals reconcile exactly with the category table totals (same query).
Filing is impossible with unresolved errors/unconfirmed series; the button explains why.
Post-file, every mutation path on this period's documents is disabled.


F7 — E-invoice import, IRN provenance, UTP demo (P1; toggle P2)
Requirements.

Seeded IRP registry: N inward… outward invoices carrying IRNs, status "available on IRP". Import e-invoices on /returns pulls them into the period as committed documents with source = EINVOICE, IRN + IRN date shown as a green badge in invoice lists.
Sever demo (P1): editing any field of an e-invoice document (allowed pre-filing via the expanded row's Edit) shows a warning modal: "This row came signed from the IRP. Editing it detaches the IRN — the provenance is lost. The government portal does this silently; we won't." Proceed → irn_severed = true, badge turns red "IRN detached".
UTP mode (P2): a labelled experimental toggle on the workspace ("UTP mode — treat the signed e-invoice as the return"). When on: edits to e-invoice rows are refused with "Recorded as a delta against the IRN instead" (a visible amendment note is created), and a banner renders: "In UTP mode there is nothing to file — your signed invoices already are the return." Toggle off restores normal behaviour. Pure UI + one deltas note field; no second backend.

Acceptance.

Import is idempotent (re-clicking doesn't duplicate).
The three-beat demo works: import → edit warning/sever → UTP refusal, on one invoice, in under 30 seconds.


F8 — Purchases / IMS review + GSTR-2B (P0)
Route /purchases.

Requirements.

Header banner — the "do nothing" preview, computed live: "If you take no action before filing GSTR-3B, ₹{sum} across {n} invoices becomes your ITC claim — including {m} not in your purchase records." ({m} from `matched_in_books = false}.)
Invoice table: supplier, number, date, value, ITC, "In your books?" chip (Yes / Not found red), action segmented control per row: Accept / Reject / Keep pending. Bulk bar: "Accept all {k} matched invoices" for rows with books-match and no action yet.
Reject on a credit note interrupts with the warning: "Rejecting this credit note will increase {supplier}'s tax next month. There is no dispute process — they'll call you." Confirm to proceed. (Supplier-side write is NOT implemented; the warning is the feature.)
Keep pending on a credit note shows its expiry ("You can hold this until {date}; after that it counts as accepted").
Finalize and generate GSTR-2B → builds the snapshot (rules TECHNICAL.md §6.5): sections ITC available / not available / rejected, with totals; untouched rows counted as deemed accepted and labelled so in the summary ("7 accepted by you · 25 accepted by silence").
After the period's GSTR-3B is filed, all actions lock with "IMS window closed for {period}".

Acceptance.

The banner sum equals exactly what finalize would produce with zero actions.
Pending rows are excluded from the 2B totals; rejected rows appear only in the rejected section.
The words "accepted by silence" appear in the finalize summary.


F9 — GSTR-3B (P0)
Route /returns/gstr3b/{period}.

Requirements.

Blocked states first: if GSTR-1 unfiled → full-page block "File GSTR-1 for {period} first" with link. If IMS not finalized → block with link. (Sequencing is the real system's rule; keep it.)
Pre-filled summary, every cell showing its source in small grey text:
3.1(a) outward liability — from filed GSTR-1, locked ("locked from your GSTR-1 — the portal locked this in July 2025 too").
3.1(c) nil/exempt — from GSTR-1 Table 8, locked.
3.1(d) RCM inward — from committed inward RCM docs, locked.
Table 4A ITC — from the finalized 2B snapshot; editable upward triggers a red warning chip (matches real portal), downward allowed.
Table 4C = 4A − 4B, derived.
Payment box: liability per head, credit available per head, suggested set-off in Rule 88A order (IGST credit → IGST, then CGST/SGST; no CGST↔SGST cross-use), editable; cash required = RCM + shortfall. Offset allowed once ("The offset can be run only once per period — same as the portal"). Create challan inline if cash ledger short (creates a challan ledger credit, dummy).
File GSTR-3B → simulated → writes the full ledger mutation set (TECHNICAL.md §6.6) + a payments record → confirmation with links "See what moved in your ledgers →".
Nil 3B allowed only when all four nil conditions hold; otherwise the button explains which fails.

Acceptance.

Every pre-filled cell displays its source; locked cells are visibly non-editable.
Offset is once-only; a second attempt explains why.
Post-file ledger balances change by exactly the documented mutation set (assert in a seed test).


F10 — Ledgers (P0)
Route /ledgers, one page, three tabs: Credit ledger · Cash ledger · Liability register.

Requirements.

Every tab: balance cards on top (per head: IGST/CGST/SGST/Cess), then the monthly statement table: date, description in words ("GSTR-3B July 2026 — ITC credited"), source link (opens the return/refund/challan), per-head + / − amounts, running balance. Month group headers with opening/closing.
Cash ledger: minor heads (Tax/Interest/Penalty/Fee/Others) as collapsible sub-rows per head. Seed includes ₹12,000 stuck under Fee with an info note: "Money in the wrong pocket can't pay tax — on the real portal this needs form PMT-09."
Credit ledger (Meridian): shows the refund debit on filing and any re-credit events, each linking to the ARN.
Download statement (Excel) per tab (SheetJS export of the visible rows).
Liability register: created-by-3B / discharged-by-offset pairs, simple.

Acceptance.

Running balances are computed from entries, never stored; totals match the dashboard money boxes to the rupee.
Every entry's source link resolves.


F11 — Refund flow R1–R7 (P0, flagship)
Six screens + tracker. Classifications are binding — they implement the approved blended design. Colour language: derived values green-tinted "computed" labels; confirmations amber; user decisions plain. Saffron accents allowed only here.

R1 /refunds — home.

Claimable card (₹17,97,211 · July 2026 · one-line why · Start refund claim). Claims list: ARN, period, amount, status chip. Clean/Aarohan users see the empty/explainer state ("Refunds apply when your purchase tax rate is higher than your sales rate — not your situation this month").

R2 /refunds/new — eligibility & period. [ALL AUTOMATED]

Period select showing accumulated credit per period. Auto checks with green ticks: all returns due are filed; GSTR-3B for the period is filed. Failure → blocked with a link to the missing return.
Two-year deadline computed and displayed as a countdown, with the caption: "The government portal refuses to calculate this deadline for you. We did." Warn, never hard-block.

R3 /refunds/new/classify — classify purchases. [AUTO for services · FLAGGED for goods]

Every inward invoice of the period listed. SAC lines (99xxxx) auto-tagged Input Services, locked, label "detected from the service code".
Goods lines suggested Inputs; the seeded corrugator invoice (HSN ch. 84) suggested Capital Goods with the explainer "Machinery is usually capitalised — capital goods cannot be refunded under this category." Per-line accept/override + Accept all suggested for the unflagged mass.
Section 17(5) suggestion chips where HSN matches the blocked-pattern list; cross-field auto rules applied (blocked Yes → eligible No, amounts auto).
Live Net ITC preview updates as they classify: "Net ITC (inputs only): ₹37,08,000 — services ₹6,66,000 and capital ₹2,50,000 excluded by law."

R4 /refunds/new/inversion — inversion check. [FLAGGED, per output HSN]

One evidence card per inverted output HSN (481910, 481920, 482390): output rate, its input HSNs + rates, "same code on both sides? No", "output rate reduced by notification on 22-09-2025 — but inputs are different goods at a stable 18%", verdict "Pattern typically eligible (structural) — please confirm". Confirm / Exclude per card; excluding drops the line from the claim and shows "the credit stays in your ledger — it is not lost".
A closing panel: "No same-product (temporal) pattern found in your July data." A ?demo=temporal query param renders one clearly-labelled example temporal card (synthetic, marked "Example — not your data") so judges can see the exclusion verdict. Do not let the example touch the computation.
P5 (392329, 18% in / 18% out) never generates a card — not inverted; if asked, the panel notes "PP sacks trade at the same rate both ways — no inversion, not part of this claim."

R5 /refunds/new/compute — computation. [AUTOMATED with one FLAGGED input]

Top-to-bottom derivation with a "show working" expander at each line: inverted turnover ₹2,80,00,000 (lines listed) → tax on it ₹14,00,000 → adjusted total turnover ₹3,50,00,000 — confirmable field with itemised exclusions ("Exclusions applied: none — no exports without payment, no exempt supplies") → Net ITC ₹37,08,000 (downward-editable only; raising it shows "the ledger caps this") → Rule 89(5) maximum ₹17,97,211 using the AMENDED formula (TECHNICAL.md §6.7 — do not use the pre-2022 formula).
Lowest-of-three: formula max vs credit balance at period end vs balance now vs Net ITC — binding figure highlighted with the reason in words.
Head-wise debit preview (5-case algorithm), caption "You can't choose which head pays — the law decides."

R6 /refunds/new/file — statements & file. [AUTO generation · MANUAL assent]

Statement 1A and Annexure B rendered as full tables, zero typing; each column carries a provenance badge: "already held" / "you confirmed". Annexure B col 10 filled from R3 answers.
Category confirmation block: "Filing under Inverted Duty Structure because your 5% outputs are made from 18% inputs. Five other refund categories exist; this prototype prepares only this one." One checkbox.
Bank account select (from master, never typed) · three declaration checkboxes · File refund claim.
Consequence modal before filing: "₹17,97,211 leaves your credit ledger today, not on approval. 26 purchase invoices lock until this claim is decided." Confirm → ARN, ledger debited head-wise, invoices locked, → R7.

R7 /refunds/{arn} — tracker. [AUTOMATED]

Vertical timeline: Filed → Acknowledged (RFD-02, 15-day chip) → Provisional 90% (RFD-04, 7-day chip) → Sanction (RFD-06) → Payment (RFD-05) → Disbursed; deficiency (RFD-03) and rejection branches shown when they occur, each with its ledger effect inline ("+₹17,97,211 re-credited via PMT-03").
60-day counter from filing; past day 60 an interest line appears: "The government now owes you interest under Section 56."
Branch behaviours: RFD-03 → re-credit + unlock + "file a fresh claim" → R2. Rejection → re-credit + note about the appeal-undertaking trap in one sentence.

Acceptance (whole flow).

The final figure is ₹17,97,211 from computation, not a constant; changing Net ITC downward changes it correctly.
Confirm/exclude on an R4 card changes the R5 turnover and result.
Filing debits the credit ledger by the head-wise algorithm and the entries appear in F10 with the ARN link.
Every AUTOMATED value shows a working; every FLAGGED value requires a click; nothing silently decides.
?demo=temporal card renders, labelled Example, computation unchanged.


F12 — Annual return, thin GSTR-9 (P1)
Route /annual.

System-computed FY summary from filed returns (outward, ITC, tax paid) — read-only cards, caption "computed from your twelve filed returns; nothing to type".
Red-cell demo: exactly one editable cell (Table 9 "Tax payable"). Editing it turns it red with the note "Differences from the system value stay highlighted forever — the portal remembers disagreement." Persist the highlight.
Table 17 demo: the HSN annual summary auto-filled from Table 12 data, caption "The government portal generates this exact table as an Excel download and then makes you retype it. We didn't."
File annual return = simulated, confirmation only.

Acceptance. [ ] All values derived; the red highlight survives reload.
F13 — Profile additions (P2)
Add to the existing profile: AATO line (hardcoded per user: Aarohan ₹38 crore, Meridian ₹42 crore), "E-invoicing applicable" chip, and point the filing-history tab at return_filings.
F14 — Officer demo panel (P1)
Hidden behind ?officer=1 on R7 (plus a keyboard shortcut Shift+O). Buttons: Acknowledge (RFD-02) · Deficiency (RFD-03) · Provisional 90% (RFD-04) · Show-cause (RFD-08) · Sanction (RFD-06) · Payment (RFD-05) · Reject. Each calls the officer endpoint, applies the state transition + ledger effects, and the timeline updates without reload. Panel visually labelled "Demo controls — not part of the product".
F15 — Payments (P1)
payments rows written on 3B file (cash component). Shown in the Returns hub period card is NOT needed; payments appear as the Payment status in the F3 month context only via return_filings.summary. A minimal /api/payments list endpoint is enough.


3. Cross-cutting requirements
Empty states everywhere — one sentence + one action, never a blank table.
Dates DD-MM-YYYY; money ₹ Indian grouping, tabular-nums.
No hover-only actions; no icon-only buttons. Minimum 40px targets.
Every simulated consequence is labelled ("filing is simulated") once per screen, small grey, bottom.
Error copy pattern: what happened → how to fix → where. Never a bare code.
All reads/writes go through Next.js API routes with the existing bearer-token + service-role pattern; the browser never holds the service key; RLS stays no-browser-policy.
4. Definition of done
Both demo scripts (§1) run end-to-end on a fresh database with only the seed migrations + provisioner, on a 1366×768 window, without touching the file picker, without a console error, and every on-screen number traceable to a table row or a formula in TECHNICAL.md.
