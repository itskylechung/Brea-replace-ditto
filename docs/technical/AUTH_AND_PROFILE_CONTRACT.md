# Authentication and Profile Contract

| Field | Value |
| --- | --- |
| Status | Shipped |
| Last reviewed | 2026-07-24 |
| Product surface | [Current State](../product/CURRENT_STATE.md) |

This document owns the shipped authentication, session, onboarding, profile, location, discovery
consent, and gallery behavior. Historical reasoning remains in the
[archived PRD v2.0](../archive/PRD_V2_AUTHENTICATED_RELEASE.md).

## Authentication

- Discovery requires LinkedIn OAuth sign-in.
- The frontend calls `auth.signInWithOAuth("linkedin", { redirectTo: window.location.origin })`.
- InsForge handles OAuth / PKCE and returns to the plain frontend origin; there is no dedicated
  `/auth/callback` route.
- On load, the app calls `auth.getCurrentUser()` and `auth.getPublicAuthConfig()`.
- A transient auth bootstrap failure receives one automatic retry before the UI offers a manual
  retry.
- If LinkedIn is disabled in the active InsForge environment, the sign-in action is disabled with
  setup guidance.
- An unauthenticated visitor sees only the sign-in surface.

## Session boundary

- The SDK keeps the access token in memory and uses an HttpOnly refresh cookie.
- No sensitive session value is stored in `localStorage`.
- The browser targets its own origin. Vite and Vercel proxy `/api/*` and `/fn/*` to InsForge so the
  refresh cookie remains first-party.
- Direct cross-origin browser base URLs are not supported because Safari/ITP and incognito
  environments may reject the cross-site refresh cookie.
- Sign-out is available throughout the member experience.

## LinkedIn data boundary

Standard LinkedIn OpenID Connect supplies basic identity only:

- name;
- email; and
- profile photo.

Brea does not scrape LinkedIn, import connections, read LinkedIn messages, or retrieve arbitrary
résumé/profile data. A member may supply an optional LinkedIn profile URL manually.

## Profile provisioning

- One `profiles` row belongs to each non-admin `auth.users` record.
- A database trigger provisions the row; the frontend retains an owner-scoped upsert fallback.
- The initial profile is private:
  - `onboarding_completed = false`;
  - `is_discoverable = false`; and
  - `is_available = false`.
- LinkedIn name and avatar may prefill the initial identity fields.
- Members may read and write only their own profile row under row-level security.

## Onboarding and editing fields

| Field | Requirement |
| --- | --- |
| Name | Required, maximum 120 characters |
| Headline | Required, maximum 240 characters |
| Bio | Optional, maximum 1,000 characters |
| Skills | Optional, comma-separated, de-duplicated, maximum 20 |
| Interests | Optional, comma-separated, de-duplicated, maximum 20 |
| Availability | Optional, maximum 180 characters |
| General location label | Required, maximum 120 characters |
| LinkedIn profile URL | Optional; `https://[cc.]linkedin.com/in/...` |
| Private latitude/longitude | Optional during onboarding; required before nearby search or discovery |
| Discoverable | Explicit member control |
| Available | Explicit member control |

Saving first-run onboarding sets `onboarding_completed = true` and records `profile_completed`.
Saving the same form in editing mode records `profile_updated`.

## Location and discovery consent

- `location_label` is coarse, member-authored display text.
- Latitude and longitude come from `navigator.geolocation`.
- Exact coordinates are private input to server-side distance calculation and never appear in
  discovery responses.
- Geolocation is optional during onboarding and requested inline before the first search when
  missing.
- A deferred-location member is not silently made discoverable after adding coordinates. The UI
  offers an explicit one-tap enable action.
- "Show me in discovery" is disabled when coordinates are absent and is saved off.

A profile is eligible for discovery only when all of the following are true:

- onboarding is complete;
- headline exists;
- general location label exists;
- private latitude and longitude exist;
- `is_discoverable = true`; and
- `is_available = true`.

The database check constraint enforces this completeness; the UI must represent the same rule rather
than silently changing consent.

## Profile gallery

- A member can order up to six profile photos.
- The UI accepts JPEG, PNG, or WebP files up to 5 MB each.
- Objects live in the public-read `profile-photos` storage bucket.
- Upload and deletion are owner-scoped through storage policies.
- The profile persists both each object URL and storage key so deletion remains possible.
- Public media must not contain secrets or data that requires authenticated read protection.

## Client configuration

Only browser-safe values may use the `VITE_*` prefix:

```dotenv
VITE_INSFORGE_ANON_KEY=
VITE_INSFORGE_URL=
VITE_INSFORGE_FUNCTIONS_URL=
```

The URL values remain empty for the same-origin proxy path. Never place the InsForge admin/API key,
LinkedIn client secret, raw coordinates, or other privileged data in a `VITE_*` variable.

## Error and recovery expectations

- Auth loading state is immediate and announced.
- Transient bootstrap errors are recoverable without a full page reload.
- Profile validation remains visible at the relevant field.
- A failed save does not erase entered profile content.
- Missing profile or location before search is represented by `PROFILE_SETUP_REQUIRED`, not an empty
  search result.

## Security invariants

- The session user, not a browser-supplied user ID, owns the profile operation.
- A member cannot read or write another member's private profile row.
- Exact coordinates never appear in public Function responses.
- Discovery consent is explicit and location-gated.
- LinkedIn URL disclosure to another member occurs only after accepted connection status.
