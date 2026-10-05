import test from 'node:test';
import assert from 'node:assert/strict';
import { io as connect } from 'socket.io-client';
import { createGameServer } from '../server.js';

function nextEvent(socket, event, timeout = 4000, predicate = () => true) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, received);
      reject(new Error(`Timed out waiting for ${event}`));
    }, timeout);
    function received(value) {
      if (!predicate(value)) return;
      clearTimeout(timer);
      socket.off(event, received);
      resolve(value);
    }
    socket.on(event, received);
  });
}

async function fixture(t, options = {}) {
  const game = await createGameServer({ allowedOrigins: [], ...options });
  const clients = [];
  t.after(async () => {
    for (const client of clients) client.disconnect();
    await game.close();
  });
  await new Promise(resolve => game.http.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${game.http.address().port}`;
  function client(browserOrigin = origin, token = '') {
    const socket = connect(origin, {
      autoConnect: false, forceNew: true, reconnection: false,
      transports: ['websocket'], extraHeaders: { Origin: browserOrigin },
      auth: { token },
    });
    clients.push(socket);
    return socket;
  }
  return { game, origin, client };
}

test('production server supports two browser clients joining and starting a private match', async t => {
  const { game, origin, client } = await fixture(t);
  const health = await fetch(`${origin}/healthz`);
  assert.equal(health.status, 200);
  assert.equal((await health.json()).ok, true);
  const host = client(), friend = client();
  const connected = Promise.all([nextEvent(host, 'connect'), nextEvent(friend, 'connect')]);
  host.connect(); friend.connect();
  await connected;

  const hostWelcome = nextEvent(host, 'welcome');
  const created = await host.timeout(4000).emitWithAck('join', {
    mode: 'create', name: 'Host', rounds: 6, seed: 'online-check',
  });
  assert.equal(created.ok, true);
  const { state } = await hostWelcome;
  assert.match(state.code, /^[A-F0-9]{6}$/);

  const friendWelcome = nextEvent(friend, 'welcome');
  const joined = await friend.timeout(4000).emitWithAck('join', {
    mode: 'join', name: 'Friend', code: state.code,
  });
  assert.equal(joined.ok, true);
  assert.equal((await friendWelcome).state.players.length, 2);
  assert.equal((await host.timeout(4000).emitWithAck('start')).ok, true);

  const [hostSnapshot, friendSnapshot] = await Promise.all([
    nextEvent(host, 'snapshot'), nextEvent(friend, 'snapshot'),
  ]);
  assert.equal(hostSnapshot.roundKey, friendSnapshot.roundKey);
  assert.equal(hostSnapshot.players.length, 2);
  assert.equal(game.rooms.get(state.code).settings.rounds, 6);
  assert.ok([...game.rooms.get(state.code).players.values()].every(player => !player.bot));
});

test('live sockets move, respawn, reconnect, and receive elimination without duplicate players or actions', async t => {
  const { game, client } = await fixture(t, { timings: { countdown: 0 } });
  const host = client(), friend = client();
  const connections = Promise.all([nextEvent(host, 'connect'), nextEvent(friend, 'connect')]);
  host.connect(); friend.connect(); await connections;
  const welcomed = nextEvent(host, 'welcome');
  await host.timeout(4000).emitWithAck('join', { mode: 'create', name: 'Host', seed: 'movement-network' });
  const identity = await welcomed;
  await friend.timeout(4000).emitWithAck('join', { mode: 'join', name: 'Friend', code: identity.state.code });
  await host.timeout(4000).emitWithAck('start');
  const room = game.rooms.get(identity.state.code), id = identity.id;
  // This fixture drives the authoritative process; all commands and feedback
  // still cross real WebSockets, including the reconnect handshake.
  while (room.phase !== 'playing') await nextEvent(host, 'snapshot');
  const before = room.physics.snapshot(id).p[2];
  for (let seq = 1; seq <= 6; seq++) {
    host.emit('input', { roundKey: room.roundKey, seq, x: 0, z: -1, jump: 0, dive: 0, grab: 0 });
    await nextEvent(host, 'snapshot');
  }
  assert.ok(room.physics.snapshot(id).p[2] < before - 0.4);
  const resetEvents = Promise.all([nextEvent(host, 'player-event'), nextEvent(friend, 'player-event')]);
  assert.equal((await host.timeout(4000).emitWithAck('reset-checkpoint')).ok, true);
  for (const event of await resetEvents) { assert.equal(event.type, 'respawn'); assert.equal(event.id, id); }
  assert.match((await host.timeout(4000).emitWithAck('reset-checkpoint')).error, /moment/);
  assert.equal(room.players.get(id).falls, 1);
  host.disconnect();
  const replacement = client(undefined, identity.token);
  const resumed = nextEvent(replacement, 'welcome'); replacement.connect();
  assert.equal((await resumed).id, id);
  assert.equal(room.players.size, 2);
  assert.equal(room.players.get(id).connected, true);
  while (room.snapshot().players.find(p => p.id === id).respawnLeft > 0) await nextEvent(replacement, 'snapshot');
  replacement.emit('input', { roundKey: room.roundKey, seq: 7, x: 0, z: 0, jump: 1, dive: 0, grab: 0 });
  await nextEvent(replacement, 'snapshot');
  assert.equal(room.players.get(id).jumps, 1);
  for (let seq = 8; seq <= 28; seq++) {
    replacement.emit('input', { roundKey: room.roundKey, seq, x: 0, z: 0, jump: 1, dive: 0, grab: 0 });
    await nextEvent(replacement, 'snapshot');
  }
  assert.ok(room.physics.players.get(id).grounded, 'repeated counters must not trigger another jump');
  // A final survival fall must arrive reliably and declare the other winner.
  room.round = room.settings.rounds - 1;
  const { generateMap } = await import('../shared/maps.js');
  room.courseDeck[room.round] = generateMap({ type: 'final', variant: 'last-spinner' });
  room.beginRound(); room.step();
  const eliminated = nextEvent(replacement, 'player-event');
  const ended = nextEvent(replacement, 'state', 4000, value => value.phase === 'finished');
  room.physics.teleport(id, [0, -50, 0]); room.step();
  assert.equal((await eliminated).type, 'eliminated');
  const result = await ended;
  assert.equal(result.phase, 'finished');
  assert.notEqual(result.winner, id);
});

test('production server rejects a WebSocket connection from an unrelated browser origin', async t => {
  const { client } = await fixture(t);
  const outsider = client('https://unrelated.example');
  const rejected = nextEvent(outsider, 'connect_error');
  outsider.connect();
  assert.ok(await rejected);
  assert.equal(outsider.connected, false);
});
