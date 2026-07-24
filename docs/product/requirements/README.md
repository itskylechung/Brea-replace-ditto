# Feature PRDs

This directory is for bounded product requirements that have passed validation and are approved for
delivery. It is not a Roadmap, Epic list, or Backlog.

Create a feature PRD only when:

- the user problem and target user are understood;
- the owning Epic and intended metric movement are named;
- the delivery boundary is narrow enough to accept or reject;
- major privacy, safety, and dependency decisions are made; and
- the team is prepared to turn the requirements into GitHub Issues.

## Template

```md
# PRD — Feature name

## Status
Draft / In review / Approved / Shipped / Superseded

## Owner

## Epic and milestone

## Problem

## Target user

## Job to be done

## Desired outcome

## Why now

## User journey

## Functional requirements

## States and edge cases

## In scope

## Out of scope

## Success metric

## Guardrail metrics

## Privacy and safety

## Dependencies

## Open decisions

## Acceptance criteria

## Rollout and verification

## Child issues
```

Implementation tasks, owners, estimates, and PR status remain in GitHub Issues. When a feature
ships, update `../CURRENT_STATE.md`, the relevant technical contract, Epic, Milestone, and metric
availability.
