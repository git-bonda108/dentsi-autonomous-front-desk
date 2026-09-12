# Dentsi Web Dashboard

Next.js dashboard for clinic staff: overview stats, appointments, call log,
escalation queue, and system health. In production it is compiled to a static
export and served by the NestJS backend under `/dashboard`, so it is
same-origin with the API.

## Stack

- Next.js 14 (App Router, all pages are client components)
- React 18, TypeScript, Tailwind CSS 3
- axios (single instance in `lib/api.ts`, 15 s timeout)
- lucide-react icons, date-fns
- Yarn 4 (`packageManager` pinned in `package.json`)

## Structure

```
app/
  page.tsx            # Overview: stats cards, system health, tables
  appointments/       # Appointments list
  calls/              # Call log
  escalations/        # Escalation queue (resolve action)
  clinics/            # Clinic list
components/           # Navigation, StatsCard, tables, SystemHealth, ClinicSelector
lib/
  api.ts              # API client + endpoint functions
  types.ts            # Types mirroring the Prisma models
  utils.ts            # Formatters and status color maps
```

## Development

```bash
cd dashboard
yarn install
# use the dev config (no static export, API URL env default)
mv next.config.mjs next.config.export.mjs && mv next.config.dev.mjs next.config.mjs
yarn dev          # http://localhost:3001
```

The dev config sets `NEXT_PUBLIC_API_URL` (default `http://localhost:3000`).
Restore the original `next.config.mjs` before building the export. The config
swap is manual — nothing in the repo automates it.

## API base URL resolution

`lib/api.ts` resolves the backend origin in this order:

1. `NEXT_PUBLIC_API_URL` (baked in at build time if set)
2. `window.location.origin` in the browser — correct for the production
   setup where the export is served by the backend itself
3. `http://localhost:3000` as the build-time fallback

## Static export for production

```bash
yarn build   # next.config.mjs: output 'export', basePath '/dashboard', distDir 'build'
```

Copy the `build/` output to `nodejs_space/public/dashboard/` — that directory
holds the committed export that `nodejs_space/src/main.ts` serves. Rebuild and
re-copy whenever dashboard code changes; the committed export does not update
itself.

## Endpoints consumed

`/api/dashboard/stats`, `/api/dashboard/appointments`, `/api/dashboard/calls`,
`/api/dashboard/escalations` (+ `PATCH .../:id/resolve`),
`/api/dashboard/health`, `/clinics`, `/patients`. All responses use the
`{ success, data, pagination? }` envelope.
