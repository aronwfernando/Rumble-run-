// A fixed binary row keeps crowd snapshots bounded without rounding positions
// into visible grid steps. Map/roster changes still use reliable JSON messages.
export const PROTOCOL_VERSION = 2;
const STRIDE = 64;
const STATUSES = ['waiting', 'racing', 'qualified', 'eliminated'];
export function encodeFrame(snapshot, previousEnvironment = null, keyframe = true) {
  const bytes = new Uint8Array(snapshot.players.length * STRIDE), view = new DataView(bytes.buffer);
  snapshot.players.forEach((p, i) => {
    const n = i * STRIDE;
    view.setUint16(n, p.netId, true); view.setUint8(n + 2, STATUSES.indexOf(p.status));
    view.setUint8(n + 3, (p.p ? 1 : 0) | (p.g ? 2 : 0) | (p.airDiveUsed ? 4 : 0));
    view.setUint32(n + 4, Math.max(0, p.seq || 0), true);
    [...(p.p || [0, 0, 0]), ...(p.v || [0, 0, 0]), p.f || 0].forEach((v, j) => view.setFloat32(n + 8 + j * 4, v, true));
    [p.d, p.r, p.c, p.s, p.respawnLeft].forEach((v, j) => view.setUint16(n + 36 + j * 2, Math.min(65535, Math.round((v || 0) * 1000)), true));
    [p.falls, p.checkpoint, p.hits, p.tp].forEach((v, j) => view.setUint16(n + 46 + j * 2, v || 0, true));
    view.setFloat32(n + 54, p.progress || 0, true); view.setFloat32(n + 58, p.score || 0, true);
  });
  let environment = snapshot.environment;
  if (environment && !keyframe && previousEnvironment) {
    const old = new Map(previousEnvironment.platforms.map(p => [p.id, p]));
    environment = { broken: environment.broken.filter(id => !previousEnvironment.broken.includes(id)),
      platforms: environment.platforms.filter(p => JSON.stringify(p) !== JSON.stringify(old.get(p.id))) };
  }
  const { players, ...header } = snapshot;
  if(snapshot.objective){
    const {players:beans,objects,targets,...rules}=snapshot.objective,ids=new Map(players.map(p=>[p.id,p.netId]));
    // Names, UUIDs, teams and scores already exist in the roster/binary rows.
    // Only exceptional interaction flags need another per-bean record.
    header.objective={...rules,
      beans:beans.filter(p=>p.tail||p.infected||p.holding||p.laps||p.nextGate).map(p=>[ids.get(p.id),(p.tail?1:0)|(p.infected?2:0),p.holding||null,p.laps||0,p.nextGate||0]),
      bodies:objects.map(o=>[o.id,...o.p,...o.v,ids.get(o.owner)||0,o.radius,o.fuse??-1]),
      targets:targets.map(t=>[t.id,(t.visible?1:0)|(t.active?2:0)]),
    };
  }
  return { ...header, protocol: PROTOCOL_VERSION, keyframe, environment, bytes };
}

export function decodeFrame(frame, roster, previousEnvironment = null) {
  if (frame.protocol !== PROTOCOL_VERSION) throw new Error('Game updated. Reload to use the current version.');
  const bytes = frame.bytes instanceof ArrayBuffer ? new Uint8Array(frame.bytes) : new Uint8Array(frame.bytes.buffer, frame.bytes.byteOffset || 0, frame.bytes.byteLength);
  if (bytes.length % STRIDE || bytes.length > STRIDE * 64) throw new Error('Invalid snapshot');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), byId = new Map(roster.map(p => [p.netId, p.id]));
  const players = [];
  for (let n = 0; n < bytes.length; n += STRIDE) {
    const id = byId.get(view.getUint16(n, true)); if (!id) continue;
    const flags = view.getUint8(n + 3), row = { id, status: STATUSES[view.getUint8(n + 2)], seq: view.getUint32(n + 4, true) };
    if (flags & 1) {
      row.p = Array.from({ length: 3 }, (_, i) => view.getFloat32(n + 8 + i * 4, true));
      row.v = Array.from({ length: 3 }, (_, i) => view.getFloat32(n + 20 + i * 4, true));
      row.f = view.getFloat32(n + 32, true); row.g = !!(flags & 2); row.airDiveUsed = !!(flags & 4);
    }
    ['d', 'r', 'c', 's', 'respawnLeft'].forEach((key, i) => row[key] = view.getUint16(n + 36 + i * 2, true) / 1000);
    ['falls', 'checkpoint', 'hits', 'tp'].forEach((key, i) => row[key] = view.getUint16(n + 46 + i * 2, true));
    row.progress = view.getFloat32(n + 54, true); row.score = view.getFloat32(n + 58, true); players.push(row);
  }
  let environment = frame.environment;
  if (!frame.keyframe && previousEnvironment) {
    const platforms = new Map(previousEnvironment.platforms.map(p => [p.id, p]));
    for (const p of environment?.platforms || []) platforms.set(p.id, p);
    environment = { broken: [...new Set([...previousEnvironment.broken, ...(environment?.broken || [])])], platforms: [...platforms.values()] };
  }
  const { bytes: _bytes, ...header } = frame;
  if(frame.objective){
    const {beans,bodies,targets,...rules}=frame.objective,flags=new Map(beans.map(p=>[byId.get(p[0]),p])),scores=new Map(players.map(p=>[p.id,p.score]));
    header.objective={...rules,
      players:roster.map(p=>{const f=flags.get(p.id);return {id:p.id,team:p.team??null,score:scores.get(p.id)||0,tail:!!(f?.[1]&1),infected:!!(f?.[1]&2),holding:f?.[2]||null,laps:f?.[3]||0,nextGate:f?.[4]||0};}),
      objects:bodies.map(o=>({id:o[0],p:o.slice(1,4),v:o.slice(4,7),owner:byId.get(o[7])||null,radius:o[8],fuse:o[9]<0?undefined:o[9]})),
      targets:targets.map(t=>({id:t[0],visible:!!(t[1]&1),active:!!(t[1]&2)})),
    };
  }
  return { ...header, players, environment };
}
