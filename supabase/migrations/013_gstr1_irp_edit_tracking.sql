-- Keep the original IRN attached to an e-invoice while making any manual
-- invoice-content change visible in the GSTR-1 filing review.
alter table public.gstr1_documents
  add column if not exists is_irp_edited boolean not null default false;

