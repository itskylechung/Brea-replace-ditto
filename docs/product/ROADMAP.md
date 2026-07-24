# Brea Product Roadmap

| Field | Value |
| --- | --- |
| Status | Active direction, not a delivery promise |
| Last reviewed | 2026-07-24 |
| Planning model | Now / Next / Later / Exploring / Gated |

The Roadmap sequences product outcomes. It is not the assignable backlog, a list of everything the
team could build, or a promise that every named solution will ship. GitHub Issues remain the only
executable backlog.

## Now — make the current loop reliable

### Intended outcome

> A member can reliably progress from an eligible nearby result to a bidirectional conversation.

### Why now

The authenticated discovery and connection loop is shipped, but local density, notifications,
Production backend isolation, response latency, and safety operations limit real-user validation.

### Primary measures

- `OPM-001` bidirectional conversations per activated member.
- Request-to-accept rate and median response time.
- Search success and empty-result rates.

### Work themes

- Separate Production InsForge environment and custom-domain posture (OPS-02, #26).
- Diagnose backend stalls, cold starts, intermittent `502 BOOT_FAILED`, and large/concurrent
  diagnostic 504s (OPS-01/#23 and OPS-07/#98).
- Transactional notification for request received and accepted (BE-05, #49).
- Finish safety alerting and weekly moderation operations (OPS-06, #51).
- Decide disconnect, unblock, and repeat-request-after-decline safeguards.
- Extend analytics to activation, bidirectional conversation, latency, and safety guardrails.
- Validate the first-search geolocation flow on a real mobile device.

### Related work

- [Core Loop Epic](epics/EPIC-01_CORE_LOOP.md)
- [Trust and Safety Epic](epics/EPIC-05_TRUST_AND_SAFETY.md)
- [M4 — Pilot Ready](milestones/M4_PILOT_READY.md)

## Next — become pilot ready

### Intended outcome

> Brea can safely recruit and run a small, measurable cohort in one city.

### Why next

Open discovery cannot demonstrate value without local member density. A recurring, useful,
invite-only activity is the leading acquisition hypothesis for assembling a trusted cohort without
requiring a feed.

### Primary measures

- Invite-to-RSVP conversion and RSVP show-up rate.
- Activated members per recruited member.
- Attendee-to-private-shortlist and mutual-interest rates.
- Safety incidents, reports, blocks, and cohort churn.

### Work themes

- Select one launch city and reachable founder/professional community.
- Define the beachhead, eligibility, attendee mix, host, referral, capacity, and privacy rules.
- Recruit approximately 20–30 seed members manually.
- Freeze code of conduct, safety owner, incident response, appeals, and event guardrails.
- Run invitation, RSVP, capacity, waitlist, reminder, cancellation, and check-in manually before
  productizing them.
- Test a private shortlist and mutual-interest disclosure model.
- Define a minimally instrumented meeting-confirmation step.
- Resolve routing before adding a fourth member surface; Events PR #82 is not shipped.

### Related work

- [Event-to-Meeting Epic](epics/EPIC-02_EVENT_TO_MEETING.md)
- [Trust and Safety Epic](epics/EPIC-05_TRUST_AND_SAFETY.md)
- [Professional Singles Pilot](experiments/PROFESSIONAL_SINGLES_PILOT.md)
- [M4 — Pilot Ready](milestones/M4_PILOT_READY.md)
- [M5 — Event-to-Meeting Validation](milestones/M5_EVENT_TO_MEETING_VALIDATION.md)

## Later — productize relationship activation

### Intended outcome

> A member can choose whom to approach and progress a promising relationship to a mutually
> confirmed meeting with less coordination effort.

### Primary measures

- Candidate-to-shortlist and shortlist-to-approach conversion.
- Reply, scheduling, confirmation, and completion rates.
- Median time from candidate review to confirmed meeting.
- `NSM-001` mutually confirmed meetings per activated member.

### Work themes

- Select a lawful, consented candidate-source model without assuming LinkedIn graph access.
- Explainable Approach Copilot with evidence, correction, snooze, dismiss, and no automatic send.
- One-person or small-group invitation with purpose, proposed times, and a general place.
- Meeting Pipeline: Suggested → Shortlisted → Approached → Waiting → Replied → Scheduling →
  Confirmed → Met → Follow-up.
- Low-friction invitee response, privacy-safe share links, calendar handoff, and deletion controls.

### Related work

- [Relationship Activation Epic](epics/EPIC-03_RELATIONSHIP_ACTIVATION.md)
- [M6 — Relationship Retention](milestones/M6_RELATIONSHIP_RETENTION.md)

## Exploring — personality as matching evidence

### Intended outcome

> Members can judge and approach someone with more confidence because profiles show who they are
> beyond credentials.

### Candidate surfaces

- Optional structured personality prompts.
- A small set of pinned profile stories.
- Contextual posts connected to a profile, event, invitation, or meeting goal.

### Validation measures

- Profile-view-to-shortlist conversion.
- Personality-assisted approach and reply rates.
- Mutual interest and confirmed meetings influenced by member-approved content.
- Hide, report, deletion, recommendation-exclusion, and perceived-performance-pressure rates.

### Related work

- [Personality Layer Epic](epics/EPIC-04_PERSONALITY_LAYER.md)
- [Personality Content Validation](experiments/PERSONALITY_CONTENT_VALIDATION.md)

## Gated — not planned without a new decision

- Generic social feed and algorithmic engagement ranking.
- Automatic LinkedIn graph import or scraping.
- Bulk outreach or automatic message sending.
- Public attendee directory or public disclosure of romantic interest.
- Creator/influencer tools, groups, polls, newsletters, promoted events, or monetization.
- Share Marketplace, ratings, reviews, payments, or premium tiers.

A generic feed reverses the current promise of meeting relevant people without browsing a generic
social feed. It requires an explicit product contract re-freeze and evidence that profiles, events,
recommendations, and invitations cannot deliver the needed personality context first.

## Roadmap governance

- `CURRENT_STATE.md` owns what is shipped; fully shipped items leave this Roadmap.
- Each Roadmap theme links to an Epic and metric IDs.
- A Milestone may combine work from several Epics; it does not replace them.
- An unproven direction begins as an Experiment, not as committed Feature scope.
- Delivery-ready, bounded requirements may receive a feature PRD under
  `docs/product/requirements/`.
- Assignable work, owners, estimates, dependencies, and implementation acceptance criteria live in
  [GitHub Issues](https://github.com/itskylechung/Brea-replace-ditto/issues).
