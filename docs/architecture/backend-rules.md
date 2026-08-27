# Backend rules

## Boundaries

Keep database service-role credentials in server-only modules. Never import `src/lib/supabase-admin.ts` into client components. `getSupabaseAdmin()` must be called only after request authentication succeeds.

## Naming

Use lowercase `snake_case` for database objects and descriptive TypeScript names for application code.

## API patterns

Validate untrusted input on the server. Return generic authentication failures and never log passwords, hashes, or secrets.

## Authentication

Supabase Auth owns browser sessions. Route handlers must validate the bearer token with `auth.getUser(token)` and scope all database reads by the resulting `auth.users.id`. A user maps to exactly one GSTIN through `taxpayer_profiles.user_id`.

## Profile API

`GET /api/profile` requires `Authorization: Bearer <Supabase access token>`. It returns only the caller's taxpayer profile and related read-only master records. Bank account numbers and signatory email/mobile values are masked in the DTO; raw values never leave the server.
