# Brea Web

Brea helps a signed-in member find suitable people nearby, understand why each result is relevant, start a connection, and continue the conversation. The shipped web app includes profile galleries, semantic search with a deterministic fallback, a Requests inbox, accepted-connection messaging, safety controls, and an admin moderation surface.

LinkedIn OAuth establishes the member's identity. Brea then creates one private application profile per InsForge auth user and asks the member to review it before publication. Sensitive operations go through authenticated Edge Functions; owner profile and photo operations are constrained by grants, row-level security, and storage policies.

## Local setup

Requirements: Node.js 22 and npm. Node 22.22+ is recommended when using the current InsForge CLI.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Only the anonymous publishable key is required locally:

```dotenv
VITE_INSFORGE_ANON_KEY=

# Leave both URLs empty to use the first-party same-origin proxies.
VITE_INSFORGE_URL=
VITE_INSFORGE_FUNCTIONS_URL=
```

With the URL variables empty, Vite proxies `/api` and `/fn` to InsForge while the browser stays on the page origin. Vercel applies equivalent rewrites in production. This keeps the HttpOnly refresh cookie first-party; direct cross-origin URLs break session persistence in Safari/ITP and incognito windows.

Only public InsForge values belong in `VITE_*` variables. Never place the InsForge admin/API key, OAuth secrets, or raw coordinates in frontend environment variables.

Useful checks:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run preview
```

## Backend contract

The frontend uses InsForge auth (`signInWithOAuth("linkedin")` for OAuth/PKCE sign-in) plus eight active Edge Functions through `@insforge/sdk`:

- `people-search` — `{ query, radiusKm, limit }` → nearby profiles ranked by semantic embedding similarity, with keyword fallback, evidence-based match reason, rounded distance, and connection status
- `connection-request` — `{ recipientId, sourceQuery }` → send or re-request a connection (idempotent; typed 409 conflicts)
- `connection-inbox` — `{}` → the member's incoming and outgoing requests
- `connection-respond` — `{ connectionId, action }` → accept or decline an incoming request
- `connection-messages` — list or send messages inside an accepted, unblocked connection
- `profile-safety` — `{ action, profileId, ... }` → hide (block) or report a profile
- `track-event` — `{ eventName, properties }` → record a client product event
- `moderation-console` — allowlisted-admin queue and resolution actions for reports and recent blocks

Members read and write only their own `profiles` row directly under row-level security. Profile photos use the public-read `profile-photos` bucket with owner-scoped upload/delete policies; the profile stores both URL and storage key. All connection, message, moderation, safety, and analytics tables are server-only.

Each Function verifies the caller's bearer token, resolves the actor through `profiles.user_id`, and never trusts a browser-supplied identity. Search uses exact coordinates server-side but returns only rounded distance. Function errors use `{ code, message }`. See the [technical contracts](./docs/technical/DATA_SECURITY_AND_FUNCTIONS.md) for the complete shipped boundary and [insforge/BACKEND_RUNBOOK.md](./insforge/BACKEND_RUNBOOK.md) for deployment order and operational checks.

## LinkedIn OAuth setup

Code support is complete, but every InsForge environment needs a LinkedIn provider configuration and its own frontend redirect allowlist:

1. Create or select a LinkedIn Developer app and enable **Sign In with LinkedIn using OpenID Connect**.
2. In the InsForge dashboard, enable the LinkedIn provider using InsForge shared keys or an approved app-specific client.
3. Copy the LinkedIn callback URL shown by InsForge into the LinkedIn app's authorized redirect URLs.
4. Add the plain frontend origins you use (local, Preview, and Production) to InsForge's allowed redirect URLs.
5. Reload Brea and confirm the sign-in screen enables the LinkedIn button.

Standard LinkedIn sign-in supplies the signed-in member's basic identity. Brea does not scrape LinkedIn, import the member's connections, or fetch arbitrary profiles.

## Vercel deployment

The repo deploys through `.github/workflows/deploy.yml` to `rex-yens-projects/brea-replace-ditto`. Production deploys on pushes to `main`; pull requests receive Preview deploys.

`VITE_INSFORGE_ANON_KEY` is a public build value. Keep `VITE_INSFORGE_URL` and `VITE_INSFORGE_FUNCTIONS_URL` unset so `vercel.json` routes `/api/*` and `/fn/*` server-side and preserves first-party auth cookies.

The backend `BREA_ALLOWED_ORIGINS` allowlist must contain the exact browser origin. Generated Vercel Preview URLs are not currently allowlisted, so authentication/profile paths can work there while `/fn/*` calls return 403. Use a stable preview origin or deliberately update the backend allowlist when a full Preview E2E pass is required.

Run the local quality suite before deploying:

```bash
npm run typecheck && npm run lint && npm run test && npm run build
```

Backend migration and Function deployment order is production-sensitive because the current Preview InsForge project also serves the production website. Follow the runbook; never promote a Preview artifact carrying a different backend configuration.

## Scope

Shipped and in scope:

- LinkedIn OAuth sign-in (required) with a per-user private profile and first-run onboarding (name, headline, bio, skills, interests, availability, general location, and an optional private geolocation origin (required before the first search)).
- Profile editing plus an ordered gallery of up to six profile photos.
- Nearby natural-language search with an adjustable radius (1–50 km, default 10 km), embedding-based ranking, and deterministic keyword fallback.
- Connection lifecycle: send a request, accept or decline it in a **Requests inbox**, and re-request after a decline. A member's optional LinkedIn URL is exchanged only once a request is accepted.
- One-to-one messaging for accepted, unblocked connections. The current UI polls every five seconds rather than using Realtime.
- Per-card hide (block) and report; product-event tracking.
- Admin-only `/admin` moderation queue, protected by `BREA_ADMIN_EMAILS`.

Under validation or not shipped (see the [Product Roadmap](./docs/product/ROADMAP.md)):

- Notifications (email or push).
- Events, feed, vouches, verification badges, passive discovery, and the broader relationship-activation workflow.
- Share Marketplace, ratings/reviews, payments, and automatic LinkedIn graph import.
- Real-time chat delivery, message pagination, read receipts, and attachments.

## Current limitations

- The live site still uses the `brea-mvp-preview` InsForge project. There is no isolated Production backend yet, so backend changes have a production blast radius.
- The member UI has three state-machine tabs and no client-side router. Add routing before shipping a fourth member screen.
- Members add their private location when they first search (or any time in profile editing); exact coordinates stay private.
- LinkedIn's normal sign-in scope provides basic identity (name, email, photo), not a complete résumé or arbitrary member data.
- Hidden profiles cannot currently be unblocked by the member without an admin/service operation.
- InsForge request stalls, intermittent `502 BOOT_FAILED`, cold starts, and large/concurrent diagnostic 504s remain tracked operational risks.

Start with [PRODUCT.md](./PRODUCT.md) for the product foundation and documentation map, [CURRENT_STATE.md](./docs/product/CURRENT_STATE.md) for the Production product truth, and [HANDOFF.md](./HANDOFF.md) when taking over engineering work. [insforge/BACKEND_RUNBOOK.md](./insforge/BACKEND_RUNBOOK.md) is the operational source of truth, and [docs/METRICS.md](./docs/METRICS.md) owns metric definitions and preserves the M1 query pack. The [archived PRD v2.0](./docs/archive/PRD_V2_AUTHENTICATED_RELEASE.md), [USER_FLOW.md](./USER_FLOW.md), and [MVP_PLAN.md](./MVP_PLAN.md) retain historical contracts and plans.
