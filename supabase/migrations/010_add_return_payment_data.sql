alter table public.taxpayer_filing_history
  add column if not exists tax_paid numeric(14,2),
  add column if not exists payment_status text check (payment_status in ('Paid', 'Pending'));
