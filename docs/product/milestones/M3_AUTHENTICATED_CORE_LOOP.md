# M3 — Authenticated Core Loop

| Field | Value |
| --- | --- |
| Status | Shipped and archived |
| Completed | 2026-07 |
| Product contract | [Archived PRD v2.0](../../archive/PRD_V2_AUTHENTICATED_RELEASE.md) |
| Verification | [Core-loop verification](../../verification/2026-07-21-core-loop-verification.md) |

## Milestone outcome

> Replace the anonymous fixed-profile prototype with a real authenticated member loop backed by
> InsForge.

## Exit criteria reached

- LinkedIn OAuth is required and creates one private profile per auth user.
- First-run onboarding and later profile editing work.
- Members control discovery, availability, general location, and private distance origin.
- Members can maintain an ordered gallery of up to six profile photos.
- Nearby natural-language search returns eligible profiles with approximate distance and evidence.
- Semantic ranking degrades to deterministic keyword ranking without breaking discovery.
- Connection requests persist, retry idempotently, and appear in incoming/sent lists.
- Recipients can accept or silently decline; status reflects back into search.
- Accepted, unblocked members can exchange one-to-one text messages.
- Members can hide or report; allowlisted admins can moderate reports.
- Member and privileged data boundaries are enforced through RLS, storage policies, and Functions.
- Core mobile and desktop flows pass the recorded release verification.

## Delivered product loop

```text
LinkedIn sign-in
  → Profile
  → Private location
  → Nearby discovery
  → Connection request
  → Accept or decline
  → Accepted-connection messaging
  → Hide, report, and moderation
```

## Remaining work that does not reopen M3

- Production backend isolation.
- Transactional notifications.
- Backend stability investigation.
- Disconnect, unblock, and repeat-request policy.
- Event, meeting, personality, and relationship-activation validation.

Those items belong to current Roadmap Epics and later Milestones. M3 remains closed so the meaning of
the shipped authenticated release does not drift.

## Evidence and history

- [Current State](../CURRENT_STATE.md) owns the latest Production status.
- [Metrics](../../METRICS.md) preserves the M1 developer/E2E baseline.
- [Engineering Handoff](../../../HANDOFF.md) records operational evidence and decisions.
- [Archived PRD v2.0](../../archive/PRD_V2_AUTHENTICATED_RELEASE.md) preserves the full release
  contract as it was frozen.
