# Brea Current State

| Field | Value |
| --- | --- |
| Status | Shipped authenticated release |
| Last verified | 2026-07-24 |
| Production | <https://brea-replace-ditto.vercel.app> |
| Frontend | React 19 + TypeScript + Vite SPA on Vercel |
| Backend | InsForge `brea-mvp-preview` |

This document is the product-facing Production truth. It describes what a member can do today, not
what has merely been designed, merged, or deployed to Preview. Operational fingerprints and setup
belong in [HANDOFF.md](../../HANDOFF.md); API and security details belong in the
[technical contracts](../technical/DATA_SECURITY_AND_FUNCTIONS.md).

## Current product promise

> Sign in with LinkedIn, find suitable people nearby, and start a real connection—without exposing
> your exact location.

## Current member journey

```text
Open Brea
  → Sign in with LinkedIn
  → Review and complete a private Brea profile
  → Add a private location during onboarding or at first search
  → Describe who to meet and choose a 1–50 km radius
  → Review ranked profiles, approximate distance, and match reasons
  → Send a connection request
  → Recipient accepts or silently declines in Requests
  → Accepted members exchange their optional LinkedIn URLs and can message
  → Either member can hide or report a profile
```

## Who appears in discovery

A search never queries arbitrary LinkedIn members. A result must be another Brea member who:

- completed LinkedIn sign-in and Brea onboarding;
- has a headline, general location label, and private coordinates;
- explicitly enabled discovery and availability;
- is inside the selected radius;
- is not blocked in either direction; and
- passes the current semantic or keyword relevance threshold.

If no other eligible profiles exist nearby, Find My People correctly returns an empty result. Local
member density remains a product and go-to-market risk, not a frontend defect.

## Shipped capabilities

### Authentication and profiles

- Required LinkedIn OAuth / PKCE sign-in.
- One private profile per InsForge auth user.
- First-run onboarding and later profile editing.
- Name, headline, bio, skills, interests, availability, general location, and optional LinkedIn URL.
- Private browser geolocation requested no later than the first search.
- Explicit discoverability and availability controls.
- Ordered profile gallery of up to six JPEG, PNG, or WebP photos.

### Discovery

- Authenticated natural-language people search.
- Radius from 1 to 50 km, default 10 km.
- Server-side Haversine distance filter.
- Semantic embedding ranker when the model gateway is available.
- Deterministic weighted keyword fallback during model failure or low-quality semantic results.
- Evidence-based match reason, approximate distance, and connection state on each card.
- Idle, loading, results, empty, recoverable error, and first-search location states.

### Connections and messaging

- Idempotent connection request and re-request behavior.
- Incoming and Sent Requests lists.
- Accept and silent decline.
- Search-card states for none, outgoing pending, incoming pending, and accepted.
- Optional LinkedIn profile URL revealed only after acceptance.
- One-to-one text messaging inside accepted, unblocked connections.
- Five-second polling; realtime delivery is not shipped.

### Safety and moderation

- Per-profile hide/block.
- Blocking filters both people from future discovery and force-declines their connections.
- Reports with a structured reason and optional details.
- Fail-closed admin moderation console at `/admin`.
- Allowlisted admins can resolve or dismiss reports and optionally force-hide a profile.

### Analytics

- Server-only product events for sign-in, profile completion/update, search, connection request and
  response, hide, and report.
- Frozen M1 baseline and runnable SQL in [Metrics](../METRICS.md).

## Current navigation

The member interface has three state-machine tabs:

- Discover
- Requests
- Profile

Accepted connections open a chat panel inside Requests. `/admin` opens a separate moderation
surface. There is no client-side router, so a fourth member surface requires the routing decision
tracked by FE-12 (#48).

## Current privacy and security promises

- Exact coordinates stay server-side; discovery returns rounded distance and a member-chosen label.
- LinkedIn sign-in supplies basic identity only; Brea does not scrape or import the LinkedIn graph.
- A LinkedIn URL is optional and stays hidden until a connection is accepted.
- Members can pause discovery or availability, edit their profile, hide/report someone, and sign
  out.
- Member identity is resolved from the bearer token; privileged Functions do not trust a
  browser-supplied actor ID.
- Owner profile and gallery writes are constrained by row-level security and storage policies.
- Messages, blocks, reports, and events are server-only.

## Current limitations

- No transactional email or push notification for requests, acceptance, or messages.
- No meeting proposal, mutual confirmation, completion, calendar handoff, or follow-up.
- No LinkedIn connection import or automatic relationship graph.
- No event, RSVP, waitlist, check-in, attendee context, or mutual-interest product surface.
- No dating-specific age gate, preference model, relationship intent, unmatch, or repeat-request
  cooling policy.
- No personality prompts, pinned stories, contextual posts, or feed.
- No realtime chat, pagination, read receipts, typing state, or attachments.
- Hidden members cannot self-serve an unblock.
- No dedicated Production InsForge project; the live site still uses `brea-mvp-preview`.
- Generated Vercel Preview origins are not in the backend Function CORS allowlist by default.

## Explicitly not implied

Current LinkedIn sign-in does not imply résumé import, arbitrary LinkedIn profile access, connection
graph access, or message access. Semantic ranking does not imply personal compatibility or predict a
response. A connection acceptance does not prove that a meeting happened.

## Current system inventory

- Eight Edge Functions.
- Six application tables.
- Ten applied repository migrations.
- One public-read, owner-write `profile-photos` bucket.
- LinkedIn OAuth, model gateway, and moderation allowlist configured.
- Production deploys from `main` through GitHub Actions.

See [Data, Security, and Functions](../technical/DATA_SECURITY_AND_FUNCTIONS.md) and the
[Backend Runbook](../../insforge/BACKEND_RUNBOOK.md) for the authoritative inventory and deployment
order.

## Change policy

A capability enters this document only after Production verification. When that happens:

1. update this file and its relevant technical contract;
2. close or revise the owning issue;
3. remove the item from Roadmap if it is fully shipped;
4. update its Epic and Milestone status; and
5. preserve the historical decision in Git and, when material, the relevant archived contract.
