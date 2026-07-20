# Brea Web PRD

| Field | Value |
| --- | --- |
| Version | 2.0 |
| Date | 2026-07-20 |
| Status | Shipped — authenticated release |
| Supersedes | v1.3 (anonymous two-hour MVP, 2026-07-19) |
| Delivery format | Responsive single-page web app |

> **Contract re-freeze (2026-07).** Versions up to 1.3 froze an _anonymous_ MVP: a visitor
> searched from a fixed server-side demo profile (`BREA_MVP_PROFILE_ID`), and login, per-user
> profiles, browser geolocation, connection acceptance, and safety controls were all out of scope.
> The product shipped a different contract. This document re-freezes the contract to the
> **authenticated release** that is live at <https://brea-replace-ditto.vercel.app>. Where a
> capability is not yet built, it appears only under [§19 Roadmap](#19-roadmap-not-yet-shipped).

> **Amendments to this contract**
>
> - 2026-07-20 — FE-07 (#42): geolocation moved from onboarding requirement to first-search prompt. Discovery defaults are location-gated; a member who defers location stays non-discoverable until they enable discovery after adding a location. The first-search flow offers a one-tap prompt to enable it (FE-13, #52).

## 1. Product Summary

Brea helps a signed-in member find suitable people nearby through natural-language search. A member
describes who they want to meet, sees why each result is relevant, sends a lightweight connection
request, and manages incoming and outgoing requests from a Requests inbox.

### Product core

> Find suitable people nearby.

Every shipped capability strengthens either geographic proximity or personal relevance, or protects
the member (privacy and safety) while they do so.

### Product promise

> Sign in with LinkedIn, describe who you want to meet nearby, and start a real connection — while
> your exact location stays private.

## 2. Goal

Deliver a real end-to-end workflow that validates natural-language people discovery between
authenticated members through an integrated backend. The frontend ships no hard-coded profile or
connection data; every profile, distance, match reason, and connection state comes from InsForge
Edge Functions.

The release is successful when a first-time member can:

1. Sign in with LinkedIn.
2. Complete a one-minute onboarding that creates their private, discoverable profile.
3. Search nearby and receive relevant profiles with clear match explanations and approximate distance.
4. Send a connection request that is persisted and reflected back in search and the Requests inbox.
5. Accept or decline requests other members send them.

## 3. Target User and Job to Be Done

### Primary persona

An urban professional, student, newcomer, or remote worker with a LinkedIn identity who wants to
meet someone relevant nearby without browsing a generic social feed.

### Job to be done

> When I want company, advice, or a shared activity, help me quickly find a nearby person who fits
> what I am looking for so I can start a real-world connection — without exposing where I live.

## 4. Scope

### 4.1 In scope — shipped

- **LinkedIn OAuth sign-in (required).** No unauthenticated access to discovery. LinkedIn provides
  the member's name, email, and profile photo only.
- **Per-user private profiles.** One private profile is provisioned per InsForge auth user on first
  sign-in and is hidden from discovery until the member completes onboarding and opts in.
- **First-run onboarding.** Member reviews and edits name, headline, short bio, skills, interests,
  availability, a general location label, an optional LinkedIn profile URL, and an optional private
  distance origin from browser geolocation (requested before the first search if skipped here); and
  sets discovery controls (discoverable / open to new connections).
- **Profile editing.** The same form reopens later so members can edit details, refresh their
  private location, or pause visibility.
- **Nearby natural-language search** for authenticated, onboarded members, with an adjustable radius
  (default 10 km, 1–50 km) and deterministic relevance ranking.
- **Bidirectional connection status** on each result card (none, outgoing pending, incoming pending,
  connected).
- **Connection request lifecycle**: send request → accept / decline; idempotent retries; re-request
  after a decline; typed 409 conflict semantics (see [§8](#8-connection-lifecycle)).
- **Requests inbox** with separate Incoming and Sent lists and accept / decline actions.
- **LinkedIn URL exchange on acceptance**: a member's optional LinkedIn profile URL is revealed to a
  counterpart only after a request is accepted.
- **Safety controls**: per-card hide (block) and report with a reason.
- **Product-event tracking** (see [§11](#11-product-events)).
- **Functions-only data boundary** with deny-by-default row-level security.

### 4.2 Out of scope

Anything not listed in §4.1 is out of scope for this release. Notable exclusions, and where they are
tracked, are in [§19 Roadmap](#19-roadmap-not-yet-shipped): chat and real-time messaging;
notifications (email or push); the Share Marketplace; ratings, reviews, payments, and identity
verification beyond LinkedIn; vector or LLM-based semantic search; and a moderation / admin console
for stored reports and blocks.

## 5. Authentication Model

- Sign-in is **LinkedIn OAuth** via `@insforge/sdk` `auth.signInWithOAuth("linkedin", { redirectTo:
  window.location.origin })`. The app uses the SDK's OAuth/PKCE flow; there is no `/auth/callback`
  route — the provider returns to the plain origin.
- On load the app bootstraps the session with `auth.getCurrentUser()` and reads
  `auth.getPublicAuthConfig()` to learn whether the LinkedIn provider is enabled. A transient
  backend error triggers one automatic retry before the sign-in screen surfaces a manual retry.
- If the LinkedIn provider is not enabled in the current InsForge environment, the sign-in button is
  disabled with setup guidance rather than failing silently.
- Sessions are the SDK default (in-memory access token plus an HttpOnly refresh cookie; nothing
  sensitive is stored in `localStorage`). Sign-out is available throughout the app.
- Unauthenticated visitors only ever see the sign-in screen.

## 6. Profile and Onboarding

- **Provisioning.** A private `profiles` row is created for every non-admin auth user — by a database
  trigger on `auth.users` insert, with a client-side upsert fallback. It starts with
  `onboarding_completed = false`, `is_discoverable = false`, `is_available = false`, and the name /
  avatar carried from the LinkedIn identity.
- **Onboarding form** (`ProfileSetup`, "onboarding" mode). Fields:
  - Name (required, ≤120 chars).
  - Headline (required, ≤240 chars).
  - Short bio (optional, ≤1000 chars).
  - Skills and interests (optional, comma-separated, de-duplicated, ≤20 each).
  - Availability (optional, ≤180 chars).
  - General location label (required, ≤120 chars) — a coarse, human-readable place shown to others.
  - LinkedIn profile URL (optional; validated against `https://[cc.]linkedin.com/in/...`).
  - **Private distance origin** — latitude/longitude captured with `navigator.geolocation`. Optional
    at onboarding; Brea requests it before the first search, and it is required to appear in discovery
    or to search nearby. Used only to compute approximate distance; the coordinates are never shown to
    anyone.
  - Discovery controls: **Show me in discovery** (`isDiscoverable`) and **Open to new connections**
    (`isAvailable`), both defaulting on during onboarding **when a location is provided; without one,
    "Show me in discovery" is disabled and saved off until a location is added later**.
- Saving onboarding sets `onboarding_completed = true` and emits `profile_completed`.
- **Editing** ("editing" mode) reopens the same form; saving emits `profile_updated`.
- A profile becomes discoverable only when it is onboarded, discoverable, available, and has a
  headline, a location label, and coordinates (enforced by a database check constraint).

## 7. Discovery and Search

- Search requires an authenticated session, a completed profile, and a stored location. Missing any
  of these returns `PROFILE_SETUP_REQUIRED` (409). Because location is optional at onboarding, the app
  prompts for it inline on the first search when it is not yet set, then runs the search automatically
  once it is saved.
- The UI exposes a **radius slider** from 1 to 50 km, defaulting to **10 km**; the empty state offers
  a one-tap "Broaden to 25 km". (Radius is no longer fixed at 10 km as in v1.3.)
- Example query chips populate and run the search:
  - "A product designer who enjoys hiking"
  - "Someone who can help me practice Japanese"
  - "A developer available for coffee"
- The backend resolves the searcher from their bearer token, excludes the searcher, and considers
  only profiles that are onboarded, discoverable, and available, minus any blocked in either
  direction. It computes Haversine distance, applies the radius as a hard filter, ranks by
  **deterministic keyword relevance** (weighted fields: skills > interests > headline > availability >
  bio, with an exact-phrase bonus) using distance as the tie-breaker, and rounds distance to 0.1 km.
- Ranking is deterministic keyword matching, **not** a vector or LLM model; the UI does not claim
  otherwise.
- Each result card shows name and avatar or initials, headline, approximate distance, skills and
  interests, availability, an evidence-based match reason, current connection state, and a `⋯` menu
  with Hide / Report.
- The UI has distinct idle, loading, results, empty, and error states, prevents duplicate in-flight
  searches, and preserves the query on retry.

## 8. Connection Lifecycle

Statuses persist as `pending`, `accepted`, or `declined`, with legal transitions enforced by a
database trigger: `pending → accepted|declined`, `accepted → declined`, and `declined → pending`
(re-request).

### 8.1 Send a request — `connection-request`

Request body:

```ts
{ recipientId: string /* UUID */, sourceQuery: string /* 2–200 chars */ }
```

Success (200):

```ts
type ConnectionResponse = {
  id: string;
  recipientId: string;
  status: "pending" | "accepted";
  createdAt: string;
  created: boolean;
};
```

- First request persists a `pending` row and returns `created: true`.
- A repeated request for an existing `pending`/`accepted` pair returns that row with `created: false`
  (idempotent; no duplicate row — enforced by a unique `(sender, recipient)` constraint).
- A request to someone the sender previously declined, or who declined the sender, re-opens the row
  (`declined → pending`) and returns `created: true`.
- A successful new or re-opened request emits `connection_requested`.

Error responses use `{ code, message }`. The full set for this Function:

| HTTP | `code` | Meaning |
| --- | --- | --- |
| 400 | `INVALID_REQUEST` | Malformed body, bad `recipientId` UUID, or `sourceQuery` outside 2–200. |
| 400 | `SELF_CONNECTION` | `recipientId` is the sender's own profile. |
| 401 | `AUTH_REQUIRED` | No bearer token. |
| 401 | `INVALID_SESSION` | Token present but session invalid/expired. |
| 403 | `ORIGIN_NOT_ALLOWED` | Origin not in the allowlist. |
| 404 | `RECIPIENT_NOT_FOUND` | No profile with that id. |
| 405 | `METHOD_NOT_ALLOWED` | Non-POST method. |
| 409 | `PROFILE_SETUP_REQUIRED` | Sender has not completed onboarding. |
| 409 | `RECIPIENT_UNAVAILABLE` | Recipient is not onboarded/discoverable/available, **or** either side has blocked the other. |
| 409 | `INCOMING_REQUEST_EXISTS` | The recipient already has a pending request _to_ the sender — review it in Requests instead. |
| 409 | `ALREADY_CONNECTED` | The two are already connected. |
| 500 | `INTERNAL_ERROR` | Unexpected failure. |
| 503 | `SERVICE_UNAVAILABLE` | Backend configuration missing. |

### 8.2 Requests inbox — `connection-inbox`

Request body: `{}`. Returns the caller's incoming and outgoing requests, newest first:

```ts
type ConnectionInboxResponse = { incoming: ConnectionItem[]; outgoing: ConnectionItem[] };

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
    linkedinProfileUrl: string | null; // revealed only when status === "accepted"
  };
};
```

### 8.3 Respond to a request — `connection-respond`

Request body: `{ connectionId: string /* UUID */, action: "accept" | "decline" }`. Only the request's
**recipient** may respond. Success (200): `{ id, status: "accepted" | "declined", respondedAt }`.
Responding again with the same outcome is idempotent. Declining is **silent** — the sender is not
notified. Accepting emits `connection_responded` with `{ status }`.

| HTTP | `code` | Meaning |
| --- | --- | --- |
| 400 | `INVALID_REQUEST` | Bad body, `connectionId`, or `action`. |
| 401 | `AUTH_REQUIRED` / `INVALID_SESSION` | Not signed in / session invalid. |
| 404 | `REQUEST_NOT_FOUND` | No such request, or the caller is not its recipient. |
| 409 | `PROFILE_SETUP_REQUIRED` | Caller has no profile yet. |
| 409 | `REQUEST_ALREADY_RESOLVED` | Request is no longer pending (or changed concurrently). |

### 8.4 Connection status in search results

`people-search` returns a per-result `connectionStatus` of `none`, `outgoing_pending`,
`incoming_pending`, or `accepted`, so cards render the correct action (Connect / Request sent /
Review it in Requests / Connected). For backward compatibility during rollout, the frontend also
accepts the legacy value `"pending"` and treats it as `outgoing_pending`.

## 9. Safety — `profile-safety`

One Function handles both actions; both require an authenticated, onboarded caller and a target that
is not the caller.

- **Hide (block)** — `{ action: "block", profileId }`. Records a block (idempotent), auto-declines any
  connections between the two in both directions, and removes the card from the current results.
  Blocked profiles are filtered out of future searches in both directions. Emits `profile_hidden`.
  Returns `{ action: "block", profileId, hidden: true }`.
- **Report** — `{ action: "report", profileId, reason, details? }`, where `reason` is one of `spam`,
  `harassment`, `misleading`, `unsafe`, `other`, and `details` is optional (≤500 chars). Stores the
  report and emits `profile_reported` with `{ reason }`. Returns
  `{ action: "report", profileId, submitted: true }`.

Reports are stored for later review; there is no moderation/admin console in this release (see §19).

## 10. Privacy Promises

- **Exact location is never exposed.** Coordinates are stored server-side and used only to compute
  distance; the API returns rounded distance and the member's chosen `locationLabel`, never latitude
  or longitude.
- **No LinkedIn scraping or contact import.** LinkedIn sign-in supplies only basic identity (name,
  email, photo). Brea does not scrape LinkedIn or import the member's connections (連絡人). A member's
  LinkedIn profile URL is self-provided and optional, and is disclosed to a counterpart only after a
  connection is accepted.
- **Member control.** A member can pause discoverability, pause new connections, edit their profile,
  hide/report others, or sign out at any time.
- **Least-exposure data surface.** Browser code receives only the InsForge URL, Functions URL, and
  anon key. The admin API key and LinkedIn client secret stay in server-side Function secrets.
- **Silent declines.** Declining a request does not notify the sender.

## 11. Product Events

Events are written to `public.product_events` (a server-only table). Client-originated events go
through the `track-event` Function, which only accepts the three client event names below; the
remaining events are written directly by their owning Function. The database constrains the event
name to exactly this set:

| Event | Source | Trigger | Properties |
| --- | --- | --- | --- |
| `sign_in_completed` | client → `track-event` | Once per session after the profile loads | `{}` |
| `profile_completed` | client → `track-event` | Onboarding saved | `{}` |
| `profile_updated` | client → `track-event` | Profile edited and saved | `{}` |
| `search_completed` | `people-search` | Each search | `{ radiusKm, resultCount, queryLength }` |
| `connection_requested` | `connection-request` | New or re-opened request | `{ recipientId }` |
| `connection_responded` | `connection-respond` | Accept or decline | `{ status }` |
| `profile_hidden` | `profile-safety` | Block | `{}` |
| `profile_reported` | `profile-safety` | Report | `{ reason }` |

## 12. Core User Flow

```text
Open Brea
   ↓
Sign in with LinkedIn
   ↓
First run: review profile, optionally add location, choose discovery controls  → save
   ↓
Describe who you want to meet (or pick an example) and set a radius
   ↓
Submit search (add your location first if not set) → review ranked profiles, distance, and match reasons
   ↓
Connect  ──────────────►  Request sent (pending)
   │                          ↓
   │                  Recipient opens Requests inbox
   │                          ↓
   │                  Accept  →  both sides Connected, LinkedIn URLs exchanged
   │                  Decline →  silent; sender may re-request later
   └── Hide / Report a card at any time
```

## 13. Functional Requirements

| ID | Requirement | Acceptance |
| --- | --- | --- |
| AUTH-001 | LinkedIn sign-in | Discovery is unreachable until the member signs in with LinkedIn; provider-disabled state is explained, not silent. |
| PROF-001 | Provisioned profile | A private, non-discoverable profile exists after first sign-in. |
| PROF-002 | Onboarding | Name, headline, and location label are required to finish; the geolocation origin is optional at onboarding and is requested before the first search; discovery toggles are set; `profile_completed` fires. |
| PROF-003 | Editing | The member can edit the profile and pause visibility; `profile_updated` fires. |
| SEARCH-001 | Nearby search | Search invokes `people-search` with `{ query, radiusKm, limit }`; radius is adjustable 1–50 km (default 10). |
| SEARCH-002 | States | Distinct idle, loading, results, empty, and error states; duplicate in-flight searches prevented; query preserved on retry. |
| SEARCH-003 | Relevance & privacy | Every result carries a backend match reason and rounded distance; no coordinates are returned. |
| CONN-001 | Send request | Connect invokes `connection-request`; idempotent retry; re-request after decline; typed 409s per §8.1. |
| CONN-002 | Inbox | Requests shows Incoming and Sent; recipient can accept/decline; decline is silent. |
| CONN-003 | Status reflection | Search cards reflect none / outgoing pending / incoming pending / connected. |
| SAFE-001 | Hide & report | A card can be hidden (block) or reported; blocked profiles disappear from results both ways. |
| API-001 | Error handling | Non-2xx responses show a readable message via the `{ code, message }` shape without losing the member's context. |
| UI-001 | Responsive | Core flows work without horizontal scroll at ~375 px and read comfortably at ~1440 px. |
| UI-002 | Accessibility | Inputs are labeled, controls have accessible names, keyboard navigation works, focus is visible, and status regions are announced. |

## 14. InsForge Function Contract

The Vite app creates one `@insforge/sdk` client from `VITE_INSFORGE_URL`,
`VITE_INSFORGE_FUNCTIONS_URL`, and `VITE_INSFORGE_ANON_KEY`, and calls Functions via
`insforge.functions.invoke()`. Six Functions are frozen for this release:

| Slug | Purpose | Request |
| --- | --- | --- |
| `people-search` | Nearby ranked discovery | `{ query, radiusKm, limit }` |
| `connection-request` | Send / re-request a connection | `{ recipientId, sourceQuery }` |
| `connection-inbox` | List incoming & outgoing requests | `{}` |
| `connection-respond` | Accept / decline a request | `{ connectionId, action }` |
| `profile-safety` | Block or report a profile | `{ action, profileId, reason?, details? }` |
| `track-event` | Record a client product event | `{ eventName, properties }` |

Every Function verifies the caller's bearer token, resolves the actor through `profiles.user_id`
server-side (it never trusts a browser-supplied identity), enforces the `BREA_ALLOWED_ORIGINS` CORS
allowlist, handles `OPTIONS`, and returns errors as `{ code, message }`. `people-search` shape:

```ts
type PeopleSearchResponse = { results: PersonMatch[] };

type PersonMatch = {
  id: string;
  name: string;
  avatarUrl: string | null;
  headline: string;
  bio: string | null;
  distanceKm: number;                 // rounded to 0.1 km
  skills: string[];
  interests: string[];
  availability: string | null;
  matchReason: string;
  connectionStatus: "none" | "outgoing_pending" | "incoming_pending" | "accepted";
};
```

An empty search returns `{ "results": [] }`. Results arrive already ranked; the frontend does not
re-rank or recompute distance.

## 15. Data Model and Security Boundary

- Tables: `profiles` (with `user_id` → `auth.users`, `location_label`, `linkedin_profile_url`,
  `onboarding_completed`, `is_discoverable`, `is_available`, `latitude`, `longitude`, …),
  `connections` (`sender_id`, `recipient_id`, `status`, `source_query`, `responded_at`, unique
  `(sender, recipient)`, transition-guard trigger), `profile_blocks`, `profile_reports`, and
  `product_events`.
- Row-level security is enabled on every table. `authenticated` members may read/write only their own
  `profiles` row and may read connections they participate in; `profile_blocks`, `profile_reports`,
  and `product_events` are fully revoked from `anon` and `authenticated` and are reachable only
  through Functions using the admin client.
- All privileged reads/writes go through Edge Functions with the server-side `API_KEY`. The frontend
  never reads or writes base tables beyond its own profile row.
- Function secrets: `INSFORGE_BASE_URL`, `API_KEY`, `BREA_ALLOWED_ORIGINS`. (`BREA_MVP_PROFILE_ID`
  from the anonymous MVP is retired and read by no deployed Function.)

## 16. Technical Constraints

- React 19 + TypeScript + Vite; Tailwind CSS v3.4; `@insforge/sdk` as the only integration client.
- Node.js 22 for local development.
- Browser-safe env vars only: `VITE_INSFORGE_URL`, `VITE_INSFORGE_FUNCTIONS_URL`,
  `VITE_INSFORGE_ANON_KEY` (see `.env.example`). Never place the admin/API key, LinkedIn client
  secret, or coordinates in `VITE_*` variables.
- Keep `.env`, `.env.local`, `.env*.local`, and `.vercel/` out of Git; commit only empty placeholders.
- Single-route SPA — no Next.js, React Router, or raw Function URLs.
- Vite embeds `VITE_*` at build time, so Preview and Production must build separately and a Preview
  bundle must never be promoted to Production when the two target different InsForge backends.

## 17. Non-Functional Requirements

- **Performance:** immediate loading feedback; SDK requests time out at 15 s with one retry.
- **Reliability:** network and server errors are recoverable without reloading; auth bootstrap
  auto-retries a transient failure and offers manual retry.
- **Privacy:** display only discovery fields the member chose to share; never expose coordinates.
- **Security:** no credentials, secrets, or privileged tokens in frontend code or the bundle.
- **Compatibility:** current Chromium- and WebKit-based browsers.

## 18. Definition of Done (this release)

- Members sign in with LinkedIn, complete onboarding, add their private geolocation (during onboarding or before their first search), and become discoverable.
- Search returns backend-ranked nearby profiles with match reasons and rounded distance.
- A request persists, is idempotent, re-opens after a decline, and returns the typed 409s in §8.1.
- The Requests inbox lists incoming/outgoing requests and supports accept/decline; declines are silent.
- Hide (block) and report work and filter blocked profiles from search both ways.
- Product events are recorded for the events in §11.
- Anonymous SDK clients cannot read `profiles`, `connections`, or the safety/event tables directly.
- No admin key, LinkedIn secret, or raw coordinates appear in the bundle or Function responses.
- The core loop works at mobile and desktop widths with no blocking console errors.

## 19. Roadmap (not yet shipped)

Aspirational; none of the following is built in this release:

1. Chat or real-time messaging between connected members.
2. Notifications (email or push) for requests and acceptances.
3. A moderation / admin console over stored `profile_reports` and `profile_blocks`.
4. Semantic / vector search and ranking evaluation (current ranking is deterministic keyword matching).
5. AI-assisted profile enrichment with explicit consent.
6. Finer location-precision and consent controls beyond the current private-origin model.
7. A separate, dedicated Production InsForge project (the live site currently runs on the Preview
   backend) with re-verified deny-by-default RLS.
8. The location-based Share Marketplace as a separate validated workflow.
9. Dedicated per-code UI for the Connect 409 conflicts (today the backend `message` is surfaced
   generically).
