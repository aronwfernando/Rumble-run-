# Baseline: 1.1.0

Inspected the shared controller and maps, client renderer/input/networking,
authoritative tournament/server, package lock, tests and Render configuration.
The existing engine is usable. Preserve it and extend shared rule/content data.

- GitHub main: `cd8ec50efbbf6d8e64e538546a210f60380f88b7`.
- Render deployment `dep-db22jp2jnfac73em1eog` is live.
- 41 regression checks passed in the prior release and on Render's build gate.
- 1,500 maps passed structural validation across 500 seeds; this is not human
  proof of playability or a temporal/crowd validation result.
- Vite production assets: HTML 3.38 kB, CSS 4.99 kB, JS 193.91 kB gzip.
- Local 30-body/600-tick smoke benchmark: 0.408 ms average per tick. It is not a
  Render capacity or client frame-rate measurement.
- The available cloud browser has WebGL disabled. GPU frame time, memory,
  actual visual output and subjective movement feel are unverified. Do not
  interpret CPU scene-transform tests as a rendered human playtest.

Baseline gaps: no objective strategy registry, authored mechanical presets,
server-secret puzzle manifest, practice, editable lobby, durable progression,
editor/community system, abilities, teams or expanded modes. Current player
bodies pass through each other. Networking uses soft correction rather than
acknowledged input replay. Public snapshots expose procedural puzzle choices.

Preserve the default human-only skill rules. New optional rules belong in
clearly described custom modes; never silently activate bots or abilities.

Operations: one free Render web service. Matches are process-local and abort
on restart. Durable profile/editor/economy data requires external storage;
the ephemeral service filesystem is not suitable. Paid services, real-money
checkout, adverts, voice and third-party identity are not configured.
