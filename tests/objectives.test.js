import test from 'node:test';
import assert from 'node:assert/strict';
import { Tournament } from '../server/tournament.js';
import { createArena } from '../shared/arenas.js';
import { OBJECTIVES } from '../shared/objectives.js';
import { validateMap } from '../shared/map-validation.js';
import { verifyPublicMap } from '../shared/content.js';

function roomFor(rule,{count=4,practice=false,format='knockout',final=false,...options}={}){
  const room=new Tournament('ARENA0',{objective:rule,rounds:4,practice,format,seed:'arena-test',timings:{countdown:0,intermission:0},...options});
  const players=Array.from({length:count},(_,i)=>room.addHuman({name:'Bean '+i,color:'#ff658c'}));
  if(final){room.round=3;room.beginRound();}else room.start(players[0].id);
  room.step();return {room,players,objective:room.objective};
}

test('every arena has supported spawns and completes a bounded server round',()=>{
  for(const rule of Object.keys(OBJECTIVES)){
    for(let i=0;i<8;i++)assert.equal(validateMap(createArena(rule,{seed:'arena-'+i})),true,rule);
    const {room}=roomFor(rule);
    assert.equal(verifyPublicMap(room.state().map),true,rule);
    for(let i=0;i<90&&room.phase==='playing';i++)room.step();
    assert.ok(room.snapshot().players.every(p=>!p.p||p.p.every(Number.isFinite)),rule);
    room.time=room.roundLimit+0.1;room.step();
    if(room.phase==='playing'){assert.equal(room.objective.overtime,true,rule);room.time=room.roundLimit+0.1;room.step();}
    assert.ok(['results','finished'].includes(room.phase),rule);
  }
});

test('memory reveals symbols only during the preview and restores the removed floor',()=>{
  const {room,objective}=roomFor('memory');
  room.time=0.1;objective.step();
  assert.equal(objective.snapshot().symbols.length,16);
  assert.equal(objective.snapshot().answer,undefined);
  room.time=7.2;objective.step();
  assert.equal(objective.snapshot().symbols,undefined);
  const missing=[...room.physics.platforms.values()].filter(p=>p.removed);
  assert.equal(missing.length,12);
  const original=missing[0].dropAt;
  room.time=8;objective.step();assert.equal(missing[0].dropAt,original,'a removed floor must continue its drop animation');
  room.time=11.1;objective.step();
  assert.equal([...room.physics.platforms.values()].some(p=>p.removed),false);
});

test('a goal scores once, pauses play, and a new serve has momentum after the pause',()=>{
  const {room,objective}=roomFor('football');
  const ball=room.physics.objects.get('ball');ball.body.position.set(22,1,0);
  room.time=1;objective.step();assert.deepEqual(objective.teamScores,[1,0]);
  for(let i=0;i<20;i++)room.step();
  assert.deepEqual(objective.teamScores,[1,0]);assert.equal(objective.snapshot().locked,true);
  const volley=roomFor('volleyball');const v=volley.room.physics.objects.get('ball');
  v.body.position.set(5,0.8,0);volley.room.time=1;volley.objective.step();
  volley.room.time=2;volley.objective.step();assert.equal(v.body.velocity.x,0);
  volley.room.time=3;volley.objective.step();assert.ok(v.body.velocity.x<0);
});

test('objects have a single holder, respect facing and walls, and drop on disconnect',()=>{
  const {room,players:[a,b],objective}=roomFor('collection');
  const object=room.physics.objects.get('egg-0');
  for(const other of room.physics.objects.values())if(other!==object)other.body.position.set(12,1,12);
  room.physics.teleport(a.id,[0,1,0]);room.physics.teleport(b.id,[0,1,0]);
  object.body.position.set(0,1,1);objective.time=1;objective.interact(a);
  assert.equal(a.holding,null,'cannot grab behind the bean');
  object.body.position.set(0,1,-1);objective.time=2;objective.interact(a);
  assert.equal(object.owner,a.id);assert.equal(a.holding,object.data.id);
  objective.interact(b);assert.equal(object.owner,a.id,'pickup protection prevents immediate stealing');
  objective.time=3;objective.interact(b);assert.equal(object.owner,b.id);assert.equal(a.holding,null);
  room.setConnected(b.id,false);assert.equal(object.owner,null);assert.equal(b.holding,null);assert.equal(object.body.collisionFilterMask,7);
  // The volleyball net is a real occluding collider.
  const net=roomFor('volleyball');const bean=net.players[0];net.room.physics.teleport(bean.id,[-1,1,0]);net.room.physics.players.get(bean.id).face=-Math.PI/2;
  assert.equal(net.objective.canReach(bean,[1,1,0]),false);
});

test('practice and early two-friend arenas respawn while a final eliminates',()=>{
  for(const options of [{practice:true,count:1},{count:2}]){
    const {room,players:[p],objective}=roomFor('lasers',options);
    objective.eliminate(p,'test beam');assert.equal(p.status,'racing');assert.equal(p.falls,1);assert.equal(room.phase,'playing');
  }
  const {room,players:[a,b],objective}=roomFor('lasers',{count:2,final:true});
  objective.eliminate(a,'Hit by the laser');objective.step();
  assert.equal(room.phase,'finished');assert.equal(room.winner,b.id);assert.equal(a.cause,'Hit by the laser');
});

test('rings require an airborne crossing and award a single claim to simultaneous contenders',()=>{
  const {room,players:[a,b],objective}=roomFor('hoops');
  const target=[...objective.targets.values()][0];
  for(const p of [a,b]){
    room.physics.teleport(p.id,[target.position[0],target.position[1],target.position[2]+0.1]);
    p.previousArenaPosition=[target.position[0],target.position[1],target.position[2]+0.2];
  }
  objective.time=1;objective.collect();assert.equal(a.score+b.score,0);
  for(const p of [a,b])p.previousArenaPosition[2]=target.position[2]-0.1;
  objective.collect();assert.equal(a.score+b.score,target.value);
  objective.collect();assert.equal(a.score+b.score,target.value,'a consumed ring cannot score twice');
});

test('a team puzzle has two genuine 3×3 boards and resolves the matching team',()=>{
  const {room,players,objective}=roomFor('pattern');
  assert.equal(objective.cells.length,18);assert.equal(objective.pattern.length,9);
  objective.cells.splice(0,9,...objective.pattern);objective.time=2;objective.paint();
  assert.equal(room.phase,'results');assert.deepEqual(room.qualifiers,players.filter(p=>p.team===0).map(p=>p.id));
});

test('Grand Prix preserves participants across all selected rounds and resets after a rematch',()=>{
  const {room}=roomFor('lasers',{format:'grandprix',count:3,rounds:6});
  const visited=new Set();
  for(let i=0;i<80&&room.phase!=='finished';i++){
    visited.add(room.round);
    if(room.phase==='playing'){
      room.objective.eliminate(room.competitors[0],'test');
      if(room.competitors.length)assert.equal(room.phase,'playing');
      room.time=room.roundLimit+0.1;
    }
    room.step();
  }
  assert.equal(visited.size,6);assert.equal(room.phase,'finished');assert.ok(room.humans.every(p=>p.seriesPoints>0));
  room.rematch(room.hostId);assert.equal(room.phase,'lobby');assert.equal(room.objective,null);assert.deepEqual(room.winnerIds,[]);assert.ok(room.humans.every(p=>p.seriesPoints===0));
});

test('private room settings are host-controlled, capacity-safe, and reset ready states',()=>{
  const room=new Tournament('LOBBY0');const host=room.addHuman({name:'Host'}),friend=room.addHuman({name:'Friend'});
  room.setReady(friend.id,true);assert.throws(()=>room.editSettings(friend.id,{rounds:8}),/host/);
  room.editSettings(host.id,{format:'grandprix',rounds:10,theme:'pirate-islands',playlist:'party'});
  assert.equal(room.settings.rounds,10);assert.equal(room.courseDeck.length,10);assert.equal(friend.ready,false);
  assert.ok(room.courseDeck.every(m=>m.theme.id==='pirate-islands'));
  room.transferHost(host.id,friend.id);assert.equal(room.hostId,friend.id);
  assert.throws(()=>room.start(host.id),/host/);
});

test('same-tick final falls produce a declared shared result and button claims advance the target',()=>{
  const {room,players,objective}=roomFor('lasers',{count:2,final:true});
  for(const p of players)objective.eliminate(p,'Simultaneous fall');objective.step();
  assert.equal(room.phase,'finished');assert.deepEqual(room.winnerIds,players.map(p=>p.id));
  const button=roomFor('buttons'),target=[...button.objective.targets.values()][0];
  button.room.physics.teleport(button.players[0].id,target.position);button.objective.time=1;button.objective.collect();
  assert.equal(button.players[0].score,1);assert.equal(button.objective.buttonIndex,1);assert.equal(button.objective.snapshot().targets[1].active,true);
});
