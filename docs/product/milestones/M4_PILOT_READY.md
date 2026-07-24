# M4 — Pilot Ready

| Field | Value |
| --- | --- |
| Status | Planned |
| Outcome | Safely recruit and operate the first measurable real-user cohort |
| Primary Epics | [Core Loop](../epics/EPIC-01_CORE_LOOP.md), [Event to Meeting](../epics/EPIC-02_EVENT_TO_MEETING.md), [Trust and Safety](../epics/EPIC-05_TRUST_AND_SAFETY.md) |

## Milestone intent

M4 is not "ship every LinkedIn-for-dating feature." It is the smallest cross-functional checkpoint
at which Brea can invite real members into a controlled pilot, observe the complete funnel, and
respond safely when something goes wrong.

## Exit criteria

### Market and cohort

- [ ] One launch city and reachable community are selected.
- [ ] Beachhead, age/eligibility, relationship intent, attendee mix, referral, and capacity rules
  are written.
- [ ] Approximately 20–30 suitable seed members can be recruited manually.
- [ ] Pilot positioning sets romantic and professional-social expectations clearly.

### Product and infrastructure

- [ ] Dedicated Production InsForge environment and deploy/rollback path are verified.
- [ ] Request-received and request-accepted notification paths work.
- [ ] Activation, search success, request response, conversation, and safety metrics are queryable.
- [ ] First-search geolocation and session persistence are verified on a real mobile device.
- [ ] Routing or a deliberate no-router pilot surface is decided before adding another member view.

### Safety and operations

- [ ] Code of conduct and participant eligibility are published.
- [ ] A named safety owner, backup, incident channel, removal path, and appeal path exist.
- [ ] Event attendee visibility and mutual-interest disclosure rules are frozen.
- [ ] Moderation alerts and a weekly review rhythm are operating.
- [ ] Invite expiry, revocation, forwarding, and unauthenticated-view rules are decided.

### Experiment readiness

- [ ] Funnel definitions, sample, and observation window are frozen.
- [ ] Quantitative Continue / Iterate / Pivot / Stop thresholds are set before invitations.
- [ ] Recruitment source is attributable.
- [ ] Interview script and post-event feedback plan are ready.
- [ ] A manual fallback exists for RSVP, reminders, check-in, shortlist, mutual interest, and meeting
  confirmation.

## Non-goals

- Generic feed.
- Automatic LinkedIn graph import.
- Complete Approach Copilot or Meeting Pipeline.
- Paid acquisition.
- Full calendar-provider integration.
- Scaling beyond one controlled cohort.

## Completion decision

The PM, pilot operator, safety owner, and engineering owner jointly sign off on the checklist.
Completing frontend screens alone does not complete M4.
