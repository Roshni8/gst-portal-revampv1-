TECHNICAL — GST Flow Prototype
Audience: the coding agent. This document is the single source of truth for schema, seed numbers, API contracts, and computation rules. PRD.md defines what; this defines how. Where a number here differs from any earlier mockup, THIS number wins.


0. Stack & existing state
Frontend/backend: Next.js (App Router assumed; keep whatever the repo uses), TypeScript.
DB/Auth: Supabase. Existing migrations 001_create_users.sql, 002_create_taxpayer_master.sql create: users, taxpayer_profiles, taxpayer_places_of_business, taxpayer_authorised_signatories, taxpayer_bank_accounts, taxpayer_derived_attributes, taxpayer_filing_history, taxpayer_hsn_sac_codes.
Access pattern (reuse everywhere, do not invent a new one): browser calls /api/* with Authorization: Bearer <supabase access token> → route validates the token server-side → queries with the service-role client scoped by the resolved user_id. RLS enabled on all tables, no browser policies. Mask nothing new beyond what profile already masks.
Libraries to add: xlsx (SheetJS) for template generation/parsing and ledger export. Nothing else new.


1. Architecture overview
Browser (Next.js pages)

   │  fetch /api/* with Bearer token

   ▼

API routes (server) ── validate token ── resolve user_id

   │                                    │

   ▼                                    ▼

Domain modules (pure TS, unit-testable)         Supabase (service role)

   ├─ routing.ts        GSTR-1 category router

   ├─ validation.ts     Excel/JSON row rules

   ├─ table12.ts        HSN summary derivation

   ├─ table13.ts        series detection

   ├─ gstr2b.ts         snapshot builder

   ├─ gstr3b.ts         auto-population + set-off (Rule 88A)

   ├─ ledger.ts         THE ONLY writer of ledger_entries

   └─ refund.ts         classification suggestions, inversion evidence,

                        Rule 89(5) amended formula, ceilings, head-wise debit,

                        ARN state machine

Hard rule: every ledger mutation in the entire app goes through ledger.ts (one function postLedgerEntries(entries[])). Every rupee shown in the UI is either a stored seed value or the output of one of these modules. No arithmetic in React components beyond formatting.

Demo clock: all "today" logic uses DEMO_TODAY = 2026-08-12 from lib/constants.ts (overridable by env DEMO_TODAY). Never call new Date() for business logic.


2. Database design (migration 003_returns_refunds_ledgers.sql)
2.1 ER diagram
users 1──1 taxpayer_profiles (existing)

users 1──* upload_batches 1──* documents 1──* document_lines

users 1──* documents            (direction: OUTWARD | INWARD)

documents(INWARD) 1──0..1 ims_actions

users 1──* gstr2b_snapshots     (per period)

users 1──* return_filings       (GSTR1 | GSTR3B | GSTR9 per period)

users 1──* payments

users 1──* ledger_entries       (CASH | CREDIT | LIABILITY)

users 1──* refund_applications 1──* refund_line_classifications ──> documents

                              1──* refund_inversion_decisions

                              1──* refund_status_events

hsn_rate_history                (global reference, no user_id)
2.2 Full SQL
-- ============ 003_returns_refunds_ledgers.sql ============

create extension if not exists "pgcrypto";

-- enums

create type doc_direction   as enum ('OUTWARD','INWARD');

create type doc_type        as enum ('INV','CN','DN');

create type supply_type_e   as enum ('REGULAR','SEZ_WP','SEZ_WOUT','DEEMED_EXPORT',

                                     'EXPORT_WP','EXPORT_WOUT','NIL','EXEMPT','NON_GST');

create type gstr1_category  as enum ('B2B','B2B_RC','B2CL','B2CS','EXP','NIL_EXEMPT',

                                     'CDNR','CDNUR','B2BA','CDNRA','AT','ATADJ');

create type doc_status_e    as enum ('STAGED','COMMITTED','FILED','LOCKED');

create type doc_source_e    as enum ('EXCEL','JSON','EINVOICE','SEED');

create type ims_action_e    as enum ('ACCEPT','REJECT','PENDING');

create type return_type_e   as enum ('GSTR1','GSTR3B','GSTR9');

create type filing_status_e as enum ('NOT_STARTED','IN_PROGRESS','FILED','NIL_FILED');

create type ledger_e        as enum ('CASH','CREDIT','LIABILITY');

create type minor_head_e    as enum ('TAX','INTEREST','PENALTY','FEE','OTHERS');

create type ledger_source_e as enum ('OPENING','CHALLAN','GSTR3B','RFD01','RFD03_RECREDIT',

                                     'PMT03_RECREDIT','SEED');

create type itc_category_e  as enum ('INPUTS','INPUT_SERVICES','CAPITAL_GOODS');

create type ynp_e           as enum ('YES','NO','PARTIAL');

create type refund_status_e as enum ('DRAFT','SUBMITTED','ACKNOWLEDGED','DEFICIENT',

                                     'PROVISIONAL','SCN','SANCTIONED','PAYMENT_ORDERED',

                                     'DISBURSED','REJECTED','WITHDRAWN');

create type inv_verdict_e   as enum ('LIKELY_STRUCTURAL','LIKELY_TEMPORAL','NOT_INVERTED');

create type inv_decision_e  as enum ('PENDING','CONFIRMED','EXCLUDED');

-- 1) upload batches -------------------------------------------------

create table upload_batches (

  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references users(id),

  period char(6) not null,                       -- 'MMYYYY'

  source doc_source_e not null default 'EXCEL',

  filename text,

  rows_read int not null default 0,

  invoices_created int not null default 0,

  error_rows jsonb not null default '[]',        -- [{row, field, problem, fix}]

  status text not null default 'VALIDATED',      -- VALIDATED | COMMITTED | REPLACED

  created_at timestamptz not null default now()

);

-- 2) documents ------------------------------------------------------

create table documents (

  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references users(id),

  period char(6) not null,

  direction doc_direction not null,

  doc_type doc_type not null,

  supply_type supply_type_e not null default 'REGULAR',

  is_amendment boolean not null default false,

  original_period char(6),

  original_doc_no text, original_doc_date date,  -- amendment target OR CN/DN original invoice

  doc_no text not null,

  doc_date date not null,

  value numeric(15,2) not null,

  supplier_gstin text not null,

  supplier_name text,

  recipient_gstin text,                          -- null = B2C

  recipient_name text,

  pos char(2) not null,

  reverse_charge boolean not null default false,

  note_type char(1),                             -- 'C' | 'D'

  reason_for_note text,

  port_code text, shipping_bill_no text, shipping_bill_date date,

  nil_details jsonb,                             -- {nil_rated, exempted, non_gst, inter_intra, reg_unreg}

  category gstr1_category,                       -- assigned by router (OUTWARD only)

  category_reason text,

  category_overridden boolean not null default false,

  irn text, irn_date date, irn_severed boolean not null default false,

  utp_delta_note text,

  source doc_source_e not null default 'SEED',

  status doc_status_e not null default 'COMMITTED',

  matched_in_books boolean,                      -- INWARD only; false = "not in your books"

  upload_batch_id uuid references upload_batches(id),

  validation_errors jsonb not null default '[]',

  locked_by_refund uuid,                         -- set when Statement 1A locks it

  created_at timestamptz not null default now(),

  unique (user_id, doc_no, doc_type, period)

);

create index on documents (user_id, period, direction);

create index on documents (user_id, period, category);

create table document_lines (

  id uuid primary key default gen_random_uuid(),

  document_id uuid not null references documents(id) on delete cascade,

  line_no int not null,

  hsn text,                                      -- null only for B2CS-consolidated & advances

  uqc text, quantity numeric(15,3),

  rate numeric(5,2) not null,

  taxable_value numeric(15,2) not null,

  igst numeric(15,2) not null default 0,

  cgst numeric(15,2) not null default 0,

  sgst numeric(15,2) not null default 0,

  cess numeric(15,2) not null default 0

);

create index on document_lines (document_id);

-- 3) IMS ------------------------------------------------------------

create table ims_actions (

  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references users(id),

  document_id uuid not null references documents(id),

  action ims_action_e not null,

  remark text,

  itc_reduce boolean, reduce_amount numeric(15,2),

  acted_at timestamptz not null default now(),

  unique (user_id, document_id)

);

create table gstr2b_snapshots (

  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references users(id),

  period char(6) not null,

  generated_at timestamptz not null default now(),

  itc_available jsonb not null,     -- {total:{igst,cgst,sgst,cess}, by_user:n, by_silence:n, doc_ids:[]}

  itc_rejected jsonb not null,

  itc_pending jsonb not null,

  unique (user_id, period)

);

-- 4) filings & payments ---------------------------------------------

create table return_filings (

  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references users(id),

  return_type return_type_e not null,

  period char(6) not null,                       -- GSTR9: '2025-26' stored as 'FY2526'

  status filing_status_e not null default 'NOT_STARTED',

  due_date date not null,

  arn text, filed_at timestamptz,

  table13_confirmed boolean not null default false,

  offset_done boolean not null default false,    -- GSTR3B only

  summary jsonb not null default '{}',           -- cached headline numbers for lists

  unique (user_id, return_type, period)

);

create table payments (

  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references users(id),

  period char(6) not null,

  amount numeric(15,2) not null,

  mode text not null default 'CASH_LEDGER',

  challan_ref text,

  paid_at timestamptz not null default now()

);

-- 5) ledgers ---------------------------------------------------------

create table ledger_entries (

  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references users(id),

  ledger ledger_e not null,

  txn_date date not null,

  description text not null,                     -- plain words, shown verbatim in UI

  source_type ledger_source_e not null,

  source_ref text,                               -- ARN / period / challan no — used for the UI link

  minor_head minor_head_e,                       -- CASH only; null elsewhere

  igst numeric(15,2) not null default 0,         -- SIGNED: + credit into ledger, − debit out

  cgst numeric(15,2) not null default 0,

  sgst numeric(15,2) not null default 0,

  cess numeric(15,2) not null default 0,

  created_at timestamptz not null default now()

);

create index on ledger_entries (user_id, ledger, txn_date);

-- Balances are ALWAYS sum() over entries. Never store a balance.

-- 6) refunds ----------------------------------------------------------

create table refund_applications (

  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references users(id),

  arn text unique,

  category text not null default 'IDS',

  from_period char(6) not null, to_period char(6) not null,

  status refund_status_e not null default 'DRAFT',

  computation jsonb not null default '{}',       -- full working, see §6.7 shape

  adjusted_tt_confirmed boolean not null default false,

  category_confirmed boolean not null default false,

  bank_account_id uuid,

  created_at timestamptz not null default now(),

  filed_at timestamptz

);

create table refund_line_classifications (

  id uuid primary key default gen_random_uuid(),

  refund_id uuid not null references refund_applications(id) on delete cascade,

  document_id uuid not null references documents(id),

  suggested itc_category_e not null,

  suggestion_reason text not null,

  category itc_category_e not null,              -- starts = suggested; user may override

  auto_locked boolean not null default false,    -- true for SAC-detected services

  blocked_17_5 ynp_e not null default 'NO',

  eligible ynp_e not null default 'YES',

  eligible_itc numeric(15,2) not null default 0,

  ineligible_itc numeric(15,2) not null default 0,

  confirmed boolean not null default false,

  unique (refund_id, document_id)

);

create table refund_inversion_decisions (

  id uuid primary key default gen_random_uuid(),

  refund_id uuid not null references refund_applications(id) on delete cascade,

  output_hsn text not null,

  evidence jsonb not null,   -- {output_rate, input_hsns:[{hsn,rate}], same_hsn_both_sides,

                             --  rate_change:{changed, on, from, to, notification}, turnover, tax}

  verdict inv_verdict_e not null,

  decision inv_decision_e not null default 'PENDING',

  decided_at timestamptz,

  unique (refund_id, output_hsn)

);

create table refund_status_events (

  id uuid primary key default gen_random_uuid(),

  refund_id uuid not null references refund_applications(id) on delete cascade,

  status refund_status_e not null,

  form text,                                     -- 'RFD-02' … 'RFD-05'

  note text,

  ledger_effect jsonb,                           -- copy of entries posted, for the timeline

  event_at timestamptz not null default now()

);

-- 7) reference --------------------------------------------------------

create table hsn_rate_history (

  hsn text not null,

  rate numeric(5,2) not null,

  effective_from date not null,

  notification text,

  primary key (hsn, effective_from)

);

-- RLS: enable on all, browser policies: none (service role only) — same as 002

alter table upload_batches enable row level security;

alter table documents enable row level security;

alter table document_lines enable row level security;

alter table ims_actions enable row level security;

alter table gstr2b_snapshots enable row level security;

alter table return_filings enable row level security;

alter table payments enable row level security;

alter table ledger_entries enable row level security;

alter table refund_applications enable row level security;

alter table refund_line_classifications enable row level security;

alter table refund_inversion_decisions enable row level security;

alter table refund_status_events enable row level security;

alter table hsn_rate_history enable row level security;
2.3 Design notes (why it's shaped this way)
One documents table, both directions. Direction is data, not schema — mirrors the real system where the GSTIN role decides sale vs purchase. Every downstream feature (GSTR-1 categories, IMS, 2B, Annexure B) is a filtered view of this one table. That's the anti-RE-ASKED thesis in the schema itself.
Line-level document_lines. This is what lets Table 12, the refund invoice split, and the inversion detector be lookups instead of user arithmetic.
Signed amounts in ledger_entries, computed balances. One insert function, sum for balance, trivially auditable in the demo ("every rupee is a row").
return_filings supersedes taxpayer_filing_history as the operational table. Do not delete the old table; backfill it once from seed and point the profile's filing tab at return_filings.
All refund working stored in computation jsonb so R5's "show working" and R6's statement render from one stored object — recompute on every step change, persist on advance.


3. Seed data (canonical numbers)
Seeds ship as migrations 004_seed_reference.sql (rate history) + provisioner extension (per-user, JSON-driven, same pattern as /api/profile/demo). Store the per-user seed JSON in lib/seed/aarohan.ts, lib/seed/meridian.ts.
3.1 Reference: hsn_rate_history
hsn
rate
effective_from
notification
481910
18
2017-07-01
—
481910
5
2025-09-22
9/2025-CT(Rate)
481920
18
2017-07-01
—
481920
5
2025-09-22
9/2025-CT(Rate)
482390
18
2017-07-01
—
482390
5
2025-09-22
9/2025-CT(Rate)
482110
18
2017-07-01
—
392329
18
2017-07-01
—
4804 / 4808 / 4810 / 3215 / 3506
18
2017-07-01
— (one row each)
8441
18
2017-07-01
—

3.2 Meridian Packaging (refund user) — 27AAFCM0000K1Z5
Profile: Maharashtra, Pvt Ltd, AATO ₹42 crore (hardcoded), Aadhaar-authenticated, 2 bank accounts.

Filings: return_filings FILED for GSTR1 + GSTR3B for 042026–072026 (dates: 1 → 11th following month, 3B → 20th; July 3B filed 20-08? No — DEMO_TODAY is 12-08. Seed July GSTR-1 FILED 11-08-2026 and July GSTR-3B FILED 12-08-2026 (early filing is legal and the refund pre-check requires it). Apr–Jun all filed on due dates.

July outward documents (5, one per SKU, INV, REGULAR, B2B):

doc_no
HSN
rate
taxable
tax
MPP/26-27/0101
481910
5
1,80,00,000
9,00,000
MPP/26-27/0102
481920
5
70,00,000
3,50,000
MPP/26-27/0103
482390
5
30,00,000
1,50,000
MPP/26-27/0104
482110
18
45,00,000
8,10,000
MPP/26-27/0105
392329
18
25,00,000
4,50,000
Totals




3,50,00,000
26,60,000


July inward documents (10):

doc_no
supplier
HSN/SAC
ITC (₹)
note
KM/26-27/1182
Kraft Mills
4804
18,00,000
inputs
CB/26-27/0441
Corru Boards
4808
9,00,000
inputs
CP/26-27/0312
CoatPap
4810
6,30,000
inputs
INK/26-27/0088
InkChem
3215
2,00,000
inputs
ADH/26-27/0170
BondFix
3506
1,78,000
inputs
Inputs subtotal




37,08,000
= Net ITC
FRT/26-27/0551
RoadStar Logistics
996511
3,00,000
input services
RENT/26-27/07
MIDC Estates
997212
2,50,000
input services
AUD/26-27/031
S&K Associates
998222
1,16,000
input services
Services subtotal




6,66,000
excluded from Net ITC
LEG/26-27/009
(advocate, RCM)
998212
66,000
RCM service, reverse_charge=true
MACH/26-27/002
PaperTech Machines
8441
2,50,000
capital goods flag demo


ITC availed on inputs + input services (formula denominator) = 37,08,000 + 6,66,000 + 66,000 = 44,40,000. The 8441 capital invoice is excluded from both formula terms — it exists purely for the R3 flag.

Ledger seed (CREDIT): OPENING entries so that: balance at end of July period (after July 3B) = ₹58,40,000, balance "now" (DEMO_TODAY) = ₹58,40,000 (nothing spent since). Head split: IGST 12,00,000 · CGST 23,20,000 · SGST 23,20,000 · Cess 0. (Formula max 17,97,211 < both balances < is the binding figure — required.) CASH: ₹3,10,000 under TAX heads + ₹12,000 under CGST/FEE (misplaced-cash story). LIABILITY: nil outstanding.

Refund expectation (assert in a seed test): amended-formula max = ₹17,97,211; refundable = 17,97,211; head-wise debit (Case 2): IGST 12,00,000 → remainder 5,97,211 split CGST 2,98,606 + SGST 2,98,605 (put the odd rupee on CGST).
3.3 Aarohan Systems (filing user) — 29AAHCA3412R1Z5
Profile: exists. Add AATO ₹38 crore hardcoded.

Months Apr–Jun 2026: GSTR1 + GSTR3B FILED on due dates; payments rows: Apr ₹1,42,000 · May ₹1,58,500 · Jun ₹1,36,200; matching ledger entries (challan credit → 3B cash debit) so cash closing before July = ₹2,20,000; credit closing = ₹6,80,000 (IGST 2,00,000 / CGST 2,40,000 / SGST 2,40,000).

July sample upload batch (this is what Use sample data loads; also the downloadable filled example): 24 outward documents + lines whose category routing yields EXACTLY the approved Returns-page table:

category
docs
taxable
tax
B2B
15
2,88,50,000
21,78,350
B2B_RC
1
50,000
9,000
B2CL
1
1,50,000
7,500
B2CS (consolidated)
—
1,00,000
5,000
EXP
1
4,50,000
22,500
NIL_EXEMPT
1
50,000
0
CDNR
2
−1,15,000
−5,750
CDNUR
1
−15,000
−750
B2BA
1
5,00,000
25,000
CDNRA
1
20,000
1,000
AT/ATADJ
0
—
—
Total
24
2,99,90,000
22,41,850


Generate invoice lines freely to hit these subtotals (2–3 HSNs from Aarohan's seeded taxpayer_hsn_sac_codes; number series AAR/26-27/0001…0024). One deliberate error row in the sample file: an export invoice missing port_code (drives F4/F5 demo). Six of the B2B invoices carry IRNs (for F7: seeded as "available on IRP", imported or matched on upload).

July inward (IMS) documents (42): 32 matched_in_books=true untouched (bulk-accept targets), 1 obviously wrong (duplicate number, reject demo), 9 untouched "pending-review" rows with ITC totalling ₹4,32,100, of which 2 have matched_in_books=false. One of the 42 is a credit note (CN-rejection warning demo). RCM inward: 1 legal-services invoice, tax ₹9,000 → July 3B cash need = ₹9,000.

July state at login: GSTR-1 NOT filed, no batch committed (the demo starts clean at upload). IMS untouched. 3B NOT_STARTED.
3.4 Provisioner
POST /api/demo/provision (auth required): looks up which seed JSON matches the user's email (aarohan@…, meridian@…, else clean), inserts profile + all seed rows in one transaction if taxpayer_profiles absent. Idempotent. Login page calls it after sign-in (same as the existing profile provisioner — extend, don't duplicate).


4. API routes (all bearer-authenticated; all responses { ok, data | error })
Method & path
Purpose
GET /api/dashboard
to-dos, money boxes, due dates (one aggregate call)
GET /api/returns?fy=&period=
period card + all-categories table
GET /api/template/gstr1
xlsx template download
POST /api/returns/gstr1/:period/upload
multipart xlsx/JSON → batch + staged docs + report
POST /api/returns/gstr1/:period/sample
load seeded sample batch (Use sample data)
GET /api/returns/gstr1/:period/review
error rows + grouped staged invoices
POST /api/returns/gstr1/:period/review
{fixes:[], overrides:[]} revalidate/reassign
POST /api/returns/gstr1/:period/commit
STAGED → COMMITTED
POST /api/returns/gstr1/:period/import-einvoice
pull IRP-seeded docs (idempotent)
PATCH /api/documents/:id
pre-filing edit; severs IRN when source=EINVOICE (or refuses in UTP mode)
GET /api/returns/gstr1/:period
workspace: categories, table12, table13, filing state
POST /api/returns/gstr1/:period/table13/confirm
{cancelled}
POST /api/returns/gstr1/:period/file
file (checks: no errors, t13 confirmed) → ARN
POST /api/returns/gstr1/:period/nil
nil filing (checks: zero committed docs)
GET /api/ims?period=
banner numbers + invoice list + actions
POST /api/ims/actions
{document_id, action, remark?, itc_reduce?, reduce_amount?}
POST /api/ims/finalize?period=
build + store 2B snapshot
GET /api/returns/gstr3b/:period
blocked-state or pre-filled tables + payment plan
POST /api/returns/gstr3b/:period/offset
once-only; body = optional set-off overrides
POST /api/returns/gstr3b/:period/file
file → ledger mutations + payment row
GET /api/ledgers/:type
entries + computed balances (type = cash
GET /api/ledgers/:type/export
xlsx of visible statement
GET /api/refunds
claimable card + list
POST /api/refunds
create DRAFT {from_period,to_period}
GET /api/refunds/:id/prechecks
checks + limitation countdown
GET/POST /api/refunds/:id/classify
suggestions / user confirmations & overrides
GET/POST /api/refunds/:id/inversion
evidence cards / decisions
GET/POST /api/refunds/:id/compute
full working / {adjusted_tt_confirmed, net_itc_override?}
POST /api/refunds/:id/file
validations → SUBMITTED, ARN, ledger debit, invoice lock
GET /api/refunds/:id
tracker: status events, clocks, computation
POST /api/refunds/:id/officer
`{action: ACK
GET /api/annual
thin GSTR-9 aggregates; POST /api/annual/table9 persists the red-cell edit
GET /api/payments
dummy payments list


Contract example — POST /api/returns/gstr1/072026/upload response:

{ "ok": true, "data": {

  "batch_id": "…", "rows_read": 31, "invoices_created": 24,

  "errors": [ { "row": 12, "doc_no": "AAR/26-27/0017", "field": "port_code",

                "problem": "Export invoice has no port code",

                "fix": "Pick the port from the list on the review screen" } ]

}}


5. Backend flows (guided)
5.1 Excel/JSON upload pipeline
xlsx file ──SheetJS──► raw rows

  │  group rows by doc_no (multi-line invoices)

  ▼

validation.ts  per-row rules (§6.2) ──fail──► error_rows[] (row, field, problem, fix)

  │ pass

  ▼

routing.ts  assign gstr1_category + category_reason (§6.3)

  ▼

insert upload_batches + documents(status=STAGED) + document_lines

  ▼

REVIEW screen: fixes revalidate row → clears validation_errors

               overrides set category + category_overridden

  ▼

COMMIT: all error-free → status=COMMITTED  (batch COMMITTED)

Re-upload before commit ⇒ old batch REPLACED, its STAGED docs deleted.
5.2 GSTR-1 filing
file request

  ├─ guard: no docs with validation_errors ≠ []      → 422 with reasons[]

  ├─ guard: table13_confirmed = true                  → 422

  ▼

tx: documents COMMITTED→FILED · return_filings{status:FILED, arn:'AA29'+period+seq,

    filed_at, summary:{docs,taxable,tax}} · IMS banner recount

No ledger effect (GSTR-1 never moves money — say so in the confirmation copy).
5.3 IMS → GSTR-2B
finalize(period)

  for each INWARD doc of period:

    action row?  ACCEPT → available     REJECT → rejected     PENDING → pending

    no action    → available (deemed)   count separately as by_silence

  RCM docs bypass IMS entirely → always available (flag rcm:true)

  store gstr2b_snapshots (unique per period; re-finalize replaces)

Guard: after 3B filed → 409 "IMS window closed for {period}".
5.4 GSTR-3B prepare → offset → file (the ledger moment)
prepare:

  3.1a = Σ outward REGULAR/B2CL/B2CS taxable&tax  − CDN (floor at 0, note if floored)

  3.1c = Σ NIL_EXEMPT               3.1d = Σ inward RCM tax

  4A   = 2B snapshot itc_available totals          4C = 4A − 4B(=0)

offset (once): plan = rule88A(liability, credit)   cash_needed = 3.1d + shortfall

file (single tx) → ledger.ts posts, dated DEMO_TODAY, source GSTR3B/{period}:

  CREDIT  + 4C                       "ITC for {month} credited"

  CREDIT  − itc_used (per head)      "Used to pay {month} tax"

  CASH    − cash_used (TAX heads)    "Cash paid for {month} (incl. RCM ₹…)"

  LIABILITY + liability then − same  "Created by GSTR-3B" / "Discharged"

  payments row (cash amount) · return_filings FILED (arn, summary)
5.5 Refund pipeline (R2→R7)
create DRAFT

R2 prechecks: all due return_filings FILED? · 3B(period) FILED?

   limitation: relevant_date = 3B due date of period; deadline = +2y; days_left vs DEMO_TODAY

R3 classify: build refund_line_classifications for INWARD docs of period

   SAC 99xxxx → INPUT_SERVICES (auto_locked)          reason "service code"

   HSN ch 84/85 → suggest CAPITAL_GOODS               reason "machinery chapter"

   17(5) pattern HSNs → suggest blocked=YES → eligible=NO, ineligible=totalItc (auto)

   else INPUTS, eligible_itc = line tax sum

R4 inversion: for each OUTWARD hsn with output_rate < max(input rates):

   evidence = input hsns/rates · same_hsn_both_sides · hsn_rate_history change lookup

   verdict: same-hsn + rate-change → LIKELY_TEMPORAL else LIKELY_STRUCTURAL

   (Meridian seed ⇒ three LIKELY_STRUCTURAL cards; `?demo=temporal` renders a synthetic

    example card CLIENT-SIDE ONLY — it must never write a decision row)

R5 compute (recompute on every entry; persist to computation jsonb):  §6.7

R6 file guards: all classifications confirmed · all inversion cards decided ·

   adjusted_tt_confirmed · category_confirmed · bank chosen · ≥1 CONFIRMED card

   tx: status SUBMITTED · arn 'AB27'+period+seq · status_event(Filed) ·

       CREDIT ledger − head-wise debit (§6.7d) src RFD01/{arn} ·

       INWARD docs of the claim → status LOCKED, locked_by_refund

R7 officer actions → state machine §7.2; DEFICIENCY & REJECT post re-credit

   (RFD03_RECREDIT / PMT03_RECREDIT) and unlock docs (deficiency & withdrawal only).


6. Computation reference (implement in the named modules; unit-test each)
6.1 Periods & due dates
period = 'MMYYYY'. GSTR-1 due = 11th of next month; GSTR-3B due = 20th of next month. DEMO_TODAY = 2026-08-12.
6.2 Row validation (Excel & JSON — same rules)
doc_type ∈ {INV, CN, DN, ADVANCE, ADVANCE_ADJ}; supply_type ∈ enum; unknown value → error naming the allowed list.
doc_no ≤ 16 chars; doc_date within the selected period, not future vs DEMO_TODAY.
GSTIN: 15 chars, state code 01–38/96/97/99 prefix rule relaxed to "15 characters, starts with 2 digits".
HSN: 4/6/8 digits (mandatory on lines except B2CS-consolidated & advances).
Tax head exclusivity: (igst>0) XOR (cgst>0 ∧ sgst>0); cgst must equal sgst; inter/intra consistency: pos ≠ supplier state ⇒ IGST, else CGST+SGST.
CN/DN: original_invoice_number/date required. Amendments: original_period/doc_no/date required.
EXPORT_*: port_code, shipping_bill_no/date required (the seeded sample omits port_code once, deliberately).
Line sum vs invoice value: warn (not block) if |Σ(taxable+tax) − value| > ₹10.
6.3 GSTR-1 category router (port the uploaded schema's _routing_logic verbatim)
Order: ADVANCE→AT · ADVANCE_ADJ→ATADJ · supply NIL/EXEMPT/NON_GST→NIL_EXEMPT · CN/DN: amendment? (CDNRA) : GSTIN? CDNR : CDNUR · INV amendment: GSTIN? B2BA : (B2CLA→fold into B2BA row set) · INV EXPORT_*→EXP · INV+GSTIN: reverse_charge? B2B_RC : B2B · INV no GSTIN: inter_state ∧ value > B2CL_THRESHOLD(₹1,00,000, config constant) → B2CL else B2CS. inter_state = (supplier GSTIN[0:2] ≠ pos). B2CS is stored per-invoice but displayed and filed consolidated by (pos, rate).
6.4 Table 12 & Table 13
T12: group committed OUTWARD lines by (hsn, uqc, rate) into B2B tab (recipient_gstin present) and B2C tab (absent); sums of qty/taxable/tax heads; CN/DN lines subtract.
T13: strip trailing digits of each doc_no → (prefix, number); one series per prefix: from=min, to=max, total=count, cancelled=user input, net=total−cancelled.
6.5 GSTR-2B build — §5.3. Store per-doc ids per section for drill-down.
6.6 Rule 88A set-off order
IGST credit → IGST liability, then remaining IGST credit → CGST then SGST; CGST credit → CGST then IGST; SGST credit → SGST then IGST; never CGST↔SGST. RCM (3.1d) cash only. Return the plan as {per_head:{liability, from_credit:{...}, from_cash}}.
6.7 Refund computation (AMENDED Rule 89(5) — mandatory)
inverted_turnover  = Σ taxable of OUTWARD lines whose hsn ∈ CONFIRMED inversion cards

tax_on_inverted    = Σ tax of those lines

adjusted_tt        = Σ taxable of ALL outward lines of period   (exclusions: none for seed;

                     render the empty exclusion list explicitly)

net_itc            = Σ eligible_itc of classifications with category=INPUTS ∧ eligible≠NO

itc_inputs_svcs    = net_itc + Σ eligible_itc of INPUT_SERVICES (incl. RCM)   -- 44,40,000

max_refund = round( inverted_turnover × net_itc / adjusted_tt

                  − tax_on_inverted × net_itc / itc_inputs_svcs )

           -- Meridian: 2,80,00,000×37,08,000/3,50,00,000 = 29,66,400

           --           14,00,000×37,08,000/44,40,000    = 11,69,189

           --           max_refund = 17,97,211  ✔ assert in a unit test

refundable = min(max_refund, credit_balance_at_period_end, credit_balance_now, net_itc)

(d) Head-wise debit: IGST first up to its balance → remainder split equally CGST/SGST (odd rupee → CGST) → shortfall in one cascades to the other → Cess only vs Cess. Non-editable. computation jsonb shape: store every intermediate above plus {lines_included:[], exclusions:[], binding_ceiling:'FORMULA|PERIOD_END|NOW|NET_ITC', headwise:{igst,cgst,sgst,cess}}.
6.8 Limitation
relevant_date = gstr3b_due(period); deadline = relevant_date + 2 years; countdown vs DEMO_TODAY. Warn at <90 days (amber) and past (red). Never block.


7. State machines
7.1 Return filing
NOT_STARTED → IN_PROGRESS (first batch/commit) → FILED | NIL_FILED — terminal; every mutating route guards on it.
7.2 Refund ARN
DRAFT →(file)→ SUBMITTED →(ACK)→ ACKNOWLEDGED →(PROVISIONAL)→ PROVISIONAL

SUBMITTED|ACKNOWLEDGED →(DEFICIENCY)→ DEFICIENT   [re-credit + unlock + note "file fresh"]

ACKNOWLEDGED|PROVISIONAL →(SCN)→ SCN →(SANCTION|REJECT)

ACKNOWLEDGED|PROVISIONAL|SCN →(SANCTION)→ SANCTIONED →(PAYMENT)→ PAYMENT_ORDERED → DISBURSED

any of SUBMITTED|ACKNOWLEDGED|PROVISIONAL →(withdraw – P2)→ WITHDRAWN [re-credit + unlock]

(REJECT)→ REJECTED  [re-credit via PMT03_RECREDIT; do NOT unlock — one-line trap note in UI]

Clocks (display only): ACK due filed+15d · PROVISIONAL due ack+7d · final order 60d from filing; past 60 → interest line. Officer endpoint validates transitions against this table and refuses illegal ones with the allowed set.


8. Excel template spec (/api/template/gstr1)
Sheet Invoices, row 1 headers exactly: doc_type | supply_type | is_amendment | original_period | original_doc_no | original_doc_date | invoice_number | invoice_date | invoice_value | receiver_gstin | receiver_name | place_of_supply | reverse_charge | note_type | reason_for_note | original_invoice_number | original_invoice_date | port_code | shipping_bill_number | shipping_bill_date | line_no | hsn | uqc | quantity | rate | taxable_value | igst | cgst | sgst_utgst | cess Multi-line invoice = repeated invoice columns with incrementing line_no (parser groups by invoice_number). Data-validation dropdowns on doc_type / supply_type / note_type / reason_for_note / place_of_supply. Sheet Read me: one row per column — name, required?, format, example — plus 3 fully-worked example rows (a 2-line B2B, a B2CL, a CN). Generate with SheetJS at request time so the GSTIN/example names match the logged-in user.


9. Mocked-vs-real ledger (surface in UI per PRD honesty rule)
Real (computed from data): routing, Table 12/13, 2B build, 3B pre-fill, set-off, all ledger movements, entire refund computation, clocks. Simulated (labelled): DSC/EVC signing, ARN issuance, officer actions, disbursement, challan money. Not implemented (say so if asked): supplier-side CN liability write, interest/late fees, notices, other refund categories.
10. Build order
Migration 003 + seeds + provisioner + ledger.ts + unit tests for §6.3, §6.6, §6.7 (assert 17,97,211).
Shell/nav (F1) → Returns hub (F3) → upload/review/workspace/file (F4–F6).
IMS (F8) → 3B (F9) → Ledgers (F10). Milestone: demo script A runs.
Refund R1–R7 + officer panel (F11, F14). Milestone: demo script B runs.
Dashboard wiring polish (F2 is thin once APIs exist) → Annual (F12) → e-invoice/UTP (F7) → F13/F15. Run both demo scripts on a fresh DB before calling anything done.

