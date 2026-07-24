# EPIC-04 — Personality as Matching Evidence

| Field | Value |
| --- | --- |
| Status | Exploring — not shipped |
| Roadmap | Exploring |
| Primary metric | Profile-view-to-shortlist and evidence-assisted reply conversion |
| Related issue | #95 |

## Problem

LinkedIn communicates credentials and professional history but gives weak evidence about what a
person is like outside work. A title alone does not help someone judge whether they would enjoy a
conversation, activity, or relationship.

## Target user

A member who wants to express a small amount of authentic, non-sensitive personality and a member
who needs better evidence before shortlisting or approaching someone.

## Job to be done

> Help me understand who this person is beyond their title and begin a specific, respectful
> conversation without forcing either of us to perform for a public audience.

## Desired outcome

Improve selection confidence, shortlisting, specific approaches, replies, mutual interest, and
confirmed meetings without optimizing for content consumption.

## Strategic alignment

- Core value: better evidence makes "suitable" more than professional keyword overlap.
- Principles: Suitable over plentiful; Real connection over engagement; Assist, never impersonate.

## Hypothesis

> LinkedIn shows what someone has done; Brea can help them show who they are.

Optional structured prompts, a small pinned set, and contextual posts may improve decisions and
conversation starts without requiring a generic feed.

## Candidate surfaces

### Personality prompts

Optional answers to bounded prompts about after-work habits, current interests, ideal activities,
friend descriptions, or qualities the member appreciates. Members can edit or remove answers and
are never required to disclose intimate or sensitive information.

### Pinned profile stories

Approximately three to five member-selected prompt answers or short stories that remain intentional
and scannable on the profile.

### Contextual posts

Short content attached to a real context, such as a desired activity, an event introduction, a
post-event topic, an invitation, or a meeting goal.

## Product loop

```text
Share member-approved personality evidence
  → make a more confident shortlist
  → use a specific approach angle
  → receive a reply or mutual interest
  → confirm a meeting
  → create richer future context
```

## Boundaries

- Text-first in the initial experiment.
- Explicit edit, delete, unpin, hide, report, and recommendation-exclusion controls.
- Recommendation use only with specific cited evidence.
- No follower graph, reposts, public popularity counts, creator monetization, or infinite feed.
- No automatic publishing or AI-generated content posted without review.
- No inference of psychological diagnoses, sexual behavior, political affiliation, or other
  unshared sensitive attributes.

## Success measures

- Profile view → shortlist with and without personality content.
- Personality-assisted approach and reply rates.
- Mutual-interest and confirmed-meeting rates.
- Member-reported selection confidence and conversation specificity.

## Guardrails

- Hide, report, deletion, and recommendation-exclusion rates.
- Sensitive-content and moderation incidents.
- Members feeling pressure to perform or expose more than intended.
- Incorrect use of content as recommendation evidence.

## Dependencies

- [Trust and Safety Epic](EPIC-05_TRUST_AND_SAFETY.md).
- Approved visibility defaults and event-attendee access rules.
- Moderation ownership and response targets.
- [Personality Content Validation](../experiments/PERSONALITY_CONTENT_VALIDATION.md).

## Decision gate

Proceed only if personality content improves selection, conversation, mutual interest, or meetings
without unacceptable privacy, safety, or performance pressure. Posting volume or reactions alone do
not justify a broader content surface, and a successful experiment does not authorize a generic
feed.
