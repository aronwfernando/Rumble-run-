# Rumble Run 1.2.0

- Added solo practice, 4–10-round Grand Prix, Party arenas and focus-course selection.
- Added 23 original arena rules and 23 ordered/reference-inspired presets. Sports,
  carrying, ribbons, memory, 3×3 patterns and survival hazards now use server rules
  and matching HUD/geometry. These are approximations, not exact reference maps.
- Added eight distinct scenic themes; retained generated layouts and human-only play.
- Added room capacity, ready indicators, editable settings, host transfer and kick.
- Added camera collision avoidance, optional second-press dive, look inversion,
  persistent browser preferences and selectable/previous spectator targets.
- Added instanced geometry batching and compact protocol-2 player/object snapshots.
- Fixed disconnected object holders, departed-avatar ghosts, final preset rules,
  repeated goal scoring, memory-floor restoration and simultaneous final results.
- Added a requirement ledger, reference catalogue, performance report and explicit
  remaining work. Persistent accounts, economy, creator publishing, advanced modes
  and the complete expansion specification remain unfinished.

# Rumble Run 1.1.0

- Fixed wall sticking caused by physics friction counteracting gravity. Course
  collisions remain solid; ground grip now comes from the movement controller.
- Added faster, direction-independent acceleration, air steering, buffered and
  coyote jumps, a forward dive with a short recovery, and quicker stun recovery.
  Beans pass through one another to prevent crowd trapping.
- Smoothed local fixed-step rendering, remote snapshots, reconciliation, camera
  following, and bean animations. Stopped stale movement after blur or disconnect.
- Added checkpoint recovery feedback, a server-controlled reset button and R
  shortcut, explicit qualification/elimination overlays, and spectator status.
- Added camera-relative movement, camera dragging and recentering, right-click
  jump, gamepad controls, camera settings, and reduced camera motion.
- Added easy/normal/hard difficulty and a races-only tournament option. All
  matches remain human-only, skill-based, and 4–8 rounds long.
- Remixed race families with guest sections, separated combined hazards,
  visible checkpoints, varied scenery, and stage-based difficulty.
- Added regression coverage for physics, input, scene transforms, interpolation,
  checkpoint reset, reconnect, and reliable multiplayer elimination events.

GPU rendering and subjective game feel still need playtesting in a WebGL-enabled
browser. Structural map checks establish a route, not perfectly equal difficulty
across every seed. Free Render services may cold-start after inactivity; rooms
are in memory and a deployment restarts them.
