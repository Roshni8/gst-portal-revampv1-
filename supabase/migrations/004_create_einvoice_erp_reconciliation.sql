-- ERP invoice uploads and reconciliation against e-invoices imported into GSTR-1.
--
-- Prerequisite: 003_create_gstr1_outward_supplies.sql.  E-invoices remain the
-- authoritative documents in gstr1_documents (source = 'EINVOICE', IRN set).
-- ERP rows are stored separately so an import never mutates government-source
-- facts.  Every reconciliation run is immutable and its exceptions are exposed
-- by public.einvoice_erp_reconciliation_exceptions.

create type public.erp_upload_status as enum (
  'UPLOADED', 'VALIDATING', 'READY_TO_RECONCILE', 'RECONCILED', 'FAILED'
);

create type public.erp_source_format as enum ('CSV', 'XLSX', 'JSON', 'API');

create type public.invoice_reconciliation_status as enum (
  'MATCHED', 'ERP_ONLY', 'EINVOICE_ONLY', 'AMOUNT_MISMATCH', 'FIELD_MISMATCH'
);

-- Removes casing, whitespace and punctuation differences from ERP invoice
-- numbers. It is deliberately immutable so it can support generated columns
-- and indexes. The original value is always retained for display/audit.
create or replace function public.normalize_invoice_identifier(value text)
returns text
language sql
immutable
strict
parallel safe
as $$
  select upper(regexp_replace(value, '[^A-Za-z0-9]', '', 'g'));
$$;

create table public.erp_invoice_uploads (
  id uuid primary key default gen_random_uuid(),
  gstr1_return_id uuid not null references public.gstr1_returns(id) on delete cascade,
  uploaded_by_user_id uuid not null references auth.users(id) on delete cascade,
  source_format public.erp_source_format not null,
  original_filename text not null,
  storage_path text,
  file_sha256 char(64),
  status public.erp_upload_status not null default 'UPLOADED',
  total_rows integer not null default 0 check (total_rows >= 0),
  accepted_rows integer not null default 0 check (accepted_rows >= 0 and accepted_rows <= total_rows),
  rejected_rows integer not null default 0 check (rejected_rows >= 0 and rejected_rows <= total_rows),
  error_summary jsonb not null default '[]'::jsonb,
  uploaded_at timestamptz not null default now(),
  processed_at timestamptz,
  check ((status = 'FAILED') or accepted_rows + rejected_rows <= total_rows)
);

-- One normalised ERP invoice header per source-file row. Keep raw_row for
-- source traceability and future vendor-specific parser diagnostics.
create table public.erp_invoice_rows (
  id uuid primary key default gen_random_uuid(),
  upload_id uuid not null references public.erp_invoice_uploads(id) on delete cascade,
  source_row_number integer not null check (source_row_number > 0),
  document_type public.gstr1_document_type not null default 'INVOICE',
  document_number text not null,
  normalized_document_number text generated always as (public.normalize_invoice_identifier(document_number)) stored,
  document_date date not null,
  recipient_gstin text check (recipient_gstin is null or recipient_gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z][A-Z][0-9A-Z]$'),
  recipient_name text,
  place_of_supply char(2) check (place_of_supply is null or place_of_supply ~ '^[0-9]{2}$'),
  total_invoice_value numeric(15,2) not null check (total_invoice_value >= 0),
  taxable_value numeric(15,2) not null default 0 check (taxable_value >= 0),
  igst numeric(15,2) not null default 0 check (igst >= 0),
  cgst numeric(15,2) not null default 0 check (cgst >= 0),
  sgst_utgst numeric(15,2) not null default 0 check (sgst_utgst >= 0),
  cess numeric(15,2) not null default 0 check (cess >= 0),
  currency char(3) not null default 'INR' check (currency = 'INR'),
  external_reference text,
  raw_row jsonb not null default '{}'::jsonb,
  validation_errors jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (upload_id, source_row_number),
  check (not (igst > 0 and (cgst > 0 or sgst_utgst > 0))),
  check (cgst = sgst_utgst)
);

create table public.invoice_reconciliation_runs (
  id uuid primary key default gen_random_uuid(),
  upload_id uuid not null references public.erp_invoice_uploads(id) on delete cascade,
  started_by_user_id uuid not null references auth.users(id) on delete cascade,
  tolerance numeric(15,2) not null default 0.01 check (tolerance >= 0),
  total_erp_rows integer not null default 0 check (total_erp_rows >= 0),
  matched_count integer not null default 0 check (matched_count >= 0),
  exception_count integer not null default 0 check (exception_count >= 0),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- A result references an ERP row, an e-invoice-backed GSTR-1 document, or
-- both. ERP_ONLY and EINVOICE_ONLY are the records the UI lists separately;
-- mismatch rows retain both sides so a user can resolve the difference.
create table public.invoice_reconciliation_results (
  id uuid primary key default gen_random_uuid(),
  reconciliation_run_id uuid not null references public.invoice_reconciliation_runs(id) on delete cascade,
  status public.invoice_reconciliation_status not null,
  erp_invoice_row_id uuid references public.erp_invoice_rows(id) on delete cascade,
  einvoice_document_id uuid references public.gstr1_documents(id) on delete restrict,
  match_key text,
  difference_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (
    (status = 'ERP_ONLY' and erp_invoice_row_id is not null and einvoice_document_id is null)
    or (status = 'EINVOICE_ONLY' and erp_invoice_row_id is null and einvoice_document_id is not null)
    or (status in ('MATCHED', 'AMOUNT_MISMATCH', 'FIELD_MISMATCH') and erp_invoice_row_id is not null and einvoice_document_id is not null)
  )
);

create unique index invoice_reconciliation_one_erp_result
  on public.invoice_reconciliation_results (reconciliation_run_id, erp_invoice_row_id)
  where erp_invoice_row_id is not null;
create unique index invoice_reconciliation_one_einvoice_result
  on public.invoice_reconciliation_results (reconciliation_run_id, einvoice_document_id)
  where einvoice_document_id is not null;
create index erp_invoice_uploads_return_idx on public.erp_invoice_uploads (gstr1_return_id, uploaded_at desc);
create index erp_invoice_rows_match_idx on public.erp_invoice_rows (upload_id, document_type, normalized_document_number, document_date);
create index invoice_reconciliation_results_exception_idx on public.invoice_reconciliation_results (reconciliation_run_id, status) where status <> 'MATCHED';

-- Rebuilds a run from one ERP upload. A match uses document type, a normalized
-- invoice number and document date. Once paired, recipient GSTIN, POS, invoice
-- value and tax values are compared within the run tolerance.
create or replace function public.reconcile_erp_invoice_upload(p_upload_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run_id uuid;
  v_return_id uuid;
  v_user_id uuid;
  v_tolerance numeric(15,2) := 0.01;
begin
  select upload.gstr1_return_id, upload.uploaded_by_user_id
    into v_return_id, v_user_id
  from public.erp_invoice_uploads upload
  where upload.id = p_upload_id;

  if v_return_id is null then
    raise exception 'ERP invoice upload % does not exist', p_upload_id using errcode = 'P0002';
  end if;

  insert into public.invoice_reconciliation_runs (upload_id, started_by_user_id, tolerance, total_erp_rows)
  select p_upload_id, v_user_id, v_tolerance, count(*)
  from public.erp_invoice_rows
  where upload_id = p_upload_id
  returning id into v_run_id;

  with einvoice_documents as (
    select
      document.id,
      document.document_type,
      public.normalize_invoice_identifier(document.document_number) as normalized_document_number,
      document.document_date,
      document.recipient_gstin,
      document.recipient_name,
      document.place_of_supply,
      document.total_document_value,
      coalesce(sum(line.taxable_value), 0) as taxable_value,
      coalesce(sum(line.igst), 0) as igst,
      coalesce(sum(line.cgst), 0) as cgst,
      coalesce(sum(line.sgst_utgst), 0) as sgst_utgst,
      coalesce(sum(line.cess), 0) as cess
    from public.gstr1_documents document
    left join public.gstr1_document_lines line on line.document_id = document.id
    where document.gstr1_return_id = v_return_id
      and document.source = 'EINVOICE'
      and document.irn is not null
      and document.irn_severed = false
      and document.record_status <> 'DELETED'
    group by document.id
  ), paired as (
    select
      erp.id as erp_id,
      einvoice.id as einvoice_id,
      erp.document_type,
      erp.normalized_document_number,
      erp.document_date,
      erp.recipient_gstin as erp_recipient_gstin,
      einvoice.recipient_gstin as einvoice_recipient_gstin,
      erp.recipient_name as erp_recipient_name,
      einvoice.recipient_name as einvoice_recipient_name,
      erp.place_of_supply as erp_place_of_supply,
      einvoice.place_of_supply as einvoice_place_of_supply,
      erp.total_invoice_value as erp_total_invoice_value,
      einvoice.total_document_value as einvoice_total_document_value,
      erp.taxable_value as erp_taxable_value,
      einvoice.taxable_value as einvoice_taxable_value,
      erp.igst as erp_igst, einvoice.igst as einvoice_igst,
      erp.cgst as erp_cgst, einvoice.cgst as einvoice_cgst,
      erp.sgst_utgst as erp_sgst_utgst, einvoice.sgst_utgst as einvoice_sgst_utgst,
      erp.cess as erp_cess, einvoice.cess as einvoice_cess
    from public.erp_invoice_rows erp
    join einvoice_documents einvoice
      on einvoice.document_type = erp.document_type
      and einvoice.normalized_document_number = erp.normalized_document_number
      and einvoice.document_date = erp.document_date
    where erp.upload_id = p_upload_id
  )
  insert into public.invoice_reconciliation_results (
    reconciliation_run_id, status, erp_invoice_row_id, einvoice_document_id, match_key, difference_summary
  )
  select
    v_run_id,
    case
      when abs(erp_total_invoice_value - einvoice_total_document_value) > v_tolerance
        or abs(erp_taxable_value - einvoice_taxable_value) > v_tolerance
        or abs(erp_igst - einvoice_igst) > v_tolerance
        or abs(erp_cgst - einvoice_cgst) > v_tolerance
        or abs(erp_sgst_utgst - einvoice_sgst_utgst) > v_tolerance
        or abs(erp_cess - einvoice_cess) > v_tolerance then 'AMOUNT_MISMATCH'::public.invoice_reconciliation_status
      when erp_recipient_gstin is distinct from einvoice_recipient_gstin
        or lower(btrim(coalesce(erp_recipient_name, ''))) is distinct from lower(btrim(coalesce(einvoice_recipient_name, '')))
        or erp_place_of_supply is distinct from einvoice_place_of_supply then 'FIELD_MISMATCH'::public.invoice_reconciliation_status
      else 'MATCHED'::public.invoice_reconciliation_status
    end,
    erp_id,
    einvoice_id,
    concat(document_type::text, ':', normalized_document_number, ':', document_date::text),
    jsonb_build_object(
      'invoice_value_difference', erp_total_invoice_value - einvoice_total_document_value,
      'taxable_value_difference', erp_taxable_value - einvoice_taxable_value,
      'igst_difference', erp_igst - einvoice_igst,
      'cgst_difference', erp_cgst - einvoice_cgst,
      'sgst_utgst_difference', erp_sgst_utgst - einvoice_sgst_utgst,
      'cess_difference', erp_cess - einvoice_cess,
      'recipient_gstin_matches', erp_recipient_gstin is not distinct from einvoice_recipient_gstin,
      'recipient_name_matches', lower(btrim(coalesce(erp_recipient_name, ''))) is not distinct from lower(btrim(coalesce(einvoice_recipient_name, ''))),
      'place_of_supply_matches', erp_place_of_supply is not distinct from einvoice_place_of_supply
    )
  from paired;

  insert into public.invoice_reconciliation_results (
    reconciliation_run_id, status, erp_invoice_row_id, match_key
  )
  select
    v_run_id,
    'ERP_ONLY'::public.invoice_reconciliation_status,
    erp.id,
    concat(erp.document_type::text, ':', erp.normalized_document_number, ':', erp.document_date::text)
  from public.erp_invoice_rows erp
  where erp.upload_id = p_upload_id
    and not exists (
      select 1 from public.invoice_reconciliation_results result
      where result.reconciliation_run_id = v_run_id and result.erp_invoice_row_id = erp.id
    );

  insert into public.invoice_reconciliation_results (
    reconciliation_run_id, status, einvoice_document_id, match_key
  )
  select
    v_run_id,
    'EINVOICE_ONLY'::public.invoice_reconciliation_status,
    document.id,
    concat(document.document_type::text, ':', public.normalize_invoice_identifier(document.document_number), ':', document.document_date::text)
  from public.gstr1_documents document
  where document.gstr1_return_id = v_return_id
    and document.source = 'EINVOICE'
    and document.irn is not null
    and document.irn_severed = false
    and document.record_status <> 'DELETED'
    and not exists (
      select 1 from public.invoice_reconciliation_results result
      where result.reconciliation_run_id = v_run_id and result.einvoice_document_id = document.id
    );

  update public.invoice_reconciliation_runs run
  set
    matched_count = counts.matched_count,
    exception_count = counts.exception_count,
    completed_at = now()
  from (
    select
      count(*) filter (where status = 'MATCHED')::integer as matched_count,
      count(*) filter (where status <> 'MATCHED')::integer as exception_count
    from public.invoice_reconciliation_results
    where reconciliation_run_id = v_run_id
  ) counts
  where run.id = v_run_id;

  update public.erp_invoice_uploads
  set status = 'RECONCILED', processed_at = now()
  where id = p_upload_id;

  return v_run_id;
end;
$$;

create or replace view public.einvoice_erp_reconciliation_exceptions
with (security_invoker = true)
as
select
  result.id,
  result.reconciliation_run_id,
  result.status,
  upload.id as upload_id,
  return_header.gstin,
  return_header.tax_period,
  erp.document_number as erp_document_number,
  erp.document_date as erp_document_date,
  erp.total_invoice_value as erp_total_invoice_value,
  einvoice.document_number as einvoice_document_number,
  einvoice.document_date as einvoice_document_date,
  einvoice.total_document_value as einvoice_total_invoice_value,
  einvoice.irn,
  result.difference_summary,
  result.created_at
from public.invoice_reconciliation_results result
join public.invoice_reconciliation_runs run on run.id = result.reconciliation_run_id
join public.erp_invoice_uploads upload on upload.id = run.upload_id
join public.gstr1_returns return_header on return_header.id = upload.gstr1_return_id
left join public.erp_invoice_rows erp on erp.id = result.erp_invoice_row_id
left join public.gstr1_documents einvoice on einvoice.id = result.einvoice_document_id
where result.status <> 'MATCHED';

alter table public.erp_invoice_uploads enable row level security;
alter table public.erp_invoice_rows enable row level security;
alter table public.invoice_reconciliation_runs enable row level security;
alter table public.invoice_reconciliation_results enable row level security;

revoke all on public.erp_invoice_uploads, public.erp_invoice_rows,
  public.invoice_reconciliation_runs, public.invoice_reconciliation_results
  from anon, authenticated;
revoke all on public.einvoice_erp_reconciliation_exceptions from anon, authenticated;
revoke all on function public.reconcile_erp_invoice_upload(uuid) from public, anon, authenticated;
grant execute on function public.reconcile_erp_invoice_upload(uuid) to service_role;
