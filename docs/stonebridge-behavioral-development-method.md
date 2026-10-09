# Stonebridge Behavioral Development Method

Status: mandatory engineering and acceptance method  
Established: 2026-10-03  
Applies to: every resident, animal, party member, village plan, and simulation
feature

## Purpose

Stonebridge must play believably, not merely converge on acceptable statistics.
Automated totals answer how often something happened. They do not answer whether
a person perceived the right problem, considered sensible alternatives, chose a
defensible action, carried it out physically, or changed course when reality
changed.

Every implementation begins with behavior and ends with watched play. Headless
runs support this process but never replace it.

## The unit of simulation design

The unit of design is a decision episode:

1. **World state:** What physically exists and what just changed?
2. **Perception:** What can this actor actually know from location, senses,
   memory, reports, role, and village records?
3. **Pressure:** Which personal needs, threats, duties, relationships, and
   community objectives matter now?
4. **Alternatives:** What actions are physically reachable, supplied, safe,
   authorized, and socially appropriate?
5. **Choice:** Why does one alternative beat the others now?
6. **Execution:** Does the actor move, carry, work, fight, flee, eat, or sleep in
   the visible world without teleportation or symbolic shortcuts?
7. **Interruption:** What observation would make the actor stop or change course?
8. **Consequence:** How does the result alter both the individual and the
   community plan?

A feature is incomplete if any link is absent, even when its output counter
increments correctly.

## Required implementation workflow

### 1. Write the behavioral scene first

Describe at least one normal scene, one scarcity scene, one danger scene, and
one changed-mind scene in ordinary language before implementing the mechanic.
The scenes name the actor, perceived facts, rejected alternatives, chosen
action, physical steps, interruption condition, and expected consequence.

Example: a hungry hunter surprised by an aggressive animal does not compare
sleep against fence construction. Immediate threat narrows the alternatives to
fight, flee, seek cover, or call for help. Only after safety is restored may
hunger or village work be reconsidered.

### 2. Model perceptions and decisions explicitly

Do not hide behavior in a single priority number. Persist or expose:

- perceived threats and needs;
- candidate actions and rejection reasons;
- selected action and reason;
- supporting village objective or personal survival need;
- expected benefit, risk, cost, and time;
- interruption and reevaluation conditions.

Priority scores may break ties inside a decision layer. They may not allow
fence construction to outscore an immediate attacker.

### 3. Apply the survivability hierarchy

Every candidate action belongs to one layer:

1. immediate danger response;
2. imminent personal collapse prevention;
3. community survival coverage;
4. stable production and maintenance;
5. expansion, comfort, and beautification.

A lower layer is unavailable while a higher layer has an actionable unmet need.
Exceptions must be explicit—for example, closing a gate may itself be an
immediate danger response rather than ordinary fence construction.

### 4. Test decisions, not only outcomes

Automated tests must prove decision boundaries:

- the actor chooses the believable action;
- the rejected action has the correct rejection reason;
- a material change causes reevaluation;
- reservations and carried resources are released or preserved correctly;
- individual decisions update community coverage;
- community decisions never erase immediate personal self-preservation.

Tests that only assert eventual food, buildings, survival, or job counts are
supporting telemetry, not behavioral acceptance.

### 5. Perform a visible observation pass

Run the actual game at readable speed. Do not begin with a long fast-forward.
At several decision transitions:

- pause the game;
- select an active, idle, blocked, and vulnerable actor;
- inspect perception, alternatives, choice, reason, and interruption condition;
- compare the explanation with the actor's visible movement and world state;
- ask what a reasonable person would do next;
- mark any contradiction as a failure, even if the final statistics are good.

The reviewer deliberately watches beginnings, interruptions, handoffs, failures,
and recovery—not only the mature settlement screenshot.

### 6. Run counterfactual probes

Change one fact and watch the decision change:

- remove prepared food;
- block the bed or road;
- injure or threaten the assigned worker;
- consume the reserved material;
- change weather or time of day;
- remove a hunter, cook, builder, or leader;
- create a nearer safe alternative;
- complete or destroy the object that motivated the job.

If the actor continues the old action without a defensible reason, the system
has failed to simulate a decision.

### 7. Use statistics last

After watched behavior is credible, deterministic and multi-seed runs measure
whether the same logic remains viable at scale. Statistics detect frequency,
starvation, deadlocks, throughput, storage overflow, and rare failures. They do
not convert implausible behavior into correct behavior.

## Acceptance record for every feature

Every completed feature records:

- behavioral scenes covered;
- decision-layer and interruption rules;
- automated decision-boundary tests;
- watched run identifier and observed ticks;
- actors inspected and why their choices were believable;
- counterfactuals performed;
- remaining contradictions;
- current R0-R8 phase status.

No feature is called complete while a remaining contradiction affects its core
behavior.

## Review questions for Codex

Before claiming success, Codex must answer these questions from visible evidence:

1. If I knew nothing about the code, would the actor's behavior make sense?
2. Is the actor responding to the most urgent fact they can perceive?
3. Is the action physically performed at the correct place with real inputs?
4. What sensible alternatives were rejected, and why?
5. What would interrupt this action?
6. Does the village adapt when this person becomes unavailable?
7. Are idle and blocked people truthfully explained?
8. Did I watch the behavior, or am I inferring it from counters?
9. Am I claiming that a mechanism exists, or that the game plays correctly?
10. What visible evidence could prove my conclusion wrong?

If Codex cannot answer these questions, it must report the feature as unproven
and continue investigating rather than taking completion credit.

## Durable instruction for future sessions

Read this document before changing Stonebridge simulation behavior. Treat it as
an engineering constraint, not optional design commentary. When conversation
history is missing, this document, the village strategy, and the colony roadmap
are the authoritative recovery sources.
