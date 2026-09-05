-- Reconcile every invoice field except the source system itself. Rows without
-- a partner remain explicit E-invoice-only or ERP-only exceptions.
create or replace function public.reconcile_erp_invoice_upload(p_upload_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_run_id uuid; v_return_id uuid; v_user_id uuid; v_tolerance numeric(15,2) := 0.01;
begin
  select upload.gstr1_return_id, upload.uploaded_by_user_id into v_return_id, v_user_id from public.erp_invoice_uploads upload where upload.id = p_upload_id;
  if v_return_id is null then raise exception 'ERP invoice upload % does not exist', p_upload_id using errcode = 'P0002'; end if;
  insert into public.invoice_reconciliation_runs (upload_id, started_by_user_id, tolerance, total_erp_rows)
  select p_upload_id, v_user_id, v_tolerance, count(*) from public.erp_invoice_rows where upload_id = p_upload_id returning id into v_run_id;

  with einvoice_documents as (
    select document.id, document.document_type, public.normalize_invoice_identifier(document.document_number) as normalized_document_number,
      document.document_date, document.recipient_gstin, document.recipient_name, document.place_of_supply, document.total_document_value,
      coalesce(sum(line.taxable_value), 0) as taxable_value, coalesce(sum(line.igst), 0) as igst, coalesce(sum(line.cgst), 0) as cgst,
      coalesce(sum(line.sgst_utgst), 0) as sgst_utgst, coalesce(sum(line.cess), 0) as cess
    from public.gstr1_documents document left join public.gstr1_document_lines line on line.document_id = document.id
    where document.gstr1_return_id = v_return_id and document.source = 'EINVOICE' and document.irn is not null and document.irn_severed = false and document.record_status <> 'DELETED'
    group by document.id
  ), paired as (
    select erp.id as erp_id, einvoice.id as einvoice_id, erp.document_type, erp.normalized_document_number, erp.document_date,
      erp.recipient_gstin as erp_recipient_gstin, einvoice.recipient_gstin as einvoice_recipient_gstin,
      erp.recipient_name as erp_recipient_name, einvoice.recipient_name as einvoice_recipient_name,
      erp.place_of_supply as erp_place_of_supply, einvoice.place_of_supply as einvoice_place_of_supply,
      erp.total_invoice_value as erp_total_invoice_value, einvoice.total_document_value as einvoice_total_document_value,
      erp.taxable_value as erp_taxable_value, einvoice.taxable_value as einvoice_taxable_value,
      erp.igst as erp_igst, einvoice.igst as einvoice_igst, erp.cgst as erp_cgst, einvoice.cgst as einvoice_cgst,
      erp.sgst_utgst as erp_sgst_utgst, einvoice.sgst_utgst as einvoice_sgst_utgst, erp.cess as erp_cess, einvoice.cess as einvoice_cess
    from public.erp_invoice_rows erp join einvoice_documents einvoice
      on einvoice.document_type = erp.document_type and einvoice.normalized_document_number = erp.normalized_document_number and einvoice.document_date = erp.document_date
    where erp.upload_id = p_upload_id
  )
  insert into public.invoice_reconciliation_results (reconciliation_run_id, status, erp_invoice_row_id, einvoice_document_id, match_key, difference_summary)
  select v_run_id,
    case
      when abs(erp_total_invoice_value - einvoice_total_document_value) > v_tolerance or abs(erp_taxable_value - einvoice_taxable_value) > v_tolerance
        or abs(erp_igst - einvoice_igst) > v_tolerance or abs(erp_cgst - einvoice_cgst) > v_tolerance
        or abs(erp_sgst_utgst - einvoice_sgst_utgst) > v_tolerance or abs(erp_cess - einvoice_cess) > v_tolerance then 'AMOUNT_MISMATCH'::public.invoice_reconciliation_status
      when erp_recipient_gstin is distinct from einvoice_recipient_gstin
        or lower(btrim(coalesce(erp_recipient_name, ''))) is distinct from lower(btrim(coalesce(einvoice_recipient_name, '')))
        or erp_place_of_supply is distinct from einvoice_place_of_supply then 'FIELD_MISMATCH'::public.invoice_reconciliation_status
      else 'MATCHED'::public.invoice_reconciliation_status
    end,
    erp_id, einvoice_id, concat(document_type::text, ':', normalized_document_number, ':', document_date::text),
    jsonb_build_object('invoice_value_difference', erp_total_invoice_value - einvoice_total_document_value, 'taxable_value_difference', erp_taxable_value - einvoice_taxable_value,
      'igst_difference', erp_igst - einvoice_igst, 'cgst_difference', erp_cgst - einvoice_cgst, 'sgst_utgst_difference', erp_sgst_utgst - einvoice_sgst_utgst,
      'cess_difference', erp_cess - einvoice_cess, 'recipient_gstin_matches', erp_recipient_gstin is not distinct from einvoice_recipient_gstin,
      'recipient_name_matches', lower(btrim(coalesce(erp_recipient_name, ''))) is not distinct from lower(btrim(coalesce(einvoice_recipient_name, ''))),
      'place_of_supply_matches', erp_place_of_supply is not distinct from einvoice_place_of_supply)
  from paired;

  insert into public.invoice_reconciliation_results (reconciliation_run_id, status, erp_invoice_row_id, match_key)
  select v_run_id, 'ERP_ONLY'::public.invoice_reconciliation_status, erp.id, concat(erp.document_type::text, ':', erp.normalized_document_number, ':', erp.document_date::text)
  from public.erp_invoice_rows erp where erp.upload_id = p_upload_id and not exists (
    select 1 from public.invoice_reconciliation_results result where result.reconciliation_run_id = v_run_id and result.erp_invoice_row_id = erp.id);
  insert into public.invoice_reconciliation_results (reconciliation_run_id, status, einvoice_document_id, match_key)
  select v_run_id, 'EINVOICE_ONLY'::public.invoice_reconciliation_status, document.id, concat(document.document_type::text, ':', public.normalize_invoice_identifier(document.document_number), ':', document.document_date::text)
  from public.gstr1_documents document where document.gstr1_return_id = v_return_id and document.source = 'EINVOICE' and document.irn is not null and document.irn_severed = false and document.record_status <> 'DELETED' and not exists (
    select 1 from public.invoice_reconciliation_results result where result.reconciliation_run_id = v_run_id and result.einvoice_document_id = document.id);
  update public.invoice_reconciliation_runs run set matched_count = counts.matched_count, exception_count = counts.exception_count, completed_at = now()
  from (select count(*) filter (where status = 'MATCHED')::integer as matched_count, count(*) filter (where status <> 'MATCHED')::integer as exception_count from public.invoice_reconciliation_results where reconciliation_run_id = v_run_id) counts where run.id = v_run_id;
  update public.erp_invoice_uploads set status = 'RECONCILED', processed_at = now() where id = p_upload_id;
  return v_run_id;
end;
$$;

-- Rebuild the latest upload for each return so the Review tab immediately
-- reflects the new all-fields comparison, without waiting for another upload.
select public.reconcile_erp_invoice_upload(latest_upload.id)
from (
  select distinct on (gstr1_return_id) id
  from public.erp_invoice_uploads
  order by gstr1_return_id, uploaded_at desc
) as latest_upload;
