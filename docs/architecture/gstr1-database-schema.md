# GSTR-1 outward supplies database schema

This is the implementation guide for [migration 003](/Users/rosh/Desktop/GST_Portal_prototype/supabase/migrations/003_create_gstr1_outward_supplies.sql). It reflects the GSTR-1 field inventory supplied with this project, current through 25 August 2026. It is a prototype data model, not an official GSTN integration schema.

## Modelling decision

`gstr1_documents` and `gstr1_document_lines` hold the invoice/note facts once. Their `bucket` gives the GSTR-1 table placement; it is derived on save from recipient GSTIN, POS, invoice value, supply type, reverse charge, and amendment attributes. The B2CL threshold is a date-effective business rule, not a database constant.

This prevents the same invoice from being copied into a B2B/B2CL table, an amendment table, HSN summary, and filing summary. `gstr1_hsn_summaries` is the exception: it preserves the preparer's Table 12 submission because GSTN permits a value mismatch as a warning. Reconciliation must compare it to the source facts before filing.

## Coverage

| GSTR-1 table | Storage | Key fields captured |
| --- | --- | --- |
| Header | `gstr1_returns` | GSTIN, period, FY, status, AATO snapshot, ARN/date, filing method/signatory |
| 4A/4B/4C/6B/6C | `gstr1_documents` + `gstr1_document_lines` | receiver GSTIN, invoice fields, POS, RCM, differential tax, B2B/SEZ/deemed bucket, item taxes |
| 5A/5B | `gstr1_documents` + lines | B2CL invoice fields, POS, ECO GSTIN, rate-wise taxes |
| 6A | `gstr1_documents` + lines | export type, port, shipping bill/date, invoice and tax lines |
| 7 / 10 | `gstr1_b2cs_summaries` | POS, intra/inter-state, ECO GSTIN, rate/tax values, original period/POS for amendments |
| 8A–8D | `gstr1_nil_exempt_supplies` | nil/exempt/non-GST × registered/unregistered × intra/inter-state amount |
| 9B / 9C | `gstr1_documents` + lines | note type/reason, original document key, recipient bucket, amendment key |
| 11A / 11B, amendments | `gstr1_advances` | received/adjusted, original period, POS, rate, gross advance and taxes |
| 12 | `gstr1_hsn_summaries` | B2B/B2C tab, HSN, descriptions, UQC, quantity, taxable value, rate, taxes |
| 13 | `gstr1_document_series` | document nature, serial range, total, cancelled, generated net issued |
| 14 / 14A / 15 / 15A | `gstr1_eco_supplies` | ECO GSTIN, POS, rate/tax values and original period for amendment tables |

## Important constraints and operational rules

- Table 12 is unique on **B2B/B2C + HSN + UQC + rate**, matching the portal rule.
- An e-invoice source requires an IRN. Once an e-invoice is edited, clear `irn`/`irn_date`, set `irn_severed = true`, and set source to `MANUAL` in the same transaction.
- Amendment buckets require original tax period, document number, and document date. B2CS/advance amendments similarly require their original key.
- GST tax validation prevents IGST alongside CGST/SGST and requires CGST = SGST/UTGST. Application rules must additionally check supplier-state versus POS and the applicable rate/HSN rule.
- Table 13 net issued is generated from total minus cancelled; users cannot enter a conflicting number.
- All tables have RLS enabled and no browser policies. Only protected server-side code should access them.

## Summary-generation rules to implement in the service layer

The migration intentionally does not hard-code changing GSTN rules. On `Generate Summary`, the service should:

1. derive B2B/B2C Table 12 totals from documents, lines, B2CS, nil rows and the relevant amendment differentials;
2. block when B2B source data exists but the B2B Table 12 tab is empty, or when Table 12 contains orphan data;
3. warn (not block) on B2C Table 12 emptiness and value mismatches, in accordance with the supplied GSTN guide;
4. block when reportable data exists without Table 13 series; and
5. enforce the current B2CL threshold and HSN digit policy using versioned effective-date configuration.

The GSTR-1A same-period amendment window, IFF eligibility, return sequencing, three-year filing bar, and GSTR-3B prerequisites are filing-service validations, not extra per-row fields.
