# Data, Security, and Functions Contract

| Field | Value |
| --- | --- |
| Status | Shipped |
| Last verified | 2026-07-24 |
| Backend | InsForge `brea-mvp-preview` |
| Operations | [Backend Runbook](../../insforge/BACKEND_RUNBOOK.md) |

This document owns the application data boundary, Edge Function inventory, safety/moderation
authorization, event vocabulary, storage posture, and deployment-sensitive configuration.

## Integration boundary

The Vite app creates one `@insforge/sdk` client. Members may read or write only their own profile
row and owner-scoped gallery objects directly. Discovery, connections, messages, safety, moderation,
and analytics use authenticated Edge Functions or server-only writes.

Privileged Functions:

- verify the bearer token;
- resolve the actor through `profiles.user_id`;
- never trust a browser-supplied actor ID;
- enforce exact-origin CORS through `BREA_ALLOWED_ORIGINS`;
- handle `OPTIONS`;
- return errors as `{ code, message }`; and
- use server-side credentials that never enter the browser bundle.

## Active Edge Functions

| Slug | Purpose | Request |
| --- | --- | --- |
| `people-search` | Nearby ranked discovery | `{ query, radiusKm, limit }` |
| `connection-request` | Send or reopen a connection | `{ recipientId, sourceQuery }` |
| `connection-inbox` | List incoming and outgoing requests | `{}` |
| `connection-respond` | Accept or decline an incoming request | `{ connectionId, action }` |
| `connection-messages` | List/send accepted-connection messages | `{ action, connectionId, body? }` |
| `profile-safety` | Block or report a profile | `{ action, profileId, reason?, details? }` |
| `track-event` | Admit allowlisted client product events | `{ eventName, properties }` |
| `moderation-console` | Admin report queue and resolution | `{ action, reportId?, resolution?, hideProfile? }` |

Deployment order and smoke checks are authoritative in the
[Backend Runbook](../../insforge/BACKEND_RUNBOOK.md).

## Application tables

| Table | Purpose | Browser member access |
| --- | --- | --- |
| `profiles` | Member profile, location, discovery controls, gallery metadata, embedding cache | Owner row only |
| `connections` | Sender, recipient, status, source query, response time | Participating rows under RLS; mutations through Functions |
| `messages` | Accepted-connection text messages | None; Functions only |
| `profile_blocks` | Bidirectional discovery/contact exclusion source | None; Functions only |
| `profile_reports` | Report reason, detail, resolution, admin audit | None; Functions only |
| `product_events` | Product event stream | None; Functions only |

All tables have row-level security enabled. Anonymous clients cannot read application rows.
`messages`, `profile_blocks`, `profile_reports`, and `product_events` are revoked from both `anon`
and `authenticated`.

## Referential and state integrity

- `profiles.user_id` references `auth.users(id)`.
- `connections` has a unique `(sender_id, recipient_id)` constraint.
- A trigger constrains legal connection transitions.
- Discoverable profiles must satisfy the required content and location check.
- Privileged tables store profile IDs, not browser-asserted identities.
- Historical event profile IDs may become null according to the migration's deletion behavior.

## Storage boundary

The `profile-photos` bucket is:

- public-read;
- owner-scoped for upload and deletion;
- restricted by the frontend to six JPEG/PNG/WebP objects of at most 5 MB each; and
- represented in the profile by both object URL and key.

Public-read media must be treated as public once uploaded. Authentication does not protect object
reads.

## Safety Function — `profile-safety`

Both actions require an authenticated, onboarded caller and a target other than the caller.

### Block

```ts
{ action: "block", profileId: string }
```

- Idempotently records a block.
- Force-declines connections between the pair in both directions.
- Removes the target from current and future discovery.
- Filters both members from each other's searches.
- Records `profile_hidden`.
- Returns `{ action: "block", profileId, hidden: true }`.

### Report

```ts
{
  action: "report";
  profileId: string;
  reason: "spam" | "harassment" | "misleading" | "unsafe" | "other";
  details?: string; // maximum 500 characters
}
```

- Stores the report.
- Records `profile_reported` with the reason.
- Returns `{ action: "report", profileId, submitted: true }`.

## Moderation authorization

- `/admin` and `moderation-console` fail closed.
- The authenticated email must appear in server-side `BREA_ADMIN_EMAILS`.
- An admin may list the queue, mark an open report resolved or dismissed, and optionally force-hide
  the reported profile.
- Resolution time and resolving admin email remain in the audit record.
- Email allowlisting is an interim role model; Production isolation should replace it with a durable
  authorization model.

## Product event vocabulary

The database check constraint admits only this set:

| Event | Source | Trigger | Properties |
| --- | --- | --- | --- |
| `sign_in_completed` | client → `track-event` | Once per session after profile load | `{}` |
| `profile_completed` | client → `track-event` | First onboarding save | `{}` |
| `profile_updated` | client → `track-event` | Later profile save | `{}` |
| `search_completed` | `people-search` | Each completed search | `{ radiusKm, resultCount, queryLength, ranking }` |
| `connection_requested` | `connection-request` | New or reopened request | `{ recipientId }` |
| `connection_responded` | `connection-respond` | Accept or decline | `{ status }` |
| `profile_hidden` | `profile-safety` | Block | `{}` |
| `profile_reported` | `profile-safety` | Report | `{ reason }` |

Adding an event requires both Function/client behavior and an updated database constraint. Proposed
future funnel names are not valid Production events until that contract changes. Metric definitions
and known gaps live in [Metrics](../METRICS.md).

## Server-side secrets

- `INSFORGE_BASE_URL`
- `API_KEY`
- `BREA_ALLOWED_ORIGINS`
- `OPENROUTER_API_KEY`
- `BREA_ADMIN_EMAILS`
- `BREA_E2E_CREDENTIALS` for controlled fixture operations

`BREA_MVP_PROFILE_ID` is retired and read by no deployed Function.

The frontend may receive only public InsForge URL/function URL behavior and the anon key. Never
commit or expose the API key, OAuth secret, admin allowlist, E2E credentials, or raw coordinates.

## Deployment constraints

- The live site still uses `brea-mvp-preview`; every backend mutation is Production-affecting until
  OPS-02 (#26) completes.
- Vite embeds `VITE_*` at build time. Preview and Production builds must not be promoted across
  different backend targets.
- Browser requests use same-origin `/api` and `/fn` proxies for first-party session cookies.
- Function CORS is exact-origin. Generated Vercel Preview URLs require deliberate allowlisting for a
  full Function E2E pass.
- Migrations, Functions, secrets, and smoke checks follow the Backend Runbook sequence.

## Security invariants

- Deny anonymous application-table access.
- Resolve actor identity from the authenticated session.
- Keep privileged credentials server-side.
- Never return exact coordinates.
- Gate LinkedIn URL and messages on accepted, unblocked connections.
- Return the same missing-conversation response for unauthorized and nonexistent conversations.
- Keep moderation fail-closed.
- Preserve both media URL and key so owner deletion remains possible.
