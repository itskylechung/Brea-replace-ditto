# EPIC-03 — Relationship Activation

| Field | Value |
| --- | --- |
| Status | Validating — not shipped |
| Roadmap | Later |
| Primary metric | `NSM-001` mutually confirmed meetings per activated member |
| Milestone | [M6 — Relationship Retention](../milestones/M6_RELATIONSHIP_RETENTION.md) |
| Related issue | #94 |

## Problem

People may have many relevant professional relationships but still struggle to decide whom to
contact for a current goal, understand why, write a specific approach, and follow disconnected
messages through scheduling and follow-up. LinkedIn identity alone does not solve this coordination
problem.

## Target user

A member with a concrete relationship goal and a small, lawful candidate set from an approved,
consented, or member-provided source.

## Job to be done

> When I have several possible people in or around my network, help me identify who is worth
> approaching for my current goal and manage the outreach until we meet.

## Desired outcome

Increase explainable candidate-to-approach conversion and the number of mutually confirmed meetings
without scraping LinkedIn, inferring sensitive traits, or sending on the member's behalf.

## Strategic alignment

- Entry point: Reconnect complements the shipped Discover entry point.
- Core value: convert a relevant nearby possibility into a mutual real-world connection.
- Principles: Suitable over plentiful; Real connection over engagement; Assist, never impersonate.

## Hypothesis

> LinkedIn is an identity and relationship source; Brea can become the action layer that helps
> members choose whom to approach and turn outreach into real meetings.

This remains a hypothesis. Sign in with LinkedIn does not provide connection-graph access.

## Module A — Approach Copilot

- Accept a concrete weekly relationship goal.
- Build a candidate set only from approved or member-provided sources.
- Rank a small shortlist by relevant evidence such as role, experience, industry, skills, location,
  relationship context, and the member's stated goal.
- Explain why each recommendation appears and cite the evidence used.
- Suggest an approach angle or invitation draft without sending it.
- Let the member shortlist, dismiss, snooze, correct, and exclude a recommendation.

## Module B — Meeting Pipeline

```text
Suggested → Shortlisted → Approached → Waiting → Replied
  → Scheduling → Confirmed → Met → Follow-up
```

For each person or invitation, store only member-approved relationship notes plus the current stage,
last action, next action, due date, and meeting purpose. The portfolio view should surface who needs
a response or follow-up and which relationship best fits the current goal.

## First validation slice

1. Member defines one weekly relationship goal.
2. Member assembles a small candidate set without automatic graph access.
3. Brea produces an explainable shortlist.
4. Member chooses one person and reviews a personalized invitation.
5. Brea tracks Waiting, Scheduling, Confirmed, Met, and Follow-up.
6. Invitee responds with the least friction the approved privacy model allows.
7. A confirmed meeting receives a calendar handoff.

## Out of scope

- LinkedIn scraping or implied graph access.
- Bulk outreach, automatic sending, or engagement manipulation.
- Undisclosed enrichment or sensitive-trait inference.
- A claim that a recommended person will respond or is romantically compatible.
- Generic sales CRM behavior.

## Success measures

- Candidate reviewed → shortlisted → approached.
- Approached → replied → scheduling → confirmed → met.
- Median time to reply and to confirmed meeting.
- Overdue follow-ups.
- `NSM-001` mutually confirmed meetings per activated member.

## Guardrails

- Incorrect-evidence and sensitive-inference reports.
- Invitation revocation, forwarding, or guessed-link exposure.
- Automatic-send incidents.
- Candidate correction, removal, and deletion success.
- Reports, blocks, and opt-outs following a recommendation.

## Dependencies

- A lawful, usable candidate-source decision.
- Minimum relationship-data, refresh, correction, export, and deletion rules.
- Invitee authentication and share-link privacy contract.
- Meeting-confirmation measurement.
- Evidence from the [Professional Singles Pilot](../experiments/PROFESSIONAL_SINGLES_PILOT.md)
  or a standalone concierge validation.

## Decision gates

- Does Brea have approved graph access, user-assisted import, or shareable outbound invitations?
- Does Brea outperform arranging the same meeting through LinkedIn messages alone?
- Do invitees need a Brea or LinkedIn account to view and respond?
- Does the resulting product require a new formal Product contract?

## Child work

Issue #94 is the validation epic in GitHub. Delivery tasks should be created only after these gates
are answered.
