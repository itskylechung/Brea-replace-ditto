# Discovery and Connection Contract

| Field | Value |
| --- | --- |
| Status | Shipped |
| Last reviewed | 2026-07-24 |
| Product surface | [Current State](../product/CURRENT_STATE.md) |

This document owns nearby search, ranking, connection lifecycle, inbox, and accepted-connection
messaging behavior.

## Shared Function behavior

- Member Functions require an authenticated bearer token.
- The actor is resolved server-side through `profiles.user_id`.
- Allowed browser origins are enforced by `BREA_ALLOWED_ORIGINS`.
- `OPTIONS` is handled.
- Error bodies use `{ code, message }`.
- Unexpected backend configuration returns `SERVICE_UNAVAILABLE`; the browser never receives
  privileged configuration.

## Nearby search — `people-search`

### Request

```ts
type PeopleSearchInput = {
  query: string;
  radiusKm: number; // UI range 1–50; default 10
  limit: number;
};
```

Search requires an authenticated member with completed onboarding and private coordinates.
Otherwise it returns `PROFILE_SETUP_REQUIRED` (409). The frontend first-search flow may collect and
save location, then retry the same search automatically.

### Candidate eligibility

The Function:

- resolves the searcher from the session;
- excludes the searcher;
- selects only onboarded, discoverable, available profiles with complete location data;
- excludes profiles blocked in either direction;
- computes Haversine distance server-side; and
- applies `radiusKm` as a hard filter.

### Ranking

When `OPENROUTER_API_KEY` is configured, the Function embeds the query and profile text with
`nvidia/nemotron-3-embed-1b:free`, caches profile embeddings by content/model hash, filters low
similarity, and ranks by cosine similarity with distance as the tie-breaker.

Keyword evidence supplies a specific match reason when available. A semantic-only match receives
neutral language; the system must not invent evidence.

If the embedding gateway is absent, unavailable, timed out, or yields no useful matches, the
Function falls back to deterministic ranking:

```text
skills > interests > headline > availability > bio
```

Exact phrases receive a bonus and distance breaks ties. Search remains available when the model
fails.

### Response

```ts
type PeopleSearchResponse = { results: PersonMatch[] };

type PersonMatch = {
  id: string;
  name: string;
  avatarUrl: string | null;
  headline: string;
  bio: string | null;
  distanceKm: number; // rounded to 0.1 km
  skills: string[];
  interests: string[];
  availability: string | null;
  matchReason: string;
  connectionStatus:
    | "none"
    | "outgoing_pending"
    | "incoming_pending"
    | "accepted";
};
```

An empty search returns `{ results: [] }`. Results arrive ranked; the frontend does not recompute
distance or reorder them. During rollout, the legacy status `"pending"` is interpreted as
`outgoing_pending`.

## Search UI behavior

- Query, example prompts, and radius invoke the same submitted-search path.
- Distinct idle, loading, results, empty, and recoverable error states exist.
- Duplicate in-flight searches are prevented.
- Retry preserves the submitted query.
- Empty state is used only for a successful empty response.
- "Broaden to 25 km" offers a one-tap recovery from an empty result.
- A result card shows identity, headline, approximate distance, evidence, skills/interests,
  availability, connection status, and Hide / Report.

## Connection state model

Persistent statuses are `pending`, `accepted`, and `declined`. The database transition guard allows:

```text
pending → accepted
pending → declined
accepted → declined
declined → pending
```

The last transition represents re-request. Product policy for cooling or recipient control remains
an open [Trust and Safety](../product/epics/EPIC-05_TRUST_AND_SAFETY.md) decision.

## Send request — `connection-request`

### Request

```ts
type ConnectionRequestInput = {
  recipientId: string; // UUID
  sourceQuery: string; // 2–200 characters
};
```

### Response

```ts
type ConnectionResponse = {
  id: string;
  recipientId: string;
  status: "pending" | "accepted";
  createdAt: string;
  created: boolean;
};
```

- A first request inserts `pending` and returns `created: true`.
- A retry for an existing pending/accepted pair returns it with `created: false`.
- A declined pair may reopen to pending with `created: true`.
- Unique `(sender, recipient)` storage prevents duplicate rows.
- A new or reopened request records `connection_requested`.

### Typed errors

| HTTP | Code | Meaning |
| --- | --- | --- |
| 400 | `INVALID_REQUEST` | Malformed body or invalid field range |
| 400 | `SELF_CONNECTION` | Sender targeted their own profile |
| 401 | `AUTH_REQUIRED` | No bearer token |
| 401 | `INVALID_SESSION` | Invalid or expired session |
| 403 | `ORIGIN_NOT_ALLOWED` | Browser origin is not allowlisted |
| 404 | `RECIPIENT_NOT_FOUND` | No target profile |
| 405 | `METHOD_NOT_ALLOWED` | Non-POST request |
| 409 | `PROFILE_SETUP_REQUIRED` | Sender onboarding is incomplete |
| 409 | `RECIPIENT_UNAVAILABLE` | Target unavailable/ineligible or either side blocked |
| 409 | `INCOMING_REQUEST_EXISTS` | Target already sent the caller a pending request |
| 409 | `ALREADY_CONNECTED` | Pair is already accepted |
| 500 | `INTERNAL_ERROR` | Unexpected failure |
| 503 | `SERVICE_UNAVAILABLE` | Backend configuration is missing |

## Requests inbox — `connection-inbox`

Request body is `{}`. Results are newest first:

```ts
type ConnectionInboxResponse = {
  incoming: ConnectionItem[];
  outgoing: ConnectionItem[];
};

type ConnectionItem = {
  id: string;
  direction: "incoming" | "outgoing";
  status: "pending" | "accepted" | "declined";
  sourceQuery: string;
  createdAt: string;
  respondedAt: string | null;
  person: {
    id: string;
    name: string;
    avatarUrl: string | null;
    headline: string | null;
    locationLabel: string | null;
    linkedinProfileUrl: string | null;
  };
};
```

`linkedinProfileUrl` is non-null only for accepted relationships.

## Respond — `connection-respond`

```ts
type ConnectionRespondInput = {
  connectionId: string;
  action: "accept" | "decline";
};
```

Only the recipient may respond. Success returns `{ id, status, respondedAt }`. Repeating the same
outcome is idempotent. Decline is silent to the sender; both accept and decline record
`connection_responded` with the resulting `{ status }`.

| HTTP | Code | Meaning |
| --- | --- | --- |
| 400 | `INVALID_REQUEST` | Invalid connection ID or action |
| 401 | `AUTH_REQUIRED` / `INVALID_SESSION` | Missing or invalid session |
| 404 | `REQUEST_NOT_FOUND` | Missing request or caller is not recipient |
| 409 | `PROFILE_SETUP_REQUIRED` | Caller has no usable profile |
| 409 | `REQUEST_ALREADY_RESOLVED` | Request is no longer pending |

## Messaging — `connection-messages`

```ts
type MessagesInput =
  | { action: "list"; connectionId: string }
  | { action: "send"; connectionId: string; body: string };
```

- Message text is trimmed and must be 1–2,000 characters.
- Caller must participate in an accepted connection.
- Neither participant may have blocked the other.
- Missing, unauthorized, pending, declined, and blocked conversations all return the same
  `CONVERSATION_NOT_FOUND` (404) so the endpoint does not disclose which condition failed.
- Listing returns the latest 200 messages in chronological order.
- The UI polls every five seconds and merges monotonically so a stale poll cannot hide a newly sent
  message.

Realtime delivery, pagination, read receipts, typing state, attachments, and message notification
are not part of the shipped contract.

## Reliability and privacy invariants

- SDK requests expose immediate loading, time out at 15 seconds, and allow one retry where safe.
- Retrying an idempotent request does not duplicate it.
- Search failure does not erase query context.
- Coordinates never leave the server.
- Decline is not pushed to the sender.
- Accepted status, not client UI state, gates LinkedIn URL exchange and messaging.
