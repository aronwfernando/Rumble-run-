# Remaining work after 1.2

This release does not complete the supplied master specification. The ledger
indexes explicit checklist items and prose requirements; its counts are not a
percentage estimate of project completion. Many entries overlap.

## Next gameplay and validation work

- Human WebGL playtests of all shipped modes, particularly sports, drum survival,
  extreme ascent and camera collisions; review responsive controls on real devices.
- Named Chromebook/laptop GPU measurements; real Render load/capacity tests;
  latency/jitter/underlying-network impairment tests. Only local measurements exist.
- Full constrained generation: controller-derived traversal envelopes, timing search,
  joint swept-volume placement, fairness metrics, near-duplicate rejection and a
  bounded retry/fallback worker. Current validation is structural.
- More authored arena geometry and reference study. The current sports, lap and
  ball-pushing arenas are small original approximations. Lap gates enforce order
  but not direction; ball pushing uses a straight lane; volleyball fault rules and
  goal volumes are simplified; hoarding picks highest score rather than a full
  lowest-team overtime system. All of these are marked partial.
- Translating ground, proper slides, wind/gravity/boost zones, ledge grab/mantle,
  player hold/release, trapezes, consent-based piggyback, portals and emotes.
- Full obstacle registry/schema/editor lifecycle for all supplied obstacle families.
  Some arena behaviours still live in objective code instead of reusable prefabs.
- Tutorial/onboarding, complete gamepad menu navigation, remappable controls,
  localization, expanded accessibility/audio and a true winner podium.

## Not implemented

Creator/editor tools, immutable published levels and community discovery; saved
profiles/history/cosmetics/challenges/passes; friends/clubs and moderation;
ranked/leaderboards; duos/squads and manual teams; scheduled tournaments; time
attack ghosts; the full abilities/equipment system; vehicles, shooters, prop hunt,
dungeon/robot/brawler/thief modes and other advanced event rules.

Bots remain disabled and unimplemented to preserve the user's human-only choice.
The attached specification's optional bot work is tracked, not silently replaced
with invented players. Paid advantages are not part of the shipped game.

## External dependencies

The current Render Web Service runs one process with ephemeral disk and in-memory
rooms. A deploy/restart ends those rooms. Reconnect resumes a slot only while that
process and room exist; expired/restarted sessions return an honest ended message.

Durable accounts, inventory, awards, ranked and community publishing require a
database, schema/migrations, authorization and transactional/idempotent writes.
No new paid database or instance was created. Purchases, premium currency, voice,
ads and third-party identity need real providers and credentials as well as code.
There are no pretend purchase buttons, fake checkout, synthetic leaderboard
entries or claims of persistent rewards.

## Upgrade / rollback

Deploy 1.2 from GitHub main with the existing Render build/start commands. Clients
on protocol 1 must reload; the handshake explains the version mismatch. Restarted
rooms end and users create a new room. No persistent data exists to migrate.

To revert this release, deploy commit `cd8ec50efbbf6d8e64e538546a210f60380f88b7`
(1.1.0) from Render. A rollback also restarts in-memory rooms and requires a client
reload. Do not force-push the shared branch for a rollback.
