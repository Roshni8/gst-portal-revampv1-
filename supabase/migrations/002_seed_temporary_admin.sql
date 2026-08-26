-- Temporary synthetic hackathon account requested for prototype testing.
-- Username matching is case-insensitive in the application and stored lowercase.
insert into public.users (username, password_hash, role)
values (
  'admin_123',
  '$2b$12$5YfemKQcYOErXFb0o/XxZuHupLBt3aq015OPMhT98iT1.qk/gujgC',
  'admin'
)
on conflict (username) do update
set password_hash = excluded.password_hash,
    role = excluded.role;
