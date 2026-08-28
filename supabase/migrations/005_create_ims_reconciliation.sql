-- IMS: portal-populated inward invoices, ERP upload, reconciliation and user decisions.
-- Prerequisites: 001_create_users.sql, 002_create_taxpayer_master.sql,
-- 003_create_gstr1_outward_supplies.sql and 004_create_einvoice_erp_reconciliation.sql.

create type public.ims_decision_status as enum ('PENDING', 'ACCEPTED', 'REJECTED');
create type public.ims_match_status as enum ('AUTO_MATCHED', 'MISMATCH', 'PORTAL_ONLY', 'ERP_ONLY');
create type public.ims_upload_status as enum ('UPLOADED', 'VALIDATING', 'RECONCILED', 'FAILED');

-- One IMS work area exists for every taxpayer and tax period.
create table public.ims_workspaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  gstin text not null references public.taxpayer_profiles(gstin) on delete cascade,
  tax_period char(6) not null check (tax_period ~ '^(0[1-9]|1[0-2])[0-9]{4}$'),
  portal_populated_at timestamptz,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, tax_period),
  unique (gstin, tax_period)
);

-- These rows are sourced from the portal/GSTR-2B service, never from an ERP upload.
create table public.ims_portal_invoices (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.ims_workspaces(id) on delete cascade,
  invoice_number text not null,
  normalized_invoice_number text generated always as (public.normalize_invoice_identifier(invoice_number)) stored,
  invoice_date date not null,
  supplier_gstin text not null check (supplier_gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z][A-Z][0-9A-Z]$'),
  supplier_name text,
  taxable_value numeric(15,2) not null check (taxable_value >= 0),
  tax_value numeric(15,2) not null check (tax_value >= 0),
  raw_payload jsonb not null default '{}'::jsonb,
  imported_at timestamptz not null default now(),
  unique (workspace_id, supplier_gstin, normalized_invoice_number, invoice_date)
);

create table public.ims_erp_uploads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.ims_workspaces(id) on delete cascade,
  uploaded_by_user_id uuid not null references auth.users(id) on delete cascade,
  original_filename text not null,
  storage_path text,
  file_sha256 char(64),
  status public.ims_upload_status not null default 'UPLOADED',
  total_rows integer not null default 0 check (total_rows >= 0),
  accepted_rows integer not null default 0 check (accepted_rows >= 0 and accepted_rows <= total_rows),
  rejected_rows integer not null default 0 check (rejected_rows >= 0 and rejected_rows <= total_rows),
  errors jsonb not null default '[]'::jsonb,
  uploaded_at timestamptz not null default now(),
  processed_at timestamptz
);

create table public.ims_erp_invoice_rows (
  id uuid primary key default gen_random_uuid(),
  upload_id uuid not null references public.ims_erp_uploads(id) on delete cascade,
  source_row_number integer not null check (source_row_number > 0),
  invoice_number text not null,
  normalized_invoice_number text generated always as (public.normalize_invoice_identifier(invoice_number)) stored,
  invoice_date date not null,
  supplier_gstin text not null check (supplier_gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z][A-Z][0-9A-Z]$'),
  supplier_name text,
  taxable_value numeric(15,2) not null check (taxable_value >= 0),
  tax_value numeric(15,2) not null check (tax_value >= 0),
  raw_row jsonb not null default '{}'::jsonb,
  validation_errors jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (upload_id, source_row_number)
);

create table public.ims_reconciliation_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.ims_workspaces(id) on delete cascade,
  erp_upload_id uuid references public.ims_erp_uploads(id) on delete set null,
  started_by_user_id uuid not null references auth.users(id) on delete cascade,
  tolerance numeric(15,2) not null default 0.01 check (tolerance >= 0),
  auto_matched_count integer not null default 0 check (auto_matched_count >= 0),
  exception_count integer not null default 0 check (exception_count >= 0),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.ims_reconciliation_results (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.ims_reconciliation_runs(id) on delete cascade,
  status public.ims_match_status not null,
  portal_invoice_id uuid references public.ims_portal_invoices(id) on delete cascade,
  erp_invoice_row_id uuid references public.ims_erp_invoice_rows(id) on delete cascade,
  difference_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (
    (status = 'PORTAL_ONLY' and portal_invoice_id is not null and erp_invoice_row_id is null)
    or (status = 'ERP_ONLY' and portal_invoice_id is null and erp_invoice_row_id is not null)
    or (status in ('AUTO_MATCHED', 'MISMATCH') and portal_invoice_id is not null and erp_invoice_row_id is not null)
  )
);

create unique index ims_results_one_portal_invoice_per_run on public.ims_reconciliation_results (run_id, portal_invoice_id) where portal_invoice_id is not null;
create unique index ims_results_one_erp_invoice_per_run on public.ims_reconciliation_results (run_id, erp_invoice_row_id) where erp_invoice_row_id is not null;

-- User choices are stored independently from both portal and ERP source facts.
create table public.ims_invoice_decisions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.ims_workspaces(id) on delete cascade,
  portal_invoice_id uuid not null references public.ims_portal_invoices(id) on delete cascade,
  status public.ims_decision_status not null default 'PENDING',
  decided_by_user_id uuid not null references auth.users(id) on delete cascade,
  remark text,
  decided_at timestamptz not null default now(),
  unique (workspace_id, portal_invoice_id)
);

create table public.ims_counterparty_checks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.ims_workspaces(id) on delete cascade,
  portal_invoice_id uuid references public.ims_portal_invoices(id) on delete cascade,
  erp_invoice_row_id uuid references public.ims_erp_invoice_rows(id) on delete cascade,
  checked_by_user_id uuid not null references auth.users(id) on delete cascade,
  outcome text not null check (outcome in ('CLEAR', 'REVIEW_REQUIRED', 'UNAVAILABLE')),
  remarks text not null,
  checked_at timestamptz not null default now(),
  check (num_nonnulls(portal_invoice_id, erp_invoice_row_id) = 1)
);

create index ims_portal_invoices_workspace_idx on public.ims_portal_invoices (workspace_id, invoice_date);
create index ims_erp_uploads_workspace_idx on public.ims_erp_uploads (workspace_id, uploaded_at desc);
create index ims_erp_invoice_rows_match_idx on public.ims_erp_invoice_rows (upload_id, supplier_gstin, normalized_invoice_number, invoice_date);
create index ims_runs_workspace_idx on public.ims_reconciliation_runs (workspace_id, created_at desc);
create index ims_decisions_workspace_status_idx on public.ims_invoice_decisions (workspace_id, status);

create or replace function public.set_ims_workspace_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger ims_workspaces_updated_at before update on public.ims_workspaces
  for each row execute function public.set_ims_workspace_updated_at();

-- Reconciles one ERP upload to its portal-populated workspace. Matching is
-- deliberately strict: supplier GSTIN, normalized invoice number, invoice date
-- and tax amount must agree within tolerance to receive AUTO_MATCHED status.
create or replace function public.reconcile_ims_erp_upload(p_upload_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run_id uuid;
  v_workspace_id uuid;
  v_user_id uuid;
  v_tolerance numeric(15,2) := 0.01;
begin
  select workspace_id, uploaded_by_user_id into v_workspace_id, v_user_id
  from public.ims_erp_uploads where id = p_upload_id;

  if v_workspace_id is null then
    raise exception 'IMS ERP upload % does not exist', p_upload_id using errcode = 'P0002';
  end if;

  insert into public.ims_reconciliation_runs (workspace_id, erp_upload_id, started_by_user_id, tolerance)
  values (v_workspace_id, p_upload_id, v_user_id, v_tolerance)
  returning id into v_run_id;

  insert into public.ims_reconciliation_results (run_id, status, portal_invoice_id, erp_invoice_row_id, difference_summary)
  select
    v_run_id,
    case when abs(portal.tax_value - erp.tax_value) <= v_tolerance then 'AUTO_MATCHED'::public.ims_match_status else 'MISMATCH'::public.ims_match_status end,
    portal.id,
    erp.id,
    jsonb_build_object(
      'taxable_value_difference', erp.taxable_value - portal.taxable_value,
      'tax_value_difference', erp.tax_value - portal.tax_value
    )
  from public.ims_portal_invoices portal
  join public.ims_erp_invoice_rows erp
    on erp.supplier_gstin = portal.supplier_gstin
    and erp.normalized_invoice_number = portal.normalized_invoice_number
    and erp.invoice_date = portal.invoice_date
  where portal.workspace_id = v_workspace_id
    and erp.upload_id = p_upload_id;

  insert into public.ims_reconciliation_results (run_id, status, portal_invoice_id)
  select v_run_id, 'PORTAL_ONLY'::public.ims_match_status, portal.id
  from public.ims_portal_invoices portal
  where portal.workspace_id = v_workspace_id
    and not exists (select 1 from public.ims_reconciliation_results result where result.run_id = v_run_id and result.portal_invoice_id = portal.id);

  insert into public.ims_reconciliation_results (run_id, status, erp_invoice_row_id)
  select v_run_id, 'ERP_ONLY'::public.ims_match_status, erp.id
  from public.ims_erp_invoice_rows erp
  where erp.upload_id = p_upload_id
    and not exists (select 1 from public.ims_reconciliation_results result where result.run_id = v_run_id and result.erp_invoice_row_id = erp.id);

  update public.ims_reconciliation_runs run
  set auto_matched_count = counts.auto_matched_count, exception_count = counts.exception_count, completed_at = now()
  from (
    select count(*) filter (where status = 'AUTO_MATCHED')::integer as auto_matched_count,
      count(*) filter (where status <> 'AUTO_MATCHED')::integer as exception_count
    from public.ims_reconciliation_results where run_id = v_run_id
  ) counts
  where run.id = v_run_id;

  update public.ims_erp_uploads set status = 'RECONCILED', processed_at = now() where id = p_upload_id;
  return v_run_id;
end;
$$;

alter table public.ims_workspaces enable row level security;
alter table public.ims_portal_invoices enable row level security;
alter table public.ims_erp_uploads enable row level security;
alter table public.ims_erp_invoice_rows enable row level security;
alter table public.ims_reconciliation_runs enable row level security;
alter table public.ims_reconciliation_results enable row level security;
alter table public.ims_invoice_decisions enable row level security;
alter table public.ims_counterparty_checks enable row level security;

revoke all on public.ims_workspaces, public.ims_portal_invoices, public.ims_erp_uploads,
  public.ims_erp_invoice_rows, public.ims_reconciliation_runs, public.ims_reconciliation_results,
  public.ims_invoice_decisions, public.ims_counterparty_checks from anon, authenticated;
revoke all on function public.reconcile_ims_erp_upload(uuid) from public, anon, authenticated;
grant execute on function public.reconcile_ims_erp_upload(uuid) to service_role;
