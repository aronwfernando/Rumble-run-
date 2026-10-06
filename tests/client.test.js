import test from 'node:test';
import assert from 'node:assert/strict';
import { GameScene } from '../client/scene.js';
import { InputController } from '../client/input.js';
import { generateMap, FINAL_TYPES } from '../shared/maps.js';
import { createArena } from '../shared/arenas.js';
import { OBJECTIVES } from '../shared/objectives.js';
import { COLORS } from '../shared/config.js';
import { Tournament } from '../server/tournament.js';
import fs from 'node:fs';

// Exercise real scene transforms and controls with a recording renderer. This
// deliberately does not claim to test GPU output or how controls feel in play.
function dom(t) {
  class Element extends EventTarget {
    constructor() { super(); this.style = {}; this.children = []; }
    append(child) { this.children.push(child); child.parent = this; }
    remove() { this.parent.children = this.parent.children.filter(c => c !== this); }
    getContext() { return { fillText() {} }; }
    getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 }; }
    setPointerCapture() {}
  }
  const nodes = new Map();
  const document = Object.assign(new EventTarget(), {
    createElement: () => new Element(),
    querySelector: selector => {
      if (selector === 'dialog[open]') return null;
      if (!nodes.has(selector)) nodes.set(selector, new Element());
      return nodes.get(selector);
    },
  });
  const values = { document, window: new EventTarget(), innerWidth: 1280, innerHeight: 720, devicePixelRatio: 1,
    matchMedia: () => ({ matches: false }), navigator: { getGamepads: () => [] } };
  for (const [name, value] of Object.entries(values)) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
    t.after(() => previous ? Object.defineProperty(globalThis, name, previous) : delete globalThis[name]);
  }
  return document;
}

test('camera-relative controls stop on blur and do not fire gamepad actions in the background', t => {
  dom(t);
  const input = new InputController(); input.enabled = true; input.inGame = true;
  input.getYaw = () => Math.PI / 2;
  input.keys.add('KeyW');
  assert.ok(input.direction().x < -0.99);
  assert.ok(Math.abs(input.direction().z) < 0.001);
  input.action('jump');
  let cleared = 0; input.onChange = () => cleared++;
  window.dispatchEvent(new Event('blur'));
  assert.deepEqual(input.direction(), { x: 0, z: 0 });
  assert.equal(input.consume().jump, false);
  navigator.getGamepads = () => [{ axes: [1, 0, 1], buttons: [{ pressed: true }] }];
  input.pollGamepad(1 / 60);
  assert.equal(input.counters.jump, 1);
  assert.equal(cleared, 1);
  window.dispatchEvent(new Event('focus'));
  assert.ok(Math.hypot(...Object.values(input.direction())) > 0.99);
});

test('every course family renders finite transforms and clears old avatars across round transitions', t => {
  const document = dom(t);
  let rendered = 0;
  const renderer = { setPixelRatio() {}, setSize() {}, render(scene, camera) {
    rendered++;
    scene.updateMatrixWorld(); camera.updateMatrixWorld();
    assert.ok(camera.projectionMatrix.elements.every(Number.isFinite));
    scene.traverse(object => assert.ok(object.matrixWorld.elements.every(Number.isFinite), object.type));
  } };
  const scene = new GameScene(document.querySelector('#game'), renderer);
  const maps = [
    ...Array.from({ length: 8 }, (_, raceIndex) => generateMap({ seed: 'render-check', type: 'race', raceIndex })),
    ...['sweeper', 'tilefall', 'blockdash', 'rising-slime', 'carousel'].map(variant => generateMap({ type: 'survival', variant })),
    ...FINAL_TYPES.map(variant => generateMap({ type: 'final', variant })),
    ...Object.keys(OBJECTIVES).map(rule=>createArena(rule)),
  ];
  for (const map of maps) {
    scene.loadMap(map); scene.menu = false;
    assert.equal(document.querySelector('#labels').children.length, 0);
    scene.addAvatar({ id: 'a', name: 'Bean', color: '#ff658c' }, true);
    for (let tick = 0; tick < 12; tick++) {
      const row = { p: map.spawn[0], v: [0, 0, -9], f: 0, g: tick > 5, d: tick < 5 ? 0.3 : 0, s: 0, tp: 0 };
      scene.updateAvatar('a', row, tick / 60, 1 / 60);
      scene.render(1 / 60, tick / 60, row.p, row, tick / 60, {});
    }
    assert.equal(document.querySelector('#labels').children.length, 1);
    assert.equal(scene.platformMeshes.size, map.platforms.length);
    assert.equal(scene.hazardMeshes.size, map.hazards.length);
    scene.updateAvatar('a', null, 1, 1 / 60);
    assert.equal(scene.avatars.get('a').root.visible, false, 'eliminated beans must disappear');
  }
  assert.equal(rendered, maps.length * 12);
  scene.clearMap();
  assert.equal(document.querySelector('#labels').children.length, 0);
});

test('arena snapshots draw their targets and a 30-bean crowd fits the draw-call budget',t=>{
  const document=dom(t);let calls=0,triangles=0;const measurements=[];
  const renderer={setPixelRatio(){},setSize(){},render(scene,camera){calls=0;triangles=0;scene.traverseVisible(o=>{if(o.isMesh&&o.layers.test(camera.layers)){
    calls++;triangles+=(o.geometry.index?.count||o.geometry.getAttribute('position').count)/3*(o.isInstancedMesh?o.count:1);
  }});}};
  const view=new GameScene(document.querySelector('#game'),renderer);
  for(const rule of ['memory','rolling','pattern','football','blast','charge','reactive']){
    const room=new Tournament('DRAW00',{capacity:30,objective:rule,seed:'draw-budget',timings:{countdown:0}});
    const roster=Array.from({length:30},(_,i)=>room.addHuman({name:'Bean '+i,color:COLORS[i%COLORS.length]}));
    room.start(roster[0].id);room.step();room.step();
    view.loadMap(room.state().map);view.menu=false;
    for(const p of roster){view.addAvatar(p,false);view.updateAvatar(p.id,room.physics.snapshot(p.id),room.time,1/60);}
    view.render(1/60,room.time,room.map.spawn[0],room.physics.snapshot(roster[0].id),0,room.physics.environmentSnapshot(),room.objective.snapshot());
    assert.ok(calls<=100,rule+' calls: '+calls);assert.ok(triangles<=100000,rule+' triangles: '+triangles);
    measurements.push({mode:rule,players:30,drawSubmissions:calls,triangles});
    assert.equal(view.arena.items.size,room.map.items.length);
    for(const object of view.arena.items.values())assert.ok(object.root.position.toArray().every(Number.isFinite));
    if(rule==='memory')assert.equal([...view.arena.symbolLabels.values()].flat().filter(label=>label.visible).length,16);
    if(rule==='rolling')for(const p of room.map.platforms)assert.equal(view.platformMeshes.get(p.id).children.length,18);
  }
  if(process.env.WRITE_SCENE_REPORT==='1')fs.writeFileSync('docs/scene-results.json',JSON.stringify({scope:'Scene graph and draw submission estimates with a recording renderer. No actual WebGL/GPU or frame-time measurement.',measurements},null,2)+'\n');
});
