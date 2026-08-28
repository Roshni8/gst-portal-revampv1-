# GST Flow implementation plan

## Outcome

Deliver two deterministic, judge-ready stories on a fresh Supabase database:

1. Aarohan completes July GSTR-1 upload, review, IMS, GSTR-3B and ledger flow.
2. Meridian computes, files and tracks the ₹17,97,211 inverted-duty refund.

Every value must be traceable to seed data or a tested domain formula. Every
simulated government action must be labelled at the point of action.

## Working rules

- Read the relevant Next.js 16.3.3 guide in `node_modules/next/dist/docs/`
  before changing framework code.
- Browser requests use bearer-token API routes; only server code uses the
  service-role client.
- All queries are scoped by the authenticated `auth.users.id`.
- React components format values but do not perform business arithmetic.
- All ledger writes go through one `postLedgerEntries` domain function.
- Business dates use `DEMO_TODAY`, never the wall clock.
- Preserve `/design-reference` structure and tokens on every screen.
- Implement P0 end-to-end before expanding P1/P2 surfaces.

## Phase 0 — baseline and specification gate

1. Record the current lint/build baseline and current Git state.
2. Read the applicable Next.js App Router, route-handler, authentication and
   caching guidance from the installed Next package.
3. Treat `docs/specifications/README.md` as the canonical precedence map.
4. Add automated seed-contract tests for the v2 manifest before importing any
   records into Supabase.

Exit gate: the repository builds unchanged, all source documents are available,
and tests can parse the complete v2 package.

## Phase 1 — database foundation

1. Promote the reviewed 003 and 004 SQL references into executable migrations.
2. Confirm every `user_id` FK targets `auth.users(id)`.
3. Confirm RLS is enabled and browser policies are absent on every new table.
4. Apply the bank-account FK and atomic `wipe_demo_user` RPC.
5. Verify the RPC is executable by `service_role` only.
6. Add schema checks for enum coverage, unique keys, indexes and cascade order.

Exit gate: migrations 001–004 apply in order to a fresh database and schema
introspection matches the Database specification.

## Phase 2 — canonical seed and demo authentication

1. Copy `gstflow-mock-data-v2` verbatim to `src/lib/seed/data`.
2. Add `SEED_VERSION = 4` and the single email-to-seed mapping:
   Aarohan, Meridian and clean.
3. Add the service-role setup script that creates the three confirmed Supabase
   Auth users idempotently.
4. Replace the Aarohan-only profile provisioner with `/api/demo/provision`.
5. Provision parents before children and write `demo_seed_state` last.
6. Seed Aarohan July with no committed outward documents, 100 IRP records,
   43 inward documents and the prescribed IMS actions.
7. Seed Meridian as fully filed with the frozen 2B snapshot and ledgers.
8. Seed the clean account with identity only.
9. Test same-version no-op, interrupted-seed recovery and version-bump reseed.

Exit gate: each demo login receives only its own deterministic state; two
successive provision calls leave identical row counts and balances.

## Phase 3 — pure domain layer and tests

Create framework-independent modules:

- `constants.ts`: demo date, thresholds and due-date rules.
- `validation.ts`: shared Excel/JSON validation and plain-language errors.
- `routing.ts`: ordered GSTR-1 category routing and override constraints.
- `table12.ts`: B2B/B2C HSN aggregation.
- `table13.ts`: series detection and cancelled-count application.
- `gstr2b.ts`: accepted/rejected/pending/deemed snapshot builder.
- `rule88a.ts`: legal credit set-off and cash requirement.
- `ledger.ts`: the sole ledger journal writer and balance derivation.
- `refund.ts`: classification, inversion evidence, amended Rule 89(5), ceilings,
  head-wise debit and status transitions.
- formatters for Indian currency, DD-MM-YYYY and period labels.

Required assertions include:

- the 24-document sample routes into the expected ten non-empty categories;
- the missing-port-code row is the only blocking sample error;
- the IMS preview is nine documents and net ₹4,32,100;
- Rule 88A never crosses CGST directly to SGST or vice versa;
- Meridian refund is ₹17,97,211 with the exact head split;
- lowering Net ITC and excluding an inversion card recompute the result;
- running balances reproduce dashboard and ledger totals exactly.

Exit gate: domain tests pass without React, Next.js or network access.

## Phase 4 — authenticated shell and UI primitives

1. Move authenticated routes under a shared route-group layout.
2. Build one `AppShell` from the approved Returns HTML.
3. Remove the duplicate global/profile navigation implementations.
4. Add live company/GSTIN, logout, active navigation and IMS badge.
5. Place the prototype subfooter in the shell exactly once.
6. Implement Card, Chip, Button, Selector, DataTable, StepCard, NoteInline,
   Modal, Toast, EmptyState, ProvenanceBadge and Timeline primitives.
7. Add the three one-click demo cards and call provisioning after sign-in.

Exit gate: login remains outside the shell; every authenticated page shares the
same shell at 1366×768 and 360px with keyboard-visible focus.

## Phase 5 — Returns hub and GSTR-1 upload

1. Implement `/api/returns` and the FY/quarter/period selectors.
2. Build the shared 12-category table plus Table 12 and Table 13 rows.
3. Generate the two-sheet Excel template with dropdown validations.
4. Implement Excel/JSON parsing into one shared validation pipeline.
5. Implement sample loading directly from canonical JSON.
6. Persist batches, staged documents, lines and plain-language errors.
7. Replace a previous uncommitted batch safely on re-upload.

Exit gate: sample loading reports 31 rows, 24 invoices and one required fix in
under two seconds, without a file picker.

## Phase 6 — Review, workspace and GSTR-1 filing

1. Render errors first with inline fixes and live revalidation.
2. Group invoices by proposed category and expose allowed overrides with reasons.
3. Persist overrides without recomputing them on reload.
4. Block commit until all blocking errors are fixed.
5. Build the expandable workspace and derived Table 12/13 cards.
6. Require Table 13 confirmation before filing.
7. Implement preview, simulated filing, ARN creation and terminal read-only state.
8. Add idempotent e-invoice import and IRN provenance badges.

Exit gate: the Aarohan flow reaches a filed GSTR-1 and all workspace totals,
Table 12 and filing summary reconcile.

## Phase 7 — IMS and GSTR-2B

1. Implement the badge and period API from documents plus `ims_actions`.
2. Exclude RCM documents from IMS.
3. Calculate the preview from all eligible documents without an action row.
4. Seed/display 33 prior accepts and nine untouched documents.
5. Bulk accept the six matched pending invoices.
6. Implement reject and pending actions, including credit-note consequence copy.
7. Finalize the snapshot with user/deemed counts and signed CN treatment.
8. Lock the IMS window after GSTR-3B filing.

Exit gate: zero new actions reproduces the exact ₹4,32,100 preview; pending is
excluded, rejected is isolated and “accepted by silence” is visible.

## Phase 8 — GSTR-3B and ledgers

1. Enforce GSTR-1-filed and IMS-finalized prerequisites.
2. Derive all locked/pre-filled cells with source labels.
3. Implement guarded ITC adjustment behavior.
4. Build and persist the Rule 88A set-off plan.
5. Support a simulated challan when cash is insufficient.
6. Enforce once-only offset and transactional filing effects.
7. Build Credit, Cash and Liability tabs with running balances and source links.
8. Add SheetJS export of the visible ledger statement.

Exit gate: Aarohan completes demo script A and the ledger mutation test matches
every documented entry and closing balance.

## Phase 9 — refund flagship R1–R7

1. Build refunds home, eligibility checks and limitation countdown.
2. Create per-invoice classification records and deterministic suggestions.
3. Require confirmation of flagged goods and inversion evidence cards.
4. Recompute and persist the complete Rule 89(5) working after every decision.
5. Render Statement 1A and line-level Annexure B from stored source documents;
   inherit classification fields from the invoice record.
6. Validate bank selection and declarations.
7. Show the consequence modal before filing.
8. Post the exact credit-ledger debit, lock the 10 inward documents and issue a
   simulated ARN.
9. Build tracker clocks, status events and ledger-effect lines.

Exit gate: Meridian completes demo script B with ₹17,97,211 derived—not
hardcoded—and all resulting ledger/source links reconcile.

## Phase 10 — officer controls and remaining scope

1. Implement guarded officer state transitions behind `?officer=1` and Shift+O.
2. Implement deficiency/rejection re-credit behavior and unlock rules.
3. Build the data-driven dashboard and clean-account empty states.
4. Add thin GSTR-9, persistent Table 9 disagreement, and annual HSN summary.
5. Finish e-invoice sever and optional UTP delta mode.
6. Add profile AATO/e-invoice details and the minimal payments endpoint.

Exit gate: P0 is complete, then P1, then only approved P2 work.

## Phase 11 — final verification

1. Recreate a fresh database and run migrations 001–004.
2. Create all three demo users and provision each twice.
3. Run domain, API integration and mutation-idempotency tests.
4. Run both three-minute demo scripts from clean browser sessions.
5. Verify no cross-user leakage by switching accounts.
6. Reconcile every dashboard, return, snapshot, refund and ledger number.
7. Run lint, type checking and production build.
8. Check 1366×768 and 360px, keyboard navigation, labels, contrast and reduced
   motion.
9. Confirm every page has the honesty strip and every simulated action is
   labelled locally.
10. Confirm no saffron appears outside approved refund surfaces.

Definition of done: both stories work end-to-end on a fresh database without a
file picker, console error, unexplained disabled action or untraceable rupee.

