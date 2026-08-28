# E-invoice and ERP reconciliation

This extends the existing GSTR-1 schema. It treats the imported e-invoice as the authoritative government-source record and keeps ERP uploads as separate, immutable source records. An ERP upload therefore cannot overwrite an IRN, an imported e-invoice, or the GSTR-1 facts that are later filed.

## Data flow

```text
e-invoice import → gstr1_documents + gstr1_document_lines
ERP CSV/XLSX/JSON → erp_invoice_uploads → erp_invoice_rows
                                           ↓
                         reconcile_erp_invoice_upload(upload_id)
                                           ↓
                   invoice_reconciliation_results / exceptions view
```

## Matching and exception policy

The database pairs an ERP record to an e-invoice using document type, a punctuation/case-normalised invoice number, and document date. It then compares recipient GSTIN, place of supply, total invoice value, taxable value, and IGST/CGST/SGST/cess using a ₹0.01 tolerance.

The results are immutable per run and classify each row as:

- `MATCHED` — both sources agree within the tolerance.
- `AMOUNT_MISMATCH` — a paired invoice has a monetary difference.
- `FIELD_MISMATCH` — a paired invoice differs in recipient GSTIN or place of supply.
- `ERP_ONLY` — a book/ERP invoice has no e-invoice counterpart.
- `EINVOICE_ONLY` — an e-invoice has no ERP counterpart.

The UI should list only the non-matched rows through `einvoice_erp_reconciliation_exceptions`. A later resolution workflow can add a separate decision table; it must not edit the original source records.

## Applying the migration

Apply `004_create_einvoice_erp_reconciliation.sql` after migrations 001–003. It enables RLS without browser policies, consistent with the rest of the prototype; protected API routes use the service-role client for imports and reconciliation.
