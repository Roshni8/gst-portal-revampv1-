# Database schema

## `users`

| Column | Type | Rules |
| --- | --- | --- |
| `id` | `uuid` | Primary key, generated |
| `username` | `text` | Unique, required, normalized lowercase |
| `password_hash` | `text` | Required bcrypt hash |
| `role` | `text` | Required, defaults to `admin` |
| `created_at` | `timestamptz` | Required, defaults to current time |

## Access

Row-level security is enabled with no browser-accessible policies. The application reads this table only through the server-side Supabase service role.

## Taxpayer master (`002_create_taxpayer_master.sql`)

`taxpayer_profiles` owns the complete GST taxpayer identity. It is linked one-to-one with `auth.users` through `user_id`; `gstin` is the primary key and is globally unique. The PAN is checked against the GSTIN, and a user cannot own more than one GSTIN in this prototype.

The following child tables reference `taxpayer_profiles.gstin` and cascade when the profile is removed:

| Table | Purpose |
| --- | --- |
| `taxpayer_places_of_business` | One principal place and any additional places |
| `taxpayer_authorised_signatories` | Signatories, with at most one primary record |
| `taxpayer_bank_accounts` | Validated accounts, with at most one primary record |
| `taxpayer_derived_attributes` | Cached AATO and filing-dependent rules |
| `taxpayer_filing_history` | One return type per tax period |
| `taxpayer_hsn_sac_codes` | Active goods and services master codes |

All master tables have RLS enabled and no browser-facing policies. Reads are made only through the protected server API.
