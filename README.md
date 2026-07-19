# Brea Web MVP

Brea helps a signed-in member find suitable people nearby, understand why each result is relevant, and send a lightweight connection request.

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

The frontend uses InsForge auth plus two active Functions through `@insforge/sdk`:

- `signInWithOAuth("linkedin")` for OAuth/PKCE sign-in
- `people-search` with `{ query, radiusKm, limit }`
- `connection-request` with `{ recipientId, sourceQuery }`

Each Function verifies the caller's bearer token, resolves the sender through `profiles.user_id`, and never trusts a browser-supplied sender ID. Search uses exact coordinates server-side but returns only rounded distance. Function errors use `{ code, message }`.

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

## Current limitations

- LinkedIn credentials and allowed redirect URLs must be configured separately in each environment.
- Members explicitly provide browser location during onboarding; exact coordinates are private.
- LinkedIn's normal sign-in scope provides basic identity, not a complete résumé or arbitrary member data.
- The flow ends at `Request sent`; inbox, chat, notifications, and recipient acceptance are out of scope.

See [USER_FLOW.md](./USER_FLOW.md) for the experience states and [MVP_PLAN.md](./MVP_PLAN.md) for the two-hour delivery plan.
