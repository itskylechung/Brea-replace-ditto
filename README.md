# Brea Web MVP

Brea helps a signed-in member find suitable people nearby, understand why each result is relevant, send a lightweight connection request, and manage incoming and outgoing requests from a Requests inbox.

LinkedIn OAuth establishes the member's identity. Brea then creates one private application profile per InsForge auth user and asks the member to review it before publication. Search and connection actions go through authenticated Edge Functions; direct database access is constrained by grants and row-level security.

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
VITE_INSFORGE_FUNCTIONS_URL=
VITE_INSFORGE_ANON_KEY=
```

Only the public InsForge API URL, Functions runtime URL, and anon key belong in `VITE_*` variables. Never place the InsForge admin/API key, LinkedIn client secret, or raw coordinates in frontend environment variables.

Useful checks:

```bash
npm run typecheck
npm run lint
npm run build
npm run preview
```

## Backend contract

The frontend uses InsForge auth (`signInWithOAuth("linkedin")` for OAuth/PKCE sign-in) plus six active Edge Functions through `@insforge/sdk`:

- `people-search` — `{ query, radiusKm, limit }` → ranked nearby profiles with match reason, rounded distance, and per-result connection status
- `connection-request` — `{ recipientId, sourceQuery }` → send or re-request a connection (idempotent; typed 409 conflicts)
- `connection-inbox` — `{}` → the member's incoming and outgoing requests
- `connection-respond` — `{ connectionId, action }` → accept or decline an incoming request
- `profile-safety` — `{ action, profileId, ... }` → hide (block) or report a profile
- `track-event` — `{ eventName, properties }` → record a client product event

Members also read and write their own `profiles` row directly under row-level security; every other table is reachable only through these Functions. Each Function verifies the caller's bearer token, resolves the actor through `profiles.user_id`, and never trusts a browser-supplied identity. Search uses exact coordinates server-side but returns only rounded distance. Function errors use `{ code, message }`. See [PRD.md](./PRD.md) for the full request/response shapes and error codes.

## LinkedIn OAuth setup

Code support is complete, but every InsForge environment needs its own LinkedIn provider credentials:

1. Create or select a LinkedIn Developer app and enable **Sign In with LinkedIn using OpenID Connect**.
2. In the InsForge dashboard, add the LinkedIn provider with that app's client ID and client secret.
3. Copy the LinkedIn callback URL shown by InsForge into the LinkedIn app's authorized redirect URLs.
4. Add the frontend origins you use (local, Preview, and Production) to InsForge's allowed redirect URLs.
5. Reload Brea and confirm the sign-in screen enables the LinkedIn button.

Standard LinkedIn sign-in supplies the signed-in member's basic identity. Brea does not scrape LinkedIn, import the member's connections, or fetch arbitrary profiles.

## Vercel Preview

The local repo is linked to the Vercel project `rex-yens-projects/brea-replace-ditto`. After the backend owner provides the Preview InsForge URL and anon key, add each value to both Vercel Preview and Development environments, then pull Development values locally:

```bash
vercel env add VITE_INSFORGE_URL preview
vercel env add VITE_INSFORGE_FUNCTIONS_URL preview
vercel env add VITE_INSFORGE_ANON_KEY preview
vercel env add VITE_INSFORGE_URL development
vercel env add VITE_INSFORGE_FUNCTIONS_URL development
vercel env add VITE_INSFORGE_ANON_KEY development
vercel env pull .env.local --environment=development --yes
```

The backend `BREA_ALLOWED_ORIGINS` allowlist must include the exact frontend URL. Prefer one stable Preview domain instead of adding every generated branch URL. Run `npm run build` before deploying. A feature branch should deploy as a Vercel Preview. Production must be rebuilt from `main` with a separate Production InsForge environment; do not promote a Preview artifact that embeds Preview `VITE_*` values.

## Scope

Shipped and in scope:

- LinkedIn OAuth sign-in (required) with a per-user private profile and first-run onboarding (name, headline, bio, skills, interests, availability, general location, and an optional private geolocation origin (required before the first search)).
- Nearby natural-language search with an adjustable radius (1–50 km, default 10 km).
- Connection lifecycle: send a request, accept or decline it in a **Requests inbox**, and re-request after a decline. A member's optional LinkedIn URL is exchanged only once a request is accepted.
- Per-card hide (block) and report; product-event tracking.

Out of scope (see [PRD.md](./PRD.md) §19 for the roadmap):

- Chat or real-time messaging.
- Notifications (email or push) — declining is silent, and there are no request/accept notifications.
- The Share Marketplace, ratings/reviews, payments, and a moderation/admin console.
- Semantic/vector search (ranking is deterministic keyword matching).

## Current limitations

- LinkedIn credentials and allowed redirect URLs must be configured separately in each environment.
- Members add their private location when they first search (or any time in profile editing); exact coordinates stay private.
- LinkedIn's normal sign-in scope provides basic identity (name, email, photo), not a complete résumé or arbitrary member data.
- The live site currently runs on the Preview InsForge backend; a dedicated Production project is future work.

See [PRD.md](./PRD.md) for the frozen product contract. [USER_FLOW.md](./USER_FLOW.md) and [MVP_PLAN.md](./MVP_PLAN.md) capture the original anonymous two-hour plan and are retained for history.
