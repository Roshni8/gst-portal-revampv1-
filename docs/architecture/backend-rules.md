# Backend rules

## Boundaries

Keep database service-role credentials in server-only modules. Never import `src/lib/supabase-admin.ts` into client components.

## Naming

Use lowercase `snake_case` for database objects and descriptive TypeScript names for application code.

## API patterns

Validate untrusted input on the server. Return generic authentication failures and never log passwords, hashes, or secrets.

## Authentication

Auth.js uses signed JWT sessions. Credentials are verified against bcrypt hashes stored in Supabase.
