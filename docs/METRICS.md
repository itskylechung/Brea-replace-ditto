# Brea Product Metrics

| Field | Value |
| --- | --- |
| Status | Active metric contract; outcome instrumentation incomplete |
| Last reviewed | 2026-07-24 |
| Product foundation | [PRODUCT.md](../PRODUCT.md) |

This document is the single source of truth for Brea metric definitions, availability, guardrails,
and runnable baseline queries. Roadmaps and Epics reference metric IDs instead of creating local
definitions.

## Metric hierarchy

| ID | Metric | Role | Availability |
| --- | --- | --- | --- |
| `NSM-001` | Mutually confirmed meetings per activated member within 28 days | Future North Star | Not measurable; meeting confirmation is not shipped |
| `OPM-001` | Bidirectional conversations per activated member within 14 days | Current operating metric | Derivable from profiles, events, connections, and messages; not yet dashboarded |
| `ACT-001` | Activated members | Denominator / activation | Partially measurable |
| `DSC-001` | Searches returning at least one eligible result | Discovery input | Measurable from `search_completed` properties |
| `CON-001` | Request-to-accept conversion | Mutual-intent input | Measurable from `connections` |
| `SAFE-001` | Reports and blocks per 100 meaningful connections | Guardrail | Measurable with server-only tables |

## `NSM-001` — mutually confirmed meetings

### Definition

> Unique mutually confirmed meeting records divided by activated members over a rolling 28-day
> window.

### Numerator

A unique meeting between at least two different people with an explicit purpose, time, general
place, and confirmation from all required participants. A record is counted once, regardless of
participant count.

### Denominator

Unique members satisfying `ACT-001` in the same measurement window.

### Exclusions

- Cancelled meetings.
- Test, fixture, and admin accounts.
- Duplicate meeting records.
- Events without a separate agreed follow-up meeting.
- Meetings lacking mutual confirmation.

### Guardrails

- Reports and blocks following confirmation.
- Cancellation and no-show rate.
- Safety incidents.
- Median time from discovery or event to confirmation.

### Availability

Not measurable. Brea has no meeting proposal, confirmation, completion, or cancellation data model.
Do not substitute connection acceptance and label it as a meeting.

## `OPM-001` — bidirectional conversations

### Definition

> Unique accepted connections in which both participants sent at least one message, divided by
> activated members over a rolling 14-day window.

### Numerator

Unique `connection_id` values with:

- current `accepted` connection status;
- at least one message from each participant; and
- qualifying messages inside the 14-day window.

### Denominator

Unique members satisfying `ACT-001` in the same window.

### Exclusions

- Test, fixture, and admin accounts.
- Pending, declined, or blocked relationships.
- One-sided message threads.

### Availability

The source tables exist, but the metric is not yet productionized. Test-account exclusion and
activation timestamps need a durable contract before a dashboard becomes authoritative.

## `ACT-001` — activated member

A member is activated when they:

1. signed in with LinkedIn;
2. completed onboarding;
3. have private coordinates and can use nearby discovery; and
4. completed at least one valid nearby search or, in a future pilot, attended a qualifying Brea
   event.

The shipped event vocabulary can identify profile completion and search but does not persist a
single canonical `activated_at`. Current queries therefore use profile completeness plus a search
event as a proxy.

## Input metric tree

### Acquisition

- Invitation or referral → LinkedIn sign-in.
- Sign-in → profile completion.
- Cost and operator time per activated member.

### Activation and discovery

- Profile completion → private location.
- Private location → first search.
- Searches with at least one result.
- Empty-result and broaden-radius rates.
- Result → connection request.

### Mutual intent and conversation

- Request → accept or decline.
- Median response time.
- Accepted connection → first message.
- First message → reply.
- Bidirectional conversations.

### Future meeting conversion

- Mutual interest → follow-up.
- Follow-up → scheduling.
- Scheduling → confirmed.
- Confirmed → completed.
- Second meeting or continued contact.

### Safety guardrails

- Reports and blocks per 100 activated members, accepted connections, and future meetings.
- Repeat contact after decline.
- Moderation response and resolution time.
- Event incidents, removals, appeals, and safety-related churn.

## Shipped event vocabulary

Client-originated events go through `track-event`; the remaining events are server-written by their
owning Function. The database constraint accepts only:

- `sign_in_completed`
- `profile_completed`
- `profile_updated`
- `search_completed`
- `connection_requested`
- `connection_responded`
- `profile_hidden`
- `profile_reported`

Proposed event, shortlist, invitation, conversation, and meeting names are not valid Production
events until both the Function allowlist and database constraint change.

## M1 baseline query pack

The following copy-paste queries preserve the M1 activation funnel — sign-in → profile completion →
first search → connection — plus a seven-day active-searcher gauge. Every query reads only tables
and event names that exist in `migrations/` and deployed Functions; there are no invented columns or
events.

## How to run

Run each query in the **InsForge dashboard SQL editor**, or via
`npx @insforge/cli db query "<sql>"`, against the parent project
**`brea-mvp-preview`** (project id
`135081c0-d4dc-4d4d-b7ff-c4e94b4997e5`), which currently serves both preview and
production.

Event vocabulary (every value is enforced by the `product_events.event_name`
CHECK constraint in `migrations/20260719073000_authenticated-connection-lifecycle.sql`):

- Client-reported via `track-event`: `sign_in_completed`, `profile_completed`,
  `profile_updated`.
- Server-written by the functions: `search_completed` (people-search),
  `connection_requested` / `connection_responded` (connection-request /
  connection-respond), `profile_hidden` / `profile_reported` (profile-safety).

`product_events` columns used below: `profile_id`, `event_name`, `created_at`.

product_events.profile_id is nullable; sign_in_completed is recorded after profile provisioning, so null rows are not expected today — if they ever appear, distinct-profile counts will undercount.

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

Note: blocking a member force-declines any existing connection between the pair (profile-safety), so declined counts include block-driven declines and the acceptance rate reads slightly low.

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

| Metric                              | Query | value @ M1 ship            |
| ----------------------------------- | ----- | -------------------------- |
| Signed-in profiles                  | (a)   | 1                          |
| Completed profiles                  | (b)   | 0                          |
| Profile completion rate %           | (b)   | 0.0                        |
| Searching profiles                  | (c)   | 1                          |
| Search rate %                       | (c)   | n/a (0 completed profiles) |
| Connection requests created         | (d)   | 3                          |
| Connections accepted                | (d)   | 1                          |
| Acceptance rate %                   | (d)   | 100.0                      |
| 7-day active searchers              | (e)   | 1                          |

Snapshot taken 2026-07-21 via `db query` (M1 merged 2026-07-20). All traffic to
date is developer/E2E activity, so this baseline is effectively "zero real
users" — later deltas are what matter. Reading notes: searching profiles (1)
exceeds completed profiles (0) because the E2E fixture accounts are provisioned
through the admin API and never fire the client-side `profile_completed` event;
the developer account's 5 `sign_in_completed` events likewise predate a
completed client funnel. The 100% acceptance rate is one accepted E2E fixture
connection over two still-pending requests.

## Known measurement gaps

- **Welcome-intro skip vs. completion is not measurable today.** The
  `track-event` allowlist (`CLIENT_EVENT_NAMES` in
  `insforge/functions/track-event.ts`) admits only three client events —
  `sign_in_completed`, `profile_completed`, `profile_updated` — so the
  welcome-intro screen emits nothing. Capturing intro skip/completion requires a
  new client event added both to that allowlist and to the
  `product_events.event_name` CHECK constraint. That is a backend change gated by
  OPS-02 (#26).
- **`OPM-001` is not dashboarded.** The `messages` table can identify two-sided threads, but the
  team still needs durable fixture/admin exclusion and activation-window rules.
- **`NSM-001` is aspirational.** No meeting proposal, mutual confirmation, cancellation, completion,
  or follow-up records exist.
- **Request-response latency is derivable but not included in the frozen M1 pack.** Use
  `connections.created_at` and `responded_at` when the operating dashboard is implemented.
- **Safety rates need stable denominators.** Raw block/report counts exist; per-100-member,
  per-connection, and future per-meeting definitions must remain distinct.

## Definition change policy

- Product owns the meaning and intended behavior of each metric.
- Engineering owns event/data correctness and query reproducibility.
- A metric-definition change requires a reviewed PR with numerator, denominator, window,
  exclusions, source, and migration impact.
- Historical baselines are never rewritten to fit a new definition.
- A proposed metric is labeled unavailable until its source data is verified in Production.
