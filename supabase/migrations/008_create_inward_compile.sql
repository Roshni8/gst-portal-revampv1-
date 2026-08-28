-- Cached supplier compliance profiles and an auditable inward-bill compile trail.
-- The service-role API owns access; no client role receives direct table access.

create type public.gstin_status_type as enum ('ACTIVE', 'SUSPENDED', 'CANCELLED', 'PROVISIONAL');
create type public.filing_frequency_type as enum ('MONTHLY', 'QUARTERLY');
create type public.inward_compile_batch_status as enum ('IN_PROGRESS', 'COMPLETED', 'FAILED');
create type public.inward_diagnostic_severity as enum ('INFO', 'WARNING', 'CRITICAL');

create table public.counterparty_profiles (
  supplier_gstin text primary key check (supplier_gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z][A-Z][0-9A-Z]$'),
  legal_name text not null,
  trade_name text,
  state_code char(2) not null,
  gstin_status public.gstin_status_type not null default 'ACTIVE',
  registration_date date,
  cancellation_date date,
  filing_frequency public.filing_frequency_type not null default 'MONTHLY',
  is_bank_validated boolean not null default true,
  is_e_way_bill_blocked boolean not null default false,
  last_gstr1_filed_period char(6),
  last_gstr3b_filed_period char(6),
  last_verified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index counterparty_profiles_status_frequency_idx on public.counterparty_profiles (gstin_status, filing_frequency);
create index counterparty_profiles_verified_idx on public.counterparty_profiles (last_verified_at);

create table public.inward_compile_batches (
  batch_id uuid primary key default gen_random_uuid(),
  owner_gstin text not null references public.taxpayer_profiles(gstin) on delete cascade,
  workspace_id uuid references public.ims_workspaces(id) on delete set null,
  inward_batch_ref text,
  triggered_by_user_id uuid not null references auth.users(id) on delete restrict,
  total_gstins_count integer not null default 0 check (total_gstins_count >= 0),
  fresh_lookups_count integer not null default 0 check (fresh_lookups_count >= 0),
  stale_refreshed_count integer not null default 0 check (stale_refreshed_count >= 0),
  status public.inward_compile_batch_status not null default 'IN_PROGRESS',
  error_message text,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);
create index inward_compile_batches_owner_idx on public.inward_compile_batches (owner_gstin, started_at desc);

create table public.inward_compile_gstin_remarks (
  remark_id bigint generated always as identity primary key,
  batch_id uuid not null references public.inward_compile_batches(batch_id) on delete cascade,
  supplier_gstin text not null references public.counterparty_profiles(supplier_gstin),
  severity public.inward_diagnostic_severity not null default 'INFO',
  diagnostic_code varchar(50) not null,
  system_remark text not null,
  action_recommendation text not null,
  credit_at_risk_flag boolean not null default false,
  created_at timestamptz not null default now(),
  unique (batch_id, supplier_gstin)
);
create index inward_compile_remarks_batch_idx on public.inward_compile_gstin_remarks (batch_id);
create index inward_compile_remarks_severity_idx on public.inward_compile_gstin_remarks (severity);

create or replace function public.set_counterparty_profile_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger counterparty_profiles_updated_at before update on public.counterparty_profiles
  for each row execute function public.set_counterparty_profile_updated_at();

alter table public.counterparty_profiles enable row level security;
alter table public.inward_compile_batches enable row level security;
alter table public.inward_compile_gstin_remarks enable row level security;
revoke all on public.counterparty_profiles, public.inward_compile_batches, public.inward_compile_gstin_remarks from anon, authenticated;
