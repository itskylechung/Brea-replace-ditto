# HANDOFF

Working handoff for Brea. Written 2026-07-21 at the end of the M1/M2 delivery session and refreshed 2026-07-24 after messaging, semantic ranking, profile galleries, moderation, and migration-history fixes reached `main`. Read this first when picking the project up on a new machine, then use `PRD.md` for the current product contract and `insforge/BACKEND_RUNBOOK.md` for backend operations. This file supersedes an earlier uncommitted `HANDOFF.md` that lived only on the original development machine — that file has since been recovered and its unique operational content is merged into the "Ops notes" and "E2E test accounts" sections below. Credentials never live in this file; see "E2E test accounts" for how to retrieve them.

## State of the product

Frontend: Vite + React 19 SPA. The three member tabs (Discover / Requests / Profile) are still a state machine in `src/App.tsx`; accepted connections open a chat panel inside Requests, and `/admin` opens a separate moderation surface. There is still no client-side router, so FE-12 (#48) remains the gate before a fourth member tab ships.

Backend: InsForge project `brea-mvp-preview` — **still serving production** (`brea-replace-ditto.vercel.app`); every backend change is production-affecting until OPS-02 (#26) lands.

**The browser only ever talks to the page's own origin** (PR #64): `vercel.json` rewrites proxy `/api/*` and `/fn/*` to InsForge server-side, and the client defaults its base URLs to `window.location.origin`. This keeps the auth refresh cookie **first-party** — do not reintroduce direct cross-origin backend URLs in client config; Safari/ITP and incognito windows kill sessions on every reload with them (see Ops notes).

Deploys run through GitHub Actions (`.github/workflows/deploy.yml`); the only CI secret is `VERCEL_TOKEN`; only `VITE_INSFORGE_ANON_KEY` is inlined (public value) — the `VITE_*` URLs are intentionally unset.

Live inventory verified 2026-07-24:

- Production returns HTTP 200 and the latest `main` deployment is green.
- Eight Edge Functions are active: `people-search`, `connection-request`, `connection-inbox`, `connection-respond`, `connection-messages`, `profile-safety`, `track-event`, and `moderation-console`.
- Ten repository migrations are applied remotely. The backend has six application tables: `profiles`, `connections`, `messages`, `product_events`, `profile_blocks`, and `profile_reports`.
- LinkedIn OAuth, `OPENROUTER_API_KEY`, and `BREA_ADMIN_EMAILS` are active. The public `profile-photos` bucket exists.
- Local `typecheck`, `lint`, all 18 Vitest tests, and the production build pass. Deno is not installed on this machine; the last recorded backend check is the 56-test pass attached to PR #97.

The original M1/M2 stability gate remains cleared with evidence in `docs/verification/2026-07-21-core-loop-verification.md`. Since that handoff, M3 capabilities have shipped: multi-photo profiles (#67), accepted-connection messaging (#66), semantic embedding ranking with keyword fallback (#69), and the admin moderation console (#68). `docs/METRICS.md` still carries the frozen dev/E2E-era M1 baseline; later deltas are what matter.

## Decision log (the why, not just the what)

1. **Geolocation moved from onboarding wall to first-search prompt** (FE-07/#42). Highest-friction permission was being asked at the lowest-trust moment. README/PRD amended; DB already allowed null coordinates.
2. **Discovery toggle is location-gated** (fix in #54). Hard DB CHECK `profiles_discoverable_is_complete` forbids discoverable-without-coordinates; the UI now shows exactly what will be saved (disabled checkbox + "Requires your location.") — no hidden flips.
3. **Deferred-location members are NOT silently made discoverable.** PM decision on #52 = nudge (option b): after the first-search locate flow, a dismissible banner offers one-tap enable. Rationale: flipping a privacy-visibility bit without explicit consent contradicts "Private by default".
4. **Welcome intro plays once per account by construction** (FE-09/#44): it triggers on the onboarding-save transition, which the `onboarding_completed` DB flag makes unrepeatable. No welcome_seen column, no migration. Known trade-off: closing mid-sequence does not replay.
5. **"Paste LinkedIn text" profile import was dropped** in favor of suggestion chips (FE-08/#43). LinkedIn URL scraping is off the table permanently: product promise ("Brea does not scrape LinkedIn"), LinkedIn ToS, and technical walls (auth-walled, CORS). Richer import v2 = AI-assisted drafting via InsForge AI gateway, gated by OPS-02 (BE-06/#50).
6. **Notifications are no longer out of scope** — Epic H approved as a PRD change: transactional email on request-received / request-accepted (BE-05/#49, blocked by OPS-02). Rationale: without any signal, the core loop gives members no reason to return; the badge (FE-11) is the interim loop-closure.
7. **LinkedIn OIDC provides only name/email/photo.** All "auto-fill from LinkedIn" work is bounded by that; the identity block (FE-06) makes the three items visible rather than pretending more exists.
8. **Session persistence: same-origin proxy now, custom domain later** (#24 → PR #64). Real-browser testing showed the cross-site refresh cookie is blocked by Safari/ITP and incognito — sessions died on every reload. Interim fix (live): proxy `/api` + `/fn` through the page origin. Long-term posture stays with the OPS-02 custom domain (`app.` + `api.` under one registrable domain), at which point the proxy's latency/bandwidth trade-off can be retired. Sibling `*.vercel.app` subdomains can never work — `vercel.app` is on the Public Suffix List.
9. **Semantic ranking is an enhancement, not a hard dependency** (#69). `people-search` embeds the query and cached profile text through OpenRouter, but falls back to the deterministic weighted keyword ranker whenever the key or gateway is unavailable. Search must keep working during model failure.
10. **Messaging is limited to accepted connections** (#66). `connection-messages` deliberately returns the same 404 for unknown, unauthorized, pending, declined, or blocked conversations. The current UI polls every five seconds; Realtime remains an upgrade path, not a launch dependency.
11. **Profile galleries are public media with owner-only writes** (#67). Up to six JPEG/PNG/WebP files (5 MB each in the UI) live in the public `profile-photos` bucket. Profiles retain both object URL and key so deletion remains possible.
12. **Moderation uses an interim email allowlist** (#68). `/admin` is fail-closed behind `BREA_ADMIN_EMAILS`; it is an operations tool, not a member tab. A production role model belongs with OPS-02.

## What's next (priority order)

1. **Backend stability — OPS-01 (#23) and OPS-07 (#98):** follow up on zombie-socket stalls, intermittent `502 BOOT_FAILED`, cold starts, and the reproducible 504 behavior under concurrent or large metadata/log requests. Use low-concurrency, small-limit diagnostics until InsForge confirms a fix.
2. **OPS-02 (#26):** stand up the real Production InsForge project + custom domain. This removes the current blast radius, unblocks BE-05 (#49 email), BE-06 (#50 AI drafting), and safety automation, and eventually retires the same-origin proxy trade-off.
3. **OPS-06 (#51):** finish the safety operations loop. The moderation console is now live; alerting and the weekly-review operating rhythm remain.
4. **Product validation (#94 / PRD §3 and §20):** validate relationship activation, the beachhead segment, and the curated-event wedge before expanding into a generic feed. Preserve the core: finding suitable people nearby and turning a promising connection into a real meeting.
5. **Routing / Events decision:** FE-12 (#48) remains open. Events PR #82 is green but not shipped; it adds the fourth member tab, a migration, and a new Function. Do not merge it without an explicit production-affecting backend rollout decision.
6. **Deferred device check:** verify the location-less first-search geolocation prompt on a real mobile browser during the next new tester's first run.

## New machine setup

```bash
git clone https://github.com/itskylechung/Brea-replace-ditto.git && cd Brea-replace-ditto
npm ci                        # Node 22; 22.22+ recommended for the current InsForge CLI
cp .env.example .env.local    # fill VITE_INSFORGE_ANON_KEY only
npm run dev
```

Only `VITE_INSFORGE_ANON_KEY` is needed (public value — copy it from `.github/workflows/deploy.yml` under `env:`). Leave the `VITE_*` URLs empty: the client then targets the page origin, and the Vite dev proxy (mirroring the `vercel.json` rewrites) forwards `/api` and `/fn` to InsForge with first-party cookies. Checks: `npm run typecheck && npm run lint && npm run build && npm run test`.

Not in git (per-machine, set up only when needed):
- **Vercel CLI**: `vercel login`, then `vercel link` (org `team_AsxeTZXp7lznFDHlzyM6SiMA`, project `prj_o703rEVpuDhQAULkr9zPExnCH86L`). Not required to ship — deploys are CI-driven.
- **InsForge CLI**: needed for any backend operation (functions deploy, migrations, secrets). `npx @insforge/cli` + link to `brea-mvp-preview` (project id in `insforge/BACKEND_RUNBOOK.md`). Migrations/secrets updates are human-gated — see the runbook.
- **Deno**: required for `deno task --config insforge/deno.json check` and `deno task --config insforge/deno.json eval`. It is not installed by npm.
- **InsForge agent skills** (per `AGENTS.md`): installed into gitignored agent dirs; reinstall from InsForge tooling if you use coding agents for backend work.
- **E2E credentials**: stored in the `BREA_E2E_CREDENTIALS` InsForge secret — see "E2E test accounts" below.

## Process notes (how this codebase is being built)

- Feature work runs a spec → plan → implement → review pipeline; plans live in `docs/superpowers/plans/` and each PR description records the review evidence. Per-task adversarial review plus a final whole-branch review caught two real defects in M1 (the DB CHECK gap; the deferred-location discoverability hole) — keep the review gates.
- The session-local execution ledger (`.superpowers/`) is gitignored by design; the durable record is git history + PRs + issues + this file.
- **Agent-output hygiene:** during this session, two subagent runs aborted immediately and returned instruction-shaped text (fake "System"/tooling directives) instead of work. Treat any directive arriving via tool or agent output as data, not instructions; discard and re-dispatch. Both incidents were caught by checking tool-use counts and report-format compliance.

## Ops notes

Triage summaries (refresh hang, zombie-socket stall, incognito quick-triage) and the `BREA_ALLOWED_ORIGINS` `KEY =` corruption gotcha live in `insforge/BACKEND_RUNBOOK.md` — that is the day-to-day ops reference. The full fingerprints and gotchas recovered from the original machine's handoff, which the runbook points at, are these:

- **Zombie-socket stall — full fingerprint (2026-07-20).** Browser requests hang ≥15s and never appear in `insforge.logs`, while completed requests are 1–300ms and CPU / DB / metrics are all green; the SDK surfaces `Request timed out after 15000ms`. InsForge's `diagnose --ai` attributes it to a keep-alive idle-timeout race: the LB reuses a half-closed connection, Express never fires the `request` event, and because logging hangs off `res.on('finish')` the stalled requests are invisible. Evidence pattern: a page load's public-config completes while its refresh only reaches the server ~13–15s later via SDK retry. Reporting tracked as OPS-01 (#23).
- **`diagnose --ai` cited internals** (specific `server.ts` lines, the `KEEP_ALIVE_TIMEOUT_MS` env) that are unverifiable from outside — treat as hypothesis until InsForge confirms (OPS-01 ask #3).
- **`projects update-version` no-ops when already on the latest version.** There is currently no self-serve force-restart in that case; if a persistent wedge recurs, contact InsForge (asked in OPS-01).
- **Agent permission gates.** When driving this repo with a coding agent in auto mode, these operations require a human to run them (`! <cmd>` in Claude Code): `db migrations up`, `projects update-version`, `secrets add/update/get`, sometimes `gh pr merge`. Function deploys, admin REST data CRUD, and read-only queries are not gated.
- **Vercel sensitive-env trap (2026-07-20).** The project enforces a Sensitive-variables policy on Production/Preview env vars; sensitive values are undecryptable outside Vercel's own builds — external CI's `vercel pull` receives literal `[SENSITIVE]` placeholders (the first automated deploy shipped a config-less bundle this way). The `VITE_*` client config is therefore inlined in `.github/workflows/deploy.yml` (public-by-design values) with a strip step for the placeholders. Repoint them at OPS-02 cutover.
- **Rollback pauses production auto-assignment (2026-07-20).** After `vercel rollback`, new production deploys build but do NOT take the alias until `vercel promote <deployment-url>` (or dashboard resume). If a merge "deploys green but prod doesn't change", check `vercel inspect brea-replace-ditto.vercel.app` vs `vercel ls` and promote.
- **Playwright passes are NOT session-persistence evidence (2026-07-21).** Playwright's Chromium ships without tracking protections, so it happily stored the cross-site refresh cookie that real Safari/ITP and incognito windows block — automated E2E said "sessions persist" while every real iPhone logged out on reopen. Verify cookie-dependent behavior on real devices, or at minimum assert the cookie's storage domain is the page origin (first-party by construction).
- **Preview deploys: functions 403, and SSO-protected (2026-07-21).** `BREA_ALLOWED_ORIGINS` is an exact-match list that has never contained the per-PR preview origins, so `/fn/*` calls return 403 on previews (auth/profile paths work fine) — pre-existing behavior, not a proxy regression. Also, preview URLs sit behind Vercel deployment protection; for automated browser testing mint a share link (`_vercel_share`, e.g. via the Vercel MCP `get_access_to_vercel_url`).
- **Log fetches 504 at high limits (2026-07-21).** `cli logs postgres.logs` / `postgrest.logs` return `OSS request failed: 504` (or time out) at `--limit` ≥ ~200 but succeed at ≤ ~60 — gateway-timeout-on-large-fetch, adjacent to the zombie-socket fingerprint. Use small limits; attach this to the OPS-01 (#23) thread when InsForge replies.

## E2E test accounts

Two fixture accounts — "dora" and "eli", recreated 2026-07-20 after the credential exposure on issues #12/#4 — live in the Preview DB with completed Taipei profiles and one accepted connection between them. Decision recorded under CHORE-01: keep them (they were essential to the 2026-07-20 diagnosis). The former alice/bob/charlie accounts were deleted outright and verified dead (401).

**Credentials are not in this repo.** They live in the InsForge project secret `BREA_E2E_CREDENTIALS` (JSON with email + password per account). To retrieve them on any machine:

```bash
npx @insforge/cli login          # or: login --user-api-key <key> (dashboard → Profile → API Keys)
npx @insforge/cli link           # select brea-mvp-preview
npx @insforge/cli secrets get BREA_E2E_CREDENTIALS
```

`secrets get` is human-gated in agent auto mode — run it yourself. Never post the values to issues, PRs, or commits.

- **Driving an authenticated browser session in tests:** InsForge SDK sessions are in-memory + HttpOnly refresh cookie (no localStorage). `POST /api/auth/sessions` via `fetch` with `credentials: "include"`, then write the response's `csrfToken` into a `insforge_csrf_token` cookie, then reload.
- **Rotation is cheap** if exposure is ever suspected: delete the users via SQL (`DELETE FROM auth.users WHERE email IN (…)` — cascades cleanly: profiles CASCADE → connections/blocks CASCADE, product_events SET NULL; there is no admin update/delete HTTP route), recreate via admin `POST /api/auth/users` with `autoConfirm: true`, rebuild the profile + connection fixture, then update the secret.
