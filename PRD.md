# Brea Web MVP PRD

| Field | Value |
| --- | --- |
| Version | 1.3 |
| Date | 2026-07-19 |
| Status | Ready for implementation |
| Frontend/design timebox | Less than 2 hours, in parallel with backend development |
| Delivery format | Responsive web app |

## 1. Product Summary

Brea helps people find suitable people nearby through natural-language search. A user can describe who they want to meet, understand why each result is relevant, and send a lightweight connection request.

The full product vision includes AI-assisted profiles, a location-based sharing marketplace, real-time chat, and intelligent people discovery. This MVP validates only the smallest compelling part of that vision.

### Product core

> Find suitable people nearby.

Every P0 requirement must strengthen either geographic proximity or personal relevance. Features that do neither are outside this MVP.

### MVP promise

> Type who you want to meet, discover relevant people nearby, and connect in under one minute.

## 2. Goal

Deliver one real end-to-end workflow that validates natural-language people discovery through an integrated backend API. The frontend must not ship hard-coded profile or connection data.

The MVP is successful when a first-time user can:

1. Understand what Brea does without instruction.
2. Enter or select a natural-language search query.
3. Receive nearby profiles returned by the backend with clear match explanations.
4. Send a connection request that is received and persisted as `pending` by the backend.

## 3. Target User and Job to Be Done

### Primary persona

An urban professional, student, newcomer, or remote worker who wants to meet someone relevant nearby without browsing a generic social feed.

### Job to be done

> When I want company, advice, or a shared activity, help me quickly find a nearby person who fits what I am looking for so I can start a real-world connection.

## 4. Two-Hour MVP Scope

### P0 — Must build

#### 4.1 Product introduction

- Display the Brea name and a one-sentence value proposition.
- Provide a prominent natural-language search input.
- Show two or three example query chips that populate and run a search.
- Keep the location treatment approximate; never expose raw coordinates in the UI.

Example queries:

- “A product designer who enjoys hiking”
- “Someone who can help me practice Japanese”
- “A developer available for coffee”

#### 4.2 Natural-language people search

- Submit the query to the active `people-search` InsForge Function.
- Render backend-provided profiles, ranking, distance, and match explanations.
- Keep the frontend independent of the backend's internal matching implementation.
- Show loading and retry states while a request is in progress or fails.
- Show a useful empty state when no profiles match.

The backend engineer owns search implementation and data access. The UI must not claim that a specific AI model is running unless the backend actually uses it.

#### 4.3 Search result cards

Each result must show:

- Name and avatar or generated initials.
- Professional headline.
- Approximate distance.
- Skills and interests.
- Availability or intent.
- A human-readable explanation such as “Matches hiking and product design.”
- A `Connect` action.

#### 4.4 Connection request

- Selecting `Connect` invokes the active `connection-request` InsForge Function for that profile.
- While the request is pending, disable the action to prevent duplicate submissions.
- After a successful response, show `Request sent` and keep the completed state.
- If the request fails, restore the action and show a useful retry message.

#### 4.5 Responsive presentation

- The complete core flow must work at approximately 375 px and 1440 px widths.
- Search, empty, results, and request-sent states must remain readable.
- All interactive controls must be keyboard accessible and have visible focus states.

### Explicitly out of scope

The following features are not part of the two-hour MVP:

- Building account creation, login UI, or LinkedIn OAuth in the frontend.
- User profile creation or editing UI.
- Browser geolocation or maps; approximate distance comes from the backend.
- Share Marketplace offers and requests.
- Notifications, email, or push notifications after a connection request.
- Chat or real-time communication.
- Blocking, reporting, moderation, or admin tooling.
- Payments, ratings, reviews, or identity verification.
- Analytics infrastructure or production privacy controls.

These exclusions are product decisions for this timebox, not statements about the eventual production requirements.

## 5. Core User Flow

```text
Open Brea
   ↓
Understand the value proposition
   ↓
Type a query or select an example
   ↓
Submit search
   ↓
Review ranked profiles and match explanations
   ↓
Select Connect
   ↓
See Request sent confirmation
```

### Empty-state flow

```text
Search returns no matches
   ↓
Explain that no profiles matched
   ↓
Offer an example query or Clear search action
```

## 6. Functional Requirements

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| WEB-001 | Landing experience | The page displays the product name, value proposition, search input, and example queries without requiring login. |
| WEB-002 | Submit query | A non-empty query can be submitted by button and Enter key. Empty queries do not run. |
| WEB-003 | Example queries | Selecting an example populates the input and displays results. |
| SEARCH-001 | Backend search | Search invokes `people-search` once using the frozen Function contract and renders its successful response. |
| SEARCH-002 | Request states | The interface provides distinct idle, loading, success, empty, and error states. Duplicate in-flight searches are prevented. |
| SEARCH-003 | Match explanation | Every rendered result includes the backend-provided match reason. |
| SEARCH-004 | Empty state | A query with no matching data displays a clear empty state and a recovery action. |
| PROFILE-001 | Result information | Every card contains name, headline, approximate distance, tags, availability, and connection state. |
| CONNECT-001 | Send request | Connect invokes `connection-request` once, handles pending/success/error states, and shows Request sent only after success. |
| API-001 | Error handling | Non-2xx responses and unavailable network states show user-readable feedback without clearing the existing query. |
| UI-001 | Responsive layout | The core flow works without horizontal scrolling at 375 px and remains comfortably readable at 1440 px. |
| UI-002 | Accessibility baseline | Inputs have labels, buttons have accessible names, keyboard navigation works, and focus indicators are visible. |

## 7. Team Ownership

### PM, design, and frontend

- Freeze the P0 scope, user flow, copy, and visual hierarchy.
- Build the responsive search and result experience.
- Implement idle, loading, error, empty, results, and request-sent states.
- Integrate the agreed endpoints without embedding backend business logic.
- Verify the complete workflow with the backend engineer.

### Backend

- Use InsForge Postgres as the profile and connection data source.
- Manage schema, constraints, grants, and RLS through InsForge migrations.
- Expose product behavior through active InsForge Deno Edge Functions.
- Implement search, ranking, approximate distance, and match explanations.
- Persist connection requests and prevent duplicates.
- Keep the full-access API key and MVP profile identity in server-side Function secrets only.
- Configure CORS and document Function slugs, frontend environment values, and errors.

### Shared contract

- Freeze Function slugs and request/response JSON before either side builds integration code.
- Use stable profile IDs and enumerated connection statuses.
- Return a consistent JSON error shape.
- Do not expose raw user coordinates to the frontend.
- Do not allow the frontend SDK to read or write base tables directly.

## 8. InsForge Function Contract

The Vite app creates one `@insforge/sdk` client using `VITE_INSFORGE_URL` and `VITE_INSFORGE_ANON_KEY`. It invokes active Functions through `insforge.functions.invoke()` and never constructs raw Function URLs.

### Search people

Function slug: `people-search`

```ts
const { data, error } = await insforge.functions.invoke("people-search", {
  body: {
    query: "A product designer who enjoys hiking",
    radiusKm: 10,
    limit: 12,
  },
});
```

The Function determines location from a server-side MVP profile identity. The request must not contain a sender ID or coordinates, and the response must not contain raw coordinates.

```ts
type PeopleSearchResponse = {
  results: PersonMatch[];
};

type PersonMatch = {
  id: string;
  name: string;
  avatarUrl: string | null;
  headline: string;
  bio: string | null;
  distanceKm: number;
  skills: string[];
  interests: string[];
  availability: string | null;
  matchReason: string;
  connectionStatus: "none" | "pending";
};
```

An empty search returns `{ "results": [] }`. Results are already ranked by relevance, with distance used as a tie-breaker.

### Send connection request

Function slug: `connection-request`

```ts
const { data, error } = await insforge.functions.invoke("connection-request", {
  body: {
    recipientId,
    sourceQuery: submittedQuery,
  },
});
```

```ts
type ConnectionResponse = {
  id: string;
  recipientId: string;
  status: "pending";
  createdAt: string;
  created: boolean;
};
```

The first request returns `created: true`. Retrying the same sender/recipient pair returns the existing connection with `created: false` and does not create a duplicate row.

### Error response

```ts
type ApiError = {
  code: string;
  message: string;
};
```

Frontend adapters must check both `{ data, error }` and the minimum response shape before updating the UI.

## 9. Experience and Visual Direction

- Warm, approachable, and community-oriented rather than corporate.
- One focused page with minimal navigation.
- Search is the strongest visual element.
- Cards should make the match reason easy to scan.
- Use a restrained color palette, generous spacing, and friendly profile imagery or initials.
- Avoid large dashboards, maps, sidebars, and settings screens in this MVP.

## 10. Technical Constraints

Recommended implementation:

- React + TypeScript + Vite.
- Tailwind CSS v3.4.
- `@insforge/sdk` as the only frontend integration client.
- Configure `VITE_INSFORGE_URL` and `VITE_INSFORGE_ANON_KEY` in local and Vercel environment settings.
- Keep `.env`, `.env.local`, `.env*.local`, and `.vercel/` out of Git; commit only empty placeholders in `.env.example`.
- Invoke only the active `people-search` and `connection-request` Functions.
- Store `INSFORGE_API_KEY`, `BREA_MVP_PROFILE_ID`, and allowed origins only as InsForge Function secrets.
- Use InsForge Postgres migrations for `public.profiles` and `public.connections`.
- Enable RLS and explicitly revoke direct `anon` and `authenticated` table access; Functions are the only data surface.
- Deploy the Vite `dist` output through Vercel Git integration.
- Do not add Next.js, Vercel Functions, React Router, or `vercel.json` for the single-route MVP.

The implementation should favor clarity and MVP reliability over abstraction. A small number of focused components is sufficient.

### Vercel environment policy

| Vercel environment | InsForge target | Rule |
| --- | --- | --- |
| Development | Development or staging InsForge project/branch | Pulled locally only after the Vercel project is linked. |
| Preview | Shared Preview InsForge project/branch | Must not write to Production data. |
| Production | Production InsForge project | Both Functions must be active before merging to `main`. |

Vite embeds `VITE_*` values at build time. Preview and Production must therefore build separately; do not promote a Preview artifact when the two environments target different InsForge backends.

## 11. Non-Functional Requirements

- **Performance:** Show loading feedback immediately; target a backend search response within two seconds.
- **Reliability:** Network and server errors must be recoverable without reloading the page.
- **Privacy:** Display only profile fields explicitly returned for discovery; never expose raw coordinates.
- **Security:** Do not hard-code credentials, secrets, or privileged tokens in frontend code.
- **Compatibility:** Support the current versions of mainstream Chromium and WebKit-based browsers.

## 12. Definition of Done

The MVP is complete when:

- The project installs and starts with documented commands.
- The landing, search, result, empty, and request-sent states work.
- Search results come from the integrated backend rather than frontend fixtures.
- At least three example queries produce credible backend results.
- At least one query produces the backend-driven empty state.
- A connection request is persisted by the backend and duplicate submission is prevented.
- Both InsForge Functions are deployed with `active` status.
- Anonymous SDK clients cannot directly read `profiles` or `connections`.
- No admin/API key, sender ID, or raw coordinates appear in the frontend bundle or Function requests.
- A local production build succeeds before deployment.
- A Vercel Preview uses Preview-scoped InsForge configuration and passes the end-to-end flow.
- There are no blocking console errors.
- The experience is manually checked at mobile and desktop widths.
- A short README explains how to run the demo.

## 13. Suggested 110-Minute Build Plan

| Time | Deliverable |
| --- | --- |
| 0–10 min | Freeze Function slugs, JSON, MVP identity, nearby semantics, and Vercel/InsForge environment targets. |
| 10–20 min | Link Vercel and verify Development, Preview, and Production environment key names. |
| 20–35 min | Scaffold Vite, Tailwind 3.4, and the InsForge SDK client while backend applies the migration. |
| 35–55 min | Build typed Function adapters and search UI states while backend deploys `people-search`. |
| 55–80 min | Integrate nearby results and profile cards with the active search Function. |
| 80–95 min | Integrate connection pending/success/error states with `connection-request`. |
| 95–105 min | Run live InsForge E2E, RLS, responsive, accessibility, and local-build checks. |
| 105–115 min | Verify the Vercel Preview and document run/deploy commands. |

The final five minutes of a two-hour window remain as contingency. If Production InsForge is not ready, deliver the verified Vercel Preview rather than pointing Preview at production data.

## 14. Post-MVP Backlog

If the MVP validates the concept, the next PRD should cover:

1. Production InsForge authentication and profile ownership, replacing the shared MVP identity.
2. AI-assisted profile enrichment with explicit consent.
3. Production semantic search and ranking evaluation.
4. Location permission, precision, and privacy controls.
5. Connection inbox, acceptance, notifications, and chat.
6. Blocking, reporting, moderation, and user safety.
7. The location-based Share Marketplace as a separate validated workflow.
8. Product analytics, success metrics, and retention experiments.
