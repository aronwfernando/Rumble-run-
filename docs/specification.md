# Browser Party Game — Completion Master Prompt

Prepared 6 October 2026. Give this entire document to the coding agent working inside the existing game repository. The repository has not been supplied for this prompt-writing task; nothing below claims to describe its actual implementation.

This is a comprehensive implementation specification based on the supplied checklist, not a verified inventory of every historical asset, event, map variation, or current feature in two continually updated commercial games. The appendix preserves the complete supplied checklist. Numbers introduced in the specification are proposed defaults or test targets for this project, not measurements of Fall Guys or Stumble Guys. Where source claims are uncertain, verify them instead of inventing details.

---

## BEGIN IMPLEMENTATION PROMPT

You are the senior gameplay engineer, multiplayer engineer, technical designer, UI engineer, procedural-generation engineer, and QA lead responsible for completing an EXISTING lightweight browser multiplayer obstacle-party game. A substantial part already exists. Work in the current repository, inspect what is built, preserve working systems, repair incomplete integrations, and finish a cohesive playable product. Do not replace the project with an unrelated starter, deliver only a design document, or call a set of disconnected demos a complete game.

### 1. Product goal and reference fidelity

Build a responsive, funny, competitive, third-person obstacle game with the gameplay breadth of Fall Guys and Stumble Guys. Players race, survive, solve puzzles, compete in teams, collect objects, use optional abilities, qualify across rounds, spectate after elimination, and reach a final winner. The authoritative multiplayer server will run on Render. Players join through a browser without installing a native game.

**Copy/recreate the reference maps' gameplay mechanics, obstacle behaviours, objective rules, and recognisable course structure in lightweight playable reference presets.** Study the maps in these references:

- https://fallguysdb.com/levels/
- https://www.thegamer.com/fall-guys-ultimate-knockout-map-minigame-ranked/
- The entire supplied feature checklist reproduced in Appendix A.

Use independently implemented code and original names, characters, geometry assets, textures, UI, music, and sounds. Reference names in development documentation identify the mechanic being recreated. Do not download commercial game assets or represent this project as an official game. Maintain a reference-to-project mapping table so fidelity is reviewable.

Ship two content paths using the SAME obstacle and rule systems:

1. **Reference presets:** authored courses faithfully reproducing the references' mechanical sequence and challenge structure. Where exact geometry is unavailable, document the approximation rather than pretending it is exact.
2. **Procedural courses:** genuinely new layouts assembled from those reusable obstacles, with altered routes, dimensions within safe ranges, rhythms, combinations, objectives where compatible, and independent visual themes. A recolour alone does not count as a new level.

The game should feel complete even before every expansion mode is enabled: real menus, onboarding, lobbies, countdowns, round transitions, checkpoints, death/elimination UI, spectating, results, rewards, settings, reconnection, and error recovery are mandatory. Nevertheless, every requested feature below and in Appendix A must appear in the coverage ledger. Do not silently discard advanced features to simplify the task.

### 2. Inspect first; preserve the existing project

Before editing, inspect repository instructions, package manifests, lockfiles, client and server entry points, networking protocol, renderer, physics/controller, obstacles, map format, UI, persistence, assets, tests, deployment configuration, and current build scripts.

Create a feature coverage ledger with these columns: stable requirement ID; reference family; proposed behaviour; existing implementation path; status (complete, partial, missing, broken, blocked); dependency; implementation phase; acceptance check; evidence. Break composite requirements into separately checkable entries. Trace EVERY Appendix A bullet or table row to an entry or explicit merged equivalent; preserve the original reference label.

Run the existing build and relevant checks. Record baseline failures, gameplay bugs, bundle size, load time, representative frame time, server tick cost, and network usage where measurement is possible. If no runnable environment or hardware is available, say so and provide a reproducible measurement script; never fabricate results.

Keep the existing stack when it can meet the requirements. Introduce dependencies only for a demonstrated missing capability. If there is no adequate stack, propose a small browser 3D renderer, lightweight capsule controller, shared gameplay definitions, and a Node/TypeScript authoritative server; choose specific libraries only after checking repository compatibility and current official documentation. Do not load an entire physics engine merely to animate predictable sweepers.

Use incremental changes and preserve saved accounts, identifiers, routes, and map data. Supply versioned migrations and rollback steps for schema changes. Do not make destructive resets to conceal integration problems.

### 3. Scope, implementation phases, and honest completion

Implement in dependency order, continuing through phases while resources permit:

- **P0 — Existing build recovery:** reproducible setup; fix broken navigation, movement, networking, collision, round termination, and obvious performance failures.
- **P1 — Complete match loop:** home → queue/private lobby → loading/instructions → countdown → race/survival/final → qualification/elimination → spectate → next round/winner → results/rewards → replay/home. Include reconnect and failures.
- **P2 — Reusable content and generation:** obstacle registry, reference presets, deterministic generator, themes, validation, seed replay, bot navigation, and content selection.
- **P3 — Full competitive/social/progression product:** teams, parties, profiles, cosmetics, challenges, ranks, events, clubs, moderation, persistent rewards, editor and discovery.
- **P4 — Extended mechanics:** all remaining abilities, asymmetric rounds, sports, vehicles, shooting, prop hunt, dungeon/enemy modes, special transformations, and optional integrations.

These phases are sequencing, not permission to omit scope. Maintain explicit remaining work. A blocked payment, voice, advertising, identity-provider, or licensed-content integration must be labelled as blocked or disabled; a mock or hidden placeholder is not a completed integration. Complete all implementable work before reporting blockers. Do not expose nonfunctional buttons as working features.

### 4. Lightweight performance contract

“Any computer” means broad compatibility with a documented minimum, not a promise that obsolete or graphics-disabled devices can run 3D. Detect capabilities and present an understandable unsupported-browser message with retry/help when rendering cannot initialise.

Proposed LOW preset acceptance targets, to measure and tune against a named reference device:

| Area | Initial target | Measurement rule |
|---|---|---|
| Reference client | 4 GB system RAM, older integrated graphics, supported browser with WebGL 2 | Record exact CPU/GPU/OS/browser; do not infer support from RAM alone |
| Client frame rate | Sustained 30 FPS low preset at 1280×720; pursue 60 FPS on stronger hardware | Report median and p95 frame time during 16-player and 32-player stress scenes |
| Initial transfer | ≤8 MB compressed before first playable scene | Include engine, scripts, required model/texture/audio payloads; separate cache hits |
| First match assets | ≤15 MB compressed cumulative first-match download | Lazy-load later themes and advanced modes |
| Memory | Aim ≤350 MB observed tab working footprint during normal low-preset play | Browser/process memory estimates have limitations; record method |
| Rendering | Aim ≤100 draw calls and ≤100k visible triangles in low preset | Profile peak crowd/hazard scenes; budget exceptions explicitly |
| Simulation | Start with fixed 30 Hz server tick and 10–15 Hz snapshots | Independent of client render FPS; tune from collision and load measurements |
| Network | Aim ≤40 KB/s average downlink and ≤10 KB/s uplink per active player | Include protocol overhead; document spikes and snapshot size |
| Match size | 16-player reliable baseline, configurable 24/32-player target | Do not advertise 32 until tested on chosen hosting hardware |
| Server headroom | Room p95 tick work below half its tick interval at supported room count | Load-test simultaneous rooms and bots; apply admission control |

Use low-poly characters, shared meshes/materials, texture atlases, instancing, pooled effects/projectiles, frustum culling, limited lights, cheap shadows or blob shadows, distance animation throttling, and bounded particle counts. Avoid real-time reflections, expensive postprocessing, cloth, and full skeletal ragdolls in the baseline. A compact stumble animation plus authoritative knockback is sufficient.

LOW/MEDIUM/HIGH presets change visuals only. Never remove collision hazards, change timing, shrink danger zones, or change player hitboxes by quality level. Use dynamic render resolution and capped device pixel ratio, with hysteresis to avoid oscillation. Cap physics bodies and effect lifetimes. Release GPU resources, audio nodes, event listeners, workers, and room subscriptions on transitions. Load heavier mode bundles only when selected. Provide explicit frame-rate caps and reduced effects.

Support keyboard/mouse, standard controllers where the browser provides them, and touch layouts if feasible in the existing responsive UI. Test Chromium, Firefox, and Safari on actual accessible targets; clearly distinguish tested from intended support.

### 5. Player controller and interaction specification

All gameplay parameters live in shared versioned data with server authority. Establish units and derive jump reach from actual controller simulation. Starting tuning suggestions: 6 units/s run speed, 18 units/s² gravity, 7 units/s jump impulse, approximately 100 ms coyote time and 120 ms input buffering. These are project defaults to test, not reference-game values. Do not hardcode them throughout the codebase.

| Mechanic | Required implementation and edge cases |
|---|---|
| Running | Camera-relative planar input, normalised diagonals, acceleration/deceleration, slope limits, predictable braking, no faster diagonal movement |
| Turning | Decouple camera yaw from character facing; smooth visual turn while collision follows authoritative motion |
| Jump | Ground eligibility, buffered press, short coyote window, ceiling collision and landing; jumping must not become stronger at higher FPS |
| Air control | Limited horizontal steering and momentum retention; no infinite acceleration or mid-air direction teleport |
| Dive | Forward airborne/ground lunge with defined impulse and recovery; consume one airborne dive until landing; reject spam |
| Jump-dive | Combine jump arc and a later dive to increase reach; provide explicit dive binding plus optional airborne second-jump mapping |
| Sliding | Surface-tagged downhill/slime/water motion with friction and slope acceleration; steer within limits and preserve momentum on exit |
| Ice/mud | Ice lowers braking friction; mud reduces speed; visual material and UI cues identify the modifier |
| Moving ground | Ride platform translation and angular motion; inherit bounded takeoff velocity; handle edges without jitter or double-applying motion |
| Collision | Capsule or equivalent simple player shape, ground snapping, step handling, swept contacts for fast hazards, no tunnelling |
| Body blocking | Soft, bounded player separation and limited push impulse; cap crowd pileups and prevent permanent door jams |
| Knockback | Direction, impulse, resistance, stun/recovery interval and post-hit protection defined per source; do not let a hit trigger every frame |
| Stumble/ragdoll | Authoritative incapacitated state; cheap visual tumble; regain control after timeout or valid settling, never remain stuck indefinitely |
| Player grab | Server-validated range, facing and line of sight; bounded duration, escape/release, cooldown; restrict while stunned or carrying incompatible items |
| Ledge grab | Detect eligible tagged edges with free mantle volume; explicit or assist setting; hanging timeout, release, mantle arc and obstruction checks |
| Dive-grab | Define compatible interactions, such as a tail/object/crown; validate target and contact during dive without extending reach arbitrarily |
| Carry/release/throw | Single authoritative object owner, socket offset, optional movement penalty, aim/charge, ballistic release, interruption and dropped-object recovery |
| Trapeze | Attach to authored grip point; lightweight swing constraint or bounded pendulum; release with tangential velocity and regrab cooldown |
| Piggyback | Request/accept consent, visible carrier/passenger state, safe dismount, one passenger limit, no chains, restrictions for competitive modes |
| Emotes/taunts | Separate cosmetic actions from abilities; bounded animation, cancellable on movement/hit, no misleading invulnerability |
| Bounce/launch | Configured direction and impulse; consistent apex, contact cooldown and optional steering; don't accidentally multiply impulses on repeated contacts |
| Low gravity | Server-tagged volume changes gravity/jump behaviour with clear entry/exit; define overlap priority and reset on respawn |
| Teleport/pipe | Valid entry conditions, short transport state, clear destination, occupancy handling, camera transition and exit cooldown |
| Vehicle/shooter forms | Explicit controller state switch and HUD; reset inputs on transitions and restore normal controller on exit |

Use mutually controlled states: spawning, grounded, airborne, diving, sliding, grabbing, hanging, mantling, carrying, riding, stunned, transformed, respawning, qualified, eliminated, spectating. Define legal transitions, priority, interrupt behaviour and reset semantics. Prefer orthogonal status flags for compatible effects rather than an unmanageable state for every combination.

Camera: orbit with collision avoidance, adjustable sensitivity/inversion, gentle follow, reset-camera action, optional shake, no view through solid walls that gives an unintended advantage. Avoid snapping on small prediction corrections. Pause/settings overlays must release pointer lock and stop sending stuck movement inputs; an online match continues while menus are open.

### 6. Reusable obstacle registry

Every obstacle is a registered prefab with stable ID, schema version, simple server collider, cheap client visual, input/output connection sockets, bounds including its entire swept volume, difficulty range, resource cost, supported modes, reset policy, and navigation affordances.

Universal lifecycle: initialise → idle/telegraph → active → recovery → repeat or retired. Specify which states apply instead of forcing a windup onto permanently moving obstacles. Store speed, phase, period, amplitude, dimensions, direction, impulse, damage/elimination rule, surface type, occupancy, and activation dependencies as appropriate. Every lethal obstacle needs readable warning and an avoidance opportunity at the intended difficulty.

| Obstacle family | Behaviour, configuration, and mandatory validation |
|---|---|
| Static platforms, beams, ramps, stairs | Walkable geometry, slope/step limits, ledge tagging, edge clearance and camera space; visual silhouette matches collision |
| Rotating discs | Spin around a fixed axis; tangential surface motion affects riders; direction and speed configurable; avoid centre singularities |
| Rotating cylinders/rings | Curved terrain with gaps and protrusions; surface contact/normal updates as it rotates; crossing between rings must be possible |
| Conveyors | Add a directional surface velocity, independent of material friction; entering/exiting doesn't permanently alter base speed |
| Moving platforms | Path with endpoints, easing, dwell and phase; prevent teleport at loop boundary; include rider motion and swept bounds |
| Seesaws/tilting boards | Aggregate occupied positions into bounded tilt with damping; clamp angle and recovery; provide anti-stall behaviour and viable routes |
| Collapsing tiles | First valid contact starts warning timer, then removes collision; persist destruction for round or regenerate under explicit rules |
| Multi-layer tile floors | Stacked collapsing layers with safe vertical spacing; landing on a lower layer works; final layer leads to elimination |
| Breakable ice | Per-tile durability/contact thresholds, visual cracks per damage stage, destruction and no client-side score decisions |
| Regenerating floors | Removed tiles return only after delay with warning; never materialise inside a player without safe resolution |
| Falling arena segments | Scheduled segment removal with visible warning; retain reachable safe terrain until designed endgame |
| Pendulums, swinging balls/axes | Bounded periodic arc, sweep collision, momentum-directed impulse, phase synchronisation; server geometry independent of cosmetic chain |
| Rotating hammers | Rotating impact head with timed contact response; distinguish useful launch from harmful knockback in metadata |
| Sweepers/jump bars | Rotating low beam to jump and optional higher beam preventing careless jumps; speed ramp, height and phase produce valid dodge windows |
| Pistons/punching gloves | Windup, extension, impact, retract and rest phases; active face pushes; do not crush players through geometry accidentally |
| Sliding walls/gates | Open/closed paths with dwell; minimum passable interval; resolve doorway occupancy; no invisible closed-wall state |
| Fake/breakable doors | Seeded real/fake choices with at least one valid exit per row; reveal after hit; reset only between rounds |
| Block waves | Generate rows with walk/jump openings, optional breakable sections and spacing; validate consecutive waves, not just each row in isolation |
| Jump ropes | Sweeping obstacle on a path with clearly marked timing; ensure ground-level crossing can be jumped within measured arc |
| Pinball bumpers | Contact impulse away from centre/normal, trigger cooldown and limited stacking; optional spring animation |
| Flippers | Activation by timer/contact, rotate through arc and launch players; predictable impulse and visible ready state |
| Trampolines/lily pads/drums | Bounce strength per surface; small/large variants, repeated bounce damping or combo rules; make landing areas reachable |
| Fans/wind volumes | Directional acceleration within cone/box, falloff and cap; tagged vertical lifts or lateral pushes; control must remain interpretable |
| Speed arches/boost strips | Temporary capped speed multiplier or impulse; duration and overlap policy; visual trail with low-preset fallback |
| Slime/water slides | Surface friction and steering on shaped track; guardrails where intended; checkpoints reset momentum safely |
| Ice/mud zones | Tagged friction/speed behaviour; boundaries match appearance; terrain effects do not persist after exit |
| Gravity zones | Transition volume with gravity scale and effect priority; route validation simulates inside and outside separately |
| Cannons/fruit/debris | Server-seeded firing schedule, spawn telegraph, projectile pool, trajectory and expiry; bound simultaneous projectiles |
| Rolling snowballs/boulders | Simplified sphere dynamics or authored paths; collide with players, reset if out of bounds, avoid endless accumulated bodies |
| Water balloons/bombs | Ballistic travel, landing or timer detonation, radius, knockback/status and clear warning; pool and clean up effects |
| Explosive balls | Pickup, fuse, throw, warning flash and radial impulse; one owner, authoritative detonation and safe spawn/reset |
| Laser beams/walls/rings | Visible warning, sweep velocity, exact lethal volume and optional jumpable gaps; thick enough collision at target tick rate |
| Rising slime/lava/acid/water | Monotonic height curve with start delay; lethal or respawn policy explicit; validate ascent speed and avoid unmarked kill plane |
| Moving/shrinking safe zone | Server-controlled boundary with telegraph and staged size; define outside grace/damage/elimination consistently |
| Hoverboard/vehicle platforms | Rideable moving base; progression triggers, dismount sections, catch-up rules and finish condition tied to mode |
| Sinking/floating terrain | Occupancy/time-based displacement, buoyancy-style visual or cheap curve; limits, reset and safe timing |
| Chasing creatures | Finite-state wander/telegraph/charge/recover AI; navigation bounds, target switching, line of sight and anti-permanent-chase rule |
| Kraken/tentacle/reactive attacks | Attack marked tiles or trigger conditions; windup, strike and retreat; never attack a tile with no feasible escape unless intentional endgame |
| Buttons/pressure plates | Debounced trigger, occupancy accounting, cooldown, active/inactive appearance and connection graph; reject cyclic runaway activation |
| Switchable bridges/walls | Change collision only at scheduled authoritative state; warning and safe occupancy handling; solvable switch dependencies |
| Pipes/portals | Paired endpoint IDs, travel delay and safe destination; validate no unintended infinite loop or bypass of finish checkpoints |
| Trapezes/grip rails | Tagged anchors, bounded motion and valid release zone; broad clearance for player capsule |
| Movable blocks/balls | Mass, push force, friction, grab flags, restitution and sleeping; reset out-of-bounds objects needed for completion |
| Destructible/scoring objects | Health/hit count and permitted damage source; score once on destruction, optional respawn, no repeated award on duplicate packets |
| Hoops/collectibles | Directional trigger if needed, point value, claim policy and respawn; shared vs per-player collection explicit |
| Score/possession zones | Continuous fixed-tick score while conditions hold; distinguish location scoring from holding a physical object |
| Hidden path/memory tiles | Server-owned truth, reveal schedule, correct answer and fall state; validation guarantees a solution and sufficient answer time |
| Traffic obstacles | Lanes, direction, speed, spawn timing and despawn boundaries; predictable warning and crossable windows |
| Checkpoint/finish/kill volumes | Server trigger validation, ordered route progress, one-time qualification and unambiguous respawn vs elimination behaviour |

Store obstacle definitions in data, not bespoke code for each map. Composite obstacles can combine prefabs, but declare their combined swept bounds, costs, timing constraints and reset rules.

### 7. Round objectives and scoring

Implement objective strategies separate from maps. Each strategy declares eligibility, start/reset, score events, HUD, timeout, qualification, tie resolution, overtime, disconnect handling and end condition. Match termination must be idempotent.

| Objective | Required rules |
|---|---|
| Finish-line race | Server verifies ordered progress/checkpoints and finish crossing; earliest valid finishers fill a configured quota; timeout resolves unfinished players consistently |
| Lap race | Ordered lap gates, direction validation, lap counter, last-lap feedback; crossing finish backwards or skipping gates cannot earn a lap |
| Rising-hazard ascent | Reach finish ahead of lethal rising floor; falling may eliminate instead of respawn; explain this difference before start |
| Timed survival | Stay alive to timeout or target survivor count; count eliminations server-side; settle simultaneous deaths using a documented policy |
| Last-player-standing | Exactly one winner when possible; same-tick tie uses shared victory or explicit tiebreak rules, never arbitrary client arrival order |
| Disappearing-floor final | Tile consumption creates positional strategy across layers; final living player wins; handle all-dead same tick |
| Hidden path | Discover connected safe tiles and reach finish; false tiles drop; server knows truth, clients see only appropriate reveals |
| Door maze | Interconnected rooms and fake/real doors; no inaccessible goal; anti-softlock escape if movable props block sole route |
| Memory/counting | Show symbols or objects, hide/reveal answer, give movement interval, remove incorrect tiles; accessible symbols accompany colours |
| Route puzzle | Follow visible logical connections; avoid ambiguous intersections; correct route remains derivable from displayed information |
| Pattern painting | Compare team-claimed floor pattern to target; score only when exact rule satisfied; permit correcting unwanted tiles |
| Hoops/collectibles | Contact or pass-through awards configured points; unique event ID prevents duplicate claim; rare items visibly distinguishable |
| Possession | Holding designated object accrues time/points; transfer on valid grab/drop; recovery if object leaves arena |
| Moving zone | Score by remaining inside zone; it is not the same as item possession; handle simultaneous occupants and overlap rules |
| Tail tag | Transfer tail on validated interaction; winner/qualifiers determined by possession at end or stated cumulative rule |
| Buttons | Only active buttons award points; relocate/activate new target after award; contested same-tick contacts follow server rule |
| Football | Team ball interaction, valid goal volume, kickoff/reset, own goals, timer and sudden-death overtime |
| Basketball | Carry/throw ball into opponent basket; directional goal crossing and score value; prevent repeated scoring while ball remains in hoop |
| Volleyball | Ball touching team's floor concedes point; serve, boundary/fault handling and reset; team assignment is stable |
| Egg collection | Carry objects into nests; score from current nest occupancy, not repeated entry; allow stealing according to rules |
| Ball hoarding | Score count of balls in team territory at specified time; boundary ownership and overtime for lowest-team ties |
| Ball pushing | Team moves heavy shared object along route; valid team finish trigger, progress and anti-stuck reset |
| Snowball growth | Roll over consumable snow patches to grow score/size; patches consumed once or respawn explicitly; size changes bounded |
| Territory/battery | Carried battery paints tiles while valid; opposing repaint allowed; score from owned tiles at cutoff |
| Infection | Designated infected players transmit by valid grab; team eliminates when all infected; seeded fair initial assignments |
| Crown capture | Physical goal object requires valid touch/grab as specified; server decides winner; animated crown path matches collider |
| Destruction/sorting | Hit or deliver correct objects; define invalid-object penalty, team ownership, score and respawn schedule |
| Thieves/guardians | Asymmetric teams, stealth-speed rule, steal/deliver targets, captures, jail, rescue switch and team win conditions |
| Grand Prix | Placement points accumulated across configurable rounds, standings between rounds, ties resolved with declared criteria |
| Team survival/revival | Shared team score/lives and explicit revive action, duration, interruption, limit and safe return; not every survival mode permits revives |

Never reuse one vague “score” field for lap count, rank, currency and qualification. Maintain typed rule data and server-owned event logs.

### 8. Reference preset catalogue

The named maps below are reference targets, not a claim of a complete live map rotation. Build mechanical recreations using the registered modules. For each preset supply a short design sheet: start layout, obstacle sequence, alternate routes, objective, checkpoints, elimination policy, end condition, difficulty, supported player counts, cost, and test seed. Use original public-facing titles.

**Initial Fall Guys reference set from the requested database:**

| Reference | Mechanical layout to reproduce |
|---|---|
| Dizzy Heights | Multi-section race over rotating discs with connecting paths and rolling projectile pressure; moving-floor handling is central |
| Door Dash | Sequential rows of apparently similar doors, only some passable, narrowing into a crowded finish approach |
| Fruit Chute | Uphill conveyor climb against descending projectiles; route choice trades exposure against direct distance |
| Gate Crash | Repeated opening/closing gates and a timed final approach; readable cycles reward timing |
| Hit Parade | Narrow approach/balance sections, push-through barriers, swinging hazards and a crowded uphill finish |
| See Saw | Chains of crowd-weighted tilting platforms; route selection and group distribution determine safe crossings |
| Slime Climb | Vertical zigzag ascent with pushers, narrow crossings and rising lethal floor; preserve elimination pressure |
| The Whirlygig | Running/jumping race through rotating sweepers/fans, launch opportunities and safer alternate paths |
| Tip Toe | Hidden connected route across real/falling tiles; discovery and crowd pressure before the finish |
| Block Party | Survival on bounded platform while walls with openings sweep across; sequence openings into viable movement |
| Jump Club | Circular arena with rotating beams and jump timing; survive the scheduled duration |
| Perfect Match | Memorise tile symbols, observe answer, move to safe matching tiles before others disappear |
| Roll Out | Adjacent rotating cylinders/rings with gaps and obstacles; move between bands to remain supported |
| Tail Tag | Multi-level chase arena with transferable tails; possession at cutoff governs qualification |
| Egg Scramble | Three-team object gathering and theft with accessible nests and central supply |
| Fall Ball | Two-team football arena with shared physics ball, goals and round timer |
| Hoarders | Three connected team territories; push balls into own region and retain them until scoring cutoff |
| Hoopsie Daisy | Team arena with scoring hoops at varied heights and access routes |
| Jinxed | Two-team pursuit/infection arena with initially infected players and server-validated tag spread |
| Rock ’n’ Roll | Parallel team lanes, heavy ball pushing, obstacle descent and shared final contest space |
| Team Tail Tag | Team possession totals from distributed tails in a chase arena |
| Fall Mountain | Short uphill final, projectile and rotating-hazard pressure, physical crown capture at summit |
| Hex-A-Gone | Multiple layers of contact-triggered disappearing tiles; final survivor wins |
| Jump Showdown | Beam timing final on an arena whose floor sections progressively disappear |
| Royal Fumble | Single-tail chase final; possession at timer end determines winner |

This table is a project implementation interpretation; obtain additional primary visual/gameplay references before claiming exact map fidelity. The database itself has placeholder descriptions.

**Further reference families in the supplied checklist:** Short Circuit (lap race); The Slimescraper (rising-hazard ascent); Roll Off (rotating final); Thin Ice (layered breakable floor); Hex-A-Ring (rotating disappearing floor); Hoverboard Heroes (moving platform journey); Stompin’ Ground (telegraphed charging enemies); Kraken Slam (reactive arena attacks); Blast Ball (throwable explosives); Lost Temple (door maze with crown objective); Sum Fruit (count then choose); Puzzle Path (trace a route); Pixel Painters (reproduce patterns); Hoopsie Legends and Ski Fall (hoop scoring); Bubble Trouble (collectibles); Pegwin Pool Party/Pegwin Pursuit (object possession); Airtime/Leading Light (zone-time scoring); Button Bashers/Frantic Factory (active-button competition); Basketfall/Volleyfall (sports); Egg Siege (nest theft with more route structure); Snowy Scrap (growth objective); Power Trip (tile territory); Tip Toe Finale (team path discovery/crown); Sweet Thieves/Treat Thieves (asymmetric capture/rescue). Implement each distinct mechanic, then author an appropriate mechanically faithful preset rather than only renaming a generic race.

**Stumble Guys reference families:** sliding and water-course races; hammer/pusher races; low-gravity races; disappearing-tile survival; moving block-wave arenas with normal, hard/Legendary and endless configurations; laser sweep/ring survival; cannon/bomb arenas; traffic/platform survival; rising-hazard and sinking-platform rounds; team collection; vehicle races; shooter arenas; prop hunt; dungeon/class encounters; special-power robot encounters; football; and team revival variants. Reconcile the official map catalogue with the attachment and add individually verified map-to-preset rows. Do not fabricate a complete map list from names guessed from memory. All families require playable implementations even when a specific commercial map description is unavailable.

### 9. Procedural generation: an actual constrained algorithm

Do not scatter obstacles randomly. Generate a constrained route graph, instantiate compatible modules, validate space AND time, test traversability, select a mechanically different variant, then dress it with a visual theme.

#### 9.1 Inputs and versioned data

`GenerationRequest`: seed, generatorVersion, rulesVersion, obstacleCatalogVersion, mode, playerCount, skillBand, difficultyCurve, targetDuration, maxWorldBounds, resourceBudget, allowedObstacleTags, disabledAbilities, enabledMovementProfile, themePool, recentLayoutFingerprints and optional fixedReferenceTemplate.

`ModuleDefinition`: ID/version, entry and exit sockets (position, direction, width, elevation, allowed traversal), bounding volume, swept hazard bounds, surface tags, clearance, safe waiting zones, checkpoint candidates, difficulty vector (precision/timing/crowd/navigation), traversalTimeRange, allowed parameter ranges, moving-cycle metadata, dependency graph, renderer/physics/network cost and bot traversal actions.

`LevelManifest`: canonical modules/transforms/parameters, route graph, start slots, checkpoints, hazards, objectives, camera intro points, server secret choices, public visual data, theme ID, hashes and measured validation report. Hidden path truth and fake-door solutions stay server-side until legitimately revealed. A public seed must not expose competitive puzzle answers: derive a separate server-only secret seed or send only the resolved public manifest.

#### 9.2 Generation steps

1. Normalise request and validate capabilities. Match player count to start width, safe-zone capacity, obstacle density and qualifying quota. Select only modules playable without disabled abilities.
2. Use a seeded, version-pinned PRNG with stable iteration order. Split independent streams for layout, obstacle parameters, theme and server-secret puzzle choices; changing decorations must not change the route.
3. Choose a grammar by objective. Race grammar: start → introduction → skill section → recovery/checkpoint → combination section → optional branch/rejoin → climax → finish. Survival grammar: arena scaffold → safe-space allocation → validated hazard schedule → escalation → resolution. Team grammar: symmetric or equivalent spawn/goal regions → shared contest space → reset locations.
4. Sample a connected route graph. Include a conservative base route and optional faster risky routes. Every legal branch reconnects or reaches a valid objective. For laps, create a loop and ordered gates. Do not put an ordinary finish line in a pure survival arena.
5. Select module sequences with weighted variety, bounded difficulty transitions and anti-repetition. Avoid three consecutive identical skills unless the chosen challenge intentionally trains them. Assign recovery space after disruptive launches.
6. Solve socket placement and transform constraints. Use coarse spatial occupancy plus exact/simple collision tests. Expand bounds for moving hazards, player capsule, jumps, camera and waiting areas. Reject intersections and unreachable height changes.
7. Compute feasible traversal envelopes from the real controller. Test jumps/dives under configured gravity, slope, friction, platform velocity and landing width. Include a safety margin for novice routes; don't use distance-only guesses for ballistic reach.
8. Validate hazard timing with time-expanded graph search or sampled simulation. Nodes include location and cycle phase; edges include wait/move/jump/dive. The horizon must cover relevant cycles or a bounded approximation with stated limits. Individually passable gates can still be impossible in sequence.
9. Place checkpoints after major sections at stable, hazard-free spawn pads. Validate return paths, orientation and crowd capacity. Do not insert respawns into elimination modes without an explicit rule.
10. Generate hidden paths, doors and switch logic with guaranteed solutions; validate there is no key/switch dependency cycle that prevents progress. Match puzzle information shown to the answer space.
11. For survival, evaluate escape corridors and time-to-contact at every scheduled wave, starting from plausible player positions. Bound unavoidable traps and escalating hazard density. Distinguish deliberate final pressure from immediate random deaths.
12. Simulate multiple bot policies, spawn positions and timing offsets, including conservative, median and aggressive routes. Bots provide evidence, not proof of universal human solvability. Apply crowd stress tests for bottlenecks and seesaw stalls.
13. Compute difficulty, completion-time, fairness and resource metrics. Reject levels with unreasonably strong spawn advantage, inaccessible collectibles, too few scoring opportunities, impossible timeout, excessive physics cost or dangerous checkpoint spawns.
14. Fingerprint topology, module order, parameter buckets and objective. Separately fingerprint theme. Compare structural distance to recent maps. Reject near duplicates even if colours differ. Store bounded history per playlist/party and handle exhausted candidate space.
15. Apply theme to a valid layout using semantic material slots, decorations, lighting, skybox and music. Cosmetic dressing must not alter collision or obscure threats. If a theme intentionally changes friction/gravity, it is a gameplay modifier requiring revalidation.
16. Commit the accepted canonical manifest and content hash. Broadcast public manifest/version/hash; clients confirm compatibility. Server owns all random results and moving phases. Mismatching clients resync or receive a clear version error.
17. If attempts or time budget expire, use a prevalidated fallback matching mode, capacity and movement profile. Never start an invalid generated course or block the lobby indefinitely.

#### 9.3 Pseudocode

```text
generateLevel(request):
    req = validateAndNormalise(request)
    streams = splitSeed(req.seed, req.generatorVersion)
    for attempt in 0 .. MAX_ATTEMPTS-1:
        graph = sampleObjectiveGrammar(req, streams.layout.fork(attempt))
        modules = selectCompatibleModules(graph, req)
        layout = solveSocketsAndBounds(graph, modules, req)
        if layout.failed: continue
        layout = configureHazardSchedules(layout, req, streams.hazards.fork(attempt))
        if not staticClearanceAndReachability(layout, req): continue
        if not temporalReachabilityAndEscape(layout, req): continue
        if not objectiveAndCheckpointValidation(layout, req): continue
        metrics = runBoundedBotAndCrowdChecks(layout, req)
        if not withinFairnessDifficultyAndCostBudgets(metrics, req): continue
        fingerprint = structuralFingerprint(layout)
        if tooSimilar(fingerprint, req.recentLayoutFingerprints): continue
        theme = chooseCompatibleTheme(req, streams.theme.fork(attempt))
        manifest = applyCosmeticThemeAndCanonicalise(layout, theme)
        if not finalVisibilityAndManifestValidation(manifest): continue
        return persistValidatedManifest(manifest, metrics)
    return getCompatibleValidatedFallback(req)
```

Starting bounds: 50 candidate attempts and a short worker-time budget for live selection; tune with measurement. Generate/validate course pools ahead of matches in a worker or offline build step, never perform expensive simulation in the active room tick. Runtime still checks schema/version/hash before using a cached course.

#### 9.4 Theme system and variation

Create at least eight cheap, distinct original themes: toy workshop, jungle canopy, frozen docks, desert ruins, neon factory, candy carnival, pirate islands and orbital station. Each maps semantic slots such as safe floor, moving platform, danger, bounce, slippery, checkpoint and finish to readable colours/materials/shapes. Use shared geometry and atlases. Choose one coherent palette and silhouette language per map.

Vary sky/background, distant set dressing, low-cost lighting, decoration placement outside collision, ambient audio, obstacle skins, checkpoint/finish dressing and HUD accent. Keep function legible across all themes: a bounce pad still looks bouncy and lethal surfaces remain unmistakable. Colourblind patterns and icons cannot depend solely on red/green contrast.

Provide at least three example generated manifests from the SAME seed family with different route decisions, not just new themes, plus a same-layout/different-theme pair demonstrating independent streams. Include a seed browser for development, regenerate/replay actions and validation-failure reasons. “Every match is different” means strong variety with repeat suppression; do not promise mathematical uniqueness forever in a finite catalogue.

### 10. Abilities, equipment and status effects

Implement two separate systems: level-supplied equipment/power-ups and optional owned/equipped ability loadouts. Cosmetic emotes never consume an ability slot. Support up to four equipped abilities and distinct bindings, with rules that can disable abilities entirely or restrict the pool. Ranked uses equalised configured strengths by default for this project; casual progression may unlock levels. This is an intentional project policy, not a claim that the reference games use it.

Every ability definition includes target mode, valid player states, cast/windup, active duration, cooldown, charges if any, range, arc/area, line-of-sight rule, impulse/status, interruption behaviour, server event IDs, animation/audio, low-preset effect, counters, mode restrictions and reset policy. Specify interaction tests against shield, immunity, carrying, ledges, death, respawn, other transformations and map objectives. Never trust client cooldowns or reported hits.

The following are proposed implementations of the supplied reference effects, with original project naming allowed:

| Reference ability/equipment | Detailed behaviour to implement |
|---|---|
| Banana | Toss short-lived slippery disruption projectile/trap; hit causes bounded stumble; remove after trigger or TTL |
| Block Throw | Throw simple solid projectile with capped impulse, bounce count and lifespan; cannot permanently block sole route |
| Bolt | Telegraph a directional bolt; validate sweep hit and apply short stun with repeat-hit protection |
| Bouncing Ball/Bean Ball | Temporary rolling form with modified controller, bounce and speed limits; restore capsule safely at expiry |
| Briefcase | Short-range strike that locks target abilities for a bounded interval; ordinary movement remains available |
| Chop | Frontal strike with squash visual and bounded stun/knockback; visual scaling does not unpredictably change collider |
| Dice Roll | Deploy a large rolling die-like physics object; capped size, lifetime and collision cost; no random economy rewards |
| Hat Hop | Place a temporary launch object; clear bounce direction, activation count and expiry; specify whether all players can use it |
| Hug | Timed player grapple with range checks, break/release and anti-chain immunity; no indefinite capture |
| Invisibility | Temporarily suppress opponent-visible character presentation; define visibility of held objects, trails and effects; retain self cue; visual concealment alone is not anti-cheat |
| Punch | Narrow frontal impulse attack, direction from validated facing, short windup and cooldown |
| Rake | Ground trap with placement clearance, trigger zone, warning/readability and one-use trip effect |
| Shield | Temporary protection with specified blocked effect categories; visible expiry; cannot imply protection against kill planes unless explicitly configured |
| Shutdown | Radius pulse suppresses nearby ability use temporarily; does not delete projectiles already in flight unless configured |
| Slap | Wider, shorter-range sweep than punch, with bounded knockback and one hit per target per activation |
| Slide | Ground slide attack that trips contacts; requires valid surface, stops at obstacles and cannot become repeated invulnerability |
| Snowball | Projectile with knockback and temporary slow; slow stacking capped and reset after duration |
| Speed Gel | Place a limited-length boost trail on valid ground; explicitly define ally/enemy use and no infinite speed stacking |
| Spin | Short radial attack state, bounded duration and per-target hit interval; movement multiplier declared |
| Spit | Place a temporary slow patch with readable edge; overlapping patches use capped strongest effect |
| Sticky Bomb | Attach or land, telegraph detonation, create bounded area slow/disruption; clear ownership and expiry |
| Power Jump | Apply extra vertical impulse under legal state rules; no repeated air recharge; course generation never assumes it in no-ability modes |
| Chicken Bomb | Area transformation into a faster but lower-jumping form; timed expiry, safe collider restoration and original visual design |
| Rewind | Restore position/velocity from short server history only if safe and in same valid life/round; clear configured debuffs; never resurrect elimination, undo rewards or cross locked checkpoints |
| Gust | Directional wind burst affects players and eligible objects; bounded impulse, occlusion and falloff |
| Glider | Airborne drag/lift state with duration/height limits, steering and landing cancel; disallow indefinite hovering |
| Switch | Swap two eligible positions after range/LOS checks and safe destination validation; disallow finished, dead, protected or incompatible carried states |
| Hook | Grapple toward eligible target with travel cap and obstruction checks; no teleport through walls or pulling across forbidden progress gates |
| Block Wall | Spawn temporary barrier with safe placement, capped count and duration; reject placement trapping spawns or sealing the only legal route |
| Boost | Short forward acceleration burst with speed cap, swept collision and recovery |
| Rock Slam | Downward impact followed by temporary resistant form; ground shockwave and immunity categories specified; cannot bypass lethal floor |
| Bumper Field | Timed repulsion field around player; per-target cooldown and maximum impulse prevent endless pinball loops |
| Pollo Stick | Chained bounce state with increasing bounded height/range; combo window and max count, breaks on hit or invalid landing |
| Party Crasher | Original animal-shaped explosive projectile equivalent; launch trajectory, fuse/range, impact and knockback |
| Rubber Chicken | Carryable melee tool; hold-to-charge increases impulse within cap; release/hit interruption and tool drop |
| Blast Ball | Carry/throw explosive with fuse and warning; reuse explosive-ball obstacle implementation |
| Carryable puncher | Portable device with directional timed punch, placement/carry restrictions and ownership |
| Carryable fan | Portable force emitter with bounded cone; carry orientation and airflow interaction with player/object mass |

Use data-driven upgrades. The supplied checklist describes a nine-level fixed path, but the general official ability page checked for this document only confirms four slots and separate controls. Treat nine levels as a requested project design unless independently verified. Each level has explicit values and caps; persist unlocks/upgrade spending transactionally. Provide respec/refund behaviour only if intentionally designed, not assumed from references.

Event Extras use event-granted loadouts, separate from owned abilities: enhanced jump plus shockwave punch; explosive jump; temporary ice ramp; frog-style jump/grapple; giant form with changed movement/resistance; football haymaker/ball freeze/powerful kick; growing snowball form; snowball-throwing form; chained bunny jump; chasing creature spawns; egg-like proximity mines. Each must use the same authority, status, expiry, collision and safety contracts. Use original characters and names for collaboration-inspired mechanics.

### 11. Advanced mode contracts

- **Vehicles:** steering, acceleration/braking, jump/nitro with resource/cooldown, checkpoints/laps, track respawn, player-to-vehicle transitions and controller HUD. Use a cheap kinematic vehicle model before simulating wheel suspension. Validate lap shortcuts and off-track resets.
- **Shooter arenas:** aiming, firing, projectile/hitscan policy, ammunition/reload, health/shields, weapon pickups, elimination/limited lives, optional shrinking zone and collapsing floor. Separate shooter balance from obstacle-race abilities. Bound lag compensation and reject firing while eliminated.
- **Prop hunt:** asymmetric hider/seeker roles, legal prop disguises with bounded hitboxes, transform cooldown, periodic forced change/clues, seeker hit/penalty rules, hiding phase and time limit. Only send role-secret information to permitted clients where feasible.
- **Dungeon/classes:** room graph, team spawn, class-specific ability kits, telegraphed enemies, encounter completion gates, advancing threat and victory/failure. Reset enemies/keys safely; no softlocks on player disconnect.
- **Special-power robot encounter:** original powers and robot enemies, weak-point or interaction objectives, large obstacle attack patterns, clear tells and bounded AI cost.
- **Arena brawler:** weapon pickup, knockback/combat, limited lives, respawn where allowed and terrain collapse. Make death cause and remaining lives explicit.
- **Thieves mode:** separate stealth/catch/delivery mechanics, jail UI, rescue progress and guardian objective. Spectating cannot reveal enemy positions to active team members through an unfair unrestricted view.

Keep these modules unloaded until selected. Do not force their HUD, assets, or physics cost into ordinary races.

### 12. Matchmaking, playlists and private rooms

Implement Classic/solo knockout, duos, squads, team rounds, ranked, rotating events, practice, time attack, extreme/no-respawn races, endless challenge, continuous community exploration, creator spotlight, custom shows/parties, tournaments and Grand Prix. A playlist is configuration over supported rules, not duplicated game logic.

Support 2-player duels, 4-player short series, 8-player one-round showdown, 16-player short knockout and up-to-32-player event configurations as capacity permits. Defaults are project configuration; do not present historical event counts as universally current. Team races award shared placement points; team survival uses a declared points/lives rule; a team-final win awards the whole eligible squad.

Queue by region/latency, playlist, compatible version, party size and skill where enabled. Show queue state and cancel. Widen acceptable skill range gradually when population is low. Define minimum humans, countdown and optional bots. Identify bots honestly; do not fabricate human player names/presence. No bots in ranked unless explicitly disclosed and intentionally configured. Avoid fragmenting a small community across many permanently open queues: schedule secondary modes and keep custom access.

Private room: create/join code, copy/share control, invitations, privacy, capacity, round count, pool/map selection, seed lock, theme choice, teams/manual assignment, bot fill, abilities on/off/restricted, difficulty, host transfer, kick permissions, ready state, favourites, edit room without recreating, start validation and room expiry. Party leader is not simulation authority. Existing matches survive lobby-leader departure according to documented rules. Custom/practice progression is disabled by default to prevent farming, with clear reward eligibility UI.

Tournament framework: scheduled registration, eligibility, check-in, bracket/heat or leaderboard format, deterministic advancement, disconnect/no-show handling, ties, result finalisation and prize ledger. Ticket/prize payments remain disabled until real integrations and applicable product rules are configured; free tournaments must still function.

Time attack: repeatable seed/rules, ghost/replay if supported, valid route/time verification, personal best and leaderboard. Ghosts are visual only and never collide. Explore: next/skip/like/report controls, round completion rewards with anti-farming rules, and graceful loading between maps.

### 13. Every menu and player-facing state

Implement functional, keyboard/controller-accessible UI with responsive layout. Every screen needs loading, empty, error and retry states where relevant. Every button must perform its promised action or clearly explain why unavailable.

| Screen/state | Required content and actions |
|---|---|
| Boot/capability check | Lightweight loading progress, browser/GPU failure, retry, version mismatch and maintenance handling |
| Welcome/account | Guest play, display-name setup, sign in/link where configured, recover session, clear guest persistence limitations |
| Tutorial/onboarding | Camera/move/jump/dive/checkpoint/finish practice, hazard lesson, settings, skip/replay; teach grabs/abilities only when relevant |
| Main menu | Character preview, prominent Play, playlist selector, party roster, profile, cosmetics, challenges, pass, shop, rankings, events, custom room, settings, help |
| Mode selection | Description, team size, player cap, ability rules, rewards, matchmaking availability and requirements |
| Queue | Searching status, region/ping estimate, elapsed time, party state and cancel; don't invent wait-time estimates |
| Lobby | Roster, ready status, rules summary, room code/privacy, host controls, invite/join errors and disconnect indicators |
| Loading/map preview | Actual map name/theme, objective, controls, elimination/respawn rule, qualifying count, progress and timeout recovery |
| Countdown | Synchronised 3–2–1/start cues; movement lock releases on server start, not each client's animation end |
| Gameplay HUD | Timer, qualification/survivors, objective progress, position/laps when relevant, team score, checkpoint feedback, ability slots/cooldowns, ping warning |
| Pause/settings overlay | Resume, controls/audio/display, report, leave confirmation; state clearly that live multiplayer continues |
| Fall/respawn overlay | Brief cause, countdown if any, current checkpoint, remaining lives if applicable; does not falsely label ordinary race fall as elimination |
| Death/elimination menu | “Eliminated”, accurate cause, placement/status, Spectate, Play Again when allowed, Return to Lobby; preserves party status and unclaimed rewards |
| Qualification screen | Placement/qualified confirmation and spectate remaining players; no premature next-round loading |
| Spectator HUD | Target name/team, next/previous, eligible target list, alive count, round progress, follow teammate, exit; input cannot control active player |
| Between rounds | Qualified/eliminated roster, team standings, next-round transition and loading failure handling |
| Winner/podium | Authoritative winner/team, original celebration, match summary, skip animation, sound/reduced-motion setting |
| Results/rewards | Placements, XP/currency breakdown, challenge/pass/rank changes, pending/retry award status, replay/home/party actions |
| Profile | Stats, wins, history, rank, achievements, cosmetics and identity settings; distinguish private/public data |
| Wardrobe/loadout | Preview/equip, owned/locked, filters, favourites, rarity, separate emote/ability slots and upgrade details |
| Shop/pass | Accurate price/currency/ownership, purchase confirmation and error; free/premium tracks, claim states, season timer; no fake checkout |
| Challenges/events | Daily/seasonal/event goals, progress, expiry, rewards, claim and eligibility |
| Friends/party/clubs | Search/invite/accept/remove/block, membership/role controls, presence privacy, leave/kick/transfer, actionable errors |
| Ranked/leaderboards | Rules, divisions, progress, season end, placement history, filters and pagination; validated backend results |
| Creator/editor | New/open/save/test/publish, object tools, budget, validation, versions and share code |
| Community browser | Featured/search/favourites/recent/own maps, difficulty/mode filters, version, play, like/dislike/report |
| Reconnecting | Visible reconnect attempt, bounded retry/backoff, cancel, match-resume or honest session-ended result |
| Disconnect/server restart | Explain lost connection vs match ended vs incompatible build; safe retry and return to menu |
| Report/help | Player/map report categories, confirmation, support/help, control reference and feedback |

Persist audio, controls, quality, accessibility and language choices. Use localisation keys and expandable layouts, not hardcoded text in meshes.

### 14. Spectating and elimination details

Treat respawning, permanently eliminated, qualified-awaiting-next-round and disconnected as distinct states. A race fall normally respawns; survival death normally eliminates. Extreme rules explicitly override this. No client decides whether it still has a life.

On elimination, stop movement/ability input, release carried objects, remove collision or switch to a harmless representation, show the elimination menu, and allow immediate spectating. Rejoining cannot restore a lost life. On qualification, lock score and prevent interference with remaining racers.

Spectating follows interpolated authoritative target state using a stable camera. Cycle only eligible live players; auto-switch when target dies, qualifies, leaves or becomes hidden by mode rules. Prefer party/teammates if appropriate. Show an empty/no-target state during transitions rather than black screen or crashed camera. Keep round HUD up to date. At next round, surviving players spawn; eliminated viewers remain spectators. Joining mid-match never inserts a new competitor into a started race unless a mode explicitly supports it.

In competitive/team/hidden-information modes restrict spectator view, add delay where needed, and avoid exposing secret map truth. Never allow a spectator to send gameplay commands or submit results. Provide safe exit/requeue and avoid losing already earned rewards. Free camera may be available in practice/admin modes with world bounds and permissions.

### 15. Server authority, networking and reconnection

Server owns input validation, positions/velocities, collision-critical hazards, object ownership, ability state, score, checkpoints, qualification, elimination, round transitions and rewards. Clients send bounded input commands with sequence numbers, not “I won” or arbitrary transforms.

Use a fixed timestep and bounded catch-up to avoid a spiral under load. Predict the local controller, acknowledge processed inputs, reconcile from authoritative snapshots and replay remaining commands. Interpolate remote players on a small buffered timeline; cap extrapolation and smooth visual correction without moving authoritative colliders. Send initial full state, periodic delta snapshots and resync keyframes; version the protocol.

Represent predictable kinematic hazards by server start tick, parameters and phase; do not continuously transmit every decorative transform. Physics objects need authoritative transforms and bounded update frequency. Do not assume cross-browser floating-point physics is perfectly deterministic: canonical manifests and server correction remain necessary.

Use server time estimates for countdowns and obstacle phases. Validate ranges, finite numbers, sequence order, message size, input frequency, inventory and legal transitions. Rate-limit joins, names, chat/emotes, ability requests and reports. Finish checks require valid route progress. Implement bounded lag compensation where interactions need it, with a policy that prevents old packets grabbing someone from impossible distances.

Track room ID, match ID, round ID, player/session ID, protocol/build version and reconnect token. Tokens are short-lived and bound to identity/match. Duplicate connections resolve predictably. During a configurable reconnect grace period, neutralise inputs and retain state under declared rules; disconnected players must not become invulnerable blockers. Reconnect supplies a full current snapshot. If room process died and state cannot be restored, return a clear aborted-match state and compensate according to policy; do not claim seamless resume without implementing it.

Authoritative room lifecycle: created → waiting → loading → countdown → active → resolving → intermission/next round → finished → cleanup, with cancellation/aborted paths. Use one guarded transition function and monotonically increasing state revision. Handle zero players, one player, all players dead, no finishers, tied teams, timeout, late packet, host departure and shutdown. Never wait forever for one missing load-ready response.

Bots use the route graph plus local hazard decisions and the SAME movement/collision/ability rules. Give them bounded reaction time, fallible choices and stuck recovery; never teleport them to produce an artificial race result. Budget bot AI and disable expensive path replanning every tick.

### 16. Accounts, progression, economy and cosmetics

Implement guest sessions and an account-linking path suited to available authentication. Persist account/profile, stats, match history, XP/levels, long-term journey, wins/crowns-equivalent, shards, ranks, unlocked items, equipped cosmetics, ability unlocks/upgrades, challenges, passes and purchases in server-controlled records.

Reference distinctions to preserve in the design ledger: Fall Guys-style Fame/pass, crowns and shards, long-term Crown Rank, Kudos/premium currency, separate costume top/bottom, body colours/patterns, faceplates, nameplates/nicknames, emotes/emoticons/quick phrases and celebrations; Stumble-style journey, pass tiers, missions/stars, gems/coins, ability keys/tokens, tickets, temporary event currencies, cosmetic shards, duplicate conversion, skins/rarities, trails, taunts and special animations. Use original project currency and item names. Do not create fifteen meaningless currencies merely to tick boxes; keep these supported as typed configurable reward mechanisms and clearly map merged equivalents.

Reward engine: award from finalised server match events; use immutable grant IDs and database transactions so retries cannot duplicate currency. Client reward animations are presentations, not authority. Daily/seasonal resets use server time and stored period IDs. Define XP/placement formulas and caps in data. Show pending awards if persistence fails, retry safely, and reconcile on login. Custom/private/practice farming restrictions are enforced on server.

Ranked: placement-dependent rating/points, divisions/subdivisions, promotion, documented demotion protection, seasons/cycles, eligible pool/ability restrictions, leaderboards, highest-rank season rewards and reset policy. Reference rank names in Appendix A are comparison data; choose coherent original ranks rather than showing both ladders simultaneously. Abandonment, disconnects, draws and invalidated matches have explicit point rules.

Pass: free and premium tracks, tier progress, regular/deluxe entitlements if configured, daily/seasonal/additional mission types, claim-all, expiry and already-owned rewards. Shop: rotating server-defined offers, bundles, ownership handling, preview, purchase confirmation, atomic currency debit/grant and refund/reversal hooks. Real-money checkout needs an actual payment provider and verified webhooks; sandbox behaviour must be visibly sandbox. Ad rewards need a real verified provider callback; never grant rewards because a client says an advert completed.

Prize wheels/boxes, if enabled, require server outcome selection, disclosed reward probabilities, duplicate policy, receipt/audit records and configured availability restrictions. Keep disabled unless the product explicitly enables that feature. Community challenges aggregate eligible events with anti-spam caps and shared milestone grants.

Cosmetics must not alter competitive hitboxes, obscure hazards, impersonate UI, or increase low-preset rendering cost without budget checks. Support preview, equip, remove, rarity/filter/sort, ownership and presets. Cache inventory and reconcile changes after reconnect.

### 17. Social, moderation and platform support

Friends: invitations, accept/decline/remove/block, online/party status with privacy controls, party invites/join codes, expiration and offline errors. Party leader chooses queue; members receive ready/rules feedback. Cross-browser play requires matching protocol/content versions. Account progression follows the authenticated account; do not claim integration with Epic/Scopely accounts without actually implementing an authorised provider integration.

Clubs: create/browse/search/join, open/restricted membership, applications/invites, name/tag/description/region/language, original badge, roster, roles/permissions, moderation, daily/weekly shared goals, points, season milestones, badge upgrades and streaks. Role changes, leader departure, kicks and membership capacity need backend rules.

Quick chat/emoticons and mute/block/report are core communication options. Optional party voice requires a real voice transport/service, microphone consent, mute/deafen, disconnect handling and moderation design; do not claim voice exists because a microphone icon was drawn. Optional text chat uses rate limits, moderation and privacy rules. Respect explicit integration permissions when sending external invitations.

Reports capture player/map IDs, match/round, category and limited relevant server evidence. Provide moderation tools with role-checked actions, bans/timeouts, appeals/status where appropriate and audit logs. Normal users must not access admin endpoints. Retain only necessary logs and avoid secrets/tokens in telemetry.

Local split-screen is a documented reference-specific extension, not a requirement to burden the lightweight default. If included, implement separate inputs/cameras and profile ownership, measure multiplied rendering cost, and label unsupported devices. Track it in the ledger even if blocked or disabled pending performance approval. Native-console/mobile-store integrations are reference context, not browser capabilities to falsely claim.

### 18. Creator tools and community levels

Build an editor on the SAME manifest/prefab schema used by authored and generated maps. Provide course, survival and points templates; start/finish/checkpoint/kill/respawn volumes; object palette; translate/rotate/scale; snapping; duplicate/multiselect/delete; undo/redo; numeric fields; grouping; camera controls; save/autosave/recover; test/reset; and visible budget/error list.

Expose supported obstacle timing, path/rotation controllers, triggers/connections, switch walls/bridges, conveyors/speed arches, collectibles/zones/destructibles, object mass/drag settings, power-up placement, colours/materials/backgrounds, cheap decorations/stickers and music choices. Invalid scale/parameters must be rejected server-side as well as in UI. Arbitrary uploaded executable scripts are not a level format.

Publishing requires schema validation, resource budget, objective solvability checks and a successful author test where applicable. Store immutable published versions with share codes and a mutable current-version pointer. Existing matches pin one version; editing never changes a live map underneath players. Include unpublish/update, favourites, recently played, search, featured pools, likes/dislikes with abuse prevention, reports and moderation status.

Fall Guys Creative is a reference for creation tools. The official Stumble Workshop notice announces its retirement across platforms; its old features in Appendix A are historical reference requirements, not evidence it remains a current editor. Our project's editor is a deliberate feature independent of that retirement.

### 19. Render deployment and operating model

Prepare deployment configuration for the actual repository. Do not deploy or create paid services unless the active user request authorises that action. This prompt requires deployable code and instructions; infrastructure changes must follow the surrounding task's permissions.

Start with one Render Web Service hosting HTTP and the authoritative WebSocket endpoint, plus a durable database for account/progression data. The frontend may be served by that service or a static host according to the existing build. Bind the server to `0.0.0.0` and the provided `PORT`. Use public `wss://` connections and an explicit allowed-origin policy. Public HTTP and WebSocket traffic use the same service listener. Store secrets server-side, never in browser bundles.

Provide `render.yaml` aligned to actual build/start commands, pinned supported runtime, health/readiness routes, environment variable example without secrets, migrations, graceful shutdown, logs, metrics and deployment instructions. Health reports should be cheap and should not create gameplay rooms.

Render can interrupt sockets during deploys/restarts. Implement heartbeat, reconnect with jittered exponential backoff, room recovery/abort rules and graceful draining. On SIGTERM stop accepting new matches, signal clients, persist finalised rewards and either finish within the configured shutdown window or abort cleanly. A multi-minute match cannot be assumed to finish inside every deploy window.

Free hosting is suitable for a prototype with cold-start/usage limitations; do not promise always-on production service. Render's current free documentation describes idle spin-down and ephemeral local files. Persist important data outside the service filesystem, and recheck plan/database retention constraints before selecting a production tier. Do not name a paid tier or price without current verification and measured capacity needs.

Do not add horizontal replicas and assume every room's clients will reach the same process. Render may route a reconnect to another instance. First ship a correct single-instance room host with admission control. For scaling, implement a gateway/room-owner routing design plus shared directory/session data and distributed coordination; database/pub-sub alone does not turn several independent physics simulations into one room. Document failure and restore semantics. Use a persistent database for durable progression and optional Key Value for transient room directory, rate limits and reconnect metadata. Avoid attaching local disks merely to store live rooms.

Measure active connections, rooms, players, tick p50/p95/max, event-loop delay, memory, CPU, network bytes, disconnect/reconnect rates, room crashes, generation failure rate, map completion/elimination heatmaps and reward failures. Provide safe admin controls to disable a bad map/ability, stop queue admission, rotate pools and inspect redacted match diagnostics. Bound log retention and avoid logging every player tick.

### 20. Accessibility, audio and polish

Remappable controls, controller glyphs, touch-safe controls, sensitivity/invert/deadzone, readable scalable text, strong focus states, high-contrast UI, colourblind symbols, reduced motion, camera shake toggle, effects intensity, independent music/SFX/UI/voice volume, mute-unfocused setting and saved preferences. Provide visual cues for critical audio and clear text for qualification/death/objectives. Do not make audio the only cue for a lethal attack.

Browser audio starts after user gesture and resumes gracefully after suspension. Pool short sound effects, cap simultaneous voices, attenuate distant hazards and avoid 32 players causing audio clipping. Music/theme changes crossfade cheaply. Animations include idle/run/jump/fall/dive/land/stumble/grab/carry/emote/win/elimination with transitions tied to actual states. Add jump/landing feedback and restrained UI animation without hiding player control.

Handle resize, fullscreen denial, pointer-lock loss, controller disconnect, tab backgrounding, touch cancellation and network changes. Cap background work; the server still runs the match. On focus return, resync instead of replaying minutes of stale inputs. Keep menu navigation usable without a mouse.

### 21. Testing and acceptance criteria

Write tests for substantive risks, not tests that merely restate constants. Include unit/data validation, integration tests and human playtests. Maintain reproducible seeds and failing manifests.

Mandatory acceptance scenarios:

1. Fresh guest opens the game, completes/skips onboarding, enters a real multiplayer room, plays multiple rounds, reaches results and plays again without refreshing.
2. Two real clients see consistent obstacle phases, finish order, death state, carried objects and winner. A client cannot award itself progress.
3. A race fall respawns at the correct checkpoint; a survival fall opens elimination UI; qualified/eliminated users spectate correctly.
4. Spectated player dies/leaves/qualifies, there are no valid targets, a round changes and the match ends: camera/HUD remain valid in every case.
5. A 16-player and then supported 24/32-player room runs through dense hazards without unacceptable tick/frame/bandwidth cost; measured results identify hardware and hosting tier.
6. Duplicate finish, pickup, goal, award and reconnect packets do not double-grant results or currency. Bad numeric inputs, speed hacks and illegal ability casts are rejected.
7. Reconnect during countdown, active round, elimination, result award and service restart has defined behaviour; eliminated players cannot revive by reconnecting.
8. Timeout with nobody finishing, simultaneous final deaths, tied team score, empty room, last-player disconnect and all bots stuck terminate or recover without hanging.
9. Generation tests cover at least 1,000 reproducible seeds across declared mode/difficulty/capacity combinations, plus known adversarial cases. Report invalid/rejected/fallback rates and failure reasons; do not infer guaranteed playability just from a passing seed count.
10. Same seed plus same versions creates the same canonical public layout. Changing only theme stream leaves collision unchanged. Hidden answers are not leaked through public seed or manifest.
11. Generated routes satisfy controller reachability, hazard windows, spawn/checkpoint safety and budget constraints; human playtests check that “technically possible” is also enjoyable.
12. Theme changes preserve visibility and collision. Low quality displays all critical hazards and uses identical gameplay timing.
13. Gameplay under simulated 50/100/200 ms RTT, jitter, stalled connection and 1–5% underlying network packet loss remains understandable; account for reliable WebSocket retransmission/head-of-line effects rather than pretending WebSockets drop individual application packets normally.
14. Twenty consecutive match transitions do not show unbounded memory/listener/socket growth. Soak room lifecycle and generation workers.
15. Reward retries, database failure/recovery and process termination cannot duplicate purchases or destroy finalised entitlements.
16. Editor saves, recovers autosave, rejects invalid levels, publishes immutable version, joins by code and runs it in a custom room.
17. Every menu action works; loading/empty/error states exist; keyboard focus and responsive layouts are usable.
18. Production build starts with documented Render environment, health path works, WSS connects, secrets stay out of client assets and shutdown does not leave pending awards silently lost.

Use test recordings/screenshots where useful, but never substitute screenshots of menus for evidence of real multiplayer. Mark untested browsers, devices, integrations and features explicitly.

### 22. Deliverables and final reporting

Deliver working integrated code; updated requirement coverage ledger; obstacle/mode/ability schemas; reference-preset catalogue; validated procedural generator and seed tools; theme assets; full functional UI and spectating; persistence/migrations; tests and results; performance report; deployable Render configuration; local setup and operations README; and precise remaining blockers.

For each milestone report: what changed, where, user-visible behaviour, tests actually run, known risks and next dependencies. Final report must distinguish complete, partially implemented, disabled and blocked features. Do not claim “all Fall Guys and Stumble Guys features implemented” when expansion modes, social systems, menus or deployment work are missing.

Start now by auditing the existing repository and producing the coverage ledger, then implement the highest-dependency missing systems. Continue into working gameplay and integration; do not stop after planning.

## END IMPLEMENTATION PROMPT

---

## Source and verification notes for the person using this prompt

- The supplied **Pasted text.txt** is the main breadth checklist. Appendix A is preserved verbatim and includes its own links. Its claims are user-supplied reference material, not all independently verified here. In particular, exact current ability levels, currencies, event availability, rank rules and platform support require verification when implementing reference parity.
- [FallGuysDB levels](https://fallguysdb.com/levels/) was accessible, but labels descriptions as still being added. It is useful as an initial 25-map index, not an exhaustive modern catalogue. The detailed preset table above is an implementation interpretation, not text copied from the database.
- [TheGamer reference](https://www.thegamer.com/fall-guys-ultimate-knockout-map-minigame-ranked/) could not be retrieved in this research session. Do not claim its full contents or rankings were reviewed. The downstream implementation agent should retry or ask for supplied screenshots/text if exact details from that page matter.
- [Official Stumble map catalogue](https://stumbleguys.helpshift.com/hc/en/4-stumble-guys/faq/103-what-are-the-available-maps/) provides an additional map reference; individual historical/current availability should be checked per mode/version.
- [Official Stumble abilities overview](https://stumbleguys.helpshift.com/hc/en/4-stumble-guys/faq/208-how-abilities-work/) confirms up to four abilities and separate ability controls. It does not, in the retrieved page, establish every upgrade detail in the supplied checklist.
- [Official Stumble Workshop notice](https://stumbleguys.helpshift.com/hc/en/4-stumble-guys/faq/133-stumble-workshop---important-update-april-2026/) announces retirement across platforms. Historical editor instructions remain below that notice and should not be mistaken for current availability.
- [Fall Guys Creative introduction](https://www.fallguys.com/news/introducing-fall-guys-creative) documents level creation/sharing but is an older introduction, not a complete current editor specification. [Ranked Knockout introduction](https://www.fallguys.com/news/fall-guys-ranked-knockout) documents a distinct ranked system. [Power Party update](https://www.fallguys.com/news/fall-guys-power-party-update) is another reference for equipment mechanics.
- [Render WebSockets](https://render.com/docs/websocket) supports public WSS, reconnect handling, single public listener, and the warning that reconnects can reach another instance. [Render free services](https://render.com/docs/free) documents idle spin-down and storage limitations. Recheck hosting conditions at deployment time.

## Appendix A — Complete supplied reference checklist

The following is the user's original source material. Preserve its requirements in the coverage ledger; do not treat its date or “verified” wording as independent verification by this prompt author. If a historical/current claim conflicts with current official documentation, record the difference while retaining the underlying requested game mechanic.


Yes—below is a **comprehensive checklist of the features and mechanics in both games**, covering movement, obstacles, objectives, modes, abilities, progression, customisation, social features, and level creation.

**Scope:** this covers distinct gameplay systems. Every individual map, costume, cosmetic variant, and historical event would require separate catalogues. Information checked **6 October 2026**; availability varies by playlist, platform, and event.

**1. Features both games share**

- Online multiplayer obstacle-course competitions.
- Third-person character control.
- Running, jumping, and diving.
- Physics-based collisions, knockback, falling, and recovery.
- Races with limited qualification places.
- Survival rounds and elimination hazards.
- Multiple rounds leading to a winner.
- Solo and team-based experiences.
- Checkpoints and respawning in appropriate races.
- Sudden-death elimination in appropriate survival modes.
- Timers, qualification counters, scores, and results screens.
- Spectating after elimination.
- Alternative routes, shortcuts, and movement techniques.
- Rotating events and themed collaborations.
- Character cosmetics and purchasable content.
- Free-to-play access. Their individual rules and progression systems differ substantially. [Epic Games Store](https://store.epicgames.com/p/fall-guys?utm_source=chatgpt.com)

---

**2. Fall Guys: movement and player interactions**

| Mechanic | What it does |
|---|---|
| Running | Standard movement across courses. |
| Jumping | Clears gaps, obstacles, and moving bars. |
| Air steering | Adjusts direction during jumps and falls. |
| Diving | Adds a forward lunge and changes landing position. |
| Jump-diving | Combines height with additional reach. |
| Dive-sliding | Builds and maintains movement along slippery slime surfaces. |
| Grabbing players | Briefly restrains or disrupts another bean. |
| Pushing and body blocking | Uses collisions and positioning to interfere with others. |
| Ledge grabbing | Catches suitable platform edges. |
| Mantling | Pulls the bean onto a grabbed ledge. |
| Automatic ledge grabbing | Optional assistance for catching edges. |
| Object grabbing | Picks up supported objects. |
| Carrying and releasing objects | Moves eggs, balls, batteries, Pegwins, and other items. |
| Dive-grabbing | Combines a dive with a grab, including certain tails and crowns. |
| Trapeze swinging | Grabs moving bars and releases to cross gaps. |
| Ragdolling | Collisions and awkward landings temporarily interrupt control. |
| Momentum use | Uses slopes, moving surfaces, and launches to travel farther. |
| Piggybacking | One consenting player carries another; the passenger can dismount. |
| Emoting | Performs equipped animations during play. |

Automatic grabbing and dive-grabbing are established control features; slime sliding, trapezes, and piggybacking add further movement possibilities. [fallguys.com](https://www.fallguys.com/news/fall-guys-free-for-all-release-notes?utm_source=chatgpt.com)

**3. Fall Guys: round objectives and scoring mechanics**

These are the different things a round can ask you to do. Examples identify the mechanic; they do not guarantee that the named round is in today’s rotation.

| Objective/mechanic | Examples |
|---|---|
| Reach a finish line | Ordinary obstacle races. |
| Complete laps | Short Circuit; circuit-style races. |
| Outrun rising slime | Slime Climb, The Slimescraper. |
| Survive moving hazards | Jump Club, Block Party. |
| Stay on rotating terrain | Roll Out, Roll Off. |
| Preserve disappearing floor | Hex-A-Gone and related rounds. |
| Manage breakable ice | Thin Ice. |
| Survive a rotating, disappearing floor | Hex-A-Ring. |
| Stay inside a shrinking play area | Certain finals and Creative rounds. |
| Ride a moving platform | Hoverboard Heroes and related rounds. |
| Dodge pursuing enemies | Stompin’ Ground’s rhinos. |
| Avoid reactive creature attacks | Kraken Slam. |
| Throw explosives to eliminate opponents | Blast Ball. |
| Discover a safe hidden path | Tip Toe. |
| Find working doors | Door Dash, Lost Temple. |
| Remember safe tiles | Perfect Match. |
| Count objects and choose a safe platform | Sum Fruit. |
| Follow a visual route | Puzzle Path. |
| Reproduce a displayed pattern | Pixel Painters. |
| Jump through scoring hoops | Hoopsie Daisy, Hoopsie Legends, Ski Fall. |
| Collect objects for points | Bubble Trouble. |
| Hold an object to accumulate points | Pegwin Pool Party, Pegwin Pursuit. |
| Remain inside scoring zones | Airtime and Creative points rounds. |
| Keep possession of a scoring item | Leading Light’s moving zone; crown-possession rounds use a different possession rule. |
| Steal and retain a tail | Tail Tag, Royal Fumble, Team Tail Tag. |
| Press active buttons | Button Bashers, Frantic Factory. |
| Score football goals | Fall Ball. |
| Score basketball goals | Basketfall. |
| Keep a volleyball off your floor | Volleyfall. |
| Collect and steal eggs | Egg Scramble, Egg Siege. |
| Keep balls in your team’s area | Hoarders. |
| Push a large ball through a course | Rock ’n’ Roll. |
| Grow a snowball by rolling it over snow | Snowy Scrap. |
| Claim floor tiles using batteries | Power Trip. |
| Spread an infection through grabbing | Jinxed. |
| Grab a physical crown to win | Fall Mountain, Lost Temple, Tip Toe Finale. |
| Destroy or sort objects for points | Scrapyard-themed Creative rounds. |

Official round descriptions document lap racing, territory control, basketball, collection, possession, volleyball, explosives, and Creative scoring systems. [fallguys.com](https://www.fallguys.com/news/season-4-is-out-now?lang=en-US\&utm_source=chatgpt.com)

**Special event mechanic: Sweet Thieves / Treat Thieves**

These asymmetric modes divide players into thieves and guardians. Their mechanics include stealing and delivering sweets, stealth movement, catching thieves, imprisonment, and freeing teammates. Treat these as **special or returning modes**, rather than permanent core queues. [fallguys.com](https://www.fallguys.com/news/season-6-mid-season-update?lang=en-US\&utm_source=chatgpt.com)

**4. Fall Guys: obstacle and environment mechanics**

- **Moving floors:** rotating discs, cylinders, conveyors, travelling platforms.
- **Balance platforms:** seesaws and tilting surfaces.
- **Disappearing terrain:** triggered tiles, timed floors, collapsing platforms.
- **Breakable terrain:** ice and destructible objects.
- **Swinging hazards:** pendulums, swinging balls, axes, and bars.
- **Rotating hazards:** sweepers, hammers, rotating arms, and jump ropes.
- **Pushing hazards:** pistons, punching gloves, moving walls, and blocks.
- **Launching obstacles:** flippers, hammers, bumpers, and spring-like surfaces.
- **Bouncing surfaces:** lily pads, drums, inflatable floors, and bounce boards.
- **Air forces:** fans, wind, and directional blasts.
- **Speed modifiers:** speed arches, slippery slopes, and slime slides.
- **Gravity changes:** low-gravity and altered-gravity areas.
- **Projectile hazards:** fruit, snowballs, cannon-fired objects, and water balloons.
- **Transport:** vacuum pipes, portals, and trapezes.
- **Triggered paths:** buttons, pressure plates, and switchable barriers.
- **Lethal areas:** slime, voids, and configured elimination zones.
- **Dynamic physics:** movable, pushable, draggable, or destructible objects.
- **Randomised variations:** alternative obstacle arrangements and behaviours.

Examples of the more specialised systems include low gravity, pipes, switchable barriers, speed arches, and configurable elimination zones. [fallguys.com](https://www.fallguys.com/news/season-4-is-out-now?lang=en-US\&utm_source=chatgpt.com)

**5. Fall Guys: power-ups and usable equipment**

| Power-up/equipment | Function |
|---|---|
| **Bean Ball** | Temporarily turns the bean into a rolling ball. |
| **Invisibility** | Temporarily hides the player. |
| **Party Crasher** | Fires a rhino-shaped explosive projectile. |
| **Rubber Chicken** | Swings at players or objects; charging increases its force. |
| **Blast Balls** | Carried and thrown explosives. |
| **Carriable Punching Block** | Portable puncher for launching players or affecting objects. |
| **Carriable fans** | Portable airflow equipment in supported levels. |

These are supplied by the level or mode. Fall Guys does not use Stumble Guys’ account-level ability-upgrade system. [fallguys.com](https://www.fallguys.com/news/fall-guys-power-party-update?utm_source=chatgpt.com)

**6. Fall Guys: modes and match structure**

- **Solo/Classic shows:** individual qualification through successive rounds.
- **Knockout:** a curated competitive round pool.
- **Duos:** two-player teams.
- **Squads:** four-player teams.
- **Team qualification:** race placement or survival contributes to a shared score.
- **Team finals:** a teammate’s winning performance can secure the squad’s victory.
- **Ranked Knockout:** performance-based competitive progression.
- **Rank divisions:** Rookie, Contender, Bronze, Silver, Gold, Ace, Star, Superstar.
- **Rank points and sub-ranks:** promotion and, at higher ranks, possible sub-rank demotion.
- **Competitive cycles:** rotating pools, challenges, resets, and rank rewards.
- **Mastery Ranked limited-time shows:** additional ranked event formats.
- **Explore:** continuous community rounds, skipping, and progression rewards.
- **Creator Spotlight:** selected community-made rounds.
- **Limited-time shows:** specialised pools, finals-focused shows, and modified rules.
- **X-treme variants:** races where falling can eliminate you.
- **Time Attack formats:** competing through completion times.
- **Custom Shows:** private lobbies and supported round selection.
- **Creative practice:** playing shared levels privately, including solo where supported.

Ranked, Explore, and Mastery Ranked have different structures; they should not be treated as one standard elimination format. [fallguys.com](https://www.fallguys.com/news/fall-guys-ranked-knockout?utm_source=chatgpt.com)

**7. Fall Guys: Creative level editor**

Its creation systems include:

- Course, Survival, and Points round types.
- Start positions, finish lines, and checkpoints.
- Platforms, primitives, barriers, and obstacle placement.
- Moving, rotating, resizing, duplicating, and overlapping objects.
- Configurable obstacle behaviour and timing.
- Movement and rotation controllers.
- Buttons and pressure plates.
- Connections that activate supported objects.
- Switchable walls and bridges.
- Speed arches and conveyors.
- Power-up and usable-object placement.
- Disappearing tiles.
- Elimination and respawn zones.
- Point-scoring zones, collectibles, and destructible scoring objects.
- Object physics, weight, and dragging settings.
- Destruction thresholds and hit requirements.
- Colours, materials, decorations, stickers, and backgrounds.
- Music selection.
- A build-budget limit.
- Saving, testing, publishing, and updating rounds.
- Share codes.
- Community discovery and featured playlists.
- Likes/dislikes and player feedback.

The editor has expanded substantially beyond its original race-only release. **Mobile can play Creative levels but does not provide the level editor.** [fallguys.com](https://www.fallguys.com/news/introducing-fall-guys-creative?utm_source=chatgpt.com)

**8. Fall Guys: progression, rewards, and customisation**

- **Fame:** progression earned through play and challenges.
- **Fame Pass:** free and paid reward tracks.
- **Challenges:** daily and longer-term objectives, depending on the current structure.
- **Event challenges:** objectives tied to special rewards.
- **Crowns:** earned through victories and other reward systems.
- **Crown Shards:** combine into crowns; **60 shards = one crown**.
- **Crown Rank:** longer-term reward progression.
- **Ranked rewards:** rewards associated with competitive performance.
- **Kudos:** earnable currency.
- **Show-Bucks:** premium currency.
- **Shop rotations:** individual items, costumes, and bundles.
- **Costume tops and bottoms:** mix-and-match character clothing.
- **Body colours and patterns.**
- **Faceplates.**
- **Nameplates and nicknames.**
- **Emotes, emoticons, and quick phrases.**
- **Victory celebrations.**
- **Collaboration cosmetics.**

Crowns and Kudos are earned rather than directly purchased; cosmetic passes and the shop provide separate reward routes. [Fall Guys Support](https://www.epicgames.com/help/c-32551467/c-37975153/a25348865?utm_source=chatgpt.com)

---

**9. Stumble Guys: movement and physical mechanics**

- Running and directional steering.
- Jumping.
- **Pressing jump again while airborne to dive.**
- Jump-dive combinations.
- Airborne direction adjustment.
- Sliding on slopes and water-slide courses.
- Momentum carried through jumps and launches.
- Slippery ice and movement-altering terrain.
- Bouncing from trampolines and pads.
- Knockback, stumbling, and recovery.
- Player collisions and body blocking.
- Checkpoint respawning in applicable races.
- Instant elimination in applicable survival rounds.
- Movement abilities that extend or change the basic controls.
- Mode-specific vehicle steering, jumping, and nitro.
- Mode-specific aiming and shooting.

The ordinary airborne second press is a **dive**. Additional jumps, gliding, or unusual movement come from particular abilities or modes. [Stumble Guys Help Center](https://stumbleguys.helpshift.com/hc/en/4-stumble-guys/faq/76-what-are-my-controls-when-in-a-match/?hpn=1\&utm_source=chatgpt.com)

**10. Stumble Guys: ability system**

This is a major difference from Fall Guys:

- Equip **up to four abilities**.
- Equip cosmetic emotes separately.
- Activate abilities through dedicated controls.
- Abilities provide movement, offensive, defensive, or disruptive effects.
- Individual abilities have cooldowns and activation conditions.
- Ability Keys unlock abilities.
- Ability Tokens upgrade abilities.
- The current progression system has **nine levels**.
- Upgrades follow a fixed path.
- Upgrades improve cooldown and other ability-specific properties.
- Ranked seasons can restrict the allowed ability pool.
- Custom parties can enable or disable abilities.

The older 15-level system, selectable stat upgrades, and ability visual variants were replaced in the 2026 overhaul. [Stumble Guys Help Center](https://stumbleguys.helpshift.com/hc/en/4-stumble-guys/faq/208-how-abilities-work/?utm_source=chatgpt.com)

**The named ability catalogue I could verify**

Descriptions below summarise their primary effects; exact strength and interactions depend on the current balance version.

| Ability | Main effect |
|---|---|
| Banana | Thrown disruption that impairs opponents’ movement. |
| Block Throw | Throws a disruptive block projectile. |
| Bolt | Lightning projectile that stuns opponents. |
| Bouncing Ball | Ball transformation for fast bouncing movement. |
| Briefcase | Temporarily disables a struck opponent’s abilities. |
| Chop | Close-range strike with a squashing effect. |
| Dice Roll | Throws a large disruptive die. |
| Hat Hop | Deploys a hat that launches players upward. |
| Hug | Grabs an opponent and disrupts movement. |
| Invisibility | Temporarily hides the player. |
| Punch | Strong, directed knockback attack. |
| Rake | Leaves a trap that trips/stuns players. |
| Shield | Defensive protection and space control. |
| Shutdown | Disables nearby opponents’ abilities. |
| Slap | Broad, close-range knockback attack. |
| Slide | Sliding attack that trips opponents. |
| Snowball | Projectile that pushes and slows. |
| Speed Gel | Creates a speed-boosting trail. |
| Spin | Spinning attack against nearby players. |
| Spit | Creates a slowing ground hazard. |
| Sticky Bomb | Area disruption that slows opponents. |

These effects are documented in the ability help pages and balance notes. “Volleyball” also appears in older descriptions of Bouncing Ball. [Stumble Guys Help Center](https://stumbleguys.helpshift.com/hc/en/4-stumble-guys/faq/210-examples-of-abilities/?utm_source=chatgpt.com)

| Additional ability | Main effect |
|---|---|
| **Power Jump** | Adds substantial vertical jumping height. |
| **Chicken Bomb** | Transforms affected players into faster chickens with reduced jump height. |
| **Rewind** | Returns you to a recent position and clears disruptive status effects. |
| **Gust** | Creates wind that propels players and physics objects. |
| **Glider** | Enables a controlled glide after jumping. |
| **Switch** | Swaps positions with a targeted player. |
| **Hook** | Pulls you toward another player. |
| **Block Wall** | Creates a temporary physical barrier. |
| **Boost** | Provides a burst of forward acceleration. |
| **Rock Slam** | Slams down, then provides a resistant rock form. |
| **Bumper Field** | Repels players and physics objects on contact. |
| **Pollo Stick** | Chains increasingly high and long bounces. |

The catalogue has continued expanding, including Hook, Block Wall, Boost, Rock Slam, Bumper Field, and Pollo Stick during 2026. [Console Update](https://live.web.stumbleguys.com/news/the-speed-of-stumbling?utm_source=chatgpt.com)

**11. Stumble Guys: obstacle and arena mechanics**

- Rotating platforms and floor sections.
- Tilting seesaws and unstable floors.
- Moving walls and block waves.
- Gaps, barriers, and breakable sections within block patterns.
- Hammers, swinging obstacles, pushers, and spinning hazards.
- Cannons, cannonballs, bombs, and falling debris.
- Trampolines and launch pads.
- Ice, mud, slides, and speed-boosting surfaces.
- Low-gravity sections.
- Disappearing tiles and collapsing arenas.
- Rising lava, acid, water, and other elimination zones.
- Moving lasers, laser walls, and expanding laser rings.
- Vehicle platforms and traffic-based survival.
- Sinking terrain and floating objects.
- Escalating speed or hazard density.
- Randomised obstacle arrangements.
- Harder **Legendary** variants.
- **Endless** variants of supported challenges.
- Community movement techniques such as shortcuts and side clutches.

The exact combination changes by map and variant. [Stumble Guys Help Center](https://stumbleguys.helpshift.com/hc/en/4-stumble-guys/faq/103-what-are-the-available-maps/?han=1\&utm_source=chatgpt.com)

**12. Stumble Guys: modes and match formats**

| Mode/format | Main structure |
|---|---|
| Classic | Casual, successive knockout rounds. |
| Ranked | Placement-based competitive matches and Rank Points. |
| Events | Rotating maps, rules, rewards, and collaborations. |
| Tournaments | Competitive formats with their own entry and prize rules. |
| Custom Party | Private matches with configurable settings. |
| Teams | Shared team competition. |
| Grand Prix | Points accumulated across up to ten rounds. |
| Practice | Custom setups for practising maps and mechanics. |
| Race | Finish before the qualification cutoff. |
| Solo elimination | Survive until the required number remain. |
| Team elimination | Outperform opposing teams. |
| Collection | Gather the required items or score. |

Player counts vary: the game advertises **up to 32 players**, while its current help page describes **Classic as up to 24**. Custom parties support up to 32. [stumbleguys.com](https://www.stumbleguys.com/?utm_source=chatgpt.com)

Additional event formats have included:

| Format | Documented structure |
|---|---|
| Original | 32 players, three rounds. |
| Showdown | Eight players, one round. |
| Duel | Two players, one round. |
| Clash | Four players, three rounds. |
| Turbo | 16 players, three rounds. |
| Blitz | 32 players, one round. |

These are event configurations, so they are not all permanent queues. [Console Update](https://live.web.stumbleguys.com/news/the-speed-of-stumbling?utm_source=chatgpt.com)

**Ranked mechanics**

- Rank Points gained or lost through placement.
- Wood, Bronze, Silver, Gold, Platinum, Master, and Champion ranks.
- Tier progression.
- Seasonal resets.
- Seasonal cosmetic rewards.
- Rank-dependent map pools.
- Season-specific allowed abilities.
- Competitive leaderboards.
- Platform-specific ranked differences. [Stumble Guys Help Center](https://stumbleguys.helpshift.com/hc/en/4-stumble-guys/faq/162-how-does-ranked-mode-work/?utm_source=chatgpt.com)

**13. Stumble Guys: specialised gameplay systems**

These apply to particular maps or events.

| System | Mechanics |
|---|---|
| Vehicle racing | Driving, steering, jumping, nitro, and vehicle-course transitions. |
| Shooter modes | Aiming, firing, ammunition, health, and shields. |
| Stumblewood Arena | Weapon pickups, free-for-all combat, and a shrinking safe zone. |
| Stumble Rumble | Arena combat, weapons, collapsing terrain, and limited lives. |
| Stumble & Seek | Hiders disguise themselves as props; seekers search for them. |
| Forced disguise changes | Prop-hunt transformations periodically expose clues. |
| Team race scoring | Finishing positions contribute points to the team. |
| Team revivals | Supported survival variants allow teammates to return eliminated players. |
| Stumble & Dragons | Dungeon rooms, enemies, assigned class abilities, and an advancing threat. |
| Hero Exam | Special powers, robot enemies, and a large robot obstacle encounter. |
| Stumble Cup | Team football, kickoff resets, goals, and sudden-death overtime. |

These modes add mechanics far beyond the ordinary obstacle race. [Stumble Guys Help Center](https://stumbleguys.helpshift.com/hc/en/4-stumble-guys/faq/76-what-are-my-controls-when-in-a-match/?hpn=1\&utm_source=chatgpt.com)

**Extras and collaboration powers**

Extras are event-provided powers, separate from the ordinary owned-ability loadout. Examples include:

- **One for All:** enhanced movement and a shockwave punch.
- **Explosion:** explosive jumps.
- **Half Cold:** creates an ice ramp.
- **Frog Form:** enhanced jumping and tongue grappling.
- **Gigantification:** changes size, movement, resistance, and attack.
- **Haymaker:** disrupts opposing football players.
- **Ball Freeze:** freezes the football.
- **Boot:** delivers a powerful football kick.
- **Rolling Snowball:** growing snowball transformation.
- **Snowman:** transformation with snowball throwing.
- **Bunny Hop, Chasing Chickens, and Egg Mines:** seasonal Extras.
- Other event-specific transformations, attacks, and movement modifiers.

Approved content creators also have documented access to configure Extras in custom parties. [My Hero Academia is Here!](https://www.stumbleguys.com/news/Update076?utm_source=chatgpt.com)

**14. Stumble Guys: progression, currencies, and rewards**

- Account experience and levels.
- **Stumble Journey:** longer-term progression rewards.
- Crowns and profile statistics.
- Ranked progression and rewards.
- Event milestones and leaderboards.
- **Stumble Pass:** free and premium rewards.
- **Regular and Deluxe premium options.**
- **Daily Missions:** refresh regularly.
- **Seasonal Missions:** remain available through the season.
- Additional Deluxe missions.
- **Stars:** mission rewards used to progress the pass.
- **Gems:** premium currency.
- **Stumble Coins:** currency replacing the older Stumble Tokens.
- **Ability Keys:** ability unlocking.
- **Ability Tokens:** ability upgrades.
- **Tournament Tickets:** entry to supported tournaments.
- **Event currencies:** temporary reward currencies.
- **Cosmetic shards:** progress toward particular unlocks.
- Duplicate cosmetic conversion.
- Lucky wheels and prize boxes.
- Shop purchases, bundles, and rotating offers.
- Rewarded adverts and other advertised reward opportunities on supported platforms.
- Community-wide challenges and shared rewards.

In the updated pass system, premium passes use in-app purchases; the previous gem activation method was removed. Console versions can follow a different update schedule. [Stumble Guys Help Center](https://stumbleguys.helpshift.com/hc/en/4-stumble-guys/faq/107-what-are-the-stumble-currencies/?af_ad_id=901\&af_sub1=a_6094b_435c_\&btag=a_6094b_435c_\&pid=incomeaccess_int-6094\&siteid=6094\&utm_source=chatgpt.com)

**15. Stumble Guys: customisation and social features**

**Character customisation**

- Stumbler skins.
- Skin colours.
- Additional colour/material options on selected skins.
- Common, Uncommon, Rare, Epic, Legendary, Mythic, and Special rarity categories.
- Footstep trails.
- Cosmetic emotes.
- Taunt animations.
- Victory animations.
- Special character animations.
- Collaboration cosmetics.
- Cosmetic previews, sorting, and filters.
- Separate ability loadout management. [Stumble Guys Help Center](https://stumbleguys.helpshift.com/hc/en/4-stumble-guys/section/34-customize-cosmetics-abilities/?utm_source=chatgpt.com)

**Custom parties**

- Join codes and invitations.
- Player-count selection.
- Map and map-pool selection.
- Round-count selection.
- Classic, Teams, and Grand Prix formats.
- Manual team assignment and team sizes.
- AI bot filling.
- Ability on/off settings.
- Favourite maps.
- Editing a room without recreating it.
- Practice and community tournament setups.

Custom parties do not award normal XP, crowns, or pass progression. [Stumble Guys Help Center](https://stumbleguys.helpshift.com/hc/en/4-stumble-guys/faq/261-new-custom-party/?utm_source=chatgpt.com)

**Clubs**

- Create, browse, search, and join clubs.
- Open and restricted membership.
- Club names, tags, descriptions, regions, and languages.
- Custom club badges.
- Member lists and online status.
- Leadership and moderation roles.
- Daily and weekly club goals.
- Shared club points.
- Seasonal reward milestones.
- Badge upgrades.
- Consecutive-season achievement streaks. [Stumble Guys Help Center](https://stumbleguys.helpshift.com/hc/en/4-stumble-guys/faq/257-what-are-clubs/?%3Bp=web\&hpn=1\&utm_source=chatgpt.com)

**Retired creation feature: Stumble Workshop**

Workshop previously offered map building, templates, object placement, testing, publishing, share codes, favourites, and community levels. **The official April 2026 notice says Workshop was retired across platforms**, so it should not be listed as a current equivalent of Fall Guys Creative. [Stumble Guys Help Center](https://stumbleguys.helpshift.com/hc/en/4-stumble-guys/faq/133-stumble-workshop---important-update-april-2026/?han=1\&utm_source=chatgpt.com)

---

**16. Social, platform, and supporting features compared**

| Feature | Fall Guys | Stumble Guys |
|---|---|---|
| Friends and party invitations | Yes | Yes |
| Private matches | Custom Shows | Custom Parties |
| Cross-platform play | Supported | Supported between compatible platform/version groups |
| Cross-progression | Epic account linking | Scopely account linking on supported platforms |
| Nintendo Switch progression caveat | Uses Epic account systems | Official support says no Scopely linking/cross-progression |
| In-game voice chat | Party voice chat | Official help says unsupported |
| Quick nonverbal communication | Emotes, emoticons, phrases | Emotes and taunts |
| Local split-screen | No built-in split-screen | Available on supported consoles; Xbox documents 2–4 players |
| Community level creation | Creative editor on supported platforms | Workshop retired |
| Mobile community-level play | Yes | Workshop retirement affects its former creation system |
| Keyboard/controller/touch input | Platform-dependent | Platform-dependent |
| Spectating | Yes | Yes |
| Account/settings menus | Yes | Yes |
| Audio, input, language, and display options | Platform-dependent | Platform-dependent |
| Reporting and moderation tools | Yes, including voice reporting | Player/community reporting tools |
| Playable matchmaking waiting area | — | Documented interactive waiting area |

Cross-play, cross-progression, and split-screen are separate features; support for one does not establish support for the others. [Epic Games Store](https://store.epicgames.com/p/fall-guys?utm_source=chatgpt.com)
