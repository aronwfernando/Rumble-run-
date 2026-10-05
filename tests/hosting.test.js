import test from 'node:test';
import assert from 'node:assert/strict';
import { io as connect } from 'socket.io-client';
import { createGameServer } from '../server.js';

function nextEvent(socket, event, timeout = 4000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, received);
      reject(new Error(`Timed out waiting for ${event}`));
    }, timeout);
    function received(value) {
      clearTimeout(timer);
      resolve(value);
    }
    socket.once(event, received);
  });
}

async function fixture(t) {
  const game = await createGameServer({ allowedOrigins: [] });
  const clients = [];
  t.after(async () => {
    for (const client of clients) client.disconnect();
    await game.close();
  });
  await new Promise(resolve => game.http.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${game.http.address().port}`;
  function client(browserOrigin = origin) {
    const socket = connect(origin, {
      autoConnect: false, forceNew: true, reconnection: false,
      transports: ['websocket'], extraHeaders: { Origin: browserOrigin },
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

test('production server rejects a WebSocket connection from an unrelated browser origin', async t => {
  const { client } = await fixture(t);
  const outsider = client('https://unrelated.example');
  const rejected = nextEvent(outsider, 'connect_error');
  outsider.connect();
  assert.ok(await rejected);
  assert.equal(outsider.connected, false);
});
