# Brea backend runbook

The real backend for Brea is the **parent InsForge project**. Every deployed frontend (local dev,
Vercel previews, and the current production site) targets it directly. There is no separate
authenticated branch: the former `linkedin-auth` full-copy branch is stale and slated for deletion
(see "Retiring the `linkedin-auth` branch" at the end).

## Project identity

- Project name: `brea-mvp-preview`
- Project id: `135081c0-d4dc-4d4d-b7ff-c4e94b4997e5`
- App key: `35byng5f`
- Region: `ap-southeast`
- API base (OSS host): `https://35byng5f.ap-southeast.insforge.app`
- Function runtime: `https://35byng5f.function2.insforge.app`

This is a **Preview** project. As of 2026-07-20 it **also serves the production site**
(`https://brea-replace-ditto.vercel.app`) — there is no dedicated Production InsForge project yet.
Standing up one is tracked as **OPS-02**; until it exists, treat any change here as
production-affecting.

Verify the live context and surface at any time (all read-only):

```sh
npx @insforge/cli current              # confirm the linked project is brea-mvp-preview / 35byng5f
npx @insforge/cli metadata --json      # auth providers, tables + row counts, functions
npx @insforge/cli functions list       # the six deployed functions
npx @insforge/cli db migrations list   # applied remote migrations
curl -s https://35byng5f.ap-southeast.insforge.app/api/auth/public-config   # expect "linkedin" in oAuthProviders
```

## Backend surface — the six functions

All six are deployed and `active` on the parent. Each is an authenticated POST endpoint that
enforces the `BREA_ALLOWED_ORIGINS` CORS allowlist, verifies the caller's InsForge JWT, then uses
the server-only admin client. Deploy any one with:

```sh
npx @insforge/cli functions deploy <slug> --file insforge/functions/<slug>.ts
```

| Slug                 | What it does                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `people-search`      | Nearby-people search. Ranks discoverable/available profiles within a radius (haversine distance) by embedding cosine similarity (OpenRouter `nvidia/nemotron-3-embed-1b:free`, cached per-profile in `profiles.embedding`/`embedding_hash`), falling back to weighted keyword matching when `OPENROUTER_API_KEY` is unset or the gateway errors. Returns an evidence-based `matchReason`, `distanceKm`, and a bidirectional `connectionStatus`. Strips latitude/longitude/score from output, filters out profiles blocked in either direction, and records a server-side `search_completed` event (with `ranking: semantic\|keyword`). Ranking quality is measured by `deno task eval` (`insforge/eval/ranking-eval.ts`). |
| `connection-request` | Sends a connection request from the caller to `recipientId` with a `sourceQuery`. Idempotent: a retry returns the existing row with `created: false`. Enforces 409s `INCOMING_REQUEST_EXISTS`, `ALREADY_CONNECTED`, and `RECIPIENT_UNAVAILABLE`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `connection-inbox`   | Returns the caller's connections split into `incoming` and `outgoing`, each joined with the other party's public profile fields (name, avatar, headline, location, LinkedIn URL).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `connection-respond` | Accepts or declines a pending incoming request (`connectionId` + `action: accept \| decline`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `profile-safety`     | `block` or `report` a profile (report reasons: `spam`, `harassment`, `misleading`, `unsafe`, `other`, plus optional free-text details). Writes `profile_blocks` / `profile_reports` and a product event.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `track-event`        | Records client analytics events into `product_events`. Only `sign_in_completed`, `profile_completed`, and `profile_updated` are accepted from the client; other events are written server-side by the functions above.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

## Database and migrations

Tables (parent, 2026-07-20): `profiles`, `connections`, `product_events`, `profile_blocks`,
`profile_reports`. Migration files live in **`migrations/` at the repo root** (not under
`insforge/`). Four are applied on the parent, in order:

- `20260719000100_brea-mvp`
- `20260719063613_linkedin-auth-profiles`
- `20260719064643_profile-provisioning-trigger`
- `20260719073000_authenticated-connection-lifecycle` — the connection-lifecycle migration (inbox /
  respond / block / report / events). This is the newest schema and is the migration the retired
  branch is missing.

- `20260722102300_profile-embeddings` — adds `profiles.embedding` / `profiles.embedding_hash` for
  semantic search (#69); written and applied only by the server-side admin client, though the
  pre-existing table-wide `GRANT SELECT ... TO authenticated` + own-row RLS policy means a member
  can read the columns on their own row. Rollback note: revert the `people-search` function deploy
  _before_ dropping these columns — the function hard-selects them, so dropping first turns every
  search into a 500.

Workflow:

```sh
npx @insforge/cli db migrations list          # what is applied remotely (read-only)
npx @insforge/cli db migrations new <name>    # scaffold a new local file
npx @insforge/cli db migrations up --all      # apply all pending (or --to <version>)
```

`db migrations up` mutates the live database and is a **human-gated** step — a coding agent in auto
mode must hand it to a human (`! <cmd>` in Claude Code), never run it itself. Confirm the target
with `db migrations list` first.

## Secrets

Manage with `npx @insforge/cli secrets list` (names only) / `secrets get <key>` / `secrets add` /
`secrets update`. Secret updates propagate to the functions runtime immediately — no redeploy
needed. `secrets update` is human-gated in agent auto mode.

- **`BREA_ALLOWED_ORIGINS`** (app secret) — an exact, comma-separated origin allowlist. Every
  function parses it, compares the request `Origin` header, returns `403 ORIGIN_NOT_ALLOWED` for
  anything not listed, and echoes `Access-Control-Allow-Origin` only for listed origins. Values are
  trimmed and split on commas.
  - **`KEY =` corruption gotcha (from HANDOFF):** a pasted `KEY =` prefix once landed _inside_ the
    value and silently broke only the first origin (localhost). `secrets get` already prints its own
    `KEY =` prefix, so if you see `KEY =` **twice**, the stored value is corrupted. CLI smoke tests
    cannot catch this because they send no `Origin` header — only a real cross-origin browser
    request (or an explicit `-H "Origin: ..."` curl) exercises CORS.
- **`OPENROUTER_API_KEY`** (app secret) — enables semantic ranking in `people-search` (#69). When
  absent or when the OpenRouter embeddings call fails, the function silently falls back to the
  legacy keyword ranking, so search never hard-depends on it. Server-side only.
- **`BREA_MVP_PROFILE_ID`** — **dead.** No deployed function reads it (the auth pivot removed the
  last reader). It is pending removal under **issue #29**; do not use it and do not re-add it to any
  new environment.
- **Reserved / InsForge-managed** (present, do not expose to browser code): `API_KEY`,
  `INSFORGE_BASE_URL`, `ANON_KEY`, the `JWT_*` keys, and `VERCEL_WEBHOOK_SECRET`. Functions read
  `INSFORGE_BASE_URL` + `API_KEY` to build their admin client.

## OAuth sign-in configuration (parent)

OAuth config is **not** covered by `insforge.toml`; manage it in the dashboard under `Auth Methods`,
or via the admin API with the project API key. Live state on the parent (verified 2026-07-20):
`oAuthProviders` = `github`, `google`, `linkedin`.

- **LinkedIn** is the only provider the UI offers. All providers use InsForge **shared** OAuth apps
  (`useSharedKey: true`), so **no provider client secret is stored in this project**.
- LinkedIn scopes: `openid`, `profile`, `email`.

```sh
# List configured providers
curl -sS "$INSFORGE_BASE_URL/api/auth/oauth/configs" -H "Authorization: Bearer $API_KEY"

# Enable LinkedIn with InsForge shared keys
curl -sS -X POST "$INSFORGE_BASE_URL/api/auth/oauth/configs" \
  -H "Authorization: Bearer $API_KEY" -H "Content-Type: application/json" \
  -d '{"provider":"linkedin","useSharedKey":true,"scopes":["openid","profile","email"]}'
```

**Redirect allowlist — plain origins.** The SPA passes `redirectTo: window.location.origin` and has
**no `/auth/callback` route**; the SDK detects the `insforge_code` callback parameter on any path.
The load-bearing `allowed_redirect_urls` entries are therefore the **plain frontend origins**:

- `http://localhost:5173`
- `https://brea-replace-ditto.vercel.app`
- `https://brea-replace-ditto-*-rex-yens-projects.vercel.app`

The live list currently _also_ carries `/auth/callback` variants of each. Those are inert (no such
route is ever hit) and safe to prune; do not rely on them and do not add callback paths to new
environments. Update the list in the dashboard, or via `PUT /api/auth/config` with
`allowedRedirectUrls`.

A new environment (e.g. the future Production project under OPS-02) needs **both** applied before
LinkedIn sign-in works: the provider config _and_ the plain-origin redirect allowlist for its own
frontend origins.

## Deploying a release — order matters

**Ship the frontend first, then the functions.** The frontend tolerates the legacy `"pending"`
`connectionStatus` value, so a frontend that is ahead of the functions is safe. Deploying functions
first can emit connection statuses an older frontend does not understand. This ordering is a
protected rule for every release.

Local type-check before deploying (requires Deno, which is not installed in this repo yet — see
TEST-01):

```sh
deno task --config insforge/deno.json check
```

Then deploy each changed function with the `functions deploy <slug> --file ...` command shown above.
Provide the frontend owner only the API base and the anon key — never `API_KEY`.

## RLS and privileges (invariant)

`anon` has no table access. `authenticated` gets only owner-scoped profile access and
participant-scoped connection reads/deletes, all behind RLS; profile identity and timestamp columns
are not updateable. Functions reach past RLS with the admin client **only after** verifying the
caller's JWT. Any new environment must re-establish these deny-by-default grants and pass an
anonymous direct-read negative test (security-regression risk, OPS-02).

## Smoke checks after a deploy

Sign in as a test member, complete onboarding, then exercise the loop end to end: `people-search`
returns only in-radius profiles with evidence-based `matchReason` and no latitude/longitude/score;
`connection-request` is idempotent (`created: true` then `created: false` for the same pair, one row
in `connections`); `connection-inbox` shows the request; `connection-respond` accepts/declines it;
`profile-safety` hides a blocked profile from `people-search` both ways; `track-event` writes to
`product_events`. Inspect function/database logs for errors and confirm **no secrets are logged**.

## Triage (see HANDOFF.md "Ops notes" for full fingerprints)

- **Refresh hang:** cookie-bearing `POST /api/auth/refresh` hangs forever while cookieless returns
  401 instantly, CPU/DB idle → the app process is wedged. Fix:
  `npx @insforge/cli projects
  update-version` (restart; config/data survive; human-gated).
- **Zombie-socket stall:** browser requests hang ≥15s and never appear in `insforge.logs` while
  completed requests are 1–300ms and CPU/DB/metrics are green; the SDK surfaces
  `Request timed out
  after 15000ms`. Attributed to a keep-alive idle-timeout race (reported under
  OPS-01).
- **Incognito quick-triage:** reproduce in a private window — works there ⇒ browser/cookie problem
  (clear cookies for the `35byng5f` host); still broken ⇒ platform-side, check the fingerprints
  above.

## Retiring the `linkedin-auth` branch

**Decision (2026-07-20, issue #27):** delete the `linkedin-auth` backend branch and treat the parent
as the sole backend (this runbook). This is recorded here and gated on a human running the deletion.

Why it is safe:

- The branch (`linkedin-auth`, app key `35byng5f-g8u`, mode `full`, hosts
  `https://35byng5f-g8u.ap-southeast.insforge.app` / `https://35byng5f-g8u.function2.insforge.app`,
  parent `135081c0-...`) was a full copy made 2026-07-19.
- No deployed frontend points at the `35byng5f-g8u` hosts; everything targets the parent.
- The branch is **behind**: it is missing migration `20260719073000` and the four newer function
  deploys (it predates the connection-lifecycle work and had only `people-search` +
  `connection-request`).
- Its **only unique asset** was a replicated LinkedIn OAuth config. The parent now has that config
  live — verified 2026-07-20: `linkedin` appears in both `curl .../api/auth/public-config` and
  `metadata --json` `oAuthProviders`.

**Deletion command — HUMAN step (destructive, not for an agent in auto mode):**

```sh
npx @insforge/cli branch delete linkedin-auth
```

The command prompts for confirmation. If it is ever run through the agent CLI wrapper, attach the
approval flags (`--reason`, `--impact`, `--recommendation`) so the human approver sees the intent;
`-y` skips the prompt only after human sign-off.

Double-check immediately before deleting:

- `npx @insforge/cli branch list` shows `linkedin-auth` is the branch being removed (app key
  `35byng5f-g8u`) and nothing on it is unmerged or otherwise still needed.
- No Vercel env var or frontend build still references any `35byng5f-g8u` host.
- The parent is healthy and complete: `public-config` still lists `linkedin`, `functions list` shows
  all six functions, and `db migrations list` shows `20260719073000` applied.
