# EPIC-02 — Event-to-Meeting

| Field | Value |
| --- | --- |
| Status | Validating — not shipped |
| Roadmap | Next |
| Primary metric | Attendee-to-mutually-confirmed-meeting conversion |
| Milestones | [M4 — Pilot Ready](../milestones/M4_PILOT_READY.md), [M5 — Event-to-Meeting Validation](../milestones/M5_EVENT_TO_MEETING_VALIDATION.md) |
| Related issue | #70 |

## Problem

Nearby discovery needs a trusted concentration of active people in one place. An open network can
produce empty or low-quality results before Brea has local density, while a conventional singles
mixer can create pressure without providing standalone value.

## Target user

The initial cohort under validation is time-poor single founders, operators, and ambitious
professionals who would attend a useful cowork, coffee, or after-work activity even if no romantic
match results.

## Job to be done

> When I am too busy to spend hours on dating apps, help me meet relevant singles through an
> activity I would enjoy attending anyway, then make follow-up private and low pressure.

## Desired outcome

Demonstrate that recurring, curated micro-events can create trusted local density and convert
attendee interest into safe, mutually confirmed one-to-one meetings.

## Strategic alignment

- Core capability: bring suitable nearby people into a trusted shared context.
- Core value: progress a relevant encounter toward a mutual real-world relationship.
- Principles: Real connection over engagement; Mutual consent before deeper access; Proximity
  without exposure.

## Hypothesis

Busy single professionals will attend a useful small activity more readily than they will adopt
another swipe product. Curated context, private intent capture, and structured follow-up will create
confirmed meetings without a feed or a large public network.

## Candidate product loop

```text
Curated invitation
  → LinkedIn-verified RSVP
  → Useful in-person activity
  → Private shortlist
  → Mutual interest
  → Follow-up
  → Meeting confirmed
  → Meeting completed
```

## Validation scope

- Invite-only recruitment and controlled referral.
- Capacity, RSVP, cancellation, waitlist, reminder, and check-in.
- Privacy-gated attendee context.
- Code of conduct, reporting, blocking, and named incident ownership.
- Private post-event shortlist.
- Mutual opt-in before romantic interest is disclosed.
- Evidence-based follow-up suggestions without automatic sending.
- Proposed times, a general place, meeting confirmation, and downloadable calendar handoff.

The first pilot may operate these steps manually. Productization follows evidence, not the reverse.

## Out of scope

- Public attendee directory.
- Unrestricted public registration.
- Bulk outreach or automatic LinkedIn messaging.
- Generic feed dependency.
- Direct calendar-provider integrations in the first validation.
- Paid acquisition before the manual format works.

## Success measures

- Invite-to-RSVP conversion.
- RSVP show-up rate.
- Private shortlists per attendee.
- Mutual-interest rate.
- Follow-up sent within seven days.
- Confirmed and completed meetings per event.
- Median time from event to confirmed meeting.
- Second-meeting or continued-contact rate.
- Repeat attendance and member referral.

## Guardrails

- Safety incidents, reports, and blocks.
- No-show and cancellation rates.
- Cohort or preference imbalance.
- Members feeling pressured to disclose romantic interest.
- Attendee-context privacy violations.
- Churn after an event or safety incident.

## Dependencies

- Launch city and cohort decision.
- [Trust and Safety Epic](EPIC-05_TRUST_AND_SAFETY.md).
- Routing decision FE-12 (#48) before a fourth shipped member surface.
- Notification and Production backend isolation from
  [Core Loop Epic](EPIC-01_CORE_LOOP.md).
- Frozen metrics and thresholds in the
  [Professional Singles Pilot](../experiments/PROFESSIONAL_SINGLES_PILOT.md).

## Open decisions

- Is positioning dating-first or professional-social with explicit romantic intent?
- Who may view an invitation or attendee context without authentication?
- What age, identity, preference, and eligibility rules apply?
- How are attendee mix, referrals, removal, appeals, and incident escalation handled?
- Does a successful manual pilot justify productizing Events, or only repeating the operation?

## Child work

Executable backlog lives in
[GitHub Issues](https://github.com/itskylechung/Brea-replace-ditto/issues). Events PR #82 is
unshipped evidence, not Current State.
