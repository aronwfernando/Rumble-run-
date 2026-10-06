import test from 'node:test';
import assert from 'node:assert/strict';
import { io as connect } from 'socket.io-client';
import { createGameServer } from '../server.js';
import { PROTOCOL_VERSION, decodeFrame } from '../shared/protocol.js';

function nextEvent(socket, event, timeout = 4000, predicate = () => true) {
  const snapshot = event === 'snapshot'; if (snapshot) event = 'frame';
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, received);
      reject(new Error(`Timed out waiting for ${event}`));
    }, timeout);
    function received(value) {
      if (snapshot) value = decodeFrame(value, socket.testRoster || []);
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
      auth: { token, protocol: PROTOCOL_VERSION },
    });
    socket.on('welcome', data => socket.testRoster = data.state.players);
    socket.on('state', data => socket.testRoster = data.players);
    clients.push(socket);
    return socket;
  }
  return { game, origin, client };
}

test('real room sockets enforce host settings, readiness, transfer and removal',async t=>{
  const {game,client}=await fixture(t);
  const host=client(),friend=client();const joined=Promise.all([nextEvent(host,'connect'),nextEvent(friend,'connect')]);host.connect();friend.connect();await joined;
  const welcome=nextEvent(host,'welcome');await host.timeout(4000).emitWithAck('join',{mode:'create',name:'Host'});const identity=await welcome;
  const fw=nextEvent(friend,'welcome');await friend.timeout(4000).emitWithAck('join',{mode:'join',name:'Friend',code:identity.state.code});const f=await fw;
  assert.match((await friend.timeout(4000).emitWithAck('room-settings',{rounds:8})).error,/host/);
  await friend.timeout(4000).emitWithAck('ready',true);
  const room=game.rooms.get(identity.state.code);assert.equal(room.players.get(f.id).ready,true);
  const changed=await host.timeout(4000).emitWithAck('room-settings',{format:'grandprix',rounds:10,objective:'football',theme:'pirate-islands'});
  assert.equal(changed.ok,true);assert.equal(room.players.get(f.id).ready,false);assert.equal(room.courseDeck.length,10);
  assert.equal((await host.timeout(4000).emitWithAck('transfer-host',f.id)).ok,true);
  assert.match((await host.timeout(4000).emitWithAck('start')).error,/host/);
  const removed=nextEvent(host,'removed-from-room');assert.equal((await friend.timeout(4000).emitWithAck('kick',identity.id)).ok,true);await removed;
  assert.equal(room.players.size,1);assert.equal(game.sessions.has(identity.token),false);
});

test('two real clients receive the same arena object owner, goal score and reconnect state',async t=>{
  const {game,client}=await fixture(t,{timings:{countdown:0}});
  const host=client(),friend=client();const joined=Promise.all([nextEvent(host,'connect'),nextEvent(friend,'connect')]);host.connect();friend.connect();await joined;
  const welcome=nextEvent(host,'welcome');await host.timeout(4000).emitWithAck('join',{mode:'create',name:'Host',objective:'basketball'});const identity=await welcome;
  await friend.timeout(4000).emitWithAck('join',{mode:'join',name:'Friend',code:identity.state.code});await host.timeout(4000).emitWithAck('start');
  const room=game.rooms.get(identity.state.code);while(room.phase!=='playing')await nextEvent(host,'snapshot');
  const ball=room.physics.objects.get('ball');room.physics.teleport(identity.id,[0,1,0]);room.players.get(identity.id).respawnUntil=0;room.physics.players.get(identity.id).respawnUntil=0;ball.body.position.set(0,1,-1);
  host.emit('input',{roundKey:room.roundKey,seq:1,x:0,z:0,jump:0,dive:0,grab:1});
  const owned=await Promise.all([host,friend].map(s=>nextEvent(s,'snapshot',4000,f=>f.objective?.objects[0].owner===identity.id)));
  assert.equal(owned[0].objective.objects[0].owner,owned[1].objective.objects[0].owner);
  room.objective.drop(room.players.get(identity.id));room.objective.goal(0,ball);
  const scored=await Promise.all([host,friend].map(s=>nextEvent(s,'snapshot',4000,f=>f.objective?.teams[0]===1)));
  assert.deepEqual(scored[0].objective.teams,scored[1].objective.teams);
  host.disconnect();const reconnected=client(undefined,identity.token);const resumed=nextEvent(reconnected,'welcome');reconnected.connect();assert.equal((await resumed).id,identity.id);
  const frame=await nextEvent(reconnected,'snapshot');assert.deepEqual(frame.objective.teams,[1,0]);assert.equal(room.players.size,2);
});

test('sixteen WebSocket clients agree on the winner through a four-round tournament',async t=>{
  const {game,client}=await fixture(t,{timings:{countdown:0,intermission:0,raceSeconds:.15,survivalSeconds:.15,finalSeconds:.15}});
  const clients=Array.from({length:16},()=>client());const connections=clients.map(s=>nextEvent(s,'connect'));clients.forEach(s=>s.connect());await Promise.all(connections);
  const welcome=nextEvent(clients[0],'welcome');await clients[0].timeout(4000).emitWithAck('join',{mode:'create',name:'Load test 1',rounds:4,capacity:16,seed:'sixteen-sockets'});const identity=await welcome;
  const joined=await Promise.all(clients.slice(1).map((s,i)=>s.timeout(4000).emitWithAck('join',{mode:'join',name:'Load test '+(i+2),code:identity.state.code})));
  assert.ok(joined.every(result=>result.ok));
  const endings=clients.map(s=>nextEvent(s,'state',5000,value=>value.phase==='finished'));
  await clients[0].timeout(4000).emitWithAck('start');const results=await Promise.all(endings);
  assert.ok(results[0].winner);assert.ok(results.every(r=>r.round===3&&r.winner===results[0].winner&&r.players.length===16));
  assert.equal(game.rooms.get(identity.state.code).players.size,16);
});

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
