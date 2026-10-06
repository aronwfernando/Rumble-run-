# Rumble Run

A self-hosted, human-only multiplayer bean racer built with Three.js, Socket.IO, and cannon-es. It is an original low-poly party racer with simple geometry and solid colors: no character downloads, no texture packs, and no bot players.

Create a private room and share its six-character code or invite link, or choose public quick play. Knockout uses 4–8 rounds (six by default). Grand Prix supports 4–10 rounds and brings everyone back each round for cumulative points. Practice supports one human on a single course; infection needs four humans. Hosts can change courses, playlists, themes, seed, difficulty and capacity in the lobby. The server owns movement, collisions, interaction, scoring, checkpoints, eliminations and winners.

Version 1.2 adds 23 original arena rulesets, 23 reference-inspired presets, distinct scenery for eight themes, camera collision avoidance, instanced rendering and compact binary snapshots. This is an incremental release. The full supplied expansion specification is **not complete**: see [release notes](docs/RELEASE-1.2.md), [remaining work](docs/REMAINING.md) and the [coverage ledger](docs/COVERAGE.md).

## Put it online

Use the included `render.yaml` to host the game on Render. Your friends open
the resulting website and join with an invite link; no local installation is
needed. See [ONLINE-HOSTING.md](ONLINE-HOSTING.md) for the browser-only setup,
hosting limits, and how to update the server between matches.

## Run it locally (optional)

Requires Node.js 22.12 or newer.

```bash
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:3000` in two or more browser windows, create a room in one, and join with the code in the others. Use `npm run build && npm start` for production mode.

The server serves the built client from `dist/`. It listens on `0.0.0.0` by default so it can sit behind a reverse proxy or be reached on a local network. Put TLS and a WebSocket-capable proxy in front of it for an internet deployment; keep `ALLOWED_ORIGINS` restricted to the public origin.

## Controls

- `WASD` or arrow keys: move relative to the camera
- `Space` or right mouse button: jump (with coyote time and jump buffering)
- `Shift` or `F`: dive; dive momentum and cooldown are server-validated
- `E`: grab the moving crown, pick up/throw a carryable object, or tag in a relevant arena
- Drag the game view: rotate the camera; `C`: center it
- `R`: reset to the last checkpoint during a race (counts as a fall)
- `Tab`: open the lineup
- `Esc`: settings overlay (online play continues)

Touch devices get a virtual stick, jump, dive, and crown buttons automatically.
Gamepads use the left stick to move, right stick to look, A to jump, B to dive,
and X to interact. Settings include graphics quality, field of view, camera distance,
sensitivity/inversion, optional airborne second-press dive, reduced camera motion,
player names, shadows and sound. Display/control choices persist on this browser;
the reconnect token is isolated to each tab.

Falls in races display checkpoint recovery feedback. Qualification and elimination
have dedicated overlays with a spectate action, followed by persistent status in
the HUD. Between rounds, eliminated players see an explicit result screen.

## Map generation

`shared/maps.js` is the map generator and validator. It is deterministic: the same seed, round, type, and difficulty produce the same map. The generator blends route modules, obstacle families, arena variants, and a theme palette. All sizes and gaps stay inside playable bounds before a map is returned.

Eight original race families each have a different obstacle mix and layout:

| Course | Main challenge |
| --- | --- |
| Pinwheel Park | Spinning discs and sweepers |
| Gate Garden | Phased lifting gates and breakable doors |
| Fruit Freeway | Uphill belts, giant fruit, cannonballs, and wide rolling logs |
| Tilt Trails | See-saws, split lanes, and pendulums |
| Fan Foundry | Narrow bridges and rotating blades |
| Summit Scramble | Ascending switchbacks, hammers, and pistons |
| Mirage Mile | Fragile puzzle tiles with a permanent safe path |
| Spring Street | Spring pads, flippers, and bumpers |

The generator shuffles a recipe deck, avoiding repeated race families and
survival variants within a 4–8-round match. Neighbouring rounds use different
palettes. Sections, widths, heights, lateral offsets, gaps, and obstacle phases
vary with the seed. Difficulty increases through the tournament, and the first
section of a race uses gentler hazard timing. Each race keeps an opening challenge
from its main family, then mixes in two sections from another family. Adjacent
section layouts vary, while later broad platforms may combine separated hazards.
Each theme has its own inexpensive scenery: candy poles, toy blocks, jungle trees,
orbital rings, pirate palms, frozen crystals, desert arches or neon pipework.

Five survival arenas cover sweepers with collapsing edges, three layers of
hexagonal tiles, moving walls, rising slime, and rotating island platforms.
Finals select a crown climb, Last Hex Standing, or Crown Carousel.

Match options offers generated courses, authored presets, a blend, or a focus
course. The Party playlist mixes races with arena objectives. Arenas include
memory, rotating drums, ribbons, carryable eggs, football/basketball/volleyball,
hoards, hoops, infection, ball pushing, stars, possession, moving zones, buttons,
tile territory, a 3×3 puzzle, snowball growth, lap gates, lasers, charging creatures,
reactive tiles and fuse balls. These are original compact implementations;
[reference limits](docs/REFERENCE-PRESETS.md) are documented.

The generator runs locally as seeded code. It does not make AI API calls or
download maps, textures, or models during a match. The supplied Fall Guys
catalogue informed the mix of mechanics; course names, geometry, layouts,
colours, and code in this project are original.

Generate and inspect maps:

```bash
npm run generate-map -- --list
npm run generate-map -- --seed candy --type race --course gate-garden --out generated/gates.json
npm run generate-map -- --seed candy --type survival --variant tilefall --out generated/hex.json
npm run generate-map -- --seed candy --round 7 --type final --variant last-spinner --out generated/final.json
```

Race recipes use the identifiers listed by `--list`. Survival variants are
`sweeper`, `tilefall`, `blockdash`, `rising-slime`, and `carousel`. Final variants
are `crown-climb`, `last-tiles`, and `last-spinner`. Omitting a variant or course
uses the seeded tournament deck.

`validateMap()` checks finite geometry, collider budgets, 30 supported spawns,
checkpoint landings, and a connected start-to-finish route with conservative
jump and height limits. Fragile tiles are excluded from the permanent-route
check. This establishes a structural route, not a guarantee that every hazard
combination is equally easy; human playtesting is still needed for balancing.

## Tournament rules

The lobby lists the upcoming courses. The server controls qualification,
collisions, tile collapse, finish order, and winners. With two players before
the final, survival falls respawn on a remaining safe platform. If no safe
platform remains, both advance. This keeps a friend duel going through the
selected number of rounds. Final survival falls eliminate players normally.

At the timer:

- Races rank by checkpoint, distance, then fewest falls.
- Hex survival ranks by highest layer, then fewest hits.
- Other survival rounds rank by fewest hits, then distance from the centre.
- Equal rankings use a stable player-ID ordering. The HUD shows the principal
  tiebreak in the last 15 seconds.

Arena-specific rules replace those tiebreaks. Sports allow 25 seconds of bounded
sudden death; an unresolved tied score produces a shared result. Simultaneous last
falls share the final result. Ribbons qualify current holders. Team arenas qualify
the winning team(s), which can end a small knockout early. Choose Grand Prix when
everyone should play the entire round count. Grand Prix race points descend
15, 13, 11… to a minimum of 1; team wins award 15 and other teams 5; individual
arena ties share placement points. Overall tied totals share victory.

Generate a diagram of the actual course data with `npm run preview-courses`.
These diagrams are for inspecting layouts; they are not gameplay screenshots.

## Project layout

- `server.js`: Express static server, Socket.IO gateway, origin checks, rate limits, reconnect grace, health endpoint, and fixed-rate simulation loop.
- `server/tournament.js`: private-room lifecycle, knockout/Grand Prix/practice transitions, qualification, results, and final crown rules.
- `server/objective-round.js`: authoritative arena scoring, ownership, hazards, timeout and tie resolution.
- `shared/arenas.js`, `shared/objectives.js`, `shared/presets.js`: reusable arena data, rule registry and ordered reference-inspired templates.
- `shared/content.js`, `server/map-manifests.js`: content versions, structural fingerprints, public manifests and private puzzle truth.
- `shared/protocol.js`: fixed-size binary player rows and compact objective/environment snapshots.
- `server/validation.js`: bounded names, colors, settings, and input packets.
- `shared/maps.js`: seeded course and arena generation and obstacle transforms.
- `shared/course-catalog.js`: course recipes and obstacle pools.
- `shared/map-validation.js`: geometry, spawn, checkpoint, and route checks.
- `shared/physics.js`: shared cannon-es bodies and server-authoritative movement, dive, collision, falling, see-saw, and disappearing-tile behavior.
- `client/scene.js`: low-poly Three.js renderer, bean models, obstacle animation, follow camera, and theme rendering.
- `client/arena-view.js`, `client/scenery.js`, `client/batching.js`: objective visuals, theme scenery and instanced draw batching.
- `client/client.js`: room UI, Socket.IO sync, client prediction, reconciliation, scoreboard, and round HUD.
- `client/netcode.js`: bounded remote interpolation, brief extrapolation, and local fixed-tick render interpolation.
- `scripts/generate-map.js`: deterministic map JSON export.
- `scripts/benchmark.js`: 30-player physics smoke benchmark.

## Checks

```bash
npm test
npm run check-maps
npm run build
npm run benchmark
npm run benchmark-release
```

The tests cover deterministic routes, moving hazards, controller regressions, scene transforms, real Socket.IO movement/reconnect, arena ownership/scoring, host controls and repeated tournaments. Scene tests use a recording renderer; they do not validate GPU output. `check-maps` validates 5,000 maps across 1,000 seeds. Structural checks do not prove every temporal hazard combination or human playability. The release benchmark measures local server cost and encoded traffic at 16/24/30 players; it does not measure browser FPS or Render capacity. See [measurement details](docs/PERFORMANCE.md).

## Networking and hosting notes

The client sends inputs, never authoritative poses. The server clamps movement, rate-limits packets, keeps a 30-second reconnect slot, simulates at 60 Hz and emits compact snapshots at 15 Hz. Protocol 2 rejects incompatible clients with a reload message. Map/roster and environmental changes are reliable; unchanged frame updates may be volatile. Socket.IO uses WebSocket upgrades with long-polling fallback. `/healthz` reports room count, connections, simulation time, and dropped simulation time for a process monitor.

For more than one server process, add a Socket.IO compatible adapter and shared room/session storage before introducing a load balancer. The included process is intentionally self-contained for a single public server or a small friend group.

## Design reference

[Fall Guys level catalogue](https://fallguysdb.com/levels/), reviewed on 5 October 2026. The catalogue is incomplete and many entries have no mechanic descriptions; the implementation also uses the obstacle requirements supplied for this project.

[LOLBeans](https://lolbeans.io/) and its [official level-design guidance](https://editor-ldg.lolbeans.io/) informed camera options, clear round feedback, safe checkpoints, short falls, and varied challenges. Rumble Run retains its own code, art, and generated layouts.
