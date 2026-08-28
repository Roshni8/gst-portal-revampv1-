# Technical design: April–August return-filing flow

## Goal

Replace the hardcoded Returns screen data with authenticated, database-backed
records for `test_admin123@gstprototype.test` (Aarohan Systems). April through
July 2026 are historical filed periods. August 2026 starts as an open period:
portal purchase invoices and IRP e-invoices exist, while ERP data and filing
decisions are empty until the tester performs the flow.

## User flow

```text
Returns dashboard
  └─ Select August 2026
       ├─ Outward supplies
       │    ├─ Import & download IRN e-invoices
       │    ├─ Upload ERP CSV
       │    ├─ Compare IRN and ERP tax heads
       │    └─ File GSTR-1
       └─ IMS / inward supplies
            ├─ See every portal purchase immediately
            ├─ Upload ERP CSV
            ├─ Reconcile values and tax heads
            ├─ Check counterparty registration/filing status
            ├─ Accept, reject, or keep pending
            └─ Submit IMS

GSTR-3B unlocks after GSTR-1 is filed and IMS is submitted.
Every detail screen returns to the August task chooser without losing saved data.
```

## Source-of-truth rules

- The browser never reads Supabase tables directly. It sends its bearer token
  to protected route handlers; the service-role client performs user-scoped
  reads and writes.
- `irp_einvoices` is the immutable government/IRP source. Importing copies its
  payload into `gstr1_documents` and `gstr1_document_lines` and records the
  imported document id. Repeated imports are idempotent.
- ERP rows are separate source records. They never overwrite IRN or portal
  data. Reconciliation results record differences.
- August contains no invented client-side invoice arrays. Before any tester
  action, outward invoices exist only in the IRP registry, inward invoices
  exist only in IMS portal data, and ERP tables are empty.
- April–July filing status, ARN, dates, outward invoices, and lines are stored
  in the database. August has open GSTR-1/GSTR-3B records.

## Required invoice fields

Both outward and inward ERP formats carry:

- invoice number, date, counterparty GSTIN and name;
- place of supply and total invoice value;
- HSN/SAC, quantity, UQC and GST rate where applicable;
- taxable value, IGST, CGST, SGST/UTGST and cess;
- source row/payload for traceability.

Validation rejects negative values, invalid GSTIN/date formats, IGST combined
with CGST or SGST, unequal CGST/SGST, and totals that do not reconcile.

## Counterparty checks

`gst_counterparties` is the reusable synthetic GST registration master. A
counterparty check copies the current status/filing observation into
`ims_counterparty_checks` for the active workspace. These rows form a temporary
“recent checks” list. Leaving IMS calls the authenticated clear endpoint, so a
later visit shows only checks performed during that visit; the permanent master
is never deleted.

## Filing transitions

- GSTR-1: `DRAFT` → `FILED`; filing requires at least one imported or uploaded
  outward document and creates a simulated ARN.
- IMS: open → submitted; each portal invoice has an explicit decision, with
  untouched invoices represented as `PENDING`.
- GSTR-3B: blocked until GSTR-1 is filed and IMS is submitted, then creates a
  filed history row and simulated ARN.

All write endpoints are idempotent or protected by database uniqueness keys.
All simulated filing actions remain labelled as prototype actions in the UI.

