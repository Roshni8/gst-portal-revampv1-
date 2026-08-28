-- Index the predicates and sort orders used by the authenticated portal reads.
-- These indexes keep profile, returns, outward-supplies and IMS pages responsive
-- as the number of registrations, invoices and reconciliation rows grows.

create index if not exists taxpayer_places_gstin_address_type_idx
  on public.taxpayer_places_of_business (gstin, address_type);
create index if not exists taxpayer_signatories_gstin_primary_idx
  on public.taxpayer_authorised_signatories (gstin, is_primary desc);
create index if not exists taxpayer_bank_accounts_gstin_primary_idx
  on public.taxpayer_bank_accounts (gstin, is_primary desc);
create index if not exists taxpayer_filing_history_gstin_due_date_idx
  on public.taxpayer_filing_history (gstin, due_date desc);
create index if not exists taxpayer_hsn_sac_codes_gstin_code_idx
  on public.taxpayer_hsn_sac_codes (gstin, code);

create index if not exists gstr1_documents_active_return_date_idx
  on public.gstr1_documents (gstr1_return_id, document_date)
  where record_status <> 'DELETED';
create index if not exists irp_einvoices_unimported_user_period_date_idx
  on public.irp_einvoices (user_id, period, irn_date)
  where imported_gstr1_document_id is null;
create index if not exists ims_reconciliation_results_run_idx
  on public.ims_reconciliation_results (run_id);
