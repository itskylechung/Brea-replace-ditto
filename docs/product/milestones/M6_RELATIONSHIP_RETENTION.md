# M6 — Relationship Retention

| Field | Value |
| --- | --- |
| Status | Gated — not committed |
| Outcome | Validate that decision support and follow-through increase confirmed meetings |
| Primary Epic | [Relationship Activation](../epics/EPIC-03_RELATIONSHIP_ACTIVATION.md) |

## Milestone intent

M6 tests whether Brea should become an action layer for both new discoveries and approved existing
relationships. It begins only after a lawful candidate source and a credible concierge validation
exist; it does not begin merely because an AI recommendation UI can be built.

## Entry gates

- [ ] Candidate source is approved, consented, or explicitly member-provided.
- [ ] LinkedIn API and platform-policy constraints are documented; no scraping is involved.
- [ ] Minimum relationship data, refresh, correction, export, and deletion rules are approved.
- [ ] Invitee authentication and share-link privacy are decided.
- [ ] Concierge testing indicates that candidate selection or follow-through is a material problem.
- [ ] `NSM-001` meeting confirmation can be measured.

## Exit criteria

- [ ] A member can define a weekly relationship goal.
- [ ] The product can form a small candidate set without implying unsupported graph access.
- [ ] Every recommendation cites evidence and can be corrected, dismissed, snoozed, or excluded.
- [ ] The member reviews every invitation before sending; no bulk or automatic sending exists.
- [ ] An invitation can progress through reply, scheduling, confirmation, meeting, and follow-up.
- [ ] Invitees have a low-friction response path inside the approved privacy boundary.
- [ ] Confirmed meetings receive a calendar handoff.
- [ ] The measured funnel improves over arranging the same meeting through disconnected LinkedIn
  messages alone.
- [ ] Safety, privacy, deletion, and recommendation-quality guardrails remain acceptable.

## Required evidence

- Candidate → shortlist → approach.
- Approach → reply → scheduling → confirmed → met.
- Median reply and confirmation time.
- Overdue follow-ups.
- `NSM-001` mutually confirmed meetings per activated member.
- Incorrect-evidence, sensitive-inference, opt-out, block, and report rates.

## Non-goals

- Sales automation.
- Automatic LinkedIn messaging.
- Bulk outreach.
- Undisclosed enrichment.
- Generic feed or creator tools.

## Completion decision

Completion requires an outcome review and a formal decision about whether Relationship Activation
enters the shipped Product contract. Delivery of Approach Copilot alone is insufficient.
