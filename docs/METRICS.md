# Brea M1 funnel metrics

A copy-paste query pack for the M1 activation funnel — sign-in -> profile
completion -> first search -> connection — plus a 7-day active-searcher gauge.
Every query reads only tables and event names that exist in `migrations/` and in
the deployed InsForge functions; there are no invented columns or events.

## How to run

Run each query in the **InsForge dashboard SQL editor**, against the parent
project **`brea-mvp-preview`** (project id
`135081c0-d4dc-4d4d-b7ff-c4e94b4997e5`), which currently serves both preview and
production. `insforge/BACKEND_RUNBOOK.md` documents no CLI verb for ad-hoc SQL
(the `db migrations` commands apply migrations, not `SELECT`s), so the dashboard
editor is the supported path.

Event vocabulary (every value is enforced by the `product_events.event_name`
CHECK constraint in `migrations/20260719073000_authenticated-connection-lifecycle.sql`):

- Client-reported via `track-event`: `sign_in_completed`, `profile_completed`,
  `profile_updated`.
- Server-written by the functions: `search_completed` (people-search),
  `connection_requested` / `connection_responded` (connection-request /
  connection-respond), `profile_hidden` / `profile_reported` (profile-safety).

`product_events` columns used below: `profile_id`, `event_name`, `created_at`.

## Funnel queries

### (a) Sign-ins — distinct profiles, total and per day

```sql
-- Total distinct profiles that completed sign-in.
SELECT
  count(DISTINCT profile_id) AS signed_in_profiles,
  count(*)                   AS sign_in_events
FROM product_events
WHERE event_name = 'sign_in_completed';

-- Same, broken out per calendar day.
SELECT
  created_at::date           AS day,
  count(DISTINCT profile_id) AS signed_in_profiles,
  count(*)                   AS sign_in_events
FROM product_events
WHERE event_name = 'sign_in_completed'
GROUP BY day
ORDER BY day;
```

### (b) Profile completion — distinct profiles + conversion vs (a)

```sql
SELECT
  count(DISTINCT profile_id) FILTER (WHERE event_name = 'profile_completed') AS completed_profiles,
  count(DISTINCT profile_id) FILTER (WHERE event_name = 'sign_in_completed') AS signed_in_profiles,
  round(
    100.0 * count(DISTINCT profile_id) FILTER (WHERE event_name = 'profile_completed')
          / nullif(count(DISTINCT profile_id) FILTER (WHERE event_name = 'sign_in_completed'), 0),
    1
  ) AS completion_rate_pct
FROM product_events
WHERE event_name IN ('sign_in_completed', 'profile_completed');
```

### (c) First search — distinct profiles + conversion vs (b)

```sql
SELECT
  count(DISTINCT profile_id) FILTER (WHERE event_name = 'search_completed')  AS searching_profiles,
  count(DISTINCT profile_id) FILTER (WHERE event_name = 'profile_completed') AS completed_profiles,
  round(
    100.0 * count(DISTINCT profile_id) FILTER (WHERE event_name = 'search_completed')
          / nullif(count(DISTINCT profile_id) FILTER (WHERE event_name = 'profile_completed'), 0),
    1
  ) AS search_rate_pct
FROM product_events
WHERE event_name IN ('profile_completed', 'search_completed');
```

### (d) Connection funnel — straight from the `connections` table

```sql
-- Acceptance rate is measured among responded requests (accepted + declined);
-- still-pending requests are counted but excluded from the rate.
SELECT
  count(*)                                    AS requests_created,
  count(*) FILTER (WHERE status = 'accepted') AS accepted,
  count(*) FILTER (WHERE status = 'declined') AS declined,
  count(*) FILTER (WHERE status = 'pending')  AS pending,
  round(
    100.0 * count(*) FILTER (WHERE status = 'accepted')
          / nullif(count(*) FILTER (WHERE status IN ('accepted', 'declined')), 0),
    1
  ) AS acceptance_rate_pct
FROM connections;
```

### (e) 7-day active searchers

```sql
SELECT
  count(DISTINCT profile_id) AS active_searchers_7d,
  count(*)                   AS searches_7d
FROM product_events
WHERE event_name = 'search_completed'
  AND created_at >= now() - interval '7 days';
```

## Baseline snapshot

Whoever ships M1: run queries (a)-(e) the day the M1 PR merges and paste each
result into the empty column below. This is the frozen M1 baseline.

| Metric                              | Query | value @ M1 ship |
| ----------------------------------- | ----- | --------------- |
| Signed-in profiles                  | (a)   |                 |
| Completed profiles                  | (b)   |                 |
| Profile completion rate %           | (b)   |                 |
| Searching profiles                  | (c)   |                 |
| Search rate %                       | (c)   |                 |
| Connection requests created         | (d)   |                 |
| Connections accepted                | (d)   |                 |
| Acceptance rate %                   | (d)   |                 |
| 7-day active searchers              | (e)   |                 |

## Known gaps

- **Welcome-intro skip vs. completion is not measurable today.** The
  `track-event` allowlist (`CLIENT_EVENT_NAMES` in
  `insforge/functions/track-event.ts`) admits only three client events —
  `sign_in_completed`, `profile_completed`, `profile_updated` — so the
  welcome-intro screen emits nothing. Capturing intro skip/completion requires a
  new client event added both to that allowlist and to the
  `product_events.event_name` CHECK constraint. That is a backend change gated by
  OPS-02 (#26).
