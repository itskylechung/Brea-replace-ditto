# Brea Web MVP

Brea helps a visitor find suitable people nearby, understand why each result is relevant, and send a lightweight connection request.

This repository contains the React frontend and the product contract. The InsForge database and Edge Functions are owned by the backend workstream; the browser never reads or writes base tables directly.

## Local setup

Requirements: Node.js 22 and npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Required browser-safe variables:

```dotenv
VITE_INSFORGE_URL=
VITE_INSFORGE_ANON_KEY=
```

Only the InsForge URL and anon key belong in `VITE_*` variables. Never place the InsForge admin/API key, MVP profile identity, or raw coordinates in frontend environment variables.

Useful checks:

```bash
npm run typecheck
npm run lint
npm run build
npm run preview
```

## Backend contract

The frontend calls two active InsForge Functions through `@insforge/sdk`:

- `people-search` with `{ query, radiusKm, limit }`
- `connection-request` with `{ recipientId, sourceQuery }`

The frontend does not send a sender ID or coordinates. Responses must match the frozen types in [PRD.md](./PRD.md#8-insforge-function-contract). Function errors use `{ code, message }`.

## Vercel Preview

The local repo is linked to the Vercel project `rex-yens-projects/brea-replace-ditto`. After the backend owner provides the Preview InsForge URL and anon key, add each value to both Vercel Preview and Development environments, then pull Development values locally:

```bash
vercel env add VITE_INSFORGE_URL preview
vercel env add VITE_INSFORGE_ANON_KEY preview
vercel env add VITE_INSFORGE_URL development
vercel env add VITE_INSFORGE_ANON_KEY development
vercel env pull .env.local --environment=development --yes
```

Run `npm run build` before deploying. A feature branch should deploy as a Vercel Preview. Production must be rebuilt from `main` with a separate Production InsForge environment; do not promote a Preview artifact that embeds Preview `VITE_*` values.

## MVP limitations

- No account or login UI.
- No browser geolocation.
- Nearby results are relative to the backend-managed MVP profile.
- All demo visitors share that server-side sender identity.
- The flow ends at `Request sent`; inbox, chat, notifications, and recipient acceptance are out of scope.

See [USER_FLOW.md](./USER_FLOW.md) for the experience states and [MVP_PLAN.md](./MVP_PLAN.md) for the two-hour delivery plan.
