-- GSTR-1 outward-supplies data model (PostgreSQL / Supabase).
--
-- Design: invoice and line facts are stored once.  Table 12 is retained as a
-- preparer snapshot because the GST portal permits it to differ from the
-- invoice data (with a warning).  Derived summaries must be calculated from
-- document lines, rather than copied into another source-of-truth table.
--
-- This migration follows 001_create_users.sql and 002_create_taxpayer_master.sql.

create extension if not exists pgcrypto;

create type public.gstr1_return_status as enum (
  'DRAFT', 'IN_PROGRESS', 'READY_TO_FILE', 'FILED', 'NIL_FILED'
);

create type public.gstr1_document_bucket as enum (
  'B2B', 'B2B_REVERSE_CHARGE', 'B2B_SEZ_WITH_PAYMENT',
  'B2B_SEZ_WITHOUT_PAYMENT', 'B2B_DEEMED_EXPORT',
  'B2CL', 'EXPORT_WITH_PAYMENT', 'EXPORT_WITHOUT_PAYMENT',
  'CDNR', 'CDNUR',
  'B2B_AMENDMENT', 'B2CL_AMENDMENT', 'EXPORT_AMENDMENT',
  'CDNR_AMENDMENT', 'CDNUR_AMENDMENT'
);

create type public.gstr1_document_type as enum ('INVOICE', 'CREDIT_NOTE', 'DEBIT_NOTE');
create type public.gstr1_record_status as enum ('PENDING', 'PROCESSED', 'ERRORED', 'DELETED');
create type public.gstr1_record_source as enum ('MANUAL', 'EINVOICE', 'OFFLINE_UPLOAD', 'API');
create type public.gstr1_taxpayer_class as enum ('REGISTERED', 'UNREGISTERED');
create type public.gstr1_supply_nature as enum ('NIL_RATED', 'EXEMPT', 'NON_GST');
create type public.gstr1_document_nature as enum (
  'INVOICES_FOR_OUTWARD_SUPPLY', 'INVOICES_FOR_INWARD_SUPPLY_RCM',
  'REVISED_INVOICE', 'CREDIT_NOTE', 'DEBIT_NOTE', 'RECEIPT_VOUCHER',
  'PAYMENT_VOUCHER', 'REFUND_VOUCHER', 'DELIVERY_CHALLAN', 'OTHER'
);

-- One row for a GSTIN and return period.  Legal/trade name and filing frequency
-- remain in taxpayer_profiles, so they cannot drift from the registration master.
create table public.gstr1_returns (
  id uuid primary key default gen_random_uuid(),
  gstin text not null references public.taxpayer_profiles(gstin) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  tax_period char(6) not null check (tax_period ~ '^(0[1-9]|1[0-2])[0-9]{4}$'),
  financial_year text not null check (financial_year ~ '^[0-9]{4}-[0-9]{2}$'),
  status public.gstr1_return_status not null default 'DRAFT',
  aggregate_turnover numeric(15,2) check (aggregate_turnover >= 0),
  summary_generated_at timestamptz,
  arn text unique,
  arn_date date,
  filed_at timestamptz,
  filed_by_signatory_id uuid references public.taxpayer_authorised_signatories(id),
  filing_method text check (filing_method in ('DSC', 'EVC')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (gstin, tax_period),
  unique (user_id, tax_period),
  check (
    (status in ('FILED', 'NIL_FILED') and arn is not null and filed_at is not null)
    or status not in ('FILED', 'NIL_FILED')
  )
);

-- Tables 4/5/6/9 and their amendments.  A generic document table avoids
-- repeating invoice header fields for every reporting bucket.
create table public.gstr1_documents (
  id uuid primary key default gen_random_uuid(),
  gstr1_return_id uuid not null references public.gstr1_returns(id) on delete cascade,
  bucket public.gstr1_document_bucket not null,
  document_type public.gstr1_document_type not null,
  recipient_gstin text check (recipient_gstin is null or recipient_gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z][A-Z][0-9A-Z]$'),
  recipient_name text,
  document_number text not null,
  document_date date not null,
  total_document_value numeric(15,2) not null check (total_document_value >= 0),
  place_of_supply char(2) not null check (place_of_supply ~ '^[0-9]{2}$'),
  reverse_charge boolean not null default false,
  differential_tax_percentage numeric(5,2) check (differential_tax_percentage is null or differential_tax_percentage > 0 and differential_tax_percentage <= 100),
  ecommerce_gstin text check (ecommerce_gstin is null or ecommerce_gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z][A-Z][0-9A-Z]$'),
  export_type text check (export_type in ('WITH_PAYMENT', 'WITHOUT_PAYMENT')),
  port_code text,
  shipping_bill_number text,
  shipping_bill_date date,
  note_reason text,
  original_tax_period char(6),
  original_document_number text,
  original_document_date date,
  source public.gstr1_record_source not null default 'MANUAL',
  irn text,
  irn_date date,
  irn_severed boolean not null default false,
  record_status public.gstr1_record_status not null default 'PENDING',
  validation_errors jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (gstr1_return_id, bucket, document_number, document_date),
  check ((source <> 'EINVOICE' or irn is not null) and not (irn_severed and irn is not null)),
  check (
    (bucket in ('CDNR', 'CDNR_AMENDMENT') and recipient_gstin is not null)
    or bucket not in ('CDNR', 'CDNR_AMENDMENT')
  ),
  check (
    (bucket in ('B2B_AMENDMENT', 'B2CL_AMENDMENT', 'EXPORT_AMENDMENT', 'CDNR_AMENDMENT', 'CDNUR_AMENDMENT')
      and original_tax_period is not null and original_document_number is not null and original_document_date is not null)
    or bucket not in ('B2B_AMENDMENT', 'B2CL_AMENDMENT', 'EXPORT_AMENDMENT', 'CDNR_AMENDMENT', 'CDNUR_AMENDMENT')
  )
);

create table public.gstr1_document_lines (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.gstr1_documents(id) on delete cascade,
  line_number smallint not null check (line_number > 0),
  hsn_sac_code text check (hsn_sac_code is null or hsn_sac_code ~ '^[0-9]{4,8}$'),
  description text,
  additional_description text,
  uqc text,
  quantity numeric(15,3) check (quantity is null or quantity >= 0),
  rate numeric(5,2) not null check (rate >= 0 and rate <= 100),
  taxable_value numeric(15,2) not null check (taxable_value >= 0),
  igst numeric(15,2) not null default 0 check (igst >= 0),
  cgst numeric(15,2) not null default 0 check (cgst >= 0),
  sgst_utgst numeric(15,2) not null default 0 check (sgst_utgst >= 0),
  cess numeric(15,2) not null default 0 check (cess >= 0),
  unique (document_id, line_number),
  check (not (igst > 0 and (cgst > 0 or sgst_utgst > 0))),
  check (cgst = sgst_utgst)
);

-- Table 7 and Table 10: rate- and POS-wise consolidated B2C rows.
create table public.gstr1_b2cs_summaries (
  id uuid primary key default gen_random_uuid(),
  gstr1_return_id uuid not null references public.gstr1_returns(id) on delete cascade,
  is_amendment boolean not null default false,
  original_tax_period char(6),
  original_place_of_supply char(2),
  place_of_supply char(2) not null check (place_of_supply ~ '^[0-9]{2}$'),
  supply_type text not null check (supply_type in ('INTER_STATE', 'INTRA_STATE')),
  ecommerce_gstin text check (ecommerce_gstin is null or ecommerce_gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z][A-Z][0-9A-Z]$'),
  rate numeric(5,2) not null check (rate >= 0 and rate <= 100),
  taxable_value numeric(15,2) not null check (taxable_value >= 0),
  igst numeric(15,2) not null default 0 check (igst >= 0),
  cgst numeric(15,2) not null default 0 check (cgst >= 0),
  sgst_utgst numeric(15,2) not null default 0 check (sgst_utgst >= 0),
  cess numeric(15,2) not null default 0 check (cess >= 0),
  check ((is_amendment and original_tax_period is not null and original_place_of_supply is not null) or not is_amendment),
  check (not (igst > 0 and (cgst > 0 or sgst_utgst > 0))),
  check (cgst = sgst_utgst),
  unique nulls not distinct (gstr1_return_id, is_amendment, place_of_supply, rate, ecommerce_gstin)
);

-- Table 8: one value for every supply-nature × recipient-class × supply-type axis.
create table public.gstr1_nil_exempt_supplies (
  id uuid primary key default gen_random_uuid(),
  gstr1_return_id uuid not null references public.gstr1_returns(id) on delete cascade,
  supply_nature public.gstr1_supply_nature not null,
  recipient_class public.gstr1_taxpayer_class not null,
  supply_type text not null check (supply_type in ('INTER_STATE', 'INTRA_STATE')),
  amount numeric(15,2) not null default 0 check (amount >= 0),
  unique (gstr1_return_id, supply_nature, recipient_class, supply_type)
);

-- Tables 11A/11B and their amended variants.  They are consolidated by POS and rate.
create table public.gstr1_advances (
  id uuid primary key default gen_random_uuid(),
  gstr1_return_id uuid not null references public.gstr1_returns(id) on delete cascade,
  advance_kind text not null check (advance_kind in ('RECEIVED', 'ADJUSTED')),
  is_amendment boolean not null default false,
  original_tax_period char(6),
  place_of_supply char(2) not null check (place_of_supply ~ '^[0-9]{2}$'),
  rate numeric(5,2) not null check (rate >= 0 and rate <= 100),
  gross_advance_amount numeric(15,2) not null check (gross_advance_amount >= 0),
  igst numeric(15,2) not null default 0 check (igst >= 0),
  cgst numeric(15,2) not null default 0 check (cgst >= 0),
  sgst_utgst numeric(15,2) not null default 0 check (sgst_utgst >= 0),
  cess numeric(15,2) not null default 0 check (cess >= 0),
  check ((is_amendment and original_tax_period is not null) or not is_amendment),
  check (not (igst > 0 and (cgst > 0 or sgst_utgst > 0))),
  check (cgst = sgst_utgst),
  unique (gstr1_return_id, advance_kind, is_amendment, place_of_supply, rate)
);

-- Table 12.  Keep the preparer-entered snapshot to reproduce portal warnings;
-- reconcile it to gstr1_document_lines and consolidated source rows on summary generation.
create table public.gstr1_hsn_summaries (
  id uuid primary key default gen_random_uuid(),
  gstr1_return_id uuid not null references public.gstr1_returns(id) on delete cascade,
  supply_class public.gstr1_taxpayer_class not null,
  hsn_sac_code text not null check (hsn_sac_code ~ '^[0-9]{4,8}$'),
  description text not null,
  additional_description text,
  uqc text not null,
  total_quantity numeric(15,3) not null default 0 check (total_quantity >= 0),
  total_taxable_value numeric(15,2) not null default 0 check (total_taxable_value >= 0),
  rate numeric(5,2) not null check (rate >= 0 and rate <= 100),
  igst numeric(15,2) not null default 0 check (igst >= 0),
  cgst numeric(15,2) not null default 0 check (cgst >= 0),
  sgst_utgst numeric(15,2) not null default 0 check (sgst_utgst >= 0),
  cess numeric(15,2) not null default 0 check (cess >= 0),
  source public.gstr1_record_source not null default 'MANUAL',
  unique (gstr1_return_id, supply_class, hsn_sac_code, uqc, rate),
  check (not (igst > 0 and (cgst > 0 or sgst_utgst > 0))),
  check (cgst = sgst_utgst)
);

-- Table 13.  Net issued is deliberately generated, so a user cannot overwrite it.
create table public.gstr1_document_series (
  id uuid primary key default gen_random_uuid(),
  gstr1_return_id uuid not null references public.gstr1_returns(id) on delete cascade,
  document_nature public.gstr1_document_nature not null,
  serial_number_from text not null,
  serial_number_to text not null,
  total_number integer not null check (total_number >= 0),
  cancelled_number integer not null default 0 check (cancelled_number >= 0 and cancelled_number <= total_number),
  net_issued integer generated always as (total_number - cancelled_number) stored,
  unique (gstr1_return_id, document_nature, serial_number_from, serial_number_to)
);

-- Tables 14/14A and 15/15A: ECO reporting is consolidated by operator, POS and rate.
create table public.gstr1_eco_supplies (
  id uuid primary key default gen_random_uuid(),
  gstr1_return_id uuid not null references public.gstr1_returns(id) on delete cascade,
  table_kind text not null check (table_kind in ('TABLE_14', 'TABLE_14A', 'TABLE_15', 'TABLE_15A')),
  original_tax_period char(6),
  ecommerce_gstin text not null check (ecommerce_gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z][A-Z][0-9A-Z]$'),
  place_of_supply char(2) not null check (place_of_supply ~ '^[0-9]{2}$'),
  rate numeric(5,2) not null check (rate >= 0 and rate <= 100),
  taxable_value numeric(15,2) not null check (taxable_value >= 0),
  igst numeric(15,2) not null default 0 check (igst >= 0),
  cgst numeric(15,2) not null default 0 check (cgst >= 0),
  sgst_utgst numeric(15,2) not null default 0 check (sgst_utgst >= 0),
  cess numeric(15,2) not null default 0 check (cess >= 0),
  check ((table_kind in ('TABLE_14A', 'TABLE_15A') and original_tax_period is not null) or table_kind in ('TABLE_14', 'TABLE_15')),
  check (not (igst > 0 and (cgst > 0 or sgst_utgst > 0))),
  check (cgst = sgst_utgst),
  unique (gstr1_return_id, table_kind, ecommerce_gstin, place_of_supply, rate)
);

create index gstr1_returns_user_period_idx on public.gstr1_returns (user_id, tax_period);
create index gstr1_documents_return_bucket_idx on public.gstr1_documents (gstr1_return_id, bucket);
create index gstr1_documents_recipient_idx on public.gstr1_documents (recipient_gstin) where recipient_gstin is not null;
create index gstr1_document_lines_hsn_idx on public.gstr1_document_lines (hsn_sac_code);

create or replace function public.set_gstr1_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger gstr1_returns_updated_at before update on public.gstr1_returns
  for each row execute function public.set_gstr1_updated_at();
create trigger gstr1_documents_updated_at before update on public.gstr1_documents
  for each row execute function public.set_gstr1_updated_at();

alter table public.gstr1_returns enable row level security;
alter table public.gstr1_documents enable row level security;
alter table public.gstr1_document_lines enable row level security;
alter table public.gstr1_b2cs_summaries enable row level security;
alter table public.gstr1_nil_exempt_supplies enable row level security;
alter table public.gstr1_advances enable row level security;
alter table public.gstr1_hsn_summaries enable row level security;
alter table public.gstr1_document_series enable row level security;
alter table public.gstr1_eco_supplies enable row level security;

revoke all on public.gstr1_returns, public.gstr1_documents, public.gstr1_document_lines,
  public.gstr1_b2cs_summaries, public.gstr1_nil_exempt_supplies, public.gstr1_advances,
  public.gstr1_hsn_summaries, public.gstr1_document_series, public.gstr1_eco_supplies
  from anon, authenticated;
