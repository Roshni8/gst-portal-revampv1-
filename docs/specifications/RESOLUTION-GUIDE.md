RESOLUTION GUIDE — the seven data-validation issues
====================================================
Plain text, one decision per issue. The regenerated mock-data zip (v2) and
004_patches.sql shipped alongside this guide ARE the fixes — nothing below is
left as "to do" except the small doc-delta list at the end.

ISSUE 1 — Demo-count conflict (24 invoices vs 10)
--------------------------------------------------
DECISION: the PRD/design copy wins; the data was regenerated to match it.
sample_upload.json now contains exactly 24 invoices across 31 line rows in
10 categories: 14 plain B2B invoices (7 of them two-line) + the 10 special
docs (B2B-RC, B2CL, B2CS, export-with-missing-port-code, NIL, 2 CDNR, CDNUR,
B2BA, CDNRA). The upload report reads "31 rows read / 24 invoices found /
1 row needs fixing" and the commit bar reads "Commit 24 invoices into 10
categories" — both now literally true.
One deliberate simplification: the sample-upload B2B rows carry NO IRNs
(pure Excel path). The IRN sever demo uses an IMPORTED e-invoice instead, so
drop TECHNICAL 3.3's line "six of the B2B invoices carry IRNs".

ISSUE 2 — Seed data violated its own validation rules
------------------------------------------------------
All three fixed in the generator, and a full Section-6.2 validator now runs
over EVERY generated document before the package is written (it is assertion
#7 in MANIFEST.json), so this class of bug cannot ship again.
  a) Doc numbers: B2CS consolidated is now "B2CS-0726"; amended notes REUSE
     the original document number (is_amendment distinguishes them, and the
     unique key includes period so there is no clash). Longest doc number in
     the package is 15 characters.
  b) Tax-head exclusivity: no line anywhere has IGST together with CGST/SGST,
     and CGST always equals SGST (all engineered ITC amounts are even).
  c) Invoice value always equals the line totals exactly (0 difference, well
     under the Rs 10 threshold) — values are recomputed after any adjustment.

ISSUE 3 — IMS "do nothing" semantics
-------------------------------------
BINDING DECISION: the preview means ALL untouched IMS-eligible documents
(INV and CN, non-RCM). There is no third pseudo-state; the seed annotation
"UNREVIEWED" is gone.
To keep the demo numbers exact under that rule, the seed now SHIPS 33 ACCEPT
rows in ims_actions ("accepted earlier in the month as invoices arrived" —
realistic, and it is why the badge shows a focused number instead of 43).
Untouched at seed = exactly 9 documents: 8 invoices + 1 credit note, net ITC
Rs 4,32,100 (invoices Rs 4,37,500 minus the CN's Rs 5,400 — the CN's
reduction is itself a teaching moment: silence on a credit note CUTS your
credit). 2 of the 9 are not in the books, one of which is the duplicate.
Demo actions become: bulk "Accept all 6 matched pending invoices", reject
the duplicate, CN warning on the credit note.
RCM invoices bypass IMS entirely (flagged BYPASS_RCM in the data).

ISSUE 4 — Wipe order breaks on Meridian
----------------------------------------
Fixed in 004_patches.sql: the wipe function deletes irp_einvoices BEFORE
documents. The AGENT-FIXES wipe list is superseded by the function body —
the function IS the order now; do not re-implement it in TypeScript.

ISSUE 5 — Per-line vs per-invoice refund classification
--------------------------------------------------------
SCOPE DECISION (binding): classification is PER INVOICE in this prototype.
refund_line_classifications stays keyed on document_id. Rationale: every
seeded Meridian purchase is single-line, so per-line adds zero demo value;
and category (Inputs vs Capital) is in practice an invoice-level books fact.
Annexure B still renders one ROW per document_line (amounts from the line),
inheriting columns 10 and 17–20 from the invoice-level classification.
DATABASE.md 5.1's split note should be read with this scope line appended:
"classification columns are inherited from the invoice-level record; a
nullable document_line_id is a documented future extension, not built."

ISSUE 6 — Missing bank FK
--------------------------
Fixed in 004_patches.sql: refund_applications.bank_account_id now has a
foreign key to taxpayer_bank_accounts(id). No dangling bank selections.

ISSUE 7 — "One transaction" for wipe+reseed
--------------------------------------------
DECISION: atomic where it matters, self-healing where it does not.
  - The WIPE is atomic: one RPC call to wipe_demo_user(uid) (004_patches.sql,
    security definer, service-role only) = one implicit transaction. It can
    never half-complete.
  - The RESEED (many inserts over Supabase REST) is not one transaction and
    does not need to be, because demo_seed_state is upserted LAST, as the
    commit marker. If seeding dies mid-way, the marker is absent/stale, so
    the next login sees a version mismatch and runs wipe+reseed again from
    clean. Partial seeds are therefore unreachable by users and self-healing
    by construction.
  - Provisioner call order: resolve user -> check demo_seed_state ->
    rpc wipe_demo_user(uid) -> insert seeds (any order within parents-first)
    -> upsert demo_seed_state with SEED_VERSION. Bump SEED_VERSION to 4 now,
    since the seed JSON changed in this fix round.

DOC DELTAS (apply these words; nothing else in the docs changes)
----------------------------------------------------------------
1. PRD F8 req 1–2: "9 invoices" -> "9 documents (8 invoices + 1 credit
   note)"; the preview sentence gains "…and one credit note that cuts your
   credit by Rs 5,400"; "32 matched" -> "33 accepted earlier in the month";
   bulk bar -> "Accept all 6 matched pending invoices".
2. PRD F8: add one line — "Preview rule: every IMS-eligible document with no
   ims_actions row counts; RCM documents bypass IMS."
3. TECHNICAL 3.3: Aarohan July purchase composition -> "43 inward: 33 with
   seeded ACCEPT actions, 9 untouched (net Rs 4,32,100, 2 not in books,
   incl. 1 duplicate and 1 credit note), 1 RCM (Rs 9,000)"; delete the
   "six carry IRNs" sentence.
4. TECHNICAL 5.5 / AGENT-FIXES 5: wipe order text superseded by the
   wipe_demo_user function; SEED_VERSION = 4.
5. DATABASE.md 5.1: append the Issue-5 scope line above.
