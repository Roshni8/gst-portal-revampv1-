# GST Flow canonical specification set

This directory preserves the complete product, technical, design, database,
resolution and migration-reference documents supplied for the GST Flow
prototype. The older files remain intact for traceability; later resolution
documents override only the explicitly named passages.

## Reading order and precedence

1. The current user request always has highest authority.
2. `RESOLUTION-GUIDE.md` resolves the seven final data-validation decisions and
   applies the listed PRD, Technical and Database deltas.
3. `AGENT-FIXES.md` resolves the earlier six review issues, except where the
   Resolution Guide supersedes its seed version or wipe order.
4. `sql/004_patches.sql` is the reviewed patch reference applied after 003. Its
   repository copy includes the corrected legacy-history delete and explicit
   `service_role` execution grant.
5. `sql/003_returns_refunds_ledgers.sql` is the final base schema reference and
   supersedes earlier migration 003 text embedded in Technical/Database docs.
6. `DATABASE.md` governs table purpose and field provenance, subject to the
   per-invoice refund-classification scope decision in the Resolution Guide.
7. `TECHNICAL.md` governs APIs, computations and backend flow.
8. `PRD.md` governs product behavior, priorities and acceptance criteria.
9. `DESIGN.md` governs visual and copy rules. For exact visual structure, the
   files in `/design-reference` take precedence in the order stated there.
10. `MOCK-DATA-V2.md` records the verified canonical seed package and replaces
    illustrative Aarohan figures from earlier drafts.

## Important applied deltas

- Aarohan's sample upload is 24 invoices represented by 31 upload rows, with
  one deliberate missing-port-code error and no IRNs in the Excel batch.
- Aarohan IMS begins with 33 prior ACCEPT actions, nine untouched documents
  (eight invoices and one credit note), and one RCM document that bypasses IMS.
- The untouched net ITC is ₹4,32,100; two documents are not in the books; the
  bulk action targets six matched pending invoices.
- Refund classification is per invoice. Annexure B still renders per line and
  inherits classification columns from the invoice record.
- `SEED_VERSION` starts at 4 for the v2 package.
- Demo-user wipe is the 004 RPC order; do not reproduce that deletion sequence
  in TypeScript.

These are specifications and reviewed SQL references, not proof that the
migrations have been applied to any Supabase project.

