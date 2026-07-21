# Core-loop verification — INT-01 (#12) + BE-04 smoke/security evidence (#4)

**Date:** 2026-07-21 (~02:51–03:03 UTC)
**Target:** production app `https://brea-replace-ditto.vercel.app` → backend InsForge `brea-mvp-preview`
(`35byng5f`, ap-southeast). Functions runtime `https://35byng5f.function2.insforge.app`.
**Driver:** real browser (Playwright) against the live production URL, backed by direct
authenticated function calls (API-level evidence) and `@insforge/cli db query` (DB-level evidence).

This is the authenticated-contract core-loop pass. It does **not** close #12 or #4 — human-only items
remain (see "Remaining human-only checks").

> Credential hygiene: no passwords, admin API key, anon key, or full JWTs appear in this document.
> Accounts are referred to by nickname only (dora, eli, tmp1, tmp2).

---

## Environment preflight (all read-only)

| Item | Result |
| --- | --- |
| Linked project | `brea-mvp-preview` (`135081c0-…`), app key `35byng5f`, ap-southeast — confirmed via `cli current` |
| Functions | All **6 active**: `people-search`, `connection-request`, `connection-inbox`, `connection-respond`, `profile-safety`, `track-event` |
| Migrations applied | `20260719000100`, `20260719063613`, `20260719064643`, `20260719073000`, `20260720103739` (all 5) |
| Preview vs Production | No dedicated Production InsForge project exists yet (OPS-02). This Preview project **also serves production**; every function/migration verified here is the one production uses. |

## Method — test accounts & session handling

- The dora↔eli fixture (one accepted connection) was **not** used for any mutating flow, to protect it.
  Instead, **two throwaway accounts** were created via admin REST
  `POST /api/auth/users` (`autoConfirm: true`): `brea-e2e-tmp1@example.com`, `brea-e2e-tmp2@example.com`.
  The provisioning trigger (`20260719064643`) auto-created their profile rows; both were then completed
  via SQL `UPDATE public.profiles` with Taipei coordinates, `onboarding_completed/​is_discoverable/​is_available = true`,
  and a distinctive skill token `breaqa2026` so the block-filter search is unambiguous.
- Authenticated browser sessions were established with the documented session-injection trick
  (`POST /api/auth/sessions` with `credentials:"include"`, write `insforge_csrf_token` cookie, reload).
- **Pre-existing connections investigated before touching anything** (task requirement): the 2 pending rows
  belong to (a) `Brea MVP Host → Haruto Sato` — a legacy seed/demo request from 2026-07-19 that predates the
  current connection-request deploy, and (b) `Shaoyu Yen → Maya Chen` — a real user's request to a seed
  profile from 2026-07-20. Neither was mine; both were left untouched.

---

## Verdict table

| # | Check | Verdict | Key evidence |
|---|-------|---------|--------------|
| 1 | `connection_requested` event fires & persists (live browser request) | **PASS** | UI Connect (tmp1→tmp2) created connection `1c122d8d` (pending, src `breaqa2026`); new `connection_requested` event @02:53:11.342Z (profile=tmp1, `recipientId`=tmp2). Event count 3→**4**. |
| 1b | connection-request idempotency (`created:true` then `created:false`, one row) | **PASS** | UI Connect → `created:true`. Repeat API call same pair → `created:false`, same id `1c122d8d`, **no** new event, source_query unchanged. |
| 2 | Declined → re-request (states/events correct) | **PASS** | tmp2 declined in Requests UI → row `declined`, `responded_at` set, `connection_responded`(declined) event. tmp1 re-Connect (UI) → **same row** `1c122d8d` reactivated `declined→pending`, `responded_at=null`, `created_at` unchanged, count stays **1**; 2nd `connection_requested` event. |
| 3 | Server-side block filtering hides both directions | **PASS** | Before: tmp1 sees tmp2 **and** tmp2 sees tmp1 (server search, 1 each). tmp1 Hides tmp2 (per-card menu). After: fresh server `people-search` returns **0** for **both** directions; UI shortlist shows "0 matches". `profile_blocks` row written; connection flipped to `declined` (documented side-effect); `profile_hidden` event written. |
| 4 | Profile-editing save + `profile_updated` event | **PASS** | Profile tab → Edit → headline changed → Save. Persisted to `public.profiles` (`updated_at` bumped); `profile_updated` event @03:01:15.441Z (profile=tmp2). |
| 5 | Smoke checks (runbook §"Smoke checks after a deploy") | **PASS** | See "Smoke checks" below — search output strips lat/lng/score, evidence-based `matchReason`, idempotent connect, inbox, respond, block, track-event, empty/short/no-auth states. |
| 6 | Logs contain no secrets | **PASS (clean)** | 0 hits for any password / admin key (full + `ik_`) / anon key (full + `anon_`) / sensitive header names, across insforge+function+postgres+postgREST logs that demonstrably cover this session. |
| — | Anon direct table access denied (#4 AC) | **PASS** | Direct DB REST read with the anon key on all 5 tables → HTTP **401 "permission denied"** (PG 42501). |
| — | Real LinkedIn OAuth round trip | **NOT ATTEMPTED (human-only)** | Requires a real LinkedIn account. |
| — | Real-device geolocation prompt | **NOT ATTEMPTED (human-only)** | Deferred-location code path present (`App.tsx` `locateForPendingSearch`, `ProfileSetup` `useCurrentLocation`); real-device grant is a human/QA-01 check. Not emulated in this pass. |

---

## Check 1 & 1b — `connection_requested` fires and persists; idempotency

Driven from the real UI: tmp1 searched `breaqa2026`, saw the tmp2 card, clicked **Connect** → button
flipped to "Request sent".

- Connection row (DB): `1c122d8d-…`, `status=pending`, `source_query="breaqa2026"`, `created_at=2026-07-21T02:53:11.165Z`, `responded_at=null`.
- `product_events` (DB): new `connection_requested` @`02:53:11.342Z`, `profile_id`=tmp1, `properties={recipientId: <tmp2>}`. **Count 3 → 4.**
- **Idempotency** (API, same pending pair): response `created:false`, same id `1c122d8d`, `status:pending`; **no** new event row; `source_query` remained `breaqa2026` (idempotent-return path does not overwrite it). Matches the coded contract in `connection-request.ts`.

> Note on premise: the task framed `connection_requested` as "0 rows ever". Actual baseline was **3** rows
> (2 orphaned to `profile_id=null` from the deleted 2026-07-20 "charlie" account + 1 from real user Shaoyu Yen).
> The check still holds: a live browser request produced a new, correctly-attributed row.

## Check 2 — declined → re-request

- tmp2 → Requests tab: incoming request from tmp1 shown ("Found you via 'breaqa2026'"), badge "1 pending".
  Clicked **Decline**.
  - DB: row `1c122d8d` `status=declined`, `responded_at=2026-07-21T02:54:44.186Z`, `updated_at` bumped, `created_at` unchanged, `source_query` unchanged.
  - Event: `connection_responded` @`02:54:44.503Z`, `profile_id`=tmp2, `properties={status:"declined"}`.
- tmp1 → searched `breaqa2026` again: card offered **Connect** again (declined maps to a re-connectable state). Clicked Connect.
  - DB: **same** row `1c122d8d` reactivated → `status=pending`, `responded_at=null`, `created_at` unchanged (02:53:11.165Z), `updated_at=02:56:09.011Z`. **Row count for the pair stays 1** (no duplicate).
  - Event: 2nd `connection_requested` @`02:56:09.195Z`. **Count 4 → 5.**

## Check 3 — server-side block filtering (both directions)

- **Before block** (direct server `people-search`, query `breaqa2026`): tmp1 → `[E2E Tmp Two]` (1); tmp2 → `[E2E Tmp One]` (1).
- **Block** (real UI): tmp1 → tmp2 card → "⋯" → **Hide this profile**. Card removed; shortlist "0 matches".
  - DB: `profile_blocks` row `25c5db86-…` (blocker=tmp1, blocked=tmp2).
  - Side-effect (per `profile-safety.ts`): connection `1c122d8d` flipped `pending → declined` (`responded_at` set).
  - Event: `profile_hidden` @`02:58:11.859Z`, `profile_id`=tmp1.
- **After block** (fresh server `people-search`): tmp1 → **0** results; tmp2 → **0** results. Bidirectional server-side filtering confirmed (matches `people-search.ts` `collectBlockedProfileIds`).
- Block row then removed via admin REST `DELETE …/profile_blocks?…` (HTTP 200); 0 rows remain for the pair.

> Behavior worth keeping (unchanged from prior pass): there is **no in-app/authenticated unblock**
> (`profile_blocks` has `REVOKE ALL` from `authenticated`), and a block does **not** restore a connection
> it declined. Both require admin/service-role. Flag for product.

## Check 4 — profile-editing save + `profile_updated`

- tmp2 → Profile tab → **Edit profile** → headline changed to `QA fixture profile — edited 2026-07-21` → **Save profile changes**.
- Persisted (DB): `public.profiles` headline updated, `updated_at=2026-07-21T03:01:13.103Z`; ProfileView reflected it.
- Event: `profile_updated` @`03:01:15.441Z`, `profile_id`=tmp2.

## Check 5 — Smoke checks (runbook)

| Smoke item | Result |
| --- | --- |
| `people-search` output strips latitude/longitude/score | **PASS** — response keys exactly `[id, name, avatarUrl, headline, bio, distanceKm, skills, interests, availability, matchReason, connectionStatus]`; no `latitude`/`longitude`/`score`. |
| Evidence-based `matchReason` + approximate `distanceKm` | **PASS** — e.g. `matchReason:"Matches skill: breaqa2026."`, `distanceKm:0.3`. |
| In-radius filtering | **PASS** — both temp profiles within 10 km returned; out-of-radius/non-matching excluded. |
| `connection-request` idempotent (one row) | **PASS** — see Check 1b. |
| `connection-inbox` shows the request | **PASS** — tmp2 inbox listed tmp1's incoming request with source query & date. |
| `connection-respond` accept/decline | **PASS** — decline path exercised (Check 2). |
| `profile-safety` block hides both ways | **PASS** — Check 3. |
| `track-event` writes to `product_events` | **PASS** — `profile_completed` (provision) and `profile_updated` (Check 4) rows written. |
| Empty result state (no keyword match) | **PASS** — `query:"zzqqxnomatch12345"` → `200`, 0 results. |
| Validation: query too short | **PASS** — `query:"a"` → `400 INVALID_REQUEST`. |
| Auth required | **PASS** — call without bearer → `401 AUTH_REQUIRED`. |

Event deltas produced by this pass (baseline → final): `connection_requested` 3→5, `connection_responded` 3→4,
`profile_hidden` 2→3, `profile_updated` 2→3, `search_completed` 10→18, `sign_in_completed` 5→6. All within
the migration's `product_events_name_is_valid` allow-list.

## Check 6 — logs contain no secrets

Pulled and scanned `insforge.logs`, `function.logs`, `postgres.logs`, `postgREST.logs`.

| Pattern | Hits |
| --- | --- |
| dora / eli passwords (exact) | 0 / 0 |
| tmp1 / tmp2 passwords (exact) | 0 / 0 |
| admin API key (full) / `ik_` prefix | 0 / 0 |
| anon key (full) / `anon_` prefix | 0 / 0 |
| header/field names: `authorization`, `bearer `, `password`, `csrf`, `set-cookie`, `x-api-key`, `apikey`, access/refresh token | 0 each |

The check is **meaningful**: the captured logs cover this session's window and contain its traffic —
`function.logs` shows this pass's calls (`people-search`×33, `connection-inbox`×21, `connection-request`×12,
`track-event`×9, `connection-respond`×6, `profile-safety`×6), and `insforge.logs` covers 02:54–03:03Z — yet
carry none of the secrets above. Consistent with the SDK's header/body redaction.

## Anon direct-read negative test (#4 AC "direct anon table access is denied")

Direct DB REST read using only the public anon key (no user JWT):

| Table | Result |
| --- | --- |
| `profiles`, `connections`, `product_events`, `profile_blocks`, `profile_reports` | **HTTP 401 — "permission denied for table …"** (PG `42501`) for all five |

Confirms the deny-by-default grants (`anon` has no table access) from `20260719063613` / `20260719073000`.

---

## Fixture state confirmation (must remain intact)

`E2E dora → E2E eli` connection `102ab52e-…`: **`status=accepted`**, `source_query="e2e fixture"`,
`created_at=2026-07-20T09:18:30.221Z`, `responded_at=2026-07-20T09:00:00.000Z` — **unchanged / intact**.
It was never used or mutated in this pass. `profile_blocks` table = 0 rows (clean).

Final `connections` table (4 rows): dora→eli **accepted** (fixture); Brea MVP Host→Haruto Sato pending
(legacy seed); Shaoyu Yen→Maya Chen pending (real user); tmp1→tmp2 declined (this pass's throwaway pair).

---

## Temp-account cleanup — HUMAN step (destructive SQL is agent-blocked)

`DELETE FROM auth.users` is blocked for the agent by the permission classifier, so it was **not** run.
A human should remove the two throwaway accounts (cascades: profiles → connections/blocks; `product_events` set NULL):

```sql
-- Run via: npx @insforge/cli db query "<sql>"   (human)
DELETE FROM auth.users WHERE email IN ('brea-e2e-tmp1@example.com','brea-e2e-tmp2@example.com');
```

After deletion, verify they are gone:

```sql
SELECT count(*) FROM auth.users WHERE email IN ('brea-e2e-tmp1@example.com','brea-e2e-tmp2@example.com'); -- expect 0
```

Throwaway passwords for these accounts were generated for this pass only and are not recorded here; the
accounts are disposable and slated for the deletion above.

---

## Remaining human-only checks (why #12/#4 stay open)

- **Real LinkedIn OAuth round trip** (sign-in → search → connect) — needs a real LinkedIn account.
- **Real-device browser geolocation prompt** — the deferred-location flow exists in code; a real device
  grant remains a human/QA-01 check (mobile-Safari ITP risk is tracked separately in QA-01/#24).

## Anomalies / blocked commands noted (not worked around)

- `cli logs postgres.logs` / `postgREST.logs` returned **`OSS request failed: 504`** / timed out at high
  limits (200–250). Both succeeded at smaller limits (40–60). Gateway-timeout-on-large-log-fetch is
  adjacent to the documented zombie-socket/gateway fingerprint; nothing was restarted (per runbook). The
  no-secrets scan used the successfully-fetched smaller pulls, which still cover this session's window.
- Human-gated commands (not run by the agent): `db migrations up`, `projects update-version`,
  `secrets get/update`, and the cleanup `DELETE FROM auth.users` above.
