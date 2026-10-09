# Stonebridge Colony-Simulation Plan

This is the acceptance ledger for the Stonebridge village. The authoritative
system architecture, reference extraction, and milestone program are in the
[Stonebridge colony-simulation specification](stonebridge-colony-simulation-spec.md).
This ledger consolidates the construction, work, architecture, survival, art,
and control checks discovered during live observation. Supporting contracts
remain authoritative for implementation detail:

- [Village construction contract](village-construction-contract.md)
- [RimWorld versus Stonebridge construction review](rimworld-construction-gap-review.md)
- [M-11.1 household and housing contract](m11-households-housing.md)
- [Stonebridge village art contract](village-art-style.md)

The target is an original Stonebridge game, not a copy of another game's art or
content. RimWorld and Clanfolk are reference points for their readable colony-
simulation grammar: work is designated visibly, materials are physically
delivered, objects are built in stages, and the result remains understandable
at overview scale.

## Status and proof rules

Every item uses one of these states:

- `[x]` **Verified** — deterministic automated coverage passes.
- `[~]` **Implemented, not accepted** — code or tests exist, but the current
  Unity build has not been watched and confirmed.
- `[ ]` **Planned** — not implemented or not yet proven.

A feature is not accepted merely because its final object exists. Acceptance
requires all of the following:

1. Focused invariant tests pass.
2. The complete suite passes.
3. A fresh deterministic scenario produces the expected telemetry without
   hidden state injection.
4. The same run is watched in the current Unity client at normal play speed.
5. The inspector truthfully agrees with what is visible on the map.

A staged save, screenshot, aggregate project percentage, placeholder icon, or
old server process is not proof. Every watched run records its scenario seed,
save source, simulation build fingerprint, and Unity build fingerprint.

Current automated baseline: **205/205 tests pass**. This does not satisfy any
unchecked live-Unity acceptance item.

## Reference behavior reviewed

These references describe the information hierarchy and work behavior we are
using as a baseline, not assets to copy:

- [RimWorld Work To Build](https://rimworldwiki.com/wiki/Work_To_Build)
  separates material delivery from construction labor; building work starts
  after the required resources are delivered.
- [RimWorld Structure](https://rimworldwiki.com/wiki/Structure) and
  [Roof](https://rimworldwiki.com/wiki/Roof) describe walls as enclosure/roof
  support and doors as passage controls, with roofing dependent on support.
- [RimWorld Fence gate](https://rimworldwiki.com/wiki/Fence_gate) treats a gate
  as a distinct construction and passage point rather than fence decoration.
- [RimWorld Work](https://rimworldwiki.com/index.php?title=Work) exposes work
  types, manual priorities, and direct prioritization instead of hiding the
  scheduler.
- [Clanfolk Construction](https://wiki.hoodedhorse.com/Clanfolk/Construction)
  similarly separates placed blueprints, delivered materials, construction
  time, and finished buildings.

We adopt these observable principles while keeping Stonebridge's own rules,
economy, scale, visual design, and code.

## 1. Founding scenario and experiment loop

- [ ] A canonical fresh-start scenario begins with ten villagers, zero finished
      buildings, no hidden facilities, and the party present but nonessential.
- [ ] Every founder is explicitly `homeless`; household membership does not
      imply a residence.
- [ ] Founding supplies list exact food, axes, saws, hammers, seed, and other
      tools. Nothing else appears for free.
- [ ] Starting tools are sufficient to bootstrap the village. Later loss or
      expansion creates a real smithy/tool-production dependency.
- [ ] The initial settlement must physically establish a lumber work area,
      food source, storage, shelter, beds, and useful homes.
- [ ] A repeatable three-to-five-minute observation run stops, reports what
      happened, identifies the first failed gate, and restarts from identical state
      after a fix.
- [ ] The experiment can be watched live; it never substitutes a prepared
      mid-game save for the founding sequence.

## 2. Architect, plans, and valid sites

- [ ] The reeve/architect creates explicit, UUID-backed plans with a reason,
      priority, dependencies, plot, footprint, and element list.
- [ ] A plan appears first as a visible translucent blueprint. No completed
      collision, capacity, production, shelter, or storage exists at designation.
- [ ] Site validation rejects roads, waterways, occupied cells, reserved plots,
      invalid terrain, and inaccessible work positions.
- [ ] Roads remain roads. Construction never silently builds over them.
- [ ] Plans reserve their full useful footprint rather than shrinking into a
      leftover gap.
- [ ] Validation includes routes from the road to the door/gate and from the
      entrance to every work position and fixture.
- [ ] Build ordering preserves access. Doors and gates may be built last when
      that prevents workers or materials from being trapped.
- [ ] Invalid plans expose the exact failed rule and never partially instantiate
      finished objects.

## 3. Physical, cell-by-cell construction

- [x] Every fence and wall cell is an independent construction element with a
      stable identity.
- [x] One material delivery modifies one exact construction element.
- [x] Several workers can haul to different elements concurrently.
- [x] Hauling can continue while supplied elements are being built.
- [x] Forestry, hauling, and construction use separate capabilities and can run
      concurrently without pulling the principal lumberjack off timber work.
- [x] Construction waits for delivered material and prefers residents with the
      strongest construction skill; hauling prefers logistics skill.
- [x] One worker action completes at most one element.
- [x] A supplied element can be built before the entire project is supplied.
- [ ] Floors, roofs, doors, gates, fixtures, and multi-cell objects use the same
      element-local lifecycle.
- [ ] Each element visibly progresses through blueprint, partially supplied,
      supplied, unfinished frame, active work, and finished object.
- [ ] Labor advances only while a worker occupies a valid adjacent work cell;
      nobody builds remotely from a project entrance.
- [ ] A builder completes one element, then physically moves to the next.
- [ ] One facility becomes operational only when its required elements and
      access rules are complete.
- [ ] Cancellation releases reservations and leaves or returns delivered
      material without duplication.
- [ ] Damage, repair, deconstruction, rebuilding, and replacement materials use
      the same object-local system.
- [ ] A live Unity replay proves several residents independently hauling and
      building one visible element at a time.

## 4. Material and tool conservation

- [x] Existing tree harvesting changes a persistent tree into a stump and
      produces bounded logs.
- [x] Existing sawing consumes logs and produces bounded building lumber.
- [x] Wood quantities share one conserved scale: common mature trees yield 27
      units, oak yields 46, sawing is 1:1, walls cost 5, fences cost 1, and wooden
      doors/gates cost 25.
- [ ] The full wood chain preserves identity and quantity through mature tree,
      felled timber, logs, boards, carried stack, delivered stack, and construction.
- [ ] Pine, elm, maple, and later tree species survive harvesting and processing
      when their mechanical wood differences are enabled.
- [ ] Stone requires quarrying and blocks; metal requires ore/refining. Stone
      walls and steel doors cannot consume generic lumber.
- [ ] Every recipe declares exact material units, tool requirements, labor, and
      skill effects.
- [ ] Tools are finite, reservable, carried, reusable, and returned or staged;
      they are not decorative or silently granted per task.
- [ ] Physical stockpiles show only real items. Residents pick up, carry,
      deliver, consume, or store them instead of leaving permanent decorative
      piles.
- [ ] Stock deltas equal material in inventory, transit, frames, completed
      objects, legitimate waste, and declared cancellation refunds.
- [ ] Save/load preserves material, tool, reservation, and element identity.

## 5. Work scheduler and resident purpose

- [x] Work labels correspond to real jobs, movement, or interaction.
- [x] A resident with no real job says `Available for work`; a fictional routine
      is never presented as productive activity.
- [ ] Immediate danger and survival needs preempt ordinary work.
- [ ] A homeless resident seeks food first and shelter second. Homelessness does
      not dissolve the resident's household.
- [ ] Healthy residents select useful hauling, gathering, building, production,
      maintenance, cleaning, repair, training, or genuine recreation whenever an
      eligible action exists.
- [ ] Work type priorities, skill, passion/aptitude, distance, reservations,
      available tools, and settlement urgency participate in deterministic choice.
- [ ] Hauling and building are separate jobs, allowing a supply chain rather
      than one resident owning an entire project.
- [ ] Residents physically route to tools, stockpiles, resources, work cells,
      food, beds, and destinations; no work teleportation is allowed.
- [ ] Direct player prioritization targets one exact job/element and remains
      truthful about why it can or cannot start.
- [ ] Blocked jobs report their actual prerequisite, reservation, route,
      congestion, tool, stock, skill, schedule, or need blocker.
- [ ] Temporary congestion is allowed. Residents negotiate passage, yield, and
      recover without teleporting or becoming permanently blocked.
- [ ] A live audit accounts for every healthy resident: useful job, movement,
      active interaction, satisfied break/recreation, or a truthful blocker.
- [ ] Normal, fast, pause, and step modes execute identical simulation decisions
      for identical ticks. The existing slow day remains about 30 real minutes.

## 6. Architecture, rooms, shelter, and housing

- [x] Household identity is UUID-backed and independent of buildings.
- [x] Residents have a nullable residence assignment and explicit homeless
      status; destroyed, incomplete, or abandoned housing can make them homeless.
- [ ] A house plan contains exterior walls, floor, door, roof, valid interior
      routes, beds, household storage, kitchen, table, and chairs.
- [ ] Houses use the validated cottage/family archetypes or a later equally
      useful plan. The legacy tiny rooms are not valid house templates.
- [ ] Enclosure and roof support are simulated. A rectangle is not shelter merely
      because its metadata says `house`.
- [ ] Shelter, indoor state, temperature protection, and residential capacity
      begin only after the relevant physical elements are complete.
- [ ] Single beds occupy 1x2 cells and sleep one resident.
- [ ] Double beds occupy 2x2 cells and sleep two residents.
- [ ] Bed art fills its footprint corner-to-corner, uses the correct long axis,
      and has no unexplained padding or gaps.
- [ ] Tables, shelves, counters, and other large fixtures use real multi-cell
      footprints for drawing, collision, access, and work positions.
- [ ] New shelves are visibly empty. Stored goods render from actual contents.
- [ ] Beds, storage, kitchens, tables, and chairs are real UUID-backed objects
      produced, hauled, placed, and built from recipes; none spawn with a room.
- [ ] Every resident receives one valid, uniquely reserved sleeping location.
      Household beds are preferred; explicitly communal beds are a fallback.
- [ ] Eating, sleeping, working, and travel fit the slow day/night schedule.
- [ ] Residence and bed capacity/occupancy derive from completed physical
      objects and never exceed them.
- [ ] Population capacity is reported, but growth remains disabled until current
      residents survive the multi-day gate.

## 7. Fences, gates, pastures, and animals

- [x] A pasture starts as a visible fence-and-gate plan, not a completed pasture
      icon or aggregate project marker.
- [x] Workers haul to and build every fence cell independently.
- [ ] Finished fences autotile into readable ends, straights, corners, T-joints,
      and crossings without changing simulation identity.
- [x] A gate is a distinct material-backed construction element with its own
      stable key, footprint, recipe, labor, and last-in-plan build order.
- [ ] The finished gate opens and closes through real interactions, changes
      collision/path behavior, and preserves the same object identity.
- [~] Fence and gate blueprint, delivered-material, frame, and complete states
  have distinct map shapes; readability at normal Unity scale is not accepted.
- [ ] Cows, horses, and other large livestock are UUID-backed moving creatures,
      normally occupying a 2x1 footprint rather than a one-cell herd symbol.
- [ ] Animals have physical location, needs, movement, food, enclosure logic,
      and interaction points. A `pasture herd` icon never substitutes for animals.
- [ ] Fences block appropriate movement; gates allow controlled passage; animal
      and resident pathfinding agrees with the visible state.
- [ ] Milk, breeding, slaughter, hauling, and feed are consequences of real
      animals and labor rather than passive aggregate output.

## 8. Food, water, and settlement economy

- [x] Existing prepared meals are finite and eating consumes one.
- [ ] Fishing requires a visible, reachable stream, river, lake, or pond with a
      real fishing interaction point. Nobody fishes from dry land or a label.
- [ ] Farming has visible soil preparation, planting, growth, harvest, hauling,
      and storage states rather than an instantly appearing farm.
- [ ] Kitchens consume actual ingredients, fuel where required, tools, time, and
      labor to create meals.
- [ ] Residents physically collect and use food, lumber, boards, tools, seed,
      animal products, and building materials.
- [ ] Settlement priorities react to food reserves, shelter deficit, tools,
      storage, maintenance, and production dependencies without scripted outcomes.
- [ ] The village can establish sustainable food and shelter without player
      intervention beyond declared founding supplies.

## 9. Doors, walls, roofs, furniture, and visible states

- [ ] Timber, stone, and metal construction are visually and mechanically
      distinct in durability, flammability, appearance, cost, and labor where the
      simulation tracks those properties.
- [ ] Stonebridge begins mainly with timber walls because it is a lumber town;
      stone walls require a later quarry chain.
- [ ] Wooden and steel doors have separate recipes and properties. No stone door
      is introduced without a concrete design reason.
- [ ] One door identity uses matching blueprint, frame, closed, open, and damaged
      images. Opening does not swap it for an unrelated-looking asset.
- [ ] Door collision and navigation change with visible state; open and closed
      are not cosmetic labels.
- [ ] Roof plans, construction, support, collapse/removal, and indoor coverage
      are visible and systemic.
- [ ] Chairs, tables, beds, shelves, racks, counters, kitchens, and storage use
      recognizable top-down objects, never ASCII letters.

## 10. Village presentation and asset system

- [ ] The village uses original top-down colony-simulation graphics. It is not
      ASCII, photorealistic, isometric, or a 1990s action-RPG presentation. Dungeons
      may keep the existing ASCII style for now.
- [ ] Pawns, animals, vegetation, loose items, buildings, blueprints, and overlays
      share a consistent scale, outline, palette, light direction, and shadow.
- [ ] Four or more tree silhouettes—including pine, elm, and maple—are readable
      both close up and at overview scale.
- [ ] Tree/sapling/stump/log/board states and door open/closed states are backed
      by simulation metadata and a consistent asset-state registry.
- [ ] Construction stages use the intended object's silhouette: translucent
      blueprint, material pile, frame, active progress, completed, and damaged.
- [ ] Remaining pound signs, door markers, letters, and unrelated generated
      icons are removed from the village presentation.
- [ ] Sprites have genuine transparency, tight crops, no embedded background,
      no XOR/alpha halo, and no excess padding that makes them tiny in game.
- [ ] Art remains readable at the streamed 100x60 overview and at close zoom.
- [ ] Generated assets record the common style anchor, source prompt, provider,
      model, date, and approved reference image so later additions remain coherent.
- [ ] We reproduce useful information hierarchy and interaction feedback, never
      copyrighted RimWorld or Clanfolk images, designs, or exact characters.

## 11. Modular pawn and animation system

- [ ] Pawn identity is composed from body build, skin, hair, clothing, equipment,
      role accents, and condition overlays instead of one full bespoke clone sprite.
- [ ] Initial body builds cover at least slim, average, heavy, and obese while
      preserving a shared anchor, footprint, and attachment points.
- [ ] Composed results are cached into a ready-to-render sprite or atlas so the
      client does not rebuild every layer every frame.
- [ ] Party members and residents are visually distinguishable without relying
      only on labels.
- [ ] North, east, south, and west facings exist; east/west mirroring is allowed
      only when clothing, tools, and injuries are symmetric.
- [ ] Idle is visually stable with no perpetual whole-body rocking or bobbing.
- [ ] Walking states run only during authoritative movement, followed by carrying, hauling,
      building, chopping, eating, sleeping, injury, and other work states.
- [ ] Carrying a log, board, tool, meal, or other item is visibly truthful to the
      current reservation and inventory.
- [ ] Pawns remain large and legible enough at overview scale, with tight sprite
      bounds and no large transparent margin.

## 12. Camera, controls, and inspection

- [ ] Right- or middle-mouse drag pans the map predictably in both axes.
- [ ] Pan speed is slower and zoom-aware; vertical movement has no inversion,
      jumping, or asymmetry.
- [ ] Center controls locate the party, selected pawn, active worker, selected
      project, and village/founding group.
- [ ] Pause, step, normal, fast, centering, selection, and project controls stay
      visible and usable while turns resolve; they do not flash or disappear.
- [ ] Simulation controls are independent from camera and selection state.
- [ ] Selecting a plan or element shows required/delivered material, work done
      and remaining, reservation, assigned worker, valid work cell, dependencies,
      and blockers.
- [ ] Prioritize, suspend, forbid, cancel, repair, and deconstruct apply to exact
      world objects and report their consequences before mutation.
- [ ] Alerts identify hunger, homelessness, missing beds, blocked access, missing
      tools/material, dangerous fatigue, and stalled high-priority work.
- [ ] The interface never hides a failure behind a progress bar, optimistic
      label, or object that only looks completed.

## 13. Determinism, diagnostics, and multi-day survival

- [ ] Identical state, intents, and seed produce identical plans, reservations,
      routes, deliveries, work order, construction order, needs, and final state.
- [ ] Save/load at blueprint, delivery, frame, active-work, door-state, homeless,
      sleep, and congestion boundaries preserves exact identities and quantities.
- [ ] The movement audit reports temporary contention separately from permanent
      blockage and retains the existing zero-permanently-blocked standard.
- [ ] The telemetry timeline can explain each resident's current job, target,
      position, carried item, reservation, work progress, need override, and blocker.
- [ ] A deterministic multi-day run reports food produced/consumed, logs and
      lumber produced/consumed, tools made/lost, buildings and elements completed,
      bed/residence capacity and occupancy, unmet needs, blocked jobs, congestion,
      health, fatigue, homelessness, deaths, and population capacity.
- [ ] The village survives multiple days without player intervention and without
      invalid beds, starvation, dangerous fatigue, permanent blockage, or hidden
      resource injection.
- [ ] Population growth remains off until that survival result is repeatable in
      tests and in a watched Unity run.

## Delivery order

Work proceeds gate by gate. A later visual or economic feature cannot be used to
paper over a failed earlier invariant.

### Phase A — make the current run truthful and observable

1. Finish cell-local construction for floors, roofs, doors, gates, and fixtures.
2. Add distinct blueprint/material/frame/work/finished visuals.
3. Add element inspection, accurate blockers, and build/version fingerprints.
4. Run and watch the fresh founding scenario; fix all unexplained idle residents.

### Phase B — prove one complete fenced project

1. Architect marks a valid fence and gate without crossing a road.
2. Multiple residents reserve and haul exact material units.
3. Builders finish one visible fence cell at a time.
4. Connections and the gate update without replacing the project wholesale.
5. Cancellation, save/load, access, and congestion tests pass.

### Phase C — construct one useful timber home

1. Validate and reserve a real house archetype.
2. Build floor, timber walls, door, supported roof, then reachable fixtures.
3. Produce and place correctly sized beds, empty storage, kitchen, table, and
   chairs from materials and labor.
4. Assign homeless residents and prove shelter, occupancy, sleeping, eating,
   access, destruction, and rehousing behavior.

### Phase D — deepen presentation without breaking truth

1. Complete material/state variants for structures, vegetation, stock, and
   furniture.
2. Implement the modular pawn compositor and cached four-direction animation.
3. Add truthful carrying and work animations.
4. Tune camera, centering, selection, and continuous-run controls.

### Phase E — survival and growth gate

1. Run repeated three-to-five-minute founding loops until early priorities and
   labor allocation are stable.
2. Run deterministic full-day and multi-day audits.
3. Watch the identical scenario in Unity and reconcile every visual/telemetry
   disagreement.
4. Enable population growth only in a later milestone after existing residents
   repeatedly survive.

## Immediate next acceptance target

The next target is **Phase A.1: finish the gate's open/closed interaction and
path behavior, then prove the complete fence-and-gate lifecycle in one fresh
watched founding run**. The current code has automated proof for independent
fence/wall/gate elements, one-unit delivery, concurrent hauling, overlapping
hauling/building, one completion per worker action, and a persistent completed
gate. It does **not** yet have user-accepted Unity proof, connected fence art,
an interactive gate, or a reliable no-idle live audit. Those gaps remain open.
