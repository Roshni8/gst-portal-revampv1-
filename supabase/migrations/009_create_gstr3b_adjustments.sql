-- Account-scoped disclosures that do not originate in GSTR-1 or IMS invoices.
-- Invoice-driven values remain derived at read time; this table holds only the
-- statutory 3B rows that need an explicit preparation entry.
create table public.gstr3b_adjustments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  gstin text not null references public.taxpayer_profiles(gstin) on delete restrict,
  tax_period char(6) not null check (tax_period ~ '^(0[1-9]|1[0-2])[0-9]{4}$'),
  table_ref text not null check (table_ref in ('3.1D', '4A1', '4A2', '4A3', '4A4', '4B1', '4B2', '5_INTER', '5_INTRA', '5.1')),
  taxable_value numeric(15,2) not null default 0 check (taxable_value >= 0),
  igst numeric(15,2) not null default 0 check (igst >= 0),
  cgst numeric(15,2) not null default 0 check (cgst >= 0),
  sgst_utgst numeric(15,2) not null default 0 check (sgst_utgst >= 0),
  cess numeric(15,2) not null default 0 check (cess >= 0),
  source_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, tax_period, table_ref),
  check (not (igst > 0 and (cgst > 0 or sgst_utgst > 0))),
  check (cgst = sgst_utgst)
);

create index gstr3b_adjustments_user_period_idx on public.gstr3b_adjustments (user_id, tax_period);

create trigger gstr3b_adjustments_updated_at before update on public.gstr3b_adjustments
  for each row execute function public.set_gstr1_updated_at();

alter table public.gstr3b_adjustments enable row level security;
revoke all on public.gstr3b_adjustments from anon, authenticated;
