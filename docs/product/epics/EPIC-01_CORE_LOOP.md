# EPIC-01 — Reliable Discovery-to-Conversation Core Loop

| Field | Value |
| --- | --- |
| Status | Active — shipped foundation, reliability work remains |
| Roadmap | Now |
| Primary metric | `OPM-001` bidirectional conversations per activated member |
| Milestone | [M4 — Pilot Ready](../milestones/M4_PILOT_READY.md) |

## Problem

Brea can authenticate, onboard, search, connect, and message, but shipping those screens does not
guarantee that a new member reaches a relevant person or receives a response. Local supply,
first-search location friction, absent notifications, backend reliability, generic conflict
messages, and missing disconnect/unblock controls can break the loop before a mutual conversation
forms.

## Target user

An authenticated member with a completed profile who wants to find and approach a suitable person
nearby.

## Job to be done

> Help me move from describing who I want to meet to a mutual conversation without losing context,
> exposing my exact location, or wondering whether my action worked.

## Desired outcome

Increase the share of activated members who receive at least one eligible result, send or review a
request, and reach a bidirectional conversation within 14 days.

## Strategic alignment

- Core capability: find suitable people nearby.
- Core value: safely form a mutual, real-world connection.
- Principles: Suitable over plentiful; Proximity without exposure; Mutual consent before deeper
  access.

## Shipped foundation

- LinkedIn OAuth and private per-user profiles.
- First-run onboarding, profile editing, discovery controls, and private location.
- Ordered gallery of up to six profile photos.
- Natural-language nearby search with semantic ranking and deterministic fallback.
- Connection request, incoming/sent inbox, accept, silent decline, and status reflection.
- Accepted-connection text messaging.
- Hide, report, and moderation.

The authoritative user-visible status is [Current State](../CURRENT_STATE.md).

## Remaining scope

- Transactional notification for request received and accepted; message notification is a later
  bounded decision.
- Dedicated Production backend and stable session/network behavior.
- Search success and empty-result measurement by market and radius.
- Dedicated UI handling for typed connection conflicts.
- Clear disconnect, self-service unblock, and repeat-request-after-decline policy.
- Bidirectional conversation instrumentation and response-latency reporting.
- Real-device verification of first-search geolocation and session persistence.

## Out of scope

- Event acquisition, RSVP, and attendee workflows.
- Automatic LinkedIn graph import.
- Approach Copilot or Meeting Pipeline.
- Personality content or a generic feed.
- Automatic message sending.

## Success measures

- `OPM-001` bidirectional conversations per activated member within 14 days.
- Activation completion rate.
- Searches returning at least one eligible result.
- Result-to-request and request-to-accept conversion.
- Accepted-connection-to-bidirectional-conversation conversion.
- Median request and first-message response time.

Exact definitions and availability live in [Metrics](../../METRICS.md).

## Guardrails

- Report and block rates.
- Repeat requests after a decline.
- Notification opt-out or complaint rate.
- Search and Function error rate.
- No raw coordinates or privileged credentials in client responses.

## Dependencies

- OPS-02 (#26) for a dedicated Production InsForge project.
- BE-05 (#49) for transactional email.
- OPS-01/#23 and OPS-07/#98 for backend reliability investigation.
- OPS-06 (#51) for safety operations.

## Open decisions

- What cooling or recipient-control rule replaces unrestricted re-request after decline?
- Does disconnect return a pair to a declined state, block state, or separate state?
- Which request and message notifications are essential without becoming noisy?
- What minimum local supply makes Find My People credible in the pilot city?

## Child work

Executable tasks, owners, dependencies, and acceptance criteria belong in
[GitHub Issues](https://github.com/itskylechung/Brea-replace-ditto/issues), not in this Epic.
