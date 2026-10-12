# Stonebridge Food Playbooks

Status: executable commands with live scheduler controller
Established: 2026-10-12

## Rule

A playbook may reference only a registered command function. Every command must
compile to a runtime job type with a real executor and must declare its physical
input and observable output. Prose such as "put food in storage" is not a valid
step. The valid command is `haul_physical_stock`, which requires a physical
source, compatible bounded destination capacity, a worker, a reservation, and a
route; its observable result is conserved stock moving between those containers.

`npm run audit:village:playbooks` fails when a playbook names an unknown
command, a command lacks a function, its job type lacks a runtime executor, its
function compiles the wrong job, or its physical input/output contract is absent.

## First food playbooks

### Emergency forage

1. `gather_wild_food`
2. `haul_physical_stock`

This is a starvation bridge only. It must stop when durable food reaches the
one-day reserve.

### River fishing

1. `craft_fishing_net`
2. `catch_river_fish`
3. `haul_physical_stock`

The catch is created at valid river access, not at the kitchen. The hauling
step moves it into the inn pantry.

### Hunting

1. `craft_hunting_bow`
2. `hunt_wild_game`
3. `haul_physical_stock`

The selected animal must be reachable and persistent. Hunting changes its life
state and produces traceable meat; it does not increment meat from a distance.

### Grain cycle

1. `prepare_crop_cell`
2. `sow_crop_cell`
3. `grow_crop`
4. `water_crop` when moisture requires it
5. `harvest_crop_cell`
6. `haul_physical_stock`
7. `save_crop_seed`

Growth is persisted per cell. Harvest creates physical fractional field piles.
Those piles remain unavailable to a kitchen until a hauling command moves them
into compatible bounded storage.

### Meal service

1. Select one ready command from `prepare_fish_meal`, `prepare_grain_meal`,
   `prepare_vegetable_meal`, or `prepare_meat_meal`.
2. `eat_prepared_meal`

An unavailable ingredient makes its cooking command not ready; it does not make
the ingredient appear. Eating consumes a physical meal and changes the selected
resident's hunger.

## Function validation matrix

| Command                  | Runtime job           | Executor   | Behavioral proof                                                      |
| ------------------------ | --------------------- | ---------- | --------------------------------------------------------------------- |
| `gather_wild_food`       | `gather_wild_food`    | production | Forage patch depletes, provenance records, emergency stops at reserve |
| `craft_fishing_net`      | `craft_fishing_net`   | production | Fiber consumed, reusable net stored, catch multiplier proven          |
| `catch_river_fish`       | `catch_fish`          | production | Fish created at real river-bank catch container                       |
| `haul_physical_stock`    | `haul_stock`          | transfer   | Fractional field harvest reaches bounded storage without duplication  |
| `craft_hunting_bow`      | `craft_hunting_bow`   | production | Metal/lumber consumed and one physical bow stored                     |
| `hunt_wild_game`         | `hunt_game`           | production | Persistent deer dies and traceable meat is returned                   |
| `prepare_crop_cell`      | `grow_grain`          | production | Ordered physical cell changes to prepared                             |
| `sow_crop_cell`          | `grow_grain`          | production | Conserved seed batch supports persisted planted cells                 |
| `grow_crop`              | `grow_grain`          | production | Per-cell growth advances before whole plot completion                 |
| `water_crop`             | `water_fields`        | production | Dry field posts watering and persisted moisture rises                 |
| `harvest_crop_cell`      | `grow_grain`          | production | Mature cell produces a physical fractional field pile                 |
| `save_crop_seed`         | `save_seed`           | production | Stored grain converts to protected seed reserve                       |
| `prepare_fish_meal`      | `prepare_meal`        | production | Fish provenance transforms into bounded prepared meals                |
| `prepare_grain_meal`     | `bake_grain_meal`     | production | Stored grain transforms through the cookery executor                  |
| `prepare_vegetable_meal` | `cook_vegetable_stew` | production | Stored vegetables transform through the cookery executor              |
| `prepare_meat_meal`      | `cook_beef_stew`      | production | Stored meat transforms into two bounded meals                         |
| `eat_prepared_meal`      | `eat_meal`            | life       | Meal quantity decreases and hunger rises                              |

The mayor's food-playbook controller now inspects the real posted jobs, maps
each one to its registered command, records readiness and blockers, and adds
the playbook, command, and step identity to the job itself. Ready food commands
receive a survival priority floor before normal schedule modifiers are applied.
The current focus and all concurrent directives are exported in the native
client view, so a test can prove the order being executed rather than infer it
from totals.

This is the first controller slice. Existing physical job posters still decide
when a command exists; the controller selects and prioritizes among those real
options. The next slice must explain commands that are absent because a
prerequisite, route, facility, tool, ingredient, worker, or destination is
missing, and request the corresponding dependency job when one does not yet
exist.
