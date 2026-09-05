-- Persist the category selected in the GSTR-1 workspace for either source.
-- The statements are idempotent so this can safely be applied to an existing
-- prototype database that already contains GSTR-1 data.
alter table public.gstr1_documents
  add column if not exists gstr1_category text;

alter table public.erp_invoice_rows
  add column if not exists gstr1_category text;

-- Give existing invoices the same categories that the workspace previously
-- derived at read time. New choices made in the UI then overwrite this value.
update public.gstr1_documents
set gstr1_category = case
  when bucket in ('CDNR', 'CDNR_AMENDMENT') then '9B - Credit / Debit Notes (Registered)'
  when bucket in ('CDNUR', 'CDNUR_AMENDMENT') then '9B - Credit / Debit Notes (Unregistered)'
  when bucket in ('EXPORT_WITH_PAYMENT', 'EXPORT_WITHOUT_PAYMENT', 'EXPORT_AMENDMENT') then '6A - Exports Invoices'
  when bucket in ('B2CL', 'B2CL_AMENDMENT') then '5A - B2C (Large) Invoices'
  when document_number ilike 'CN%' or document_number ilike 'DN%' then
    case when recipient_gstin is null then '9B - Credit / Debit Notes (Unregistered)' else '9B - Credit / Debit Notes (Registered)' end
  when recipient_gstin is null then '7 - B2C (Others)'
  else '4A, 4B, 6B, 6C - B2B, SEZ, DE Invoices'
end
where gstr1_category is null;

update public.erp_invoice_rows
set gstr1_category = case
  when recipient_gstin is null then '7 - B2C (Others)'
  else '4A, 4B, 6B, 6C - B2B, SEZ, DE Invoices'
end
where gstr1_category is null;
