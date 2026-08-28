# AGENT-FIXES — resolutions to the six review issues
**Apply in order. Item 2's SQL file replaces every earlier version of migration 003 (TECHNICAL.md §2.2 and DATABASE.md §6 are superseded by the shipped `003_returns_refunds_ledgers.sql`).**

---

## 1. Missing `design-reference/` — RESOLVED (files shipped)

The package `design-reference.zip` contains the four binding files + a README stating precedence:
`returns-page-design-v2-final.html` (copy exactly) · `user-flow-complete.html` (screen map) · `dashboard-design-v2.html` (direction) · `gstr1-filing-design-v1.html` (StepCard/upload patterns).
Unzip to `design-reference/` at repo root. Do not begin any screen without these present.

## 2. `auth.users(id)` vs `users(id)` mismatch — RESOLVED (corrected SQL shipped)

The shipped `003_returns_refunds_ledgers.sql` references **`auth.users(id)`** on every `user_id` FK, matching the 002 profile tables. The legacy public `users` table is not referenced by anything new; leave it untouched. All API routes must resolve `user_id` from the validated bearer token (`supabase.auth.getUser(token)` → `user.id`) — never from a public-table lookup. Grep rule before merge: no new migration or query may contain `references users(` or join `public.users`.

## 3. `doc_type` enum too narrow — RESOLVED (in the same SQL)

`doc_type` is now `('INV','CN','DN','ADVANCE','ADVANCE_ADJ')`, so router steps 1–2 (AT / ATADJ) and the upload schema's allowed values are representable. Also added: `documents.original_advance_ref` (links an ADVANCE_ADJ to its ADVANCE, per the upload schema). Validation additions for these types: `line_items` carry rate + amounts but `hsn` may be null; `quantity` null allowed; ADVANCE_ADJ requires `original_advance_ref`. The seeded demo data contains **zero** advance documents (Aarohan AT/ATADJ row renders as the greyed empty category) — the enum exists so an uploaded file using them routes correctly instead of erroring.

## 4. Demo credentials — DEFINED (use exactly these)

| Card label | Email | Password | seed_name |
|---|---|---|---|
| Aarohan Systems — monthly filing story | `aarohan.demo@gstflow.in` | `GSTflow#2026` | `aarohan` |
| Meridian Packaging — refund story | `meridian.demo@gstflow.in` | `GSTflow#2026` | `meridian` |
| New user — empty account | `fresh.demo@gstflow.in` | `GSTflow#2026` | `clean` |

Create them once via a setup script (`scripts/create-demo-users.ts`) using the service-role client: `auth.admin.createUser({ email, password, email_confirm: true })`; skip if the email already exists. The three login-page cards sign in with these credentials via normal `signInWithPassword` — no magic links, no admin calls from the browser. Mapping email → seed_name lives in `lib/seed/index.ts` and nowhere else.

## 5. Provisioner conflicts — REPLACE with the versioned provisioner

The old provisioner (Aarohan-only, July-filed, idempotent-on-profile-existence) is **wrong on all three counts** for the new canonical state. Replace its body; keep its route if convenient.

**Spec — `POST /api/demo/provision` (called by the login page after every successful demo sign-in):**

```
SEED_VERSION = 3            // bump this integer whenever any seed JSON changes

resolve user_id from token; seed_name from email map (unknown email → seed_name 'clean')
state = select * from demo_seed_state where user_id = :uid
if state exists AND state.seed_version == SEED_VERSION AND state.seed_name == seed_name:
    return { ok, data: { seeded: false } }        // fresh — nothing to do
// else: WIPE then RESEED inside one transaction
```

**Wipe order (children → parents; deletes scoped `where user_id = :uid` unless cascaded):**
1. `refund_status_events`, `refund_inversion_decisions`, `refund_line_classifications` (cascade via `refund_applications`, but delete explicitly for clarity) → `refund_applications`
2. `ims_actions`, `gstr2b_snapshots`
3. `document_lines` (cascades from documents) → `documents` → `irp_einvoices` → `upload_batches`
4. `return_filings`, `payments`, `ledger_entries`, `annual_returns`
5. Legacy inconsistency: delete this user's `taxpayer_filing_history` rows (the old July-filed rows are exactly the stale data the review flagged)
6. Profile master rows (`taxpayer_profiles` + children): **upsert**, don't delete — bank/signatory ids may be referenced.

**Reseed** from the mock-data JSON files (ship them in `lib/seed/data/…`, exactly the package contents):
- `aarohan`: profile upsert · suppliers/buyers into seed-side lookups · Apr–Jun: documents+lines (status FILED), purchases (documents INWARD + implicit ACCEPT ims_actions), `return_filings` FILED with ARNs/summaries, `payments`, `ledger_entries` from `ledger_entries.json` · **July: `irp_einvoices` (100 rows, unimported) + INWARD purchase documents only; NO outward committed documents, NO July GSTR-1/3B filed rows beyond `return_filings` NOT_STARTED with due dates; `sample_upload.json` stored as the payload the `/sample` endpoint posts.** This is the "July mid-flow" state the old provisioner violated.
- `meridian`: everything per its files — all periods FILED (July 3B filed 12-08-2026), 102 e-invoices as FILED outward documents (`irn` set, also mirrored in `irp_einvoices` with `imported_document_id` set), 10 INWARD purchases, `gstr2b_snapshots` for 072026, ledger entries (closing ₹58,40,000 credit).
- `clean`: profile upsert only (minimal identity), nothing else.
- Finish: upsert `demo_seed_state {user_id, seed_name, SEED_VERSION, now()}`.
- Also idempotently upsert `hsn_rate_history` (global) on every provision run.

**Acceptance for this fix:** logging into a demo account that carries old seeds lands on the new canonical state with zero manual DB work; running provision twice in a row does nothing the second time; bumping `SEED_VERSION` re-seeds on next login.

## 6. Shared authenticated shell + footer strip — REFACTOR

- Extract the shell from `design-reference/returns-page-design-v2-final.html` into ONE layout component, `components/AppShell.tsx`, applied by the authenticated route-group layout (e.g. `app/(app)/layout.tsx`) so **every** authenticated page — including the existing Profile pages — renders inside it. Delete the profile-local nav; Profile keeps only its in-page tabs.
- AppShell owns: navy header (company + GSTIN from `/api/profile`, Logout), navy nav (`Dashboard · Returns · Purchases / IMS [badge] · Ledgers · Refunds · Annual Return`; active from the current pathname; badge = live pending-IMS count via a lightweight `/api/ims/badge?period=current`), navy footer, and the **subfoot strip** `Prototype · synthetic data · filing is simulated` — the strip lives in AppShell only, so it is on every page by construction and never duplicated per-page.
- `/login` stays outside the group (no shell). Anti-drift check DESIGN.md §7 item 1 now reads: "shell rendered by AppShell, not re-implemented locally."

---

### Doc deltas (so the docs stay truthful)
- TECHNICAL.md §2.2 and DATABASE.md §6 → superseded by the shipped SQL file (note added here rather than re-issuing both docs).
- PRD F1 req 1–2 → credentials and provisioner behaviour as defined in §4–§5 above.
- TECHNICAL §3.4 → replaced by §5 above (versioned, three users, wipe-then-reseed).
