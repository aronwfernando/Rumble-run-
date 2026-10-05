# Play online with friends

Rumble Run is a browser multiplayer game. Hosting this project on an online
server gives everyone a shared website to play on. Players need only a browser;
they do not install Node.js, Unity, or the source code. A `.io` domain is optional.

This package contains deployment configuration. It is not already deployed.

## Deploy on Render without using Terminal

1. Create a GitHub repository for this project. A private repository is fine.
   Upload the **contents** of the `rumble-run` folder, so `package.json`,
   `package-lock.json`, `server.js`, and `render.yaml` are in the repository root.
   Do not upload `node_modules`, `dist`, or a local `.env` file.
2. Sign in to [Render](https://dashboard.render.com/) and connect the GitHub
   account that can access this repository.
3. Select **New > Blueprint**, choose the repository, and review `render.yaml`.
   The configuration selects a free web service in Frankfurt for an initial
   playtest. Review the plan shown by Render before creating the service.
4. Deploy. Render installs the dependencies, runs the tests, builds the browser
   client, and starts the Node.js server. You do not run these commands on your Mac.
5. When Render reports the service is live, open the HTTPS URL it provides.
   Create a private room, copy the invite, and send it to your friends. Once
   at least two people have joined, the host can start the tournament.

Render must be allowed to read the repository; connecting GitHub to another app
does not automatically grant Render access. If creating a web service manually
instead of using a Blueprint, use these settings:

| Setting | Value |
| --- | --- |
| Service type | Web Service |
| Runtime | Node |
| Build command | `npm ci --include=dev && npm test && npm run build` |
| Start command | `npm start` |
| Health check path | `/healthz` |
| Environment | `NODE_VERSION=24`, `NODE_ENV=production`, `HOST=0.0.0.0` |
| Playtest capacity | `MAX_ROOMS=2`, `MAX_CONNECTIONS=60` |
| Automatic deployments | Off |

Leave `PORT` to Render. Leave `ALLOWED_ORIGINS` unset: the game accepts browser
connections from the same host serving the game. For a custom proxy that changes
the Host header, set `ALLOWED_ORIGINS` to your exact public HTTPS origin, without
a trailing slash. Do not set it to `localhost` for the online game.

## Playing and operating the server

- Your computer can be switched off after deployment. The hosting service runs
  the match server.
- The game has no bots. Private rooms support 4–8 rounds, procedural maps, and
  up to 30 human players each. The initial hosting limits allow two rooms and
  60 total connections; that is a configured limit, not a performance guarantee.
- Render's free service sleeps after 15 minutes without inbound traffic and
  can take about a minute to wake. It is suitable for initial playtesting;
  an always-on plan is better for regular play. Review current plans in Render.
- Rooms and matches live in the server's memory. Restarting, redeploying, or
  suspending it clears them. Automatic deployments are off to avoid interrupting
  matches every time code is pushed. Deploy updates between games.
- Keep this game on **one server instance**. Multiple independent replicas do
  not share room state. A larger public launch needs shared matchmaking and
  room routing before horizontal scaling.

## If the page opens but players cannot connect

Confirm that you deployed a **Web Service**, using the build and start commands
above. Static-only hosting cannot run this project's multiplayer server. Check
`/healthz` on the service's HTTPS URL, review the Render logs, and check that
`ALLOWED_ORIGINS` does not still contain a local development address.

## Downloadable editions

Unity would require a new Unity client and suitable multiplayer integration;
these JavaScript files are not a Unity project. A native build would also need
to be compiled and tested in Unity for each target platform. Online multiplayer
still needs a reachable server or a relay. Hosting this browser edition is the
shortest route to letting friends play from a shared link.

## Hosting references

- [Render Node.js deployment](https://render.com/docs/deploy-node-express-app)
- [Blueprint configuration](https://render.com/docs/blueprint-spec)
- [WebSocket support](https://render.com/docs/websocket)
- [Free service limits](https://render.com/docs/free)
- [Node.js versions](https://render.com/docs/node-version)

Hosting details checked on 5 October 2026.
