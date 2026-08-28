ATABASE — Complete Table & Field Study

Audience: the coding agent. This supersedes TECHNICAL.md §2. Every table and every column below is traced back to the GST reference docs in the project (Sections A–J of the master reference). Section 5 proves coverage: each portal surface's fields mapped to a table.column or a derivation. Migration SQL in §6 is final — run it as 003_returns_refunds_ledgers.sql.

1. Principles that decide what is a column

From the reference docs' provenance analysis (Section I):

Store facts once, at line level. The docs prove the portal re-asks the same invoice up to 4 times (GSTR-1 → Statement 1A → Annexure B → GSTR-2B validation). We store one documents + document_lines pair and derive every downstream surface. Statement 1A and Annexure B are renders, not tables.
Never store a derived number (balances, Table 12, 2B totals, refund maximum). Store the inputs; compute in modules; cache only where the UI needs history (gstr2b_snapshots, refund_applications.computation).
Store every Genuine-USER field explicitly. Section I4's irreducible set maps 1:1 to columns: IMS action / ITC-reduction (→ ims_actions), Annexure-B category col 10 (→ refund_line_classifications.category), 17(5) judgments (→ blocked_17_5), declarations (→ refund_applications), Table 13 cancelled counts (→ return_filings.table13).
Direction is data, not schema. One documents table; direction derived at ingest from which GSTIN slot the taxpayer occupies (Section J's model).
2. Table inventory (at a glance)
2.1 Existing — keep unchanged (migrations 001/002)
#	Table	Holds	Feeds
E1	users	auth identities	everything (FK)
E2	taxpayer_profiles	GSTIN, legal/trade name, constitution, state, registration date, contacts	headers everywhere; RFD-01 MASTER fields
E3	taxpayer_places_of_business	PPOB + additional places	profile
E4	taxpayer_authorised_signatories	≤10 signatories, one primary	profile; filing "signatory" dropdowns
E5	taxpayer_bank_accounts	≤10 accounts + NPCI status	profile; refund bank selection (RFD-01 — selected, never typed)
E6	taxpayer_derived_attributes	cached AATO etc.	profile (F13 hardcoded AATO lives here)
E7	taxpayer_filing_history	legacy filing rows	profile only; superseded operationally by N6
E8	taxpayer_hsn_sac_codes	the taxpayer's goods/services master	Excel template examples; "My Masters" analogue
2.2 New — migration 003 (this doc)
#	Table	One-line purpose	Grounding in reference docs
N1	upload_batches	one Excel/JSON upload + its validation report	F4 pipeline
N2	documents	every invoice/CN/DN, outward AND inward	Section J Document; Statement 1A both sides; Annexure B cols 2–9
N3	document_lines	HSN-level lines (qty, rate, taxable, 4 tax heads)	Section J Line; Table 12; Annexure B cols 11–16; inversion detector
N4	irp_einvoices	seeded IRP registry awaiting import	Section B3.3 AUTO-EINV; F7
N5	ims_actions	the 3 genuine IMS user fields + remark	Section C9: action, itc_reduce Y/N, amount (+ remark)
N6	return_filings	operational status per return per period (+ Table 13, offset flag)	G1 pre-conditions; B12 filing mechanics
N7	gstr2b_snapshots	frozen 2B per period, 4-section split	Section C2 (static statement, sections)
N8	payments	dummy cash payments per period	F15
N9	ledger_entries	single signed journal for cash/credit/liability	Section E (PMT-01/02/05); E2's 20-bucket cash via minor_head
N10	refund_applications	RFD-01 header + full computation working + state	G3 header; G8 Tables 1–3; G12 state machine
N11	refund_line_classifications	per inward invoice: category col 10 + cols 17–20	G6 Annexure B Table 2
N12	refund_inversion_decisions	per output HSN: evidence, verdict, confirm/exclude	blended-flow R4; Circular 135 distinction
N13	refund_status_events	ARN timeline events + ledger effects	G12 diagram; G13 statuses
N14	annual_returns	thin GSTR-9: computed cache + the one red-cell edit	Section F; PRD F12
N15	hsn_rate_history	rates over time per HSN (global reference)	Notification 9/2025 22-09-2025 changes; temporal detector

Deliberately NOT tables (derived renders): Statement 1A, Annexure B, Table 12, Table 13 detection, GSTR-3B cells, ledger balances, GSTR-9 tables 4–8, the "lowest of three". §5 shows each one's derivation source.

3. Field-by-field specification (new tables)

Types are Postgres. ✱ = required (NOT NULL). Source column names the reference-doc field the column exists to hold.

N1 upload_batches
Column	Type	Notes
id ✱	uuid pk	
user_id ✱	uuid → users	
period ✱	char(6)	'MMYYYY'
source ✱	doc_source_e	EXCEL | JSON
filename	text	shown on the green file card
rows_read ✱	int	report line
invoices_created ✱	int	report line
error_rows ✱	jsonb []	[{row, doc_no, field, problem, fix}] — plain-words report
status ✱	text	VALIDATED | COMMITTED | REPLACED
created_at ✱	timestamptz	
N2 documents — the centre of the schema
Column	Type	Notes / source
id ✱	uuid pk	
user_id ✱	uuid → users	owner (RLS scope)
period ✱	char(6)	tax period
direction ✱	doc_direction	OUTWARD | INWARD — set at ingest from GSTIN role (Section J invariant)
doc_type ✱	doc_type	INV | CN | DN — Annexure B col 3; Stmt 1A "type of document"
supply_type ✱	supply_type_e	REGULAR…NON_GST — upload schema _allowed_values
inward_supply_type ✱	text default 'REGISTERED'	Annexure B col 2 dropdown; prototype scope: REGISTERED | RCM_UNREGISTERED
is_amendment ✱	bool	routes 9A/9C
original_period / original_doc_no / original_doc_date	char(6)/text/date	amendment key (B8.1) and CN/DN original-invoice link (B7 RE-ASKED pair — we store it once)
doc_no ✱	text ≤16	Annexure B col 6 validation
doc_date ✱	date	col 7: not future, ≥ 01-07-2017
value ✱	numeric(15,2)	col 9
supplier_gstin ✱ / supplier_name	text(15)/text ≤100	cols 4–5; = own GSTIN when OUTWARD
recipient_gstin / recipient_name	text/text	null recipient ⇒ B2C (routing key)
pos ✱	char(2)	place of supply; drives INTER/INTRA (supplier_gstin[0:2] ≠ pos)
reverse_charge ✱	bool	routes B2B_RC; 3B 3.1(d); IMS bypass (C7)
note_type / reason_for_note	char(1)/text	'C'|'D'; the fixed reason list
port_code / shipping_bill_no / shipping_bill_date	text/text/date	exports (6A); the seeded deliberate error omits port_code
nil_details	jsonb	{nil_rated, exempted, non_gst, inter_intra, reg_unreg} — Table 8 axes (B6)
category	gstr1_category	router output (OUTWARD only)
category_reason ✱-ish	text	shown as helper text in Review — "never silently classify"
category_overridden ✱	bool	user override flag
irn / irn_date / irn_severed ✱	text/date/bool	Section B3.3 three e-invoice columns + the sever behaviour, made loud
utp_delta_note	text	F7 UTP mode delta record
source ✱	doc_source_e	EXCEL | JSON | EINVOICE | SEED
status ✱	doc_status_e	STAGED → COMMITTED → FILED → LOCKED (LOCKED = Statement-1A invoice lock, G1)
matched_in_books	bool	INWARD only — powers "2 not in your books"
gstr2b_period	char(6)	Annexure B col 21; prototype: = period
upload_batch_id	uuid → N1	
validation_errors ✱	jsonb []	per-row problems until fixed
locked_by_refund	uuid	which ARN locked it
created_at ✱	timestamptz	
unique	(user_id, doc_no, doc_type, period)	duplicate-key guard (G6 uses GSTIN+No+Date+Category+HSN; ours is the ingest-level guard, refund dup-key enforced at render)
N3 document_lines
Column	Type	Notes / source
id ✱ / document_id ✱	uuid / → N2 cascade	
line_no ✱	int	
hsn	text	4/6/8 digits (Annexure B col 11; Table 12); null only for B2CS-consolidated & advances
uqc / quantity	text / numeric(15,3)	Table 12 columns
rate ✱	numeric(5,2)	5 | 18 …
taxable_value ✱	numeric(15,2)	
igst/cgst/sgst/cess ✱	numeric(15,2) default 0	Annexure B cols 12–15; exclusivity rule enforced in validation (IGST xor CGST+SGST, CGST=SGST)
N4 irp_einvoices
Column	Type	Notes
id ✱ / user_id ✱	uuid / → users	
irn ✱ unique	text	64-char style string
irn_date ✱	date	
period ✱	char(6)	
payload ✱	jsonb	full invoice+lines in upload-schema shape
imported_document_id	uuid → N2	set on import (idempotency key)
N5 ims_actions — exactly the Section C9 genuine-USER set
Column	Type	Source
id ✱ / user_id ✱ / document_id ✱	uuid	unique (user_id, document_id)
action ✱	ims_action_e	ACCEPT | REJECT | PENDING (no row = deemed accept)
remark	text	mandatory in UI when itc_reduce is No/partial
itc_reduce / reduce_amount	bool / numeric(15,2)	Oct-2025 credit-note declaration (C5)
acted_at ✱	timestamptz	
N6 return_filings
Column	Type	Notes / source
id ✱ / user_id ✱	uuid	unique (user_id, return_type, period)
return_type ✱	return_type_e	GSTR1 | GSTR3B | GSTR9
period ✱	char(6)	GSTR9 stores 'FY2526'
status ✱	filing_status_e	NOT_STARTED | IN_PROGRESS | FILED | NIL_FILED
due_date ✱	date	11th / 20th rules
arn / filed_at	text / timestamptz	simulated ARN
table13	jsonb	{series:[{prefix,from,to,total,cancelled,net}], confirmed:bool} — GSTR1 only; the only user input is cancelled (B11)
offset_done ✱	bool	GSTR3B once-only offset (D8 rule 1)
offset_plan	jsonb	stored Rule-88A plan actually used
summary ✱	jsonb {}	cached headline {docs,taxable,tax,cash_paid} for list rows
N7 gstr2b_snapshots
Column	Type	Notes / source
id ✱ / user_id ✱ / period ✱		unique (user_id, period); re-finalize replaces
generated_at ✱	timestamptz	
itc_available ✱	jsonb	{total:{igst,cgst,sgst,cess}, by_user, by_silence, rcm:{…}, doc_ids:[]} — "accepted by silence" is a first-class number (C3 deemed acceptance)
itc_rejected ✱	jsonb	same shape — the 01-10-2024 section (C2)
itc_pending ✱	jsonb	excluded from totals (C3 table)
N8 payments

id ✱, user_id ✱, period ✱, amount ✱ numeric(15,2), mode ✱ text 'CASH_LEDGER', challan_ref, paid_at ✱.

N9 ledger_entries — one journal, three ledgers
Column	Type	Notes / source
id ✱ / user_id ✱		
ledger ✱	ledger_e	CASH (PMT-05) | CREDIT (PMT-02) | LIABILITY (PMT-01)
txn_date ✱	date	
description ✱	text	plain words, rendered verbatim ("Refund claim filed — credit debited")
source_type ✱	ledger_source_e	OPENING | CHALLAN | GSTR3B | RFD01 | RFD03_RECREDIT | PMT03_RECREDIT | SEED
source_ref	text	period / ARN / challan no → UI link
minor_head	minor_head_e	CASH only — TAX | INTEREST | PENALTY | FEE | OTHERS. 4 heads × 5 minor heads reproduces the 20-bucket matrix (E2); the seeded ₹12,000 under CGST/FEE is the misplaced-cash story
igst/cgst/sgst/cess ✱	numeric(15,2) signed	+ credit into ledger, − debit out. LIABILITY: + created, − discharged (Part I only; Part II demands out of scope)
created_at ✱	timestamptz	
Balances = sum() per (ledger, head[, minor_head]) — never stored (E10: ledgers are wholly DERIVED).		
N10 refund_applications
Column	Type	Notes / source
id ✱ / user_id ✱		
arn unique	text	on filing
category ✱	text 'IDS'	only implemented category; confirmation stored below
from_period ✱ / to_period ✱	char(6)	RFD-01 header tax period (G3)
status ✱	refund_status_e	G12 machine, §7.2 of TECHNICAL
computation ✱	jsonb {}	the entire G8 Tables 1–3 working — shape in §5.4 below
adjusted_tt_confirmed ✱	bool	the one FLAGGED formula input (blended flow §2.4)
category_confirmed ✱	bool	R6 category checkbox (Pentacle guard)
bank_account_id	uuid → E5	RFD-01 bank: selected from master, never typed (A3.8)
declarations	jsonb	3 checkbox timestamps (G3: Declaration / Undertaking / Self-Declaration)
created_at ✱ / filed_at	timestamptz	draft 15-day purge NOT implemented — noted honesty item
N11 refund_line_classifications — Annexure B Table 2, the user-judgment columns
Column	Type	Annexure-B column it stores
id ✱ / refund_id ✱ / document_id ✱		unique (refund_id, document_id)
suggested ✱ / suggestion_reason ✱	itc_category_e / text	system's proposal + why ("service code 99…", "machinery chapter 84")
category ✱	itc_category_e	col 10 — Inputs / Input Services / Capital Goods — the only field GSTN says the portal cannot possess
auto_locked ✱	bool	SAC-detected services (deterministic half)
blocked_17_5 ✱	ynp_e	col 17
eligible ✱	ynp_e	col 18 (auto-forced No when blocked=YES — G6 cross-field rule)
eligible_itc ✱ / ineligible_itc ✱	numeric(15,2)	cols 19–20 (rule: 19+20 ≤ line-tax total)
confirmed ✱	bool	per-line human confirmation
N12 refund_inversion_decisions
Column	Type	Notes
id ✱ / refund_id ✱ / output_hsn ✱		unique (refund_id, output_hsn)
evidence ✱	jsonb	{output_rate, turnover, tax, input_hsns:[{hsn,rate}], same_hsn_both_sides, rate_change:{changed,on,from,to,notification}} — rendered as the R4 card
verdict ✱	inv_verdict_e	LIKELY_STRUCTURAL | LIKELY_TEMPORAL | NOT_INVERTED
decision ✱	inv_decision_e	PENDING | CONFIRMED | EXCLUDED
decided_at	timestamptz	
N13 refund_status_events

id ✱, refund_id ✱, status ✱ refund_status_e, form text ('RFD-02'…'RFD-09'), note text, ledger_effect jsonb (copy of entries posted, shown inline on the timeline), event_at ✱. Display labels map from Enumeration A (G13) — stored as the enum, rendered via a label map.

N14 annual_returns

id ✱, user_id ✱, fy ✱ text 'FY2526' unique with user, computed ✱ jsonb (outward/ITC/paid aggregates + auto Table 17 rows), table9_tax_payable_edit numeric(15,2) (the one editable cell), red_flag ✱ bool default false (persists the highlight — F8/H8 "the portal remembers"), filed_simulated_at timestamptz.

N15 hsn_rate_history (global, no user_id)

hsn ✱ text, rate ✱ numeric(5,2), effective_from ✱ date, notification text; pk (hsn, effective_from). Seed rows per TECHNICAL §3.1 (4819xx/482390 18→5 on 2025-09-22, stable-18% inputs, 8441 capital).

4. Enums (complete list)

doc_direction OUTWARD|INWARD · doc_type INV|CN|DN · supply_type_e REGULAR|SEZ_WP|SEZ_WOUT|DEEMED_EXPORT|EXPORT_WP|EXPORT_WOUT|NIL|EXEMPT|NON_GST · gstr1_category B2B|B2B_RC|B2CL|B2CS|EXP|NIL_EXEMPT|CDNR|CDNUR|B2BA|CDNRA|AT|ATADJ · doc_status_e STAGED|COMMITTED|FILED|LOCKED · doc_source_e EXCEL|JSON|EINVOICE|SEED · ims_action_e ACCEPT|REJECT|PENDING · return_type_e GSTR1|GSTR3B|GSTR9 · filing_status_e NOT_STARTED|IN_PROGRESS|FILED|NIL_FILED · ledger_e CASH|CREDIT|LIABILITY · minor_head_e TAX|INTEREST|PENALTY|FEE|OTHERS · ledger_source_e OPENING|CHALLAN|GSTR3B|RFD01|RFD03_RECREDIT|PMT03_RECREDIT|SEED · itc_category_e INPUTS|INPUT_SERVICES|CAPITAL_GOODS · ynp_e YES|NO|PARTIAL · refund_status_e DRAFT|SUBMITTED|ACKNOWLEDGED|DEFICIENT|PROVISIONAL|SCN|SANCTIONED|PAYMENT_ORDERED|DISBURSED|REJECTED|WITHDRAWN · inv_verdict_e LIKELY_STRUCTURAL|LIKELY_TEMPORAL|NOT_INVERTED · inv_decision_e PENDING|CONFIRMED|EXCLUDED.

5. Coverage maps — every portal field → its home
5.1 Annexure B Table 2 (all 21 columns, per G6)
#	Annexure-B column	Stored / derived from
1	Serial No.	render index
2	Type of Inward Supply	documents.inward_supply_type
3	Type of Document	documents.doc_type
4	GSTIN of Supplier	documents.supplier_gstin
5	Name of Supplier	documents.supplier_name
6	Document No.	documents.doc_no
7	Document Date	documents.doc_date
8	Port Code	documents.port_code (NA — no imports in scope)
9	Document Value	documents.value
10	Category of Input Supplies	refund_line_classifications.category (genuine USER)
11	HSN/SAC	document_lines.hsn
12–15	CGST / SGST / IGST / Cess	Σ document_lines per doc
16	Total ITC	derived = 12+13+14+15
17	Blocked u/s 17(5)	refund_line_classifications.blocked_17_5
18	Eligible for ITC	.eligible (forced by 17 per cross-rule)
19	Eligible ITC amount	.eligible_itc
20	Ineligible ITC amount	.ineligible_itc
21	2B Return Period	documents.gstr2b_period

Multi-HSN invoice split (G6's "unauditable apportionment") = one Annexure row per document_lines row — a lookup, not user arithmetic (disclosure caption per PRD).

5.2 Statement 1A (G4) — fully derived

Header GSTIN → taxpayer_profiles; From/To → refund_applications. Inward rows → documents(direction=INWARD) + line tax sums; outward rows → documents(direction=OUTWARD). Zero new storage — this is the anti-RE-ASKED demo.

5.3 RFD-01 header (G3)

Refund type → refund_applications.category (+category_confirmed) · Tax period → from/to_period · Bank → bank_account_id → E5 · Declarations ×3 → declarations jsonb · Signatory → E4 primary (display) · Supporting docs / LEI / Nil-declaration → out of scope (LEI: claim < ₹50 crore — say so if asked).

5.4 Refund computation Tables 1–3 (G8) → refund_applications.computation shape
json
{ "inverted_turnover":0, "tax_on_inverted":0, "adjusted_tt":0, "exclusions":[],
  "net_itc":0, "net_itc_override":null, "itc_inputs_and_services":0,
  "term1":0, "term2":0, "max_refund":0,
  "credit_balance_period_end":0, "credit_balance_now":0,
  "refundable":0, "binding_ceiling":"FORMULA|PERIOD_END|NOW|NET_ITC",
  "headwise":{"igst":0,"cgst":0,"sgst":0,"cess":0},
  "lines_included":["doc_line ids"], "computed_at":"ts" }

Table 1 cols 1–4 → the first four keys (col 4 downward-editable via net_itc_override); col 5 → max_refund (amended formula). Table 2 → the two balances + refundable. Table 3 → headwise (non-editable, 5-case algorithm).

5.5 GSTR-3B cells (Section D) — all derived at prepare-time

3.1(a) → Σ outward REGULAR/B2CL/B2CS − CDN, floored at 0 · 3.1(c) → nil_details sums · 3.1(d) → Σ inward reverse_charge tax · 4A → gstr2b_snapshots.itc_available · 4C → 4A−4B · set-off → return_filings.offset_plan · ledger effects → N9 rows per TECHNICAL §5.4.

5.6 Table 12 / Table 13 (Section B10/B11)

T12 → group document_lines by (hsn, uqc, rate) × B2B/B2C tabs — nothing stored. T13 → detection derived; the only USER field (cancelled) persisted in return_filings.table13.

5.7 IMS (Section C) & ledgers (Section E)

IMS genuine-USER trio → N5 exactly; deemed acceptance = absence of a row, counted in N7 by_silence. Ledger mutation matrix (E9) rows in scope → ledger_entries with the listed source_types; cash 20-bucket → head × minor_head.

6. Final SQL

Use the 003_returns_refunds_ledgers.sql from TECHNICAL.md §2.2 with these four amendments (already reflected in §3 above):

sql
-- (a) documents: two added columns
alter table documents add column inward_supply_type text not null default 'REGISTERED';
alter table documents add column gstr2b_period char(6);

-- (b) return_filings: replace table13_confirmed with the richer jsonb
alter table return_filings drop column table13_confirmed;
alter table return_filings add column table13 jsonb;   -- {series:[...], confirmed:bool}
alter table return_filings add column offset_plan jsonb;

-- (c) NEW: IRP registry
create table irp_einvoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  irn text not null unique,
  irn_date date not null,
  period char(6) not null,
  payload jsonb not null,
  imported_document_id uuid references documents(id)
);
alter table irp_einvoices enable row level security;

-- (d) NEW: annual returns (thin GSTR-9)
create table annual_returns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  fy text not null,
  computed jsonb not null default '{}',
  table9_tax_payable_edit numeric(15,2),
  red_flag boolean not null default false,
  filed_simulated_at timestamptz,
  unique (user_id, fy)
);
alter table annual_returns enable row level security;

(If writing 003 fresh, fold (a)–(d) in directly rather than altering.)

7. Checklist the schema must pass (run before building UI)
 Every field on every screen in user-flow-complete.html resolves to a column in §3 or a derivation in §5 — no orphan UI fields.
 Every Annexure-B column 1–21 renders from §5.1 with real seed data (Meridian July).
 sum(ledger_entries) per head reproduces the seeded balances in TECHNICAL §3 to the rupee.
 Unit test asserts computation.max_refund = 1797211 from seed rows alone.
 No table stores a balance, a Table-12 row, a Statement-1A row, or an Annexure-B row.
 RLS enabled on all 15 new tables, zero browser policies (matches 002).
