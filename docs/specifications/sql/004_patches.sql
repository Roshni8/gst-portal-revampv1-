-- ============================================================================
-- 004_patches.sql — apply AFTER 003_returns_refunds_ledgers.sql.
-- Resolves the bank-account FK and installs the atomic demo-user wipe RPC.
--
-- This repository copy corrects two defects found while reviewing the pasted
-- draft: taxpayer_filing_history is owned by GSTIN (not user_id), and the
-- service_role must receive EXECUTE after PUBLIC execution is revoked.
-- ============================================================================

alter table refund_applications
  add constraint refund_applications_bank_fk
  foreign key (bank_account_id) references taxpayer_bank_accounts(id);

create or replace function wipe_demo_user(uid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Refund tree.
  delete from refund_status_events
    where refund_id in (select id from refund_applications where user_id = uid);
  delete from refund_inversion_decisions
    where refund_id in (select id from refund_applications where user_id = uid);
  delete from refund_line_classifications
    where refund_id in (select id from refund_applications where user_id = uid);
  delete from refund_applications where user_id = uid;

  -- IMS and GSTR-2B.
  delete from ims_actions where user_id = uid;
  delete from gstr2b_snapshots where user_id = uid;

  -- IRP rows reference documents, so they must be removed first.
  delete from irp_einvoices where user_id = uid;
  delete from documents where user_id = uid;
  delete from upload_batches where user_id = uid;

  -- Filings, money and annual return.
  delete from return_filings where user_id = uid;
  delete from payments where user_id = uid;
  delete from ledger_entries where user_id = uid;
  delete from annual_returns where user_id = uid;

  -- Legacy filing history is keyed by GSTIN rather than user_id.
  delete from taxpayer_filing_history history
  using taxpayer_profiles profile
  where profile.user_id = uid
    and history.gstin = profile.gstin;
end;
$$;

revoke all on function wipe_demo_user(uuid) from public;
revoke all on function wipe_demo_user(uuid) from anon;
revoke all on function wipe_demo_user(uuid) from authenticated;
grant execute on function wipe_demo_user(uuid) to service_role;

