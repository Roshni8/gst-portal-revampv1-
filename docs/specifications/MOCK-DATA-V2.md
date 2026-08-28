# Mock data v2 — canonical seed contract

The canonical source package supplied as `gstflow-mock-data-v2` is deterministic
and must be copied verbatim into the implementation's seed-data directory. Do
not hand-maintain parallel TypeScript versions of its figures.

## Verified package facts

- 32 JSON files parse successfully.
- 771 documents and 801 document lines pass the package-wide validation scan.
- No document number exceeds 16 characters.
- No line mixes IGST with CGST/SGST; CGST always equals SGST.
- Every populated invoice reconciles exactly to its line totals.
- Aarohan has 100 IRP e-invoices per month from April through July 2026.
- Meridian has 102 July e-invoices and 10 inward documents.
- Meridian's amended Rule 89(5) result is ₹17,97,211, bounded by the formula.
- Meridian's credit-ledger balance is ₹58,40,000, and the expected debit is
  IGST ₹12,00,000 + CGST ₹2,98,606 + SGST ₹2,98,605.

## Aarohan July upload

`sample_upload.json` contains 24 documents. Thirty documents lines plus the
single NIL document row produce 31 upload rows. The only blocking validation
error is the missing port code on `AAR/26-27/07103`.

The Excel sample contains no IRNs. The IRN edit/sever demonstration begins by
importing one of the 100 records from `einvoices.json`.

## Aarohan July IMS state

There are 43 inward documents:

- 33 IMS-eligible documents with seeded ACCEPT actions;
- nine untouched IMS-eligible documents: eight invoices and one credit note;
- one RCM invoice marked `BYPASS_RCM`.

The preview considers every eligible document without an IMS action. Its net
ITC is ₹4,32,100, including a ₹5,400 reduction from the credit note. Two are
not in the purchase books. Six matched pending invoices are eligible for the
bulk-accept action.

## Provisioning contract

Use `SEED_VERSION = 4`. The provisioner checks `demo_seed_state`, calls the
atomic `wipe_demo_user` RPC when stale, inserts the v2 seed parents-first, and
upserts the seed-state row last as the commit marker. A failed partial reseed is
self-healing on the next login because no current marker exists.

