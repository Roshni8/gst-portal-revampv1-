-- ============================================================================
-- 003_returns_refunds_ledgers.sql  — FINAL (supersedes all prior versions of
-- this migration in TECHNICAL.md §2.2 and DATABASE.md §6; run THIS file).
-- Fixes applied per agent review:
--   (a) every user FK references auth.users(id) — matching 002's profile tables;
--       the legacy public "users" table is NOT referenced by anything new.
--   (b) doc_type enum includes ADVANCE and ADVANCE_ADJ (router steps 1–2 / AT / ATADJ).
--   (c) DATABASE.md §6 amendments folded in directly: documents.inward_supply_type,
--       documents.gstr2b_period, return_filings.table13 jsonb + offset_plan,
--       irp_einvoices, annual_returns.
--   (d) demo_seed_state added for the versioned provisioner (AGENT-FIXES.md §5).
-- ============================================================================
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- enums
create type doc_direction   as enum ('OUTWARD','INWARD');
create type doc_type        as enum ('INV','CN','DN','ADVANCE','ADVANCE_ADJ');
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

-- ---------------------------------------------------------------- N1 upload_batches
create table upload_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period char(6) not null,
  source doc_source_e not null default 'EXCEL',
  filename text,
  rows_read int not null default 0,
  invoices_created int not null default 0,
  error_rows jsonb not null default '[]',
  status text not null default 'VALIDATED',           -- VALIDATED | COMMITTED | REPLACED
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- N2 documents
create table documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period char(6) not null,
  direction doc_direction not null,
  doc_type doc_type not null,
  supply_type supply_type_e not null default 'REGULAR',
  inward_supply_type text not null default 'REGISTERED',   -- Annexure B col 2
  is_amendment boolean not null default false,
  original_period char(6),
  original_doc_no text,
  original_doc_date date,
  doc_no text not null,
  doc_date date not null,
  value numeric(15,2) not null,
  supplier_gstin text not null,
  supplier_name text,
  recipient_gstin text,
  recipient_name text,
  pos char(2) not null,
  reverse_charge boolean not null default false,
  note_type char(1),
  reason_for_note text,
  original_advance_ref text,                                -- ADVANCE_ADJ → its ADVANCE doc
  port_code text,
  shipping_bill_no text,
  shipping_bill_date date,
  nil_details jsonb,
  category gstr1_category,
  category_reason text,
  category_overridden boolean not null default false,
  irn text,
  irn_date date,
  irn_severed boolean not null default false,
  utp_delta_note text,
  source doc_source_e not null default 'SEED',
  status doc_status_e not null default 'COMMITTED',
  matched_in_books boolean,                                 -- INWARD only
  gstr2b_period char(6),                                    -- Annexure B col 21
  upload_batch_id uuid references upload_batches(id),
  validation_errors jsonb not null default '[]',
  locked_by_refund uuid,
  created_at timestamptz not null default now(),
  unique (user_id, doc_no, doc_type, period)
);
create index documents_user_period_dir_idx on documents (user_id, period, direction);
create index documents_user_period_cat_idx on documents (user_id, period, category);

-- ---------------------------------------------------------------- N3 document_lines
create table document_lines (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  line_no int not null,
  hsn text,
  uqc text,
  quantity numeric(15,3),
  rate numeric(5,2) not null,
  taxable_value numeric(15,2) not null,
  igst numeric(15,2) not null default 0,
  cgst numeric(15,2) not null default 0,
  sgst numeric(15,2) not null default 0,
  cess numeric(15,2) not null default 0
);
create index document_lines_doc_idx on document_lines (document_id);

-- ---------------------------------------------------------------- N4 irp_einvoices
create table irp_einvoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  irn text not null unique,
  irn_date date not null,
  period char(6) not null,
  payload jsonb not null,
  imported_document_id uuid references documents(id)
);
create index irp_einvoices_user_period_idx on irp_einvoices (user_id, period);

-- ---------------------------------------------------------------- N5 ims_actions
create table ims_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid not null references documents(id) on delete cascade,
  action ims_action_e not null,
  remark text,
  itc_reduce boolean,
  reduce_amount numeric(15,2),
  acted_at timestamptz not null default now(),
  unique (user_id, document_id)
);

-- ---------------------------------------------------------------- N6 return_filings
create table return_filings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  return_type return_type_e not null,
  period char(6) not null,                                  -- GSTR9: 'FY2526'
  status filing_status_e not null default 'NOT_STARTED',
  due_date date not null,
  arn text,
  filed_at timestamptz,
  table13 jsonb,                                            -- {series:[...], confirmed:bool}
  offset_done boolean not null default false,
  offset_plan jsonb,
  summary jsonb not null default '{}',
  unique (user_id, return_type, period)
);

-- ---------------------------------------------------------------- N7 gstr2b_snapshots
create table gstr2b_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period char(6) not null,
  generated_at timestamptz not null default now(),
  itc_available jsonb not null,
  itc_rejected jsonb not null,
  itc_pending jsonb not null,
  unique (user_id, period)
);

-- ---------------------------------------------------------------- N8 payments
create table payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period char(6) not null,
  amount numeric(15,2) not null,
  mode text not null default 'CASH_LEDGER',
  challan_ref text,
  paid_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- N9 ledger_entries
create table ledger_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ledger ledger_e not null,
  txn_date date not null,
  description text not null,
  source_type ledger_source_e not null,
  source_ref text,
  minor_head minor_head_e,                                  -- CASH only
  igst numeric(15,2) not null default 0,                    -- signed
  cgst numeric(15,2) not null default 0,
  sgst numeric(15,2) not null default 0,
  cess numeric(15,2) not null default 0,
  created_at timestamptz not null default now()
);
create index ledger_entries_user_idx on ledger_entries (user_id, ledger, txn_date);

-- ---------------------------------------------------------------- N10 refund_applications
create table refund_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  arn text unique,
  category text not null default 'IDS',
  from_period char(6) not null,
  to_period char(6) not null,
  status refund_status_e not null default 'DRAFT',
  computation jsonb not null default '{}',
  adjusted_tt_confirmed boolean not null default false,
  category_confirmed boolean not null default false,
  bank_account_id uuid,                                     -- → taxpayer_bank_accounts.id
  declarations jsonb,
  created_at timestamptz not null default now(),
  filed_at timestamptz
);

-- ---------------------------------------------------------------- N11 refund_line_classifications
create table refund_line_classifications (
  id uuid primary key default gen_random_uuid(),
  refund_id uuid not null references refund_applications(id) on delete cascade,
  document_id uuid not null references documents(id),
  suggested itc_category_e not null,
  suggestion_reason text not null,
  category itc_category_e not null,
  auto_locked boolean not null default false,
  blocked_17_5 ynp_e not null default 'NO',
  eligible ynp_e not null default 'YES',
  eligible_itc numeric(15,2) not null default 0,
  ineligible_itc numeric(15,2) not null default 0,
  confirmed boolean not null default false,
  unique (refund_id, document_id)
);

-- ---------------------------------------------------------------- N12 refund_inversion_decisions
create table refund_inversion_decisions (
  id uuid primary key default gen_random_uuid(),
  refund_id uuid not null references refund_applications(id) on delete cascade,
  output_hsn text not null,
  evidence jsonb not null,
  verdict inv_verdict_e not null,
  decision inv_decision_e not null default 'PENDING',
  decided_at timestamptz,
  unique (refund_id, output_hsn)
);

-- ---------------------------------------------------------------- N13 refund_status_events
create table refund_status_events (
  id uuid primary key default gen_random_uuid(),
  refund_id uuid not null references refund_applications(id) on delete cascade,
  status refund_status_e not null,
  form text,
  note text,
  ledger_effect jsonb,
  event_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- N14 annual_returns
create table annual_returns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fy text not null,
  computed jsonb not null default '{}',
  table9_tax_payable_edit numeric(15,2),
  red_flag boolean not null default false,
  filed_simulated_at timestamptz,
  unique (user_id, fy)
);

-- ---------------------------------------------------------------- N15 hsn_rate_history (global)
create table hsn_rate_history (
  hsn text not null,
  rate numeric(5,2) not null,
  effective_from date not null,
  notification text,
  primary key (hsn, effective_from)
);

-- ---------------------------------------------------------------- N16 demo_seed_state
-- Versioned provisioning: one row per demo user; provisioner compares
-- seed_version against SEED_VERSION in code and re-seeds on mismatch.
create table demo_seed_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  seed_name text not null,               -- 'aarohan' | 'meridian' | 'clean'
  seed_version int not null,
  applied_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- RLS
-- Same posture as 002: RLS on, ZERO browser policies; only the service-role
-- key (server-side API routes) reads/writes.
alter table upload_batches               enable row level security;
alter table documents                    enable row level security;
alter table document_lines               enable row level security;
alter table irp_einvoices                enable row level security;
alter table ims_actions                  enable row level security;
alter table return_filings               enable row level security;
alter table gstr2b_snapshots             enable row level security;
alter table payments                     enable row level security;
alter table ledger_entries               enable row level security;
alter table refund_applications          enable row level security;
alter table refund_line_classifications  enable row level security;
alter table refund_inversion_decisions   enable row level security;
alter table refund_status_events         enable row level security;
alter table annual_returns               enable row level security;
alter table hsn_rate_history             enable row level security;
alter table demo_seed_state              enable row level security;
