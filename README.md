# Ai Tutor — Onboarding

Concise, local-first developer README for the Ai Tutor onboarding demo app.

This repository is a Next.js (App Router + TypeScript) application that powers an onboarding flow and lesson interfaces. It uses Prisma for the database layer and is designed to run locally for development.

## What this repo contains

- Next.js app (App Router) under `src/app` with pages and API routes.
- Prisma schema and migrations under `prisma/`.
- Context and small libs under `src/context` and `src/lib`.

## Tech stack

- Next.js (App Router)
- TypeScript
- Prisma (ORM)
- Node.js

## Quick start — run locally

1. Install dependencies

```powershell
npm install
```

2. Copy environment variables

```powershell
copy .env.example .env
# then edit .env to set any DB or secret values
```

3. Prepare the database (Prisma)

If you are using SQLite (default for many local setups) the example `.env` should work out of the box. For other databases, set `DATABASE_URL` in `.env`.

```powershell
npx prisma migrate dev --name init
npx prisma generate
```

4. Run the dev server

```powershell
npm run dev
```

Open http://localhost:3000 in your browser.

## Important env vars

- `.env.example` contains the variables you should copy into `.env`.
- Typical variables used by this project:
  - DATABASE_URL — Prisma connection string
  - NEXT_PUBLIC_BASE_URL — (optional) absolute URL for previews or callbacks
  - NEXTAUTH_SECRET or other auth-related secrets if enabled

If you need help discovering required variables, open `.env.example` in the repo root.

## Useful npm scripts

- `npm run dev` — starts Next.js in development mode
- `npm run build` — builds the app for production
- `npm run start` — runs the production build locally
- `npm run prisma` — (if present) convenience script for Prisma commands

Check `package.json` for the exact scripts available in this repo.

## Prisma and database notes

- Migrations are in `prisma/migrations` — keep them committed.
- To reset local DB (dangerous on production):

```powershell
npx prisma migrate reset
```

Run `npx prisma studio` to open a local GUI and inspect data.

## Development tips

- Edit routes and UI under `src/app`.
- Shared logic and helpers live in `src/lib` and `src/context`.
- If you add types, update `src/types` accordingly.

## Troubleshooting

- If the app fails to start because of the database, confirm `DATABASE_URL` in `.env` and run `npx prisma migrate dev`.
- If TypeScript reports missing types, run `npm run build` to produce clearer errors, then fix or add types.

## Contributing

Small contributions and bug reports are welcome. For anything non-trivial, please open an issue describing the change first.

## License

This project doesn't include a license file by default — add one (for example, MIT) if you intend to publish or share the repository publicly.

---

If you'd like, I can also:

- add a small `prisma` script to `package.json` for convenience,
- create a quick start `docker-compose.yml` for a Postgres-backed dev DB,
- or run a quick check of `package.json` and `prisma/schema.prisma` to surface any obvious missing env vars. Tell me which and I'll proceed.
