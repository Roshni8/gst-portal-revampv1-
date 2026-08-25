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
