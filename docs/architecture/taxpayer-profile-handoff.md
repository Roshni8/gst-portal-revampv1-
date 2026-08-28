# Taxpayer Profile Backend — Handoff

## What is complete

The prototype now has a read-only, per-user GST taxpayer profile. Supabase Auth identifies the logged-in user; that user owns exactly one `taxpayer_profiles` row and therefore one GSTIN. The profile screen loads real Supabase rows through a protected Next.js API rather than browser placeholders.

## Data model

Run migrations in order: `001_create_users.sql`, then `002_create_taxpayer_master.sql`. The second migration creates these `public` tables:

| Table | Purpose |
| --- | --- |
| `taxpayer_profiles` | Core GSTIN, legal/trade identity, registration, jurisdiction, filing and contact details |
| `taxpayer_places_of_business` | One principal place plus additional places |
| `taxpayer_authorised_signatories` | Signatories, with at most one primary signatory |
| `taxpayer_bank_accounts` | Bank details and validation status, with at most one primary account |
| `taxpayer_derived_attributes` | Cached AATO and derived compliance rules |
| `taxpayer_filing_history` | Return records per type and tax period |
| `taxpayer_hsn_sac_codes` | Goods/services master codes used for invoicing |

Counterparty tables and related logic were intentionally removed. All master tables use RLS with no browser policies; server-side access uses the Supabase service-role key only.

## Backend contract

`GET /api/profile` requires `Authorization: Bearer <Supabase access token>`. It validates the token server-side, finds `taxpayer_profiles.user_id`, and returns only that user's profile and related rows. It masks signatory mobile/email fields and bank account numbers before sending data to the client.

`POST /api/profile/demo` is prototype-only provisioning. If the logged-in user has no profile, it creates the approved synthetic taxpayer master data. Do not expose write or edit controls in the UI; Phase 1 remains read-only.

## Frontend behavior

`src/app/profile/page.tsx` fetches `/api/profile` after Supabase session validation. If no profile is found, it calls the prototype provisioner once and reloads the data. All visible taxpayer details, places, signatories, banks, and HSN/SAC rows are mapped from the API response. The page uses a shaped skeleton loader rather than loading text. The GST service navigation is visible, but no service tab is active on `/profile`.

## Test data in Supabase

`test_admin123@gstprototype.test` is linked to synthetic GSTIN `29AAHCA3412R1Z5` for **Aarohan Systems Private Limited**. Its real table rows include 2 places of business, 2 authorised signatories, 2 bank accounts, 1 derived-attributes row, 8 filing-history rows, and 5 HSN/SAC codes.

## Validation and delivery

`npm run lint`, `npm run build`, and `npm run build:vinext` pass. The approved source is committed and pushed to GitHub (`main`, commit `7b58e94`). A Sites version has been saved; public deployment still needs final user approval because the existing site is public. Supabase migration and test data are already applied and visible in Table Editor.
