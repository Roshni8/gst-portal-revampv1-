-- Database-backed April–August demo return flow, complete IMS tax heads,
-- immutable IRP source records, and reusable synthetic counterparty registry.
-- Prerequisites: migrations 001 through 005.

alter table public.ims_portal_invoices
  add column if not exists place_of_supply char(2),
  add column if not exists total_invoice_value numeric(15,2),
  add column if not exists hsn_sac_code text,
  add column if not exists rate numeric(5,2),
  add column if not exists igst numeric(15,2) not null default 0,
  add column if not exists cgst numeric(15,2) not null default 0,
  add column if not exists sgst_utgst numeric(15,2) not null default 0,
  add column if not exists cess numeric(15,2) not null default 0,
  add column if not exists irn text,
  add column if not exists irn_date date;

alter table public.ims_erp_invoice_rows
  add column if not exists place_of_supply char(2),
  add column if not exists total_invoice_value numeric(15,2),
  add column if not exists hsn_sac_code text,
  add column if not exists rate numeric(5,2),
  add column if not exists igst numeric(15,2) not null default 0,
  add column if not exists cgst numeric(15,2) not null default 0,
  add column if not exists sgst_utgst numeric(15,2) not null default 0,
  add column if not exists cess numeric(15,2) not null default 0;

alter table public.ims_portal_invoices
  add constraint ims_portal_tax_heads_exclusive
    check (not (igst > 0 and (cgst > 0 or sgst_utgst > 0))),
  add constraint ims_portal_split_tax_equal check (cgst = sgst_utgst),
  add constraint ims_portal_pos_format check (place_of_supply is null or place_of_supply ~ '^[0-9]{2}$');

alter table public.ims_erp_invoice_rows
  add constraint ims_erp_tax_heads_exclusive
    check (not (igst > 0 and (cgst > 0 or sgst_utgst > 0))),
  add constraint ims_erp_split_tax_equal check (cgst = sgst_utgst),
  add constraint ims_erp_pos_format check (place_of_supply is null or place_of_supply ~ '^[0-9]{2}$');

create table public.irp_einvoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  irn text not null unique,
  irn_date date not null,
  period char(6) not null check (period ~ '^(0[1-9]|1[0-2])[0-9]{4}$'),
  payload jsonb not null,
  imported_gstr1_document_id uuid references public.gstr1_documents(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, period, irn)
);
create index irp_einvoices_user_period_idx on public.irp_einvoices (user_id, period);

create table public.gst_counterparties (
  gstin text primary key check (gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z][A-Z][0-9A-Z]$'),
  legal_name text not null,
  trade_name text,
  state_code char(2) not null,
  registration_status text not null check (registration_status in ('ACTIVE', 'SUSPENDED', 'CANCELLED')),
  taxpayer_type text not null default 'REGULAR',
  gstr1_filing_frequency text not null default 'MONTHLY',
  last_gstr1_period char(6),
  last_gstr3b_period char(6),
  risk_note text,
  synthetic boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.ims_counterparty_checks
  add column if not exists counterparty_gstin text references public.gst_counterparties(gstin),
  add column if not exists registration_status text,
  add column if not exists last_gstr1_period char(6),
  add column if not exists last_gstr3b_period char(6);

create index ims_counterparty_checks_recent_idx
  on public.ims_counterparty_checks (workspace_id, checked_by_user_id, checked_at desc);

alter table public.irp_einvoices enable row level security;
alter table public.gst_counterparties enable row level security;

revoke all on public.irp_einvoices, public.gst_counterparties from anon, authenticated;

insert into public.gst_counterparties
  (gstin, legal_name, trade_name, state_code, registration_status, last_gstr1_period, last_gstr3b_period, risk_note)
values
  ('27AAGCK5678L1ZP', 'Kavya Steel Traders Private Limited', 'Kavya Steel Traders', '27', 'ACTIVE', '072026', '072026', null),
  ('06AAFCN4321M1Z9', 'Nimbus Retail Solutions Private Limited', 'Nimbus Retail', '06', 'ACTIVE', '072026', '072026', null),
  ('33AAECO9988R1Z2', 'Orbit Components Limited', 'Orbit Components', '33', 'ACTIVE', '072026', '072026', null),
  ('24AAACS7788K1Z6', 'Solstice Logistics Private Limited', 'Solstice Logistics', '24', 'ACTIVE', '072026', '062026', 'GSTR-3B for July is pending.'),
  ('19AAACM5544P1Z8', 'Meridian Auto Parts Limited', 'Meridian Auto Parts', '19', 'ACTIVE', '072026', '072026', null),
  ('07AAACC6622D1Z4', 'Cobalt Packaging Company Private Limited', 'Cobalt Packaging', '07', 'SUSPENDED', '052026', '052026', 'Registration is suspended; review ITC eligibility.'),
  ('23AAACV1122N1Z7', 'Vantage Chemicals Limited', 'Vantage Chemicals', '23', 'ACTIVE', '072026', '072026', null),
  ('29AACCA1234F1Z5', 'Aravind Textiles Private Limited', 'Aravind Textiles', '29', 'ACTIVE', '072026', '072026', null)
on conflict (gstin) do update set
  legal_name = excluded.legal_name,
  trade_name = excluded.trade_name,
  registration_status = excluded.registration_status,
  last_gstr1_period = excluded.last_gstr1_period,
  last_gstr3b_period = excluded.last_gstr3b_period,
  risk_note = excluded.risk_note,
  updated_at = now();

-- Compare every monetary component, not only total tax. Identity matching is
-- supplier GSTIN + normalized invoice number + invoice date.
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
  if v_workspace_id is null then raise exception 'IMS ERP upload % does not exist', p_upload_id using errcode = 'P0002'; end if;

  insert into public.ims_reconciliation_runs (workspace_id, erp_upload_id, started_by_user_id, tolerance)
  values (v_workspace_id, p_upload_id, v_user_id, v_tolerance) returning id into v_run_id;

  insert into public.ims_reconciliation_results (run_id, status, portal_invoice_id, erp_invoice_row_id, difference_summary)
  select v_run_id,
    case when
      abs(coalesce(portal.total_invoice_value, portal.taxable_value + portal.tax_value) - coalesce(erp.total_invoice_value, erp.taxable_value + erp.tax_value)) <= v_tolerance
      and abs(portal.taxable_value - erp.taxable_value) <= v_tolerance
      and abs(portal.igst - erp.igst) <= v_tolerance
      and abs(portal.cgst - erp.cgst) <= v_tolerance
      and abs(portal.sgst_utgst - erp.sgst_utgst) <= v_tolerance
      and abs(portal.cess - erp.cess) <= v_tolerance
      and portal.place_of_supply is not distinct from erp.place_of_supply
      then 'AUTO_MATCHED'::public.ims_match_status else 'MISMATCH'::public.ims_match_status end,
    portal.id, erp.id,
    jsonb_build_object(
      'invoice_value_difference', coalesce(erp.total_invoice_value, 0) - coalesce(portal.total_invoice_value, 0),
      'taxable_value_difference', erp.taxable_value - portal.taxable_value,
      'igst_difference', erp.igst - portal.igst,
      'cgst_difference', erp.cgst - portal.cgst,
      'sgst_utgst_difference', erp.sgst_utgst - portal.sgst_utgst,
      'cess_difference', erp.cess - portal.cess,
      'place_of_supply_matches', erp.place_of_supply is not distinct from portal.place_of_supply
    )
  from public.ims_portal_invoices portal
  join public.ims_erp_invoice_rows erp
    on erp.supplier_gstin = portal.supplier_gstin
   and erp.normalized_invoice_number = portal.normalized_invoice_number
   and erp.invoice_date = portal.invoice_date
  where portal.workspace_id = v_workspace_id and erp.upload_id = p_upload_id;

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
  from (select count(*) filter (where status = 'AUTO_MATCHED')::integer auto_matched_count,
               count(*) filter (where status <> 'AUTO_MATCHED')::integer exception_count
        from public.ims_reconciliation_results where run_id = v_run_id) counts
  where run.id = v_run_id;
  update public.ims_erp_uploads set status = 'RECONCILED', processed_at = now() where id = p_upload_id;
  return v_run_id;
end;
$$;

revoke all on function public.reconcile_ims_erp_upload(uuid) from public, anon, authenticated;
grant execute on function public.reconcile_ims_erp_upload(uuid) to service_role;
