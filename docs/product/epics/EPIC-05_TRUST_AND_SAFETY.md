# EPIC-05 — Trust and Safety

| Field | Value |
| --- | --- |
| Status | Active — shipped controls, policy and operations gaps remain |
| Roadmap | Now and Next |
| Primary metric | Safety incidents and reports per 100 meaningful connections or meetings |
| Milestones | [M4 — Pilot Ready](../milestones/M4_PILOT_READY.md), [M5 — Event-to-Meeting Validation](../milestones/M5_EVENT_TO_MEETING_VALIDATION.md) |

## Problem

Brea asks people to expose identity, approximate proximity, interest, and eventually an intention to
meet. Search, messaging, events, romantic intent, and AI recommendations each create different
risks. Member trust cannot depend on a report button alone; policy, product controls, moderation,
incident ownership, and data boundaries must form one system.

## Desired outcome

Members can control visibility and contact, disclose progressively, report harm, receive predictable
moderation, and participate in events or meetings without Brea leaking sensitive information or
encouraging unwanted pursuit.

## Strategic alignment

- Core value explicitly requires safe and mutual connection.
- Principles: Proximity without exposure; Mutual consent before deeper access; Assist, never
  impersonate.

## Shipped foundation

- Private coordinates and approximate-distance responses.
- Explicit discoverability and availability controls.
- LinkedIn URL disclosure only after connection acceptance.
- Bidirectional block filtering and automatic connection decline.
- Structured reports and fail-closed admin moderation console.
- Accepted, unblocked participants only for messaging.
- Server-side identity resolution and deny-by-default data boundaries.

## Remaining policy and product scope

- Age and eligibility requirements before positioning as dating.
- Dating preference, relationship intent, and mutual-interest disclosure rules.
- Disconnect, unmatch, unblock, and repeat-request cooling or recipient controls.
- Account deletion, retention, export, and relationship-note deletion.
- Event code of conduct, attendee privacy, host responsibilities, removal, appeals, and incident
  escalation.
- Invitation expiry, revocation, forwarding, guessing, and unauthenticated-view rules.
- Moderation alerts, service targets, weekly review, and auditable role model.
- AI evidence, correction, opt-out, and sensitive-inference enforcement.

## Safety journey

```text
Private by default
  → explicit discovery consent
  → progressive profile disclosure
  → mutual acceptance before messaging/contact exchange
  → block/report at any point
  → fail-closed moderation
  → documented resolution, removal, and appeal
```

## Success measures

- Reports and blocks per 100 activated members, accepted connections, and future meetings.
- Median time to initial moderation review and final resolution.
- Repeat contact after decline or block.
- Event incidents and cohort churn after safety events.
- Member understanding of location, visibility, attendee, and mutual-interest controls.

## Guardrails

- No exact coordinates in client data or logs.
- No sensitive-trait inference.
- No public or forwarded disclosure of private intent.
- No automatic outreach.
- No moderation access outside the approved role model.
- No growth experiment may bypass eligibility, consent, reporting, or incident ownership.

## Dependencies

- OPS-06 (#51) for alerts and operating rhythm.
- OPS-02 (#26) for Production isolation and a durable admin role model.
- Product decisions in [Event-to-Meeting](EPIC-02_EVENT_TO_MEETING.md) and
  [Relationship Activation](EPIC-03_RELATIONSHIP_ACTIVATION.md).

## Open decisions

- What makes a member eligible for a professional-singles pilot?
- Which data becomes visible before, during, and after an event?
- What is the cooling and escalation policy after decline?
- What are moderation response targets, appeal rights, and record-retention periods?
- What user data is deleted immediately versus retained for legitimate safety auditing?

## Ownership rule

Every product Epic and feature PRD must list its safety risks and guardrails. This Epic owns the
cross-product policy and operations system; it does not remove safety responsibility from the
feature owner.
