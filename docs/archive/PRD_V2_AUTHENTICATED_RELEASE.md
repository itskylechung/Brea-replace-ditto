# Brea Web PRD v2.0 — Archived Authenticated Release Contract

| Field           | Value                                     |
| --------------- | ----------------------------------------- |
| Version         | 2.0                                       |
| Date            | 2026-07-20                                |
| Status          | Shipped — authenticated release           |
| Supersedes      | v1.3 (anonymous two-hour MVP, 2026-07-19) |
| Delivery format | Responsive single-page web app            |

> **Contract re-freeze (2026-07).** Versions up to 1.3 froze an *anonymous* MVP: a visitor
searched from a fixed server-side demo profile (`BREA_MVP_PROFILE_ID`), and login, per-user
profiles, browser geolocation, connection acceptance, and safety controls were all out of scope.
The product shipped a different contract. This document re-freezes the contract to the **authenticated release** that is live at [https://brea-replace-ditto.vercel.app](https://brea-replace-ditto.vercel.app). Where a
capability is not yet built, it appears only under [§19 Roadmap](#19-roadmap-not-yet-shipped).

> **Amendments to this contract**

- > 2026-07-20 — FE-07 (#42): geolocation moved from onboarding requirement to first-search prompt. Discovery defaults are location-gated; a member who defers location stays non-discoverable until they enable discovery after adding a location. The first-search flow offers a one-tap prompt to enable it (FE-13, #52).
- > 2026-07-21 — §19 Roadmap restructured around the "LinkedIn for dating life" product direction (feature map filed as issues #66–#75, milestone M4). The shipped contract is unchanged. Note: a social feed (#71) would reverse the §3 JTBD promise ("without browsing a generic social feed") and therefore requires a v3 contract re-freeze before it ships; events (#70) extend the existing core and do not.
- > 2026-07-23 — Messaging (#66, PR #78), semantic embedding ranking (#69, PR #79), and the moderation console (#68, PR #80) moved from §19 into shipped scope. Semantic search retains the deterministic keyword ranker as its availability fallback.
- > 2026-07-23 — Added a product-direction hypothesis for activating existing LinkedIn connections into real-world meetings (#94). This is a validation track, not a change to the shipped authenticated-release contract; graph access, invitation privacy, and any contract re-freeze remain explicit gates.
- > 2026-07-23 — Expanded #94 into a relationship CRM concept with two validation modules: an explainable Approach Copilot for deciding whom to contact, and a Meeting Pipeline for managing outreach through confirmed meetings and follow-up.
- > 2026-07-23 — Added the initial go-to-market hypothesis: invite-only cowork, coffee, and after-work micro-events for busy single founders, operators, and ambitious professionals. Events are the proposed acquisition wedge; Approach Copilot and Meeting Pipeline are the retention and meeting-conversion engine. See §3.2, §3.3, and §20.
- > 2026-07-23 — Added a personality-expression hypothesis (#95, §3.4): structured prompts, pinned profile stories, and contextual posts should help members show who they are beyond credentials, improve shortlisting and conversation starts, and be validated before any generic Feed investment.

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
your exact location stays private.

### Validation direction — not shipped

> Meet ambitious singles through things you already enjoy doing, then use Brea to turn promising
encounters into real meetings.

The proposed vNext model is not another swipe or feed product. Curated professional-social events
create trusted encounters; Approach Copilot and Meeting Pipeline help members decide whom to pursue,
coordinate the next meeting, and follow through.

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
what I am looking for so I can start a real-world connection — without exposing where I live.

### 3.1 Product direction under validation — relationship activation

Feedback captured on 2026-07-23 suggests that choosing LinkedIn as Brea's starting surface should
also minimize the cost of switching away from it. A member should feel that existing professional
relationships retain their value and that Brea makes those relationships easier to activate
offline.

The hypothesis is:

> LinkedIn is the identity and relationship source; Brea is the action layer that helps people turn
existing connections into real-world meetings.

The proposed positioning is:

> Brea is the relationship CRM that helps you decide whom to approach and turns outreach into real
meetings.

This creates two complementary entry points:

1. **Reconnect:** organize and invite someone the member already knows.
2. **Discover:** use Brea's shipped nearby search to find someone new.

The validation JTBD is:

> When I have many possible people in or around my LinkedIn network, help me identify who is worth
approaching for my current goal, understand why, and manage every outreach until we meet — without
repeatedly scanning profiles and disconnected message threads.

#### Module A — Approach Copilot

The member defines a concrete relationship goal, such as finding a Taipei-based operator with US
go-to-market experience or reconnecting with product leaders in B2B SaaS. Brea then:

- Builds a candidate set only from approved, consented, or member-provided sources.
- Filters by relevant experience, role, industry, skills, location, relationship context, and the
member's stated goal.
- Produces a small, prioritized shortlist rather than another infinite people directory.
- Explains why each person may be appropriate to approach and identifies the evidence used.
- Suggests a personalized approach angle or invitation draft, but never sends it automatically.
- Lets the member shortlist, dismiss, snooze, or correct a recommendation so ranking remains
user-controlled.

Ranking must be explainable and must not infer sensitive traits. A recommendation is decision
support, not a claim that the person will respond or is personally compatible.

#### Module B — Meeting Pipeline

The pipeline gives the member a portfolio-level view above individual LinkedIn message threads:

```text
Suggested → Shortlisted → Approached → Waiting → Replied → Scheduling
          → Confirmed → Met → Follow-up
```

For each person or invitation, Brea records the current stage, last action, next action, due date,
meeting purpose, and only the minimum relationship notes the member chooses to store. A dashboard
answers:

- How many people did I approach this week?
- How many have not replied?
- Which conversations are scheduling now?
- How many meetings are confirmed?
- Who needs a follow-up, and when?
- Who is the next best person to approach for my current goal?

The pipeline is not a bulk-sales automation tool. v1 has no mass outreach, automatic sending,
engagement manipulation, or undisclosed enrichment.

#### First validation slice

The first slice is not a social feed or a promise of automatic LinkedIn graph import:

1. The member defines a weekly relationship goal.
2. They add or select a small candidate set through an approved source.
3. Approach Copilot produces an explainable shortlist.
4. The member chooses someone and creates a personalized invitation.
5. Brea tracks the outreach as it moves through Waiting, Scheduling, Confirmed, Met, and Follow-up.
6. A low-friction invitation collects a response, proposed times, and a general place.
7. A confirmed meeting receives a calendar handoff.

Events (#70) should eventually reuse the same invitation, RSVP, scheduling, and calendar primitives
for group meetups.

Before this direction enters shipped scope, Brea must:

- Verify available LinkedIn APIs, platform policy, consent, and review requirements; never scrape or
imply graph access that the product has not received.
- Choose deliberately among automatic graph sync, user-assisted selection/import, and outbound
shareable invitations.
- Define the minimum relationship data stored and the member's deletion controls.
- Decide whether invitees may view or respond without signing in, including the privacy boundary for
expired, revoked, forwarded, or guessed links.
- Define how experience data enters the candidate set, when it is refreshed, and how the member can
correct or remove it.
- Require an evidence-based explanation for every recommendation and prohibit sensitive-trait
inference, bulk outreach, and automatic sending.
- Validate that Brea improves meeting conversion compared with arranging the same meeting through
LinkedIn messages alone.
- Decide whether the resulting flow requires a formal contract re-freeze.

Primary validation metric: confirmed meetings per weekly active member. Supporting funnel metrics
are candidates reviewed → shortlisted → approached → replied → scheduling → confirmed → met, plus
median time to reply and overdue follow-ups. These names are measurement proposals, not additions to
the frozen production event allowlist until implementation is approved.

The detailed validation epic is #94.

### 3.2 Beachhead segment under validation

The initial beachhead is deliberately narrower than the shipped primary persona:

- Single founders, operators, and ambitious professional or white-collar workers.
- Time-poor members who do not want to spend hours swiping or maintaining disconnected message
threads.
- People who value professional experience, ambition, shared context, and a trusted identity signal.
- Members who are more willing to attend a useful cowork, coffee, or after-work activity than an
explicit singles mixer.
- Early testers reachable through the founding team's existing founder and professional networks.

The initial geographic market must be selected before the pilot. The San Francisco Bay Area is the
leading network-based hypothesis, but the decision should compare host density, member density,
operating cost, safety coverage, and the team's ability to run recurring events.

Beachhead JTBD:

> When I am too busy to spend hours on dating apps, help me meet ambitious singles through an
activity I would enjoy attending anyway.

This is a starting cohort, not a permanent eligibility boundary. Expansion beyond founders should
follow evidence about which professional segments generate strong attendance, mutual interest,
confirmed meetings, safety, and repeat participation.

### 3.3 Go-to-market wedge under validation — curated micro-events

The proposed acquisition wedge is a recurring series of small, invite-only activities with
standalone value:

- Saturday Founder Cowork.
- Coffee & Build.
- Founder or Operator Happy Hour.
- Small after-work drinks.
- Profession- or interest-specific cowork and social sessions.

The activity must remain worthwhile even when an attendee does not meet a romantic match. That makes
the first interaction lower-pressure than a formal date, supplies natural conversation context, and
avoids requiring a populated feed at launch.

The proposed product loop is:

```text
Curated invitation → LinkedIn-verified RSVP → useful in-person activity
        → private shortlist / mutual interest → Approach Copilot
        → Meeting Pipeline → confirmed 1:1 meeting → follow-up
```

Product responsibilities by stage:

- **Acquisition — Events (#70):** invitation, curation, capacity, RSVP, reminders, check-in, attendee
privacy, safety, and a useful real-world experience.
- **Intent capture:** a private post-event shortlist; romantic interest is revealed only after
mutual opt-in.
- **Decision support — Approach Copilot (#94):** explain whom to follow up with and why, then suggest
a personalized approach without automatic sending.
- **Retention — Meeting Pipeline (#94):** track response, scheduling, confirmation, meeting, and
follow-up across relationships.

Feed (#71) is not required for this loop and remains behind its existing contract and sequencing
gates.

### 3.4 Personality layer under validation

LinkedIn is strong at communicating credentials and professional history but weak at showing what a
person is like outside work. Brea needs a personality layer that helps members answer:

> Who is this person beyond their title, and would I enjoy spending time with them?

The product hypothesis is:

> LinkedIn shows what someone has done; Brea helps them show who they are.

Personality content exists to improve judgment, conversation, and meeting conversion—not to
maximize time spent consuming a feed.

#### Surface A — personality prompts

Structured prompts reduce blank-page anxiety and produce comparable, conversation-ready signals.
Candidate prompts include:

- Where are you usually found after work?
- What have you been unusually excited about lately?
- What does your ideal Saturday afternoon look like?
- How would your close friends describe you?
- What is something you would love to find a partner-in-crime for?
- What quality do you appreciate most in another person?
- What do you take surprisingly seriously outside work?

Members choose which prompts to answer, may edit or remove an answer at any time, and are never
required to answer intimate or sensitive questions.

#### Surface B — pinned profile stories

A member can pin a small set of personality-rich prompt answers or short posts to their profile.
These stories are durable profile context rather than ephemeral engagement content. v1 should cap
the set at approximately three to five items so the profile remains intentional and scannable.

Pinned stories may appear:

- On the member's full profile.
- As evidence behind an Approach Copilot recommendation.
- In privacy-approved attendee context before or after an event.
- As a suggested, specific conversation starter.

#### Surface C — contextual posts

Contextual posts express personality through something the member wants to do or discuss:

- “I want someone to cowork with this Saturday.”
- “I am learning about natural wine—who wants to explore a bar together?”
- A short pre-event introduction.
- A post-event reflection or topic the member wants to continue discussing.
- A small personal story that reveals taste, humor, curiosity, or values.

Contextual posts should connect naturally to an invitation, event, profile, or meeting goal. They
should not require a generic global feed to create value.

#### Personality-to-meeting product loop

```text
Share personality → richer evidence for matching and shortlisting
        → more specific approach angle → higher-quality conversation
        → reply / mutual interest → confirmed meeting
        → new experiences and stories → richer personality context
        ↺
```

Approach Copilot may use member-approved personality content only when it can cite the specific
evidence behind a recommendation or conversation starter. It must not infer sensitive traits,
psychological diagnoses, sexual behavior, political affiliation, or other attributes the member did
not explicitly choose to share.

#### v1 boundaries

The first personality-content validation has:

- Text-first prompt answers and short posts.
- A small pinned set on the profile.
- Contextual distribution through profiles, events, recommendations, and invitations.
- Member controls to edit, delete, unpin, hide, report, and exclude content from recommendation use.
- No follower graph, reposts, public popularity counts, creator monetization, algorithmic engagement
ranking, or infinite-scroll feed.
- No automatic posting or content generated and published without explicit review.

Success is measured by whether personality content improves a member's confidence and ability to
choose and approach someone—not by raw posting volume, likes, impressions, or session duration.

Proposed metrics:

- Profile view → shortlist conversion with and without personality content.
- Personality-content-assisted approach rate.
- Reply rate when the approach cites a specific prompt or story.
- Mutual-interest rate.
- Confirmed meetings influenced by personality content.
- Hide, report, deletion, and recommendation-exclusion rates.

The team must validate this narrower personality layer before deciding whether Feed (#71) provides
incremental value. A successful personality layer does not, by itself, authorize a generic feed or
remove #71's v3 contract re-freeze gate.

The implementation and controlled-experiment contract is tracked in #95.

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
(default 10 km, 1–50 km), semantic embedding ranking, and a deterministic keyword fallback.
- **Bidirectional connection status** on each result card (none, outgoing pending, incoming pending,
connected).
- **Connection request lifecycle**: send request → accept / decline; idempotent retries; re-request
after a decline; typed 409 conflict semantics (see [§8](#8-connection-lifecycle)).
- **Requests inbox** with separate Incoming and Sent lists and accept / decline actions.
- **LinkedIn URL exchange on acceptance**: a member's optional LinkedIn profile URL is revealed to a
counterpart only after a request is accepted.
- **One-to-one messaging after acceptance.** Members in an accepted, unblocked connection can
exchange text messages from the Requests screen.
- **Safety controls**: per-card hide (block) and report with a reason.
- **Moderation console.** Allowlisted admins can review open reports, resolve or dismiss them, and
optionally force-hide the reported profile.
- **Product-event tracking** (see [§11](#11-product-events)).
- **Functions-only data boundary** with deny-by-default row-level security.

### 4.2 Out of scope

Anything not listed in §4.1 is out of scope for this release. Notable exclusions, and where they are
tracked, are in [§19 Roadmap](#19-roadmap-not-yet-shipped): notifications (email or push);
multi-photo profiles; the Share Marketplace; ratings, reviews, payments, and identity verification
beyond LinkedIn; existing-connection import/management and meeting coordination; personality
prompts, stories, and posts; events; and social-feed features.

## 5. Authentication Model

- Sign-in is **LinkedIn OAuth** via `@insforge/sdk` `auth.signInWithOAuth("linkedin", { redirectTo: window.location.origin })`. The app uses the SDK's OAuth/PKCE flow; there is no `/auth/callback` route — the provider returns to the plain origin.
- On load the app bootstraps the session with `auth.getCurrentUser()` and reads `auth.getPublicAuthConfig()` to learn whether the LinkedIn provider is enabled. A transient
backend error triggers one automatic retry before the sign-in screen surfaces a manual retry.
- If the LinkedIn provider is not enabled in the current InsForge environment, the sign-in button is
disabled with setup guidance rather than failing silently.
- Sessions are the SDK default (in-memory access token plus an HttpOnly refresh cookie; nothing
sensitive is stored in `localStorage`). Sign-out is available throughout the app.
- Unauthenticated visitors only ever see the sign-in screen.

## 6. Profile and Onboarding

- **Provisioning.** A private `profiles` row is created for every non-admin auth user — by a database
trigger on `auth.users` insert, with a client-side upsert fallback. It starts with `onboarding_completed = false`, `is_discoverable = false`, `is_available = false`, and the name /
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
   - Discovery controls: **Show me in discovery** (`isDiscoverable`) and **Open to new connections** (`isAvailable`), both defaulting on during onboarding **when a location is provided; without one,
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
direction. It computes Haversine distance and applies the radius as a hard filter.
- When `OPENROUTER_API_KEY` is configured, `people-search` embeds the query and profile text with `nvidia/nemotron-3-embed-1b:free`, caches profile embeddings by a content-and-model hash, filters
semantic matches below the configured similarity threshold, and ranks by cosine similarity with
distance as the tie-breaker. Keyword evidence still supplies a specific match reason when
available; a purely semantic match gets neutral copy rather than fabricated evidence.
- If the embedding gateway is unavailable, misconfigured, times out, or returns no useful matches,
search falls back to the deterministic keyword ranker (weighted fields: skills > interests >
headline > availability > bio, with an exact-phrase bonus). Distance remains the tie-breaker and
returned distance is rounded to 0.1 km. `search_completed` records whether semantic or keyword
ranking served the result.
- Each result card shows name and avatar or initials, headline, approximate distance, skills and
interests, availability, an evidence-based match reason, current connection state, and a `⋯` menu
with Hide / Report.
- The UI has distinct idle, loading, results, empty, and error states, prevents duplicate in-flight
searches, and preserves the query on retry.

## 8. Connection Lifecycle

Statuses persist as `pending`, `accepted`, or `declined`, with legal transitions enforced by a
database trigger: `pending → accepted|declined`, `accepted → declined`, and `declined → pending` (re-request).

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
- A repeated request for an existing `pending`/`accepted` pair returns that row with `created: false` (idempotent; no duplicate row — enforced by a unique `(sender, recipient)` constraint).
- A request to someone the sender previously declined, or who declined the sender, re-opens the row
(`declined → pending`) and returns `created: true`.
- A successful new or re-opened request emits `connection_requested`.

Error responses use `{ code, message }`. The full set for this Function:

| HTTP | code                    | Meaning                                                                                    |
| ---- | ----------------------- | ------------------------------------------------------------------------------------------ |
| 400  | INVALID_REQUEST         | Malformed body, bad recipientId UUID, or sourceQuery outside 2–200.                        |
| 400  | SELF_CONNECTION         | recipientId is the sender's own profile.                                                   |
| 401  | AUTH_REQUIRED           | No bearer token.                                                                           |
| 401  | INVALID_SESSION         | Token present but session invalid/expired.                                                 |
| 403  | ORIGIN_NOT_ALLOWED      | Origin not in the allowlist.                                                               |
| 404  | RECIPIENT_NOT_FOUND     | No profile with that id.                                                                   |
| 405  | METHOD_NOT_ALLOWED      | Non-POST method.                                                                           |
| 409  | PROFILE_SETUP_REQUIRED  | Sender has not completed onboarding.                                                       |
| 409  | RECIPIENT_UNAVAILABLE   | Recipient is not onboarded/discoverable/available, or either side has blocked the other.   |
| 409  | INCOMING_REQUEST_EXISTS | The recipient already has a pending request to the sender — review it in Requests instead. |
| 409  | ALREADY_CONNECTED       | The two are already connected.                                                             |
| 500  | INTERNAL_ERROR          | Unexpected failure.                                                                        |
| 503  | SERVICE_UNAVAILABLE     | Backend configuration missing.                                                             |

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

Request body: `{ connectionId: string /* UUID */, action: "accept" | "decline" }`. Only the request's **recipient** may respond. Success (200): `{ id, status: "accepted" | "declined", respondedAt }`.
Responding again with the same outcome is idempotent. Declining is **silent** — the sender is not
notified. Accepting emits `connection_responded` with `{ status }`.

| HTTP | code                            | Meaning                                                 |
| ---- | ------------------------------- | ------------------------------------------------------- |
| 400  | INVALID_REQUEST                 | Bad body, connectionId, or action.                      |
| 401  | AUTH_REQUIRED / INVALID_SESSION | Not signed in / session invalid.                        |
| 404  | REQUEST_NOT_FOUND               | No such request, or the caller is not its recipient.    |
| 409  | PROFILE_SETUP_REQUIRED          | Caller has no profile yet.                              |
| 409  | REQUEST_ALREADY_RESOLVED        | Request is no longer pending (or changed concurrently). |

### 8.4 Connection status in search results

`people-search` returns a per-result `connectionStatus` of `none`, `outgoing_pending`, `incoming_pending`, or `accepted`, so cards render the correct action (Connect / Request sent /
Review it in Requests / Connected). For backward compatibility during rollout, the frontend also
accepts the legacy value `"pending"` and treats it as `outgoing_pending`.

### 8.5 Messages — `connection-messages`

One POST Function lists or sends messages:

```ts
type MessagesInput =
  | { action: "list"; connectionId: string }
  | { action: "send"; connectionId: string; body: string /* 1–2000 chars after trimming */ };
```

A conversation is available only when the caller participates in the referenced accepted connection
and neither participant has blocked the other. Every missing, non-participant, unaccepted, or blocked
conversation returns the same `CONVERSATION_NOT_FOUND` (404) response so the endpoint does not reveal
which condition failed. Listing returns the latest 200 messages in chronological order. The Requests
UI polls every five seconds and merges responses monotonically so a stale poll cannot hide a newly
sent message.

## 9. Safety — `profile-safety`

One Function handles both actions; both require an authenticated, onboarded caller and a target that
is not the caller.

- **Hide (block)** — `{ action: "block", profileId }`. Records a block (idempotent), auto-declines any
connections between the two in both directions, and removes the card from the current results.
Blocked profiles are filtered out of future searches in both directions. Emits `profile_hidden`.
Returns `{ action: "block", profileId, hidden: true }`.
- **Report** — `{ action: "report", profileId, reason, details? }`, where `reason` is one of `spam`, `harassment`, `misleading`, `unsafe`, `other`, and `details` is optional (≤500 chars). Stores the
report and emits `profile_reported` with `{ reason }`. Returns `{ action: "report", profileId, submitted: true }`.

Reports enter an admin moderation queue. Access fails closed unless the signed-in email appears in
the server-side `BREA_ADMIN_EMAILS` allowlist. An admin can mark an open report resolved or dismissed
and may force-hide the reported profile; resolution time and resolving admin email are retained for
the audit record.

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

| Event                | Source               | Trigger                                  | Properties                                      |
| -------------------- | -------------------- | ---------------------------------------- | ----------------------------------------------- |
| sign_in_completed    | client → track-event | Once per session after the profile loads | {}                                              |
| profile_completed    | client → track-event | Onboarding saved                         | {}                                              |
| profile_updated      | client → track-event | Profile edited and saved                 | {}                                              |
| search_completed     | people-search        | Each search                              | { radiusKm, resultCount, queryLength, ranking } |
| connection_requested | connection-request   | New or re-opened request                 | { recipientId }                                 |
| connection_responded | connection-respond   | Accept or decline                        | { status }                                      |
| profile_hidden       | profile-safety       | Block                                    | {}                                              |
| profile_reported     | profile-safety       | Report                                   | { reason }                                      |

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
   │                  Accept  →  both sides Connected, LinkedIn URLs exchanged, 1:1 messages enabled
   │                  Decline →  silent; sender may re-request later
   └── Hide / Report a card at any time
```

## 13. Functional Requirements

| ID         | Requirement                   | Acceptance                                                                                                                                                                                                |
| ---------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AUTH-001   | LinkedIn sign-in              | Discovery is unreachable until the member signs in with LinkedIn; provider-disabled state is explained, not silent.                                                                                       |
| PROF-001   | Provisioned profile           | A private, non-discoverable profile exists after first sign-in.                                                                                                                                           |
| PROF-002   | Onboarding                    | Name, headline, and location label are required to finish; the geolocation origin is optional at onboarding and is requested before the first search; discovery toggles are set; profile_completed fires. |
| PROF-003   | Editing                       | The member can edit the profile and pause visibility; profile_updated fires.                                                                                                                              |
| SEARCH-001 | Nearby search                 | Search invokes people-search with { query, radiusKm, limit }; radius is adjustable 1–50 km (default 10).                                                                                                  |
| SEARCH-002 | States                        | Distinct idle, loading, results, empty, and error states; duplicate in-flight searches prevented; query preserved on retry.                                                                               |
| SEARCH-003 | Relevance & privacy           | Every result carries a backend match reason and rounded distance; no coordinates are returned.                                                                                                            |
| CONN-001   | Send request                  | Connect invokes connection-request; idempotent retry; re-request after decline; typed 409s per §8.1.                                                                                                      |
| CONN-002   | Inbox                         | Requests shows Incoming and Sent; recipient can accept/decline; decline is silent.                                                                                                                        |
| CONN-003   | Status reflection             | Search cards reflect none / outgoing pending / incoming pending / connected.                                                                                                                              |
| MSG-001    | Accepted-connection messaging | Only participants in an accepted, unblocked connection can list or send 1–2000-character text messages.                                                                                                   |
| SAFE-001   | Hide & report                 | A card can be hidden (block) or reported; blocked profiles disappear from results both ways.                                                                                                              |
| MOD-001    | Moderation queue              | An allowlisted admin can list open reports, resolve or dismiss one, and optionally force-hide the reported profile.                                                                                       |
| API-001    | Error handling                | Non-2xx responses show a readable message via the { code, message } shape without losing the member's context.                                                                                            |
| UI-001     | Responsive                    | Core flows work without horizontal scroll at ~375 px and read comfortably at ~1440 px.                                                                                                                    |
| UI-002     | Accessibility                 | Inputs are labeled, controls have accessible names, keyboard navigation works, focus is visible, and status regions are announced.                                                                        |

## 14. InsForge Function Contract

The Vite app creates one `@insforge/sdk` client from `VITE_INSFORGE_URL`, `VITE_INSFORGE_FUNCTIONS_URL`, and `VITE_INSFORGE_ANON_KEY`, and calls Functions via `insforge.functions.invoke()`. Eight Functions are shipped in this release:

| Slug                | Purpose                                          | Request                                                                         |
| ------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------- |
| people-search       | Nearby ranked discovery                          | { query, radiusKm, limit }                                                      |
| connection-request  | Send / re-request a connection                   | { recipientId, sourceQuery }                                                    |
| connection-inbox    | List incoming & outgoing requests                | {}                                                                              |
| connection-respond  | Accept / decline a request                       | { connectionId, action }                                                        |
| connection-messages | List or send messages for an accepted connection | { action: "list", connectionId } or { action: "send", connectionId, body }      |
| profile-safety      | Block or report a profile                        | { action, profileId, reason?, details? }                                        |
| track-event         | Record a client product event                    | { eventName, properties }                                                       |
| moderation-console  | List or resolve reports for an allowlisted admin | { action: "queue" } or { action: "resolve", reportId, resolution, hideProfile } |

Every Function verifies the caller's bearer token, enforces the `BREA_ALLOWED_ORIGINS` CORS
allowlist, handles `OPTIONS`, and returns errors as `{ code, message }`. Member-facing Functions
resolve the actor through `profiles.user_id` server-side and never trust a browser-supplied identity; `moderation-console` instead authorizes the authenticated email against the server-side admin
allowlist. `people-search` shape:

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
  connectionStatus: "none" | "outgoing_pending" | "incoming_pending" | "accepted";
};
```

An empty search returns `{ "results": [] }`. Results arrive already ranked; the frontend does not
re-rank or recompute distance.

## 15. Data Model and Security Boundary

- Tables: `profiles` (with `user_id` → `auth.users`, `location_label`, `linkedin_profile_url`, `onboarding_completed`, `is_discoverable`, `is_available`, `latitude`, `longitude`, cached `embedding` / `embedding_hash`, …), `connections` (`sender_id`, `recipient_id`, `status`, `source_query`, `responded_at`, unique `(sender, recipient)`, transition-guard trigger), server-only `messages`, `profile_blocks`, `profile_reports` (including resolution state), and `product_events`.
- Row-level security is enabled on every table. `authenticated` members may read/write only their own `profiles` row and may read connections they participate in; `messages`, `profile_blocks`, `profile_reports`, and `product_events` are fully revoked from `anon` and `authenticated` and are
reachable only through Functions using the admin client.
- All privileged reads/writes go through Edge Functions with the server-side `API_KEY`. The frontend
never reads or writes base tables beyond its own profile row.
- Function secrets: `INSFORGE_BASE_URL`, `API_KEY`, `BREA_ALLOWED_ORIGINS`, `OPENROUTER_API_KEY`,
and `BREA_ADMIN_EMAILS`. (`BREA_MVP_PROFILE_ID` from the anonymous MVP is retired and read by no
deployed Function.)

## 16. Technical Constraints

- React 19 + TypeScript + Vite; Tailwind CSS v3.4; `@insforge/sdk` as the only integration client.
- Node.js 22 for local development.
- Browser-safe env vars only: `VITE_INSFORGE_URL`, `VITE_INSFORGE_FUNCTIONS_URL`, `VITE_INSFORGE_ANON_KEY` (see `.env.example`). Never place the admin/API key, LinkedIn client
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
- Accepted, unblocked connections can exchange one-to-one text messages.
- Hide (block) and report work and filter blocked profiles from search both ways.
- Allowlisted admins can review and resolve or dismiss reports and optionally force-hide a profile.
- Nearby search uses semantic embedding ranking when available and degrades to deterministic keyword
ranking without failing the search.
- Product events are recorded for the events in §11.
- Anonymous SDK clients cannot read `profiles`, `connections`, `messages`, or the safety/event tables
directly.
- No admin key, LinkedIn secret, or raw coordinates appear in the bundle or Function responses.
- The core loop works at mobile and desktop widths with no blocking console errors.

## 19. Roadmap (not yet shipped)

The items below remain aspirational. Restructured 2026-07-21 around the product direction "LinkedIn
for dating life": the LinkedIn-style identity, discovery, connection loop, messaging (#66),
moderation console (#68), and semantic ranking (#69) have shipped; the remaining roadmap extends
them toward events, content, and community. The full LinkedIn→dating feature map lives in issues
#66–#75.

### Product-direction validation — activate existing relationships

Issue #94 tests whether Brea should become the action layer on top of a member's existing LinkedIn
relationships. The implementation-independent validation path is:

1. Define a weekly relationship goal and assemble a small candidate set without depending on
automatic graph access.
2. Produce an explainable, experience-aware shortlist of people worth approaching.
3. Create a personalized one-person or small-group invitation with purpose, proposed times, and a
general place.
4. Share it through LinkedIn and move it through a visible relationship pipeline.
5. Let the invitee respond with the least friction the approved privacy/authentication model allows.
6. Confirm the meeting, provide a calendar handoff, and schedule any follow-up.
7. Measure shortlist → approach → response → scheduling → confirmed → met conversion.

This validation precedes investment in Feed (#71). Events (#70) become the proposed acquisition
wedge; #94 becomes the post-event retention and meeting-conversion engine. The validation may also
reshape transactional notifications (#49) and passive suggestions (#73), but does not expand their
shipped scope until the validation and contract decisions are complete.

### P1 — close the core loop

1. Notifications: transactional email on request received / accepted (BE-05, #49).
2. Multi-photo profile gallery (#67) — the single LinkedIn OIDC photo is not enough for a dating
product.
3. AI-assisted profile enrichment with explicit consent (BE-06, #50).

### P2 — events & content (milestone M4)

1. **Events** (#70): the proposed GTM acquisition wedge begins with invite-only cowork, coffee, and
after-work micro-events for the beachhead segment, with curated invitations, RSVP, capacity,
reminders, check-in, safety controls, and a privacy-gated attendee context. Post-event private
shortlisting and mutual opt-in connect the event to #94. Requires client-side routing (FE-12,
#48) first; the moderation-console prerequisite (#68) is complete.
2. **Feed** (#71): posts about dating life, reactions, comments. ⚠️ Reverses the §3 JTBD promise
("without browsing a generic social feed") — ships only behind a v3 contract re-freeze, and
after events give members something to post about. It is deprioritized while the event → meeting
loop is being validated. Before Feed, validate the narrower §3.4 personality layer (#95):
structured prompts, pinned profile stories, and contextual posts distributed through profiles,
events, and recommendations. Evidence that personality content helps shortlisting or conversation
does not automatically justify a generic feed.
3. Vouches: character endorsements from friends (#72).
4. Passive discovery suggestions without composing a search (#73).
5. Profile verification badge (#74).

### P3 — later (single tracker: #75)

Influencer/creator tools, groups, polls, newsletters, organizer pages, who-viewed-you, premium
tier, promoted events, post-date testimonials.

### Platform debts (priority independent)

1. A separate, dedicated Production InsForge project (the live site currently runs on the Preview
backend) with re-verified deny-by-default RLS (OPS-02, #26) — blocks #49, #50, and safety-ops
automation (#51).
2. Finer location-precision and consent controls beyond the current private-origin model (#91).
3. The location-based Share Marketplace as a separate validated workflow (#92).
4. Dedicated per-code UI for the Connect 409 conflicts (today the backend `message` is surfaced
generically; #93).

## 20. Go-to-market validation plan

This section defines a controlled experiment, not shipped functionality. Product requirements enter
§4.1 and §13 only after the relevant decision gates pass.

### 20.1 Pilot hypothesis

Busy single founders and ambitious professionals will attend a small activity with professional and
social value more readily than they will adopt another swipe-based dating app. Trusted context,
private intent capture, and structured follow-up will produce confirmed meetings without requiring
a feed or a large open network.

### 20.2 Pilot design

- Select one launch city and one reachable founder/professional community.
- Recruit approximately 20–30 high-quality seed members manually.
- Run a short series of recurring events rather than evaluating a single event.
- Target roughly 15–25 attendees per event, subject to venue, safety, and cohort-quality constraints.
- Start with cowork, coffee, or after-work formats that have value independent of dating outcomes.
- Use invite-only distribution; allow a controlled member referral rather than unrestricted public
registration.
- Freeze success thresholds, cohort rules, safety ownership, and the event code of conduct before
invitations are sent.

### 20.3 Pilot product surface

The minimum event-to-meeting flow covers:

- Curated invitation, capacity, RSVP, cancellation, waitlist, reminder, and check-in.
- LinkedIn-verified identity without scraping the member's graph.
- Attendee context visible only under an approved privacy model.
- Code of conduct, reporting, blocking, and a named incident owner.
- Private post-event shortlist.
- Mutual opt-in before romantic interest is disclosed.
- Evidence-based follow-up suggestions without automatic sending.
- Proposed times and a general place.
- Meeting confirmation and downloadable calendar handoff; direct calendar-provider integrations
come later.
- Follow-up state in the Meeting Pipeline.

The pilot has no public attendee directory, bulk outreach, automatic LinkedIn messaging, engagement
manipulation, undisclosed enrichment, or feed dependency.

### 20.4 Funnel and metrics

North-star metric:

> Confirmed meetings per active member.

Pilot funnel:

```text
Invited → RSVP → Attended → Private shortlist → Mutual interest
        → Follow-up sent → Meeting confirmed → Meeting completed
        → Second meeting or continued contact
```

Supporting metrics:

- Invite-to-RSVP conversion.
- RSVP show-up rate.
- Private shortlists per attendee.
- Mutual-interest rate.
- Follow-up sent within seven days.
- Confirmed and completed meetings per event.
- Median time from event to confirmed meeting.
- Second-meeting or continued-contact rate.
- Repeat attendance and member referral rate.
- Safety incidents, reports, blocks, and cohort churn.

The team must set quantitative success, failure, and continue-testing thresholds before the first
pilot. Thresholds must not be selected after observing results.

### 20.5 Distribution

Initial distribution is founder-led and community-led:

- Direct invitations through the founding team's trusted network.
- A small number of anchor members who improve cohort trust and can refer one suitable guest.
- Partnerships with founder communities, accelerators, coworking spaces, and profession-specific
groups only after the manually operated format works.
- Event-specific landing pages and referral links with source attribution.

Paid acquisition is not part of the first validation. The experiment first tests whether the team
can create a trusted cohort, a repeatable event, and real meeting conversion.

### 20.6 Positioning and campaign language

Formal positioning:

> Meet ambitious singles through things you already enjoy doing.

Event-level campaign concept:

> Co-work to make love. Build companies. Find chemistry.

The campaign concept may be tested for memorability but is not the permanent product promise. It
must not create pressure, objectify attendees, or undermine safety and professional trust. Event
copy should make romantic intent clear enough to set expectations while preserving the low-pressure
value of the activity itself.

### 20.7 Decision gates

Before scaling or moving this direction into shipped scope, decide:

- Launch city and beachhead cohort.
- Whether positioning is explicitly dating-first or professional-social with disclosed romantic
intent.
- Host, curation, referral, capacity, and attendee-mix rules.
- Public-link and attendee-list privacy boundaries.
- Mutual-interest disclosure and post-event contact rules.
- Safety staffing, incident response, removal, and appeals.
- Whether invites require Brea/LinkedIn authentication to view or respond.
- Whether the event format produces enough confirmed meetings and repeat participation to justify
product investment.
- Whether any public invitation, external RSVP, or relationship-import decision requires a formal
contract re-freeze.

If the pilot fails, Brea should retain the shipped nearby-discovery contract and evaluate #94 as a
standalone relationship-management direction rather than manufacturing engagement through Feed.

### 20.8 Personality-content validation (#95)

Personality content should be tested inside the event-to-meeting pilot before building a standalone
content destination:

1. Ask participating members to answer a small number of optional personality prompts.
2. Let each member pin the answers or stories they feel best represent them.
3. Show the content only in privacy-approved profile and event contexts.
4. Let members privately shortlist and approach someone with a suggested evidence-based
conversation starter.
5. Compare shortlist, reply, mutual-interest, and confirmed-meeting conversion with members or
profiles that do not have personality content.
6. Interview members about whether the content increased confidence, felt authentic, created
pressure to perform, or exposed more than intended.

Before the test begins, freeze:

- The prompt set and prohibited/sensitive prompt categories.
- Visibility defaults and event-attendee access rules.
- Whether content may be used by Approach Copilot, with explicit opt-out.
- Moderation ownership and response time.
- Quantitative success, failure, and continue-testing thresholds.

Proceed to a broader content surface only if personality content measurably improves selection,
conversation quality, or confirmed meetings without unacceptable privacy, safety, or performance
pressure. Do not proceed merely because members post or react.
