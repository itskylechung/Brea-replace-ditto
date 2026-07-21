# HANDOFF

Working handoff for Brea. Written 2026-07-21 at the end of the M1/M2 delivery session; refreshed the same evening after the session-persistence fix (PR #64) and the verification/hygiene sweep (issues #4, #12, #24, #27, #29, #47 closed). Read this first when picking the project up on a new machine. This file supersedes an earlier uncommitted `HANDOFF.md` that lived only on the original development machine — that file has since been recovered and its unique operational content is merged into the "Ops notes" and "E2E test accounts" sections below (triage summaries also live in the runbook's Triage and Secrets sections). Credentials never live in this file; see "E2E test accounts" for how to retrieve them.

## State of the product

Frontend: Vite + React 19 SPA, no router (state-machine screens in `src/App.tsx`). Backend: InsForge project `brea-mvp-preview` — **still serving production** (`brea-replace-ditto.vercel.app`); every backend change is production-affecting until OPS-02 (#26) lands.

**The browser only ever talks to the page's own origin** (PR #64): `vercel.json` rewrites proxy `/api/*` and `/fn/*` to InsForge server-side, and the client defaults its base URLs to `window.location.origin`. This keeps the auth refresh cookie **first-party** — do not reintroduce direct cross-origin backend URLs in client config; Safari/ITP and incognito windows kill sessions on every reload with them (see Ops notes).

Deploys run through GitHub Actions (`.github/workflows/deploy.yml`); the only CI secret is `VERCEL_TOKEN`; only `VITE_INSFORGE_ANON_KEY` is inlined (public value) — the `VITE_*` URLs are intentionally unset.

Milestones live on GitHub (M1 First-run experience / M2 Product surface / M3 Profile intelligence). The Epic F stability gate cleared on 2026-07-21: QA-01 #24, INT-01 #12, BE-04 #4 all closed with evidence (`docs/verification/2026-07-21-core-loop-verification.md`); OPS-01 #23 is reported and awaiting InsForge. Environment split (Epic G) remains OPS-02 #26. The merge queue is empty and `docs/METRICS.md` carries the frozen M1 baseline (dev/E2E-era numbers — later deltas are what matter).

## Decision log (the why, not just the what)

1. **Geolocation moved from onboarding wall to first-search prompt** (FE-07/#42). Highest-friction permission was being asked at the lowest-trust moment. README/PRD amended; DB already allowed null coordinates.
2. **Discovery toggle is location-gated** (fix in #54). Hard DB CHECK `profiles_discoverable_is_complete` forbids discoverable-without-coordinates; the UI now shows exactly what will be saved (disabled checkbox + "Requires your location.") — no hidden flips.
3. **Deferred-location members are NOT silently made discoverable.** PM decision on #52 = nudge (option b): after the first-search locate flow, a dismissible banner offers one-tap enable. Rationale: flipping a privacy-visibility bit without explicit consent contradicts "Private by default".
4. **Welcome intro plays once per account by construction** (FE-09/#44): it triggers on the onboarding-save transition, which the `onboarding_completed` DB flag makes unrepeatable. No welcome_seen column, no migration. Known trade-off: closing mid-sequence does not replay.
5. **"Paste LinkedIn text" profile import was dropped** in favor of suggestion chips (FE-08/#43). LinkedIn URL scraping is off the table permanently: product promise ("Brea does not scrape LinkedIn"), LinkedIn ToS, and technical walls (auth-walled, CORS). Richer import v2 = AI-assisted drafting via InsForge AI gateway, gated by OPS-02 (BE-06/#50).
6. **Notifications are no longer out of scope** — Epic H approved as a PRD change: transactional email on request-received / request-accepted (BE-05/#49, blocked by OPS-02). Rationale: without any signal, the core loop gives members no reason to return; the badge (FE-11) is the interim loop-closure.
7. **LinkedIn OIDC provides only name/email/photo.** All "auto-fill from LinkedIn" work is bounded by that; the identity block (FE-06) makes the three items visible rather than pretending more exists.
8. **Session persistence: same-origin proxy now, custom domain later** (#24 → PR #64). Real-browser testing showed the cross-site refresh cookie is blocked by Safari/ITP and incognito — sessions died on every reload. Interim fix (live): proxy `/api` + `/fn` through the page origin. Long-term posture stays with the OPS-02 custom domain (`app.` + `api.` under one registrable domain), at which point the proxy's latency/bandwidth trade-off can be retired. Sibling `*.vercel.app` subdomains can never work — `vercel.app` is on the Public Suffix List.

## What's next (priority order)

1. **OPS-01 (#23, waiting):** reported to InsForge, awaiting reply. When following up, attach the newer log-fetch anomaly (see Ops notes: `postgres.logs`/`postgrest.logs` 504 at high limits).
2. **OPS-06 (#51, P1):** safety ops loop. The weekly-review runbook and report queries are buildable now; only the alert automation waits on OPS-02 (email).
3. **OPS-02 (#26):** stand up the real production InsForge project + custom domain — unblocks BE-05 (#49 email), BE-06 (#50 AI drafting), OPS-06 automation, and retires the proxy trade-off (Decision 8).
4. M3 / Epic E v2 and Epic D (router) per the roadmap: router should land **before any fourth main screen** ships (FE-12/#48).
5. Deferred micro-check: real-device geolocation prompt on a location-less profile — verify naturally during the next new tester's first run (noted on #12's close).

## New machine setup

```bash
git clone https://github.com/itskylechung/Brea-replace-ditto.git && cd Brea-replace-ditto
npm ci                        # Node 22 required (CI uses 22)
cp .env.example .env.local    # fill VITE_INSFORGE_ANON_KEY only
npm run dev
```

Only `VITE_INSFORGE_ANON_KEY` is needed (public value — copy it from `.github/workflows/deploy.yml` under `env:`). Leave the `VITE_*` URLs empty: the client then targets the page origin, and the Vite dev proxy (mirroring the `vercel.json` rewrites) forwards `/api` and `/fn` to InsForge with first-party cookies. Checks: `npm run typecheck && npm run lint && npm run build && npm run test`.

Not in git (per-machine, set up only when needed):
- **Vercel CLI**: `vercel login`, then `vercel link` (org `team_AsxeTZXp7lznFDHlzyM6SiMA`, project `prj_o703rEVpuDhQAULkr9zPExnCH86L`). Not required to ship — deploys are CI-driven.
- **InsForge CLI**: needed for any backend operation (functions deploy, migrations, secrets). `npx @insforge/cli` + link to `brea-mvp-preview` (project id in `insforge/BACKEND_RUNBOOK.md`). Migrations/secrets updates are human-gated — see the runbook.
- **Deno**: only for `deno task --config insforge/deno.json check` (function typechecks, TEST-01).
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
