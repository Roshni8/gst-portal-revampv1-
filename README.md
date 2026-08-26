# GST UX Prototype

> **This is an independent hackathon prototype. It is not affiliated with, endorsed by, or connected to the Government of India, GSTN, or the official GST Portal. All data is synthetic/mock.**

A minimal Next.js backend foundation with Supabase Postgres, Auth.js credentials sessions, and bcrypt password hashing. Registration is intentionally not exposed; administrators create users in the backend.

## Local setup

1. Create a free Supabase project.
2. Run `supabase/migrations/001_create_users.sql` in its SQL editor.
3. Copy `.env.example` to `.env.local` and fill in the values. Generate `NEXTAUTH_SECRET` with `openssl rand -base64 32`.
4. Run `npm run create-user -- demo_admin 'StrongPass!123'` and execute the printed SQL in the Supabase SQL editor.
5. Run `npm run dev`, then open `http://localhost:3000/login`.

Usernames are normalized to lowercase and must contain 3–32 lowercase letters, digits, dots, underscores, or hyphens. Passwords must be at least 12 characters and include uppercase, lowercase, a number, and a special character.

## Supabase connection

1. Create a Supabase project and save its database password somewhere secure.
2. Open **SQL Editor** in Supabase and run `supabase/migrations/001_create_users.sql`.
3. Open **Project Settings → API** and copy the project URL, anon key, and service-role key.
4. Copy `.env.example` to `.env.local` and fill in the Supabase values.
5. Generate `NEXTAUTH_SECRET` with `openssl rand -base64 32`. Keep `NEXTAUTH_URL=http://localhost:3000` locally.
6. Generate a user insert with `npm run create-user -- <username> '<password>'`, then run the resulting SQL in the Supabase SQL Editor.
7. Start the app with `npm run dev` and verify login, dashboard protection, page reload, and logout.

The Supabase service-role key is server-only. Never prefix it with `NEXT_PUBLIC_`, expose it to client code, commit it, paste it into chat, or include it in screenshots.

## ChatGPT Sites deployment

ChatGPT Sites is the intended deployment target. Before publishing, Codex must adapt and validate this Next.js application as a Sites-compatible OpenNext or vinext build; a normal `.next` output cannot be uploaded directly.

During publishing, configure the five values from `.env.example` as Sites runtime environment variables. Mark `SUPABASE_SERVICE_ROLE_KEY` and `NEXTAUTH_SECRET` as secrets. Set `NEXTAUTH_URL` to the final Sites production URL, save a new Site version, and deploy that version so the environment revision is applied.

Do not add Supabase credentials to `.openai/hosting.json`; that file stores only Sites project metadata and optional logical bindings.

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
