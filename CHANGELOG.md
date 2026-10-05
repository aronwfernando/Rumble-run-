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
