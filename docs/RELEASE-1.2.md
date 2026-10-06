# Rumble Run 1.2 milestone

The existing game is extended in place. It remains human-only, uses Three.js /
Socket.IO / cannon-es and downloads no texture or character pack.

## Play the new content

Open Match options before creating a room, or as host in a waiting room. Choose
Grand Prix for 4–10 rounds with everybody returning each round; Knockout supports
4–8 rounds but ends earlier if only one qualifier remains. The Party playlist
alternates generated races and arena objectives. Generated / Presets / Mix both
controls the course pool. Focus course repeats a chosen ruleset; leave it unset
for varied rounds. Theme, seed, difficulty and capacity are configurable.

Practice creates a one-round room that can start with one human; click Start
practice in the lobby. Infection needs four humans, including in practice.
No opponent bots are added to solo team practice. Choose the course before
pressing Practice, or edit it in the lobby. Ready is an indicator; the host can
start once the required human count is present.

## Integrated additions

- 23 arena rules: memory, rolling drums, ribbons, eggs, football, basketball,
  volleyball, ball hoarding, hoops, infection, pushing, stars, possession, moving
  zone, buttons, territory, 3×3 pattern, snowball growth, laps, lasers, charging
  creatures, reactive tiles and fuse balls. E / gamepad X interacts where needed.
- 23 reference-inspired presets share the existing generator/physics. The catalogue
  states what each approximates. Server-secret doors and path answers are removed
  from the public manifest; clients check content/rules versions and checksums.
- Room editing, capacity, ready indicators, host transfer/removal; previous/next
  and named spectator selection; disconnect cleanup; cause/placement feedback.
- Eight themes with different scenery silhouettes, camera obstruction handling,
  optional second-press dive, look inversion and locally saved preferences.
- Instanced low-poly rendering, 64-byte binary player rows, compact objective
  state and environmental deltas at 15 snapshots/sec with 60 Hz physics.

## Verified and unverified

Run `npm test`, `npm run check-maps`, `npm run build` and
`npm run benchmark-release`. The checked-in JSON measurement reports describe
scope and exclusions. Tests include real Socket.IO clients for movement, ownership,
scores, host permissions, reconnect and elimination. Same-tick final falls can
share victory; sports have bounded overtime. Twenty tournament cycles reset state.

The available browser cannot render WebGL. Scene checks use a recording renderer;
there is no claim of a real GPU playtest or measured Chromebook FPS. These modes
need human balancing. See PERFORMANCE.md and REMAINING.md for limitations and the
coverage ledger for the much larger unimplemented portion of the supplied spec.
