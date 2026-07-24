# Brea Product

| Field | Value |
| --- | --- |
| Status | Active product foundation |
| Last reviewed | 2026-07-24 |
| Product surface | Responsive web app |
| Production | <https://brea-replace-ditto.vercel.app> |

Brea helps people safely find and form real-world connections with suitable people nearby.
This document is the stable product entry point: it defines what Brea is, the value it must
preserve, and where each changing product artifact lives. It is not a feature PRD or a backlog.

## Product purpose

> Help people turn relevant nearby possibilities into real-world relationships.

## Core product capability

> Find suitable people nearby.

Geographic proximity and personal relevance are both required. A feature belongs in Brea only when
it improves that discovery, helps a promising connection progress toward a real meeting, or protects
the people involved.

## Core user value

> Safely move from wanting to meet someone to forming a mutual, real-world connection with a
> suitable person nearby.

Finding a profile is an intermediate action, not the final outcome. Brea should help a member
understand why someone is relevant, approach them with consent, receive a response, and ultimately
meet when both people want to.

## Product promise

> Sign in with LinkedIn, find suitable people nearby, and start a real connection—without exposing
> your exact location.

LinkedIn establishes basic identity only. Brea does not scrape LinkedIn, import a member's graph, or
imply access it has not received.

## Target user

The shipped product serves an urban professional, student, newcomer, or remote worker with a
LinkedIn identity who wants to meet someone relevant nearby without browsing a generic social feed.

The initial go-to-market beachhead remains under validation: time-poor single founders, operators,
and ambitious professionals who value trusted identity, professional context, and useful
low-pressure activities. This cohort is a starting hypothesis, not a permanent eligibility rule.

## Job to be done

> When I want company, advice, a shared activity, or a relationship, help me find and approach a
> suitable person nearby so I can start a real-world connection without exposing where I live.

## Product principles

### Suitable over plentiful

Prefer a small, explainable set of relevant people over an infinite directory. Ranking, shortlists,
and recommendations must give evidence rather than fabricate compatibility.

### Real connection over engagement

Optimize for mutual conversations and real meetings, not browsing time, impressions, posting
volume, or habit loops that do not help a relationship progress.

### Proximity without exposure

Use private coordinates to create nearby value while returning only approximate distance and a
member-chosen location label.

### Mutual consent before deeper access

Do not reveal deeper identity, romantic interest, contact paths, or attendee context until the
relevant people have agreed to that disclosure.

### Assist, never impersonate

AI may rank, explain, and draft. It must not infer sensitive traits, send automatically, conduct
bulk outreach, or present itself as the member.

## Measurement

The future North Star is:

> **NSM-001 — Mutually confirmed meetings per activated member within 28 days.**

Meeting confirmation is not shipped yet, so the current operating metric is:

> **OPM-001 — Bidirectional conversations per activated member within 14 days.**

The exact numerator, denominator, event availability, exclusions, input metrics, and safety
guardrails live in [Metrics](docs/METRICS.md). Product documents reference metric IDs rather than
redefining them.

## Product strategy

Brea has two compatible entry points:

1. **Discover:** find a suitable new person nearby through the shipped search experience.
2. **Reconnect:** under validation, help a member choose and approach someone from an approved,
   consented, or member-provided candidate set.

The proposed acquisition wedge is a manually curated series of useful, invite-only cowork, coffee,
and after-work activities. Events create trusted local density; Approach Copilot and Meeting
Pipeline are hypotheses for converting promising encounters into confirmed meetings. A generic feed
is not required for this loop.

## Product documentation

### What is true now

- [Current State](docs/product/CURRENT_STATE.md) — the user-visible Production contract and known
  limitations.
- [Metrics](docs/METRICS.md) — metric definitions, measurement availability, baseline queries, and
  guardrails.
- [Engineering Handoff](HANDOFF.md) — operational state, decisions, setup, and active engineering
  risks.

### Where the product may go

- [Roadmap](docs/product/ROADMAP.md) — outcome-oriented Now / Next / Later / Exploring priorities.
- [Core Loop Epic](docs/product/epics/EPIC-01_CORE_LOOP.md)
- [Event-to-Meeting Epic](docs/product/epics/EPIC-02_EVENT_TO_MEETING.md)
- [Relationship Activation Epic](docs/product/epics/EPIC-03_RELATIONSHIP_ACTIVATION.md)
- [Personality Layer Epic](docs/product/epics/EPIC-04_PERSONALITY_LAYER.md)
- [Trust and Safety Epic](docs/product/epics/EPIC-05_TRUST_AND_SAFETY.md)

### Delivery checkpoints

- [M3 — Authenticated Core Loop](docs/product/milestones/M3_AUTHENTICATED_CORE_LOOP.md)
- [M4 — Pilot Ready](docs/product/milestones/M4_PILOT_READY.md)
- [M5 — Event-to-Meeting Validation](docs/product/milestones/M5_EVENT_TO_MEETING_VALIDATION.md)
- [M6 — Relationship Retention](docs/product/milestones/M6_RELATIONSHIP_RETENTION.md)
- [GitHub Issues](https://github.com/itskylechung/Brea-replace-ditto/issues) — the only executable
  backlog.

### Validation

- [Professional Singles Pilot](docs/product/experiments/PROFESSIONAL_SINGLES_PILOT.md)
- [Personality Content Validation](docs/product/experiments/PERSONALITY_CONTENT_VALIDATION.md)

### Technical contracts

- [Authentication and Profile](docs/technical/AUTH_AND_PROFILE_CONTRACT.md)
- [Discovery and Connections](docs/technical/DISCOVERY_AND_CONNECTION_CONTRACT.md)
- [Data, Security, and Functions](docs/technical/DATA_SECURITY_AND_FUNCTIONS.md)
- [Backend Runbook](insforge/BACKEND_RUNBOOK.md)

### Historical contracts

- [PRD v2.0 — Authenticated Release](docs/archive/PRD_V2_AUTHENTICATED_RELEASE.md) — the complete
  2026-07 contract from which this documentation set was decomposed.
- [Two-Hour MVP Plan](MVP_PLAN.md) and [Original User Flow](USER_FLOW.md) — the anonymous prototype
  plan retained for history.

## Documentation rules

- `PRODUCT.md` owns purpose, core value, principles, and the North Star name.
- `CURRENT_STATE.md` owns Production product status. A merge or Preview deploy is not shipped.
- `ROADMAP.md` owns outcome sequencing, not task details.
- Epic documents own a problem space and its success criteria.
- Milestones own cross-epic exit criteria for a delivery or validation checkpoint.
- Experiment documents own unproven hypotheses, evidence, and Continue / Iterate / Pivot / Stop
  decisions.
- GitHub Issues are the only assignable backlog; documents link to issues instead of copying them.
- Technical contracts own API, state, data, privacy, and authorization behavior.
- Feature PRDs belong in `docs/product/requirements/` only after a bounded solution is approved for
  delivery.
