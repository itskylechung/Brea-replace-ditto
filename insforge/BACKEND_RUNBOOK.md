# Brea backend runbook

The authenticated backend is deployed to the full-copy InsForge branch:

- Parent project: `brea-mvp-preview`
- Branch: `linkedin-auth`
- API base: `https://35byng5f-g8u.ap-southeast.insforge.app`
- Function runtime: `https://35byng5f-g8u.function2.insforge.app`
- Function slugs: `people-search` and `connection-request`

Production remains intentionally separate and is not configured by this runbook.

## Local verification

From the repository root:

```sh
deno task --config insforge/deno.json check
```

## Target setup and deployment

1. Authenticate/link the CLI and explicitly switch with `npx @insforge/cli branch switch linkedin-auth`.
2. Apply pending files with `npx @insforge/cli db migrations up --all`.
3. Confirm the reserved InsForge Function secrets are active:
   - `INSFORGE_BASE_URL`
   - `API_KEY`
4. Configure `BREA_ALLOWED_ORIGINS` as an exact, comma-separated origin allowlist without committing or logging it.
5. Configure LinkedIn OAuth in the InsForge dashboard and add each frontend origin to the auth redirect allowlist. Keep the LinkedIn client secret server-side.
6. Deploy the two files with slugs matching their filenames:

```sh
npx @insforge/cli functions deploy people-search --file insforge/functions/people-search.ts
npx @insforge/cli functions deploy connection-request --file insforge/functions/connection-request.ts
```

`anon` has no table access. `authenticated` receives only owner-scoped profile access and participant-scoped connection reads/deletes, all behind RLS. Profile identity and timestamp columns are not updateable. The Functions use the server-only admin client only after verifying the caller's InsForge JWT.

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

Provide the frontend owner only the API base and anonymous key. Never provide `API_KEY` or LinkedIn's client secret to browser code.

## Smoke checks after deployment

Sign in as a test member, complete onboarding, and invoke `people-search` with each payload. Verify that every returned profile is within the
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

Finally, audit `pg_policies` and privileges: `anon` must have no access; authenticated profile policies must compare `user_id` with `auth.uid()`; connections must be visible only to sender or recipient; and `user_id`/timestamps must not be updateable. Inspect Function/database logs for errors and separately record branch and Production status.
