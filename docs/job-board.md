# M-4 Job Board and Reservation Contract

The job board turns world conditions and player requests into persistent,
inspectable work without embedding profession logic in the interface.

## Authoritative state

`village.jobs` and `village.reservations` are authoritative. A job stores its
one `assignedActorId`; actor inspection derives current work from that field
rather than persisting a second `currentJobId` relationship.

Every job and reservation is a UUID-backed runtime instance with a stable
definition UUID. Save schema 12 introduces both collections plus actor
capabilities, permissions, skills, availability, and last completed job type.

## Lifecycle

The legal lifecycle is:

```text
available -> reserved -> active -> completed
     |           |          |
     +--------> blocked <----+
                            |
                         suspended

Any nonterminal state -> cancelled
```

`blocked` describes an environmental or eligibility failure. `suspended` is
reserved for deliberate interruption by higher-priority work. Completed and
cancelled jobs are terminal. Illegal transitions are rejected.

A job makes at most one lifecycle transition in a simulation tick. This keeps
available, reserved, active, blocked, and completed work observable rather than
collapsing the entire lifecycle into one update.

## Reservations

Reservations can claim a job UUID, world-object UUID, item UUID, or a work
position identified by location and coordinates. A job acquires its full claim
set atomically. If any exclusive claim conflicts, none of the requested claims
are created.

Active claims use `held`; released claims retain their release tick and reason
for inspection and replay diagnosis. Completion and cancellation release every
held claim. Missing targets release the worker and claims together.

## Eligibility and assignment

Actor eligibility uses explicit data:

- capability tags;
- allowed job types;
- work availability;
- skill ratings;
- risk.

Display roles are not simulation permissions. Candidate assignment uses this
deterministic integer tuple:

1. priority, descending;
2. continuity with the actor's last job type, descending;
3. relevant skill, descending;
4. risk, ascending;
5. legal route cost, ascending;
6. actor UUID, ascending.

Unreachable actors are rejected before comparison. M-7 may replace greedy
per-job assignment with batch matching without changing job or reservation
contracts.

## M-4 proof job

The stable cart advertises `Request stocktake`. It posts one idempotent
`inspect_object` job for that cart. The selected worker reserves the job, cart,
and adjacent work position; navigates one legal cell per simulation tick;
executes the M-3 `examine` affordance; completes; and releases every claim.

This is a genuine one-action job. Cargo transfer remains in M-5, where the
first multi-step `deliver_goods` plan will load, travel, unload, and commit
stock changes.

## Presentation

The Stonebridge location drawer projects available, reserved, active, blocked,
suspended, completed, and cancelled work with assignment, progress,
destination, and blocking reason. It remains an overlay and does not reduce the
map viewport.
