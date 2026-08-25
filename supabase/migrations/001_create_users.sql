create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  password_hash text not null,
  role text not null default 'admin',
  created_at timestamptz not null default now(),
  constraint users_username_format check (username ~ '^[a-z0-9._-]{3,32}$'),
  constraint users_role_nonempty check (length(trim(role)) > 0)
);

alter table public.users enable row level security;

-- No public policies are created. Only the server-side service role can access users.
revoke all on table public.users from anon, authenticated;
