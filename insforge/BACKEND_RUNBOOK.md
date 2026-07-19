# Brea backend runbook

The backend is deployed to the isolated InsForge Preview project:

- Project: `brea-mvp-preview`
- Project ID: `135081c0-d4dc-4d4d-b7ff-c4e94b4997e5`
- API base: `https://35byng5f.ap-southeast.insforge.app`
- Function runtime: `https://35byng5f.function2.insforge.app`
- Function slugs: `people-search` and `connection-request`

Production remains intentionally separate and is not configured by this runbook.

## Local verification

From the repository root:

```sh
deno task --config insforge/deno.json check
```

## Target setup and deployment

1. Authenticate/link the CLI and confirm the exact target with `npx @insforge/cli current`.
2. Apply `migrations/20260719000100_brea-mvp.sql` once through the target's migration workflow.
3. Confirm the reserved InsForge Function secrets are active:
   - `INSFORGE_BASE_URL`
   - `API_KEY`
4. Configure these application Function secrets without committing or logging their values:
   - `BREA_MVP_PROFILE_ID=00000000-0000-4000-8000-000000000001`
   - `BREA_ALLOWED_ORIGINS` as an exact, comma-separated origin allowlist
5. Deploy the two files with slugs matching their filenames:

```sh
npx @insforge/cli functions deploy people-search --file insforge/functions/people-search.ts
npx @insforge/cli functions deploy connection-request --file insforge/functions/connection-request.ts
```

Do not give `anon` or `authenticated` direct table grants. The Functions use the server-only admin
client, and the browser must access data only through the two Function slugs.

## OAuth sign-in configuration

LinkedIn (the only provider the UI offers), Google, and GitHub are enabled with InsForge shared
OAuth apps (`useSharedKey: true`); no provider credentials are stored in this project. OAuth
configs are not covered by `insforge.toml` — manage them in the InsForge dashboard under
`Auth Methods`, or through the admin API with the project API key:

```sh
# List configured providers
curl -sS "$INSFORGE_BASE_URL/api/auth/oauth/configs" -H "Authorization: Bearer $API_KEY"

# Enable LinkedIn with InsForge shared keys (applied to this Preview project on 2026-07-19)
curl -sS -X POST "$INSFORGE_BASE_URL/api/auth/oauth/configs" \
  -H "Authorization: Bearer $API_KEY" -H "Content-Type: application/json" \
  -d '{"provider":"linkedin","useSharedKey":true,"scopes":["openid","profile","email"]}'
```

The auth `allowed_redirect_urls` list must contain the plain frontend origins — currently
`http://localhost:5173`, `https://brea-replace-ditto.vercel.app`, and
`https://brea-replace-ditto-*-rex-yens-projects.vercel.app`. The frontend passes
`redirectTo: window.location.origin` and the SPA has no `/auth/callback` route; the SDK detects
the `insforge_code` callback parameter on any path. Update the list via `PUT /api/auth/config`
with `allowedRedirectUrls`, or in the dashboard.

A new environment (for example Production) needs both of these applied before LinkedIn sign-in
works: the provider config and the redirect-URL allowlist for its own frontend origins.

## Frontend handoff

Provide the frontend owner only the API base, anonymous key, Function runtime, and Function slugs.
Never provide `API_KEY` or `BREA_MVP_PROFILE_ID` to browser code.

For this Preview project, `@insforge/sdk` 1.4.5 derives the legacy
`https://35byng5f.functions.insforge.app` host, which does not contain this deployment. The frontend
client must pass `functionsUrl: "https://35byng5f.function2.insforge.app"` until the SDK's derived
URL matches the runtime reported by `npx @insforge/cli functions list`.

## Smoke checks after deployment

Invoke `people-search` with each payload and verify that every returned profile is within the
radius, has an evidence-based match reason, and contains no latitude, longitude, or score:

```json
{"query":"A product designer who enjoys hiking","radiusKm":10,"limit":12}
{"query":"Someone who can help me practice Japanese","radiusKm":10,"limit":12}
{"query":"A developer available for coffee","radiusKm":10,"limit":12}
{"query":"A marine biologist who plays the theremin","radiusKm":10,"limit":12}
```

The final query should return `{"results":[]}`. Then invoke `connection-request` twice with the same
payload. The first response must have `created: true`; the retry must return the same `id` with
`created: false`, and `public.connections` must contain only one sender/recipient row.

Finally, verify direct `anon` reads of both `public.profiles` and `public.connections` fail, inspect
Function/database logs for errors, and separately record Preview and Production Function status.
