# Roguelike D&D compatibility profile

The solo roguelike uses SRD 5.1 combat semantics wherever the dungeon cadence
does not make them impossible. Presentation and pacing may change; numerical
combat rules should not silently fork.

## Preserved rules

- Attack rolls are `d20 + attack bonus` against Armor Class.
- A natural 1 misses and a natural 20 hits critically.
- Critical hits double damage dice, not the flat modifier.
- Damage is typed. Immunity, resistance and vulnerability are applied before
  hit points, with temporary hit points absorbing adjusted damage first.
- A hero at 0 HP falls unconscious and makes death saving throws. A natural 1
  gives two failures, a natural 20 restores 1 HP, and three successes stabilize.
- Traps name a saving-throw DC, ability context and typed consequence.
- Healing potions restore `2d4 + 2` HP and cannot raise HP above its maximum.
- Conditions, actions, bonus actions, reactions, concentration, spell slots,
  rests and class resources retain SRD meaning as content begins using them.

## Explicit roguelike overrides

- One tile is five feet, but a single step consumes the roguelike movement
  cadence rather than tracking a 30-foot movement budget beside a separate
  action.
- The hero resolves first and eligible enemies then resolve in stable order.
  The mode does not roll or maintain standard encounter initiative.
- Opening a door consumes a roguelike turn rather than the tabletop free object
  interaction.
- Hostiles stop resolving further attacks when the only solo hero falls
  unconscious. This preserves death saves as a meaningful solo mechanic.
- Noise and room-scale awareness replace the tabletop encounter setup process.

These are named mode rules, not claims about the SRD. New combat features should
reuse `src/rogue-rules.js`; adding parallel math directly to the viewer is not
allowed.
