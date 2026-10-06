#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import { performance } from 'node:perf_hooks';
import { Tournament } from '../server/tournament.js';
import { encodeFrame } from '../shared/protocol.js';
import { DT, SNAPSHOT_RATE, TICK_RATE, COLORS } from '../shared/config.js';
import { Encoder } from 'socket.io-parser';

const results=[],encoder=new Encoder();
for(const count of [16,24,30])for(const objective of ['', 'collection', 'rolling','football']){
  const room=new Tournament('BENCH0',{capacity:count,objective,format:'grandprix',seed:'release-stress',timings:{countdown:0}});
  for(let i=0;i<count;i++)room.addHuman({name:'Bean'+i,color:COLORS[i%COLORS.length]});
  room.start(room.hostId);room.step();let last=null,bytes=0,frames=0;const costs=[];
  for(let i=0;i<600&&room.phase==='playing';i++){
    for(const p of room.competitors)room.receiveInput(p.id,{seq:i+1,x:Math.sin(i/150+p.netId),z:Math.cos(i/140+p.netId),jump:Math.floor(i/90),dive:Math.floor(i/150),grab:0},room.roundKey);
    const start=performance.now();room.step();costs.push(performance.now()-start);
    if(i%(TICK_RATE/SNAPSHOT_RATE)===0){const snapshot=room.snapshot(),frame=encodeFrame(snapshot,last,i%120===0);last=snapshot.environment;const encoded=encoder.encode({type:2,data:['frame',frame]});bytes+=encoded.reduce((n,p)=>n+(typeof p==='string'?Buffer.byteLength(p):p.byteLength)+14,0);frames++;}
  }
  costs.sort((a,b)=>a-b);
  results.push({players:count,mode:objective||'generated-race',steps:costs.length,meanMs:+(costs.reduce((n,v)=>n+v,0)/costs.length).toFixed(3),p95Ms:+costs[Math.floor(costs.length*.95)].toFixed(3),maxMs:+costs.at(-1).toFixed(3),frameBytesMean:Math.round(bytes/frames),downstreamBytesPerSecond:Math.round(bytes/(costs.length*DT))});
}
const report={date:new Date().toISOString(),runtime:process.version,platform:os.platform(),cpu:os.cpus()[0]?.model,hardwareScope:'Local execution container, single room, simulated human inputs. Not a Render capacity or client FPS measurement.',wireScope:'Socket.IO event encoding plus estimated WebSocket framing, excludes TLS/TCP, initial map download and retransmissions.',results};
fs.writeFileSync('docs/benchmark-results.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
