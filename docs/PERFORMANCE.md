# Performance and validation: 1.2

These measurements distinguish server simulation, encoded network traffic and scene
complexity from actual browser rendering. No GPU FPS measurement or human playtest
is claimed. The available browser has WebGL disabled.

## Production transfer

| Asset | Gzip bytes |
|---|---:|
| dist/index.html | 4028 |
| dist/assets/index-DYoBugQ5.js | 201881 |
| dist/assets/index-CVgWnfVk.css | 5319 |

Total initial HTML/JS/CSS: 211228 gzip bytes. No external textures/models/fonts. Maps arrive after joining a room.

## Local authoritative simulation and traffic

Runtime v24.19.0 on linux. CPU model is not exposed by this container.
One room at a time; up to 600 fixed steps (10 simulated seconds) with synthetic
input, stopping early when an arena resolves. This is not a Render load test.

| Players | Mode | Steps | Mean ms | p95 ms | Max ms | Downstream bytes/sec/client |
|---:|---|---:|---:|---:|---:|---:|
| 16 | generated-race | 600 | 0.49 | 1.447 | 13.097 | 20745 |
| 16 | collection | 600 | 0.523 | 1.068 | 4.416 | 30018 |
| 16 | rolling | 207 | 0.306 | 1.188 | 5.039 | 22673 |
| 16 | football | 600 | 0.265 | 0.384 | 0.73 | 23353 |
| 24 | generated-race | 600 | 0.369 | 0.755 | 4.542 | 28421 |
| 24 | collection | 600 | 0.558 | 0.799 | 3.731 | 37702 |
| 24 | rolling | 207 | 0.333 | 1.149 | 1.996 | 30391 |
| 24 | football | 600 | 0.393 | 0.606 | 0.862 | 31032 |
| 30 | generated-race | 600 | 0.346 | 0.51 | 1.455 | 34185 |
| 30 | collection | 600 | 0.621 | 0.836 | 2.326 | 43461 |
| 30 | rolling | 207 | 0.413 | 1.355 | 2.156 | 36179 |
| 30 | football | 600 | 0.535 | 0.839 | 3.839 | 36794 |

Traffic includes Socket.IO encoding and an estimated WebSocket frame allowance,
excluding TLS/TCP, retransmissions, initial manifests and state changes. It is not
a captured WAN throughput trace. The measured default 16-player cases stay below
40 KB/sec; 30-player egg collection exceeds that target (~43.5 KB/sec). The player
cap remains 30, not 32. Supported capacity does not establish production headroom.

## Render complexity, without GPU execution

Instanced scene graph, 30 visible beans and original arena geometry:

| Mode | Estimated draw submissions | Triangles |
|---|---:|---:|
| memory | 24 | 34588 |
| rolling | 6 | 35252 |
| pattern | 12 | 35276 |
| football | 12 | 35336 |
| blast | 8 | 34696 |
| charge | 8 | 34484 |
| reactive | 9 | 35036 |

These estimates are within the 100-draw / 100k-triangle target for the measured
scenes. They do not establish actual draw counts on all drivers, memory use or FPS.
Instancing follows the official Three.js contract for per-instance matrices/colours:
https://threejs.org/docs/pages/InstancedMesh.html . Camera ray tests follow
https://threejs.org/docs/pages/Raycaster.html .

## Regression and generation scope

The complete suite includes real local WebSocket clients, a 16-client tournament,
carry/goal/reconnect consistency, movement edge cases, host permission checks,
secret-safe manifests, 23 arena terminations and 20 consecutive tournament resets.
Scene tests use a recording renderer. Listener/player counts are checked across
resets; process/GPU memory growth has not been measured.

5000 maps across 1000 reproducible seeds passed; 1000 unique structural race
fingerprints, 11 difficulty samples, 30 supported spawns per map, maximum 111
platforms and 38 hazards. Invalid: 0. Rejected/fallbacks: 0 because no bounded
retry/fallback search exists yet. This proves neither temporal hazard solvability
nor human difficulty/fairness.

## Still required

Named low-end device and mobile/browser GPU tests; subjective control/map playtests;
Render CPU/memory/concurrency tests; realistic packet loss/jitter and WebSocket
head-of-line tests; generation timing search; long-running memory soak; full UI
keyboard/controller/touch audit. Free Render hosting can cold-start and in-memory
rooms do not survive a deployment. No always-on or universal-60-FPS claim is made.
