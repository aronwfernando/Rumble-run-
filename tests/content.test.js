import test from 'node:test';
import assert from 'node:assert/strict';
import { generateMap, THEMES } from '../shared/maps.js';
import { PRESETS, presetMap } from '../shared/presets.js';
import { layoutFingerprint, verifyPublicMap } from '../shared/content.js';
import { resolveSecrets } from '../server/map-manifests.js';
import { encodeFrame, decodeFrame } from '../shared/protocol.js';
import { Tournament } from '../server/tournament.js';

test('authored presets retain their ordered mechanics and validated routes', () => {
  for (const preset of PRESETS.filter(p => p.type !== 'objective')) for (let seed = 0; seed < 12; seed++) {
    const map = presetMap(preset.id, { seed:'authored-'+seed, difficulty:seed/12 });
    assert.equal(map.name, preset.name);
    if (preset.sequence) assert.deepEqual(map.sections.map(s=>[s.kind,s.obstacle]),preset.sequence.map(s=>[s.kind,s.obstacle]));
  }
});
test('theme streams change appearance without changing course collision', () => {
  const a=generateMap({seed:'independent',themeId:THEMES[0].id}), b=generateMap({seed:'independent',themeId:THEMES[1].id});
  assert.equal(layoutFingerprint(a),layoutFingerprint(b)); assert.notDeepEqual(a.theme,b.theme);
});
test('server-only puzzle choices are absent from public manifests and unrevealed snapshots', () => {
  const map = presetMap('secret-step', {seed:'known'});
  const a=resolveSecrets(structuredClone(map),'private-one'), b=resolveSecrets(structuredClone(map),'private-two');
  assert.notDeepEqual(a.authoritative.platforms.map(p=>p.truth), b.authoritative.platforms.map(p=>p.truth));
  assert.deepEqual(a.public,b.public); assert.ok(verifyPublicMap(a.public));
  assert.ok(a.public.platforms.filter(p=>p.puzzle).every(p=>!('truth' in p)&&!('fallOnTouch' in p)));
  const room=new Tournament('SECRET',{preset:'secret-step'});room.addHuman({name:'A'});room.addHuman({name:'B'});room.round=0;room.beginRound();
  const all=room.map.platforms.filter(p=>p.puzzle);
  assert.equal(room.snapshot().environment.platforms.filter(p=>p.id.includes('-puzzle-')).length,all.length);
  const changed=structuredClone(a.public);changed.platforms[0].size[0]+=1;assert.equal(verifyPublicMap(changed),false);
});
test('compact frames preserve teleports, eliminations, cooldowns, and environment deltas', () => {
  const room=new Tournament('BINARY');const p=room.addHuman({name:'A'});room.addHuman({name:'B'});room.start(p.id);
  const original=room.snapshot(), packed=encodeFrame(original), unpacked=decodeFrame(packed,room.state().players);
  assert.equal(unpacked.players.length,2);assert.deepEqual(unpacked.players.map(p=>p.status),original.players.map(p=>p.status));
  assert.ok(Math.abs(unpacked.players[0].p[2]-original.players[0].p[2])<1e-5);
  const env={broken:['door-1'],platforms:[{id:'floor',a:0,dropAt:2}]};
  const next=decodeFrame(encodeFrame({...original,environment:env},original.environment,false),room.state().players,original.environment);
  assert.ok(next.environment.broken.includes('door-1'));
  assert.equal(next.environment.platforms.find(p=>p.id==='floor').dropAt,2);
  assert.equal(packed.bytes.length,128);
});
