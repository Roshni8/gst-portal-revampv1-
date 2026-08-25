# GST UX Prototype

> **This is an independent hackathon prototype. It is not affiliated with, endorsed by, or connected to the Government of India, GSTN, or the official GST Portal. All data is synthetic/mock.**

A minimal Next.js backend foundation with Supabase Postgres, Auth.js credentials sessions, bcrypt password hashing, and a self-hosted CAPTCHA. Registration is intentionally not exposed; administrators create test users in the backend.

## Local setup

1. Create a free Supabase project.
2. Run `supabase/migrations/001_create_users.sql` in its SQL editor.
3. Copy `.env.example` to `.env.local` and fill in the values. Generate `NEXTAUTH_SECRET` with `openssl rand -base64 32`.
4. Run `npm run create-user -- demo_admin 'StrongPass!123'` and execute the printed SQL in the Supabase SQL editor.
5. Run `npm run dev`, then open `http://localhost:3000/login`.

Usernames are normalized to lowercase and must contain 3–32 lowercase letters, digits, dots, underscores, or hyphens. Passwords must be at least 12 characters and include uppercase, lowercase, a number, and a special character.

## Deployment

Vercel is the default target because it supports standard Next.js server routes and the required npm packages. Import this repository into Vercel, add every key from `.env.example`, set `NEXTAUTH_URL` to the production URL, and deploy. No Sites-specific bindings are used.

The Supabase service-role key is server-only. Never prefix it with `NEXT_PUBLIC_` or expose it to client code.

## Commands

```bash
npm run dev
npm run lint
npm run build
npm run create-user -- <username> '<password>'
```

## Documentation

Project documentation lives in `docs/`. Database migrations live in `supabase/migrations/`.

## License

MIT
