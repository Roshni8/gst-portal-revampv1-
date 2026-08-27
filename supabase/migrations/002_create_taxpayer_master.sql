-- Taxpayer master data for the read-only GST prototype.
-- Every record is owned by exactly one authenticated Supabase user and one GSTIN.

create table if not exists public.taxpayer_profiles (
  gstin text primary key check (gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z][A-Z][0-9A-Z]$'),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  pan text not null check (pan ~ '^[A-Z]{5}[0-9]{4}[A-Z]$'),
  legal_name text not null,
  trade_name text,
  additional_trade_names text[] not null default '{}',
  constitution text not null,
  taxpayer_type text not null,
  date_of_registration date not null,
  date_of_liability date not null,
  status text not null default 'Active' check (status in ('Active', 'Suspended', 'Cancelled')),
  date_of_cancellation date,
  reason_for_cancellation text,
  state_code char(2) not null check (state_code ~ '^[0-9]{2}$'),
  state_name text not null,
  state_jurisdiction_code text not null,
  state_jurisdiction_name text not null,
  central_jurisdiction_code text not null,
  central_jurisdiction_name text not null,
  nature_of_business text[] not null default '{}',
  filing_frequency text not null check (filing_frequency in ('Monthly', 'Quarterly')),
  opted_qrmp boolean not null default false,
  opted_composition boolean not null default false,
  opted_evc boolean not null default false,
  primary_email text,
  registered_mobile text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint taxpayer_profile_pan_matches_gstin check (substring(gstin from 3 for 10) = pan),
  constraint taxpayer_profile_cancellation_consistent check (
    (status = 'Cancelled' and date_of_cancellation is not null)
    or (status <> 'Cancelled' and date_of_cancellation is null and reason_for_cancellation is null)
  ),
  constraint taxpayer_profile_qrmp_consistent check (
    (filing_frequency = 'Quarterly' and opted_qrmp)
    or (filing_frequency = 'Monthly' and not opted_qrmp)
  )
);

create table if not exists public.taxpayer_places_of_business (
  id uuid primary key default gen_random_uuid(),
  gstin text not null references public.taxpayer_profiles(gstin) on delete cascade,
  address_type text not null check (address_type in ('Principal', 'Additional')),
  building_no text,
  floor_no text,
  building_name text,
  street text,
  locality text,
  city text not null,
  district text not null,
  state text not null,
  pincode char(6) not null check (pincode ~ '^[0-9]{6}$'),
  latitude numeric(9,6),
  longitude numeric(9,6),
  contact_phone text,
  contact_email text,
  nature_of_possession text not null,
  created_at timestamptz not null default now()
);
create unique index if not exists taxpayer_places_one_principal on public.taxpayer_places_of_business (gstin) where address_type = 'Principal';

create table if not exists public.taxpayer_authorised_signatories (
  id uuid primary key default gen_random_uuid(),
  gstin text not null references public.taxpayer_profiles(gstin) on delete cascade,
  name text not null,
  designation text not null,
  mobile text not null,
  email text not null,
  is_primary boolean not null default false,
  place_of_signing text not null,
  created_at timestamptz not null default now()
);
create unique index if not exists taxpayer_signatories_one_primary on public.taxpayer_authorised_signatories (gstin) where is_primary;

create table if not exists public.taxpayer_bank_accounts (
  id uuid primary key default gen_random_uuid(),
  gstin text not null references public.taxpayer_profiles(gstin) on delete cascade,
  account_number text not null,
  ifsc_code text not null check (ifsc_code ~ '^[A-Z]{4}0[A-Z0-9]{6}$'),
  bank_name text not null,
  branch text not null,
  account_type text not null check (account_type in ('Current', 'Savings', 'Overdraft', 'Cash Credit')),
  validation_status text not null check (validation_status in ('Success', 'Success With Remark', 'Failure', 'Pending')),
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index if not exists taxpayer_bank_accounts_one_primary on public.taxpayer_bank_accounts (gstin) where is_primary;

create table if not exists public.taxpayer_derived_attributes (
  gstin text primary key references public.taxpayer_profiles(gstin) on delete cascade,
  aato numeric(15,2) not null check (aato >= 0),
  einvoicing_applicable boolean not null,
  hsn_digit_depth smallint not null check (hsn_digit_depth in (4, 6, 8)),
  gstr9c_applicable boolean not null,
  computed_at timestamptz not null default now(),
  computed_from_periods text[] not null default '{}'
);

create table if not exists public.taxpayer_filing_history (
  id uuid primary key default gen_random_uuid(),
  gstin text not null references public.taxpayer_profiles(gstin) on delete cascade,
  return_type text not null,
  tax_period text not null,
  filing_date date,
  arn text,
  status text not null check (status in ('Filed', 'Not Filed', 'Amendment Filed')),
  due_date date not null,
  days_late integer generated always as (case when filing_date is null then null else filing_date - due_date end) stored,
  unique (gstin, return_type, tax_period)
);

create table if not exists public.taxpayer_hsn_sac_codes (
  id uuid primary key default gen_random_uuid(),
  gstin text not null references public.taxpayer_profiles(gstin) on delete cascade,
  code text not null check (code ~ '^[0-9]{4,8}$'),
  description text not null,
  tax_rate numeric(5,2) not null check (tax_rate >= 0 and tax_rate <= 100),
  category text not null check (category in ('Goods', 'Services')),
  is_active boolean not null default true,
  unique (gstin, code)
);

create or replace function public.set_taxpayer_master_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists taxpayer_profiles_updated_at on public.taxpayer_profiles;
create trigger taxpayer_profiles_updated_at before update on public.taxpayer_profiles for each row execute function public.set_taxpayer_master_updated_at();

alter table public.taxpayer_profiles enable row level security;
alter table public.taxpayer_places_of_business enable row level security;
alter table public.taxpayer_authorised_signatories enable row level security;
alter table public.taxpayer_bank_accounts enable row level security;
alter table public.taxpayer_derived_attributes enable row level security;
alter table public.taxpayer_filing_history enable row level security;
alter table public.taxpayer_hsn_sac_codes enable row level security;

revoke all on all tables in schema public from anon, authenticated;
