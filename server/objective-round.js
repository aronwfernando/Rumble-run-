import { DT } from '../shared/config.js';
import { OBJECTIVES, SYMBOLS } from '../shared/objectives.js';
import { random } from '../shared/random.js';
import { shuffle } from '../shared/course-catalog.js';

const xyz=b=>[b.position.x,b.position.y,b.position.z];
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
const horizontal=(a,b)=>Math.hypot(a[0]-b[0],a[2]-b[2]);
const q=n=>Math.round(n*100)/100;

/** Objective state belongs to one round. Only the authoritative simulation
 * invokes these rules; all client commands remain movement/interaction inputs. */
export class ObjectiveRound {
  constructor(room) {
    this.room=room;this.map=room.map;this.rule=this.map.rule;this.definition=OBJECTIVES[this.rule];
    this.rng=random(room.secretSeed+':objective:'+room.round);this.time=0;this.ended=false;
    this.teamCount=Math.min(this.map.teams||0,room.competitors.length);this.teamScores=Array(this.teamCount).fill(0);
    this.targets=new Map(this.map.items.filter(i=>i.trigger).map(i=>[i.id,{...i,readyAt:0}]));
    this.cells=Array(this.rule==='pattern'?18:16).fill(-1);this.pattern=Array.from({length:9},()=>this.rng.int(0,1));
    this.pattern[4]=1;
    this.lastCycle=-1;this.symbols=[];this.answer=0;this.message='';this.effects=[];this.pauseUntil=0;this.overtime=false;
    this.events=[];this.eventNumber=0;this.finished=[];this.buttonIndex=0;
    room.competitors.forEach((p,i)=>{
      p.team=this.teamCount?i%this.teamCount:null;p.score=0;p.nextInteract=0;p.holding=null;p.tail=false;p.infected=false;p.laps=0;p.nextGate=0;
      p.arenaSpawn=[...this.map.spawn[i]];p.lastCell=-1;
      if(this.rule==='pattern'){
        const cell=this.map.platforms.find(f=>f.cell===p.team*9+Math.floor(i/this.teamCount)%9);
        p.arenaSpawn=[cell.position[0],1.1,cell.position[2]];room.physics.teleport(p.id,p.arenaSpawn);
      }
      const home=this.map.zones.find(z=>z.team===p.team);
      if(home&&!['pattern','territory'].includes(this.rule)){
        const pos=this.rule==='push'?[home.position[0]+(Math.floor(i/this.teamCount)%3-1)*1.3,1.1,17]:[home.position[0]*0.7,1.1,home.position[2]*0.7+(Math.floor(i/this.teamCount)%4-1.5)*1.4];
        p.arenaSpawn=pos;room.physics.teleport(p.id,pos);
      }
    });
    if(this.rule==='tail')shuffle(room.competitors,this.rng).slice(0,this.map.type==='final'?1:Math.max(1,Math.floor(room.competitors.length/2))).forEach(p=>p.tail=true);
    if(this.rule==='infection')for(let team=0;team<this.teamCount;team++){const p=shuffle(room.competitors.filter(p=>p.team===team),this.rng)[0];if(p)p.infected=true;}
    if(this.rule==='volleyball')room.physics.objects.get('ball').body.velocity.set(5,3,0);
    if(this.rule==='blast')for(const o of room.physics.objects.values())o.fuse=6+this.rng.range(0,4);
    room.roundLimit=Math.min(this.definition.duration,room.map.type==='final'?room.rules.finalSeconds:room.rules.raceSeconds);
  }
  get players(){return this.room.competitors;}
  body(p){return this.room.physics.players.get(p.id)?.body;}
  event(type,detail={}){const event={id:this.room.roundKey+':'+(++this.eventNumber),type,time:q(this.time),...detail};this.events.push(event);if(this.events.length>64)this.events.shift();return event;}
  addScore(p,amount){p.score+=amount;if(p.team!==null)this.teamScores[p.team]+=amount;}
  canReach(p,position,range=2.3){
    const b=this.body(p);if(!b||distance(xyz(b),position)>range)return false;
    const bean=this.room.physics.players.get(p.id),dx=position[0]-b.position.x,dz=position[2]-b.position.z,len=Math.hypot(dx,dz);
    if(len>0.3&&(-Math.sin(bean.face)*dx-Math.cos(bean.face)*dz)/len<0.25)return false;
    return this.room.physics.lineOfSight([b.position.x,b.position.y+0.2,b.position.z],[position[0],position[1]+0.2,position[2]]);
  }
  drop(p,throwing=false){
    const object=this.room.physics.objects.get(p.holding);p.holding=null;if(!object)return;
    object.owner=null;object.body.collisionFilterMask=7;
    const bean=this.room.physics.players.get(p.id);
    if(throwing&&bean){const f=bean.face;object.body.velocity.set(-Math.sin(f)*14,12,-Math.cos(f)*14);}
  }
  interact(p){
    const bean=this.room.physics.players.get(p.id);
    if(!bean||this.time<p.nextInteract||this.time<bean.stunUntil||this.time<p.respawnUntil)return;
    p.nextInteract=this.time+0.45;
    if(this.rule==='tail'||this.rule==='infection'){
      const target=this.players.filter(t=>t.id!==p.id&&(this.rule==='tail'?t.tail&&!p.tail:p.infected&&!t.infected&&t.team!==p.team)&&this.canReach(p,xyz(this.body(t))))
        .sort((a,b)=>distance(xyz(this.body(p)),xyz(this.body(a)))-distance(xyz(this.body(p)),xyz(this.body(b))))[0];
      if(target&&this.time>=(target.protectedUntil||0)){
        if(this.rule==='tail'){p.tail=true;target.tail=false;p.protectedUntil=this.time+1.2;}
        else target.infected=true;
        this.event('tag',{actor:p.id,target:target.id});
      }
      return;
    }
    if(p.holding){this.drop(p,true);return;}
    const object=[...this.room.physics.objects.values()].filter(o=>(o.data.carry||this.rule==='basketball')&&this.canReach(p,xyz(o.body)))
      .sort((a,b)=>distance(xyz(this.body(p)),xyz(a.body))-distance(xyz(this.body(p)),xyz(b.body)))[0];
    if(!object||this.time<(object.protectedUntil||0))return;
    if(object.owner){const previous=this.room.players.get(object.owner);if(previous)previous.holding=null;}
    object.owner=p.id;p.holding=object.data.id;object.protectedUntil=this.time+0.8;object.body.collisionFilterMask=0;
    this.event('pickup',{actor:p.id,object:object.data.id});
  }
  eliminate(p,cause){
    if(p.status!=='racing')return;
    const friendRound=this.map.type!=='final'&&this.room.settings.format!=='grandprix'&&this.room.roundEntrants<=this.room.target;
    if(this.room.settings.practice||friendRound){
      this.drop(p);
      const safe=this.rule==='memory'?[...this.room.physics.platforms.values()].find(f=>!f.removed&&f.data.cell!==undefined):null;
      this.room.respawn(p,safe?[safe.data.position[0],1.1,safe.data.position[2]]:p.arenaSpawn);return;
    }
    this.drop(p);p.status='eliminated';p.active=false;p.outAt=this.time;p.eliminatedRound=this.room.round;p.cause=cause;
    this.room.physics.removePlayer(p.id);this.room.emit('player-event',{roundKey:this.room.roundKey,id:p.id,type:'eliminated',cause});this.event('elimination',{player:p.id,cause});
  }
  qualify(p){
    if(p.status!=='racing')return;
    this.drop(p);p.status='qualified';p.finishTime=this.time;this.finished.push(p.id);this.room.qualifiers.push(p.id);this.room.physics.removePlayer(p.id);
    this.room.emit('player-event',{roundKey:this.room.roundKey,id:p.id,type:'qualified',placement:this.finished.length});
  }
  finish(ids){if(this.ended)return;this.ended=true;
    if(!ids.length&&this.definition.elimination&&this.map.type==='final'){
      const fallen=this.room.humans.filter(p=>p.outAt!==undefined),last=Math.max(...fallen.map(p=>p.outAt));
      ids=fallen.filter(p=>Math.abs(p.outAt-last)<0.0001).map(p=>p.id);
    }
    for(const p of this.room.players.values())this.drop(p);this.event('resolved',{qualifiers:ids});this.room.endRound(ids);}
  knock(p,from,strength=9){
    const bean=this.room.physics.players.get(p.id);if(!bean||this.time<bean.respawnUntil||this.time-bean.lastHit<0.7)return;
    const pos=xyz(bean.body),d=Math.max(0.1,horizontal(pos,from));bean.body.velocity.x+=(pos[0]-from[0])/d*strength;bean.body.velocity.z+=(pos[2]-from[2])/d*strength;
    bean.body.velocity.y=Math.max(5,bean.body.velocity.y);bean.lastHit=this.time;bean.stunUntil=this.time+0.35;bean.hits++;
  }
  resetBall(object){this.room.physics.resetObject(object.data.id,object.data.position);this.pauseUntil=this.time+1.8;this.room.gameLockedUntil=this.pauseUntil;}
  goal(team,object){
    if(this.time<this.pauseUntil)return;
    this.teamScores[team]++;this.event('goal',{team});this.message=`Team ${team+1} scores!`;this.resetBall(object);
    if(this.overtime)this.finish(this.players.filter(p=>p.team===team).map(p=>p.id));
  }
  step(){
    if(this.ended)return;this.time=this.room.time;this.effects=[];
    for(const p of [...this.players]){
      const b=this.body(p);if(!b)continue;const pos=xyz(b);
      if(!pos.every(Number.isFinite)||pos[1]<this.map.killY||Math.abs(pos[0])>70||Math.abs(pos[2])>90){
        this.drop(p);
        if(this.definition.elimination)this.eliminate(p,this.rule==='memory'?'Wrong tile or fall':'Fell out of the arena');
        else this.room.respawn(p,p.arenaSpawn);
        continue;
      }
      if(p.grabPulse)this.interact(p);
      const bean=this.room.physics.players.get(p.id);bean.speedScale=p.holding?0.85:1;
      if(p.holding){const object=this.room.physics.objects.get(p.holding);if(object){object.body.position.set(b.position.x-Math.sin(bean.face)*0.85,b.position.y+0.45,b.position.z-Math.cos(bean.face)*0.85);object.body.velocity.copy(b.velocity);object.body.aabbNeedsUpdate=true;}}
      if(this.rule==='tail')p.score=p.tail?1:0;
      if(this.rule==='possession'&&p.holding&&this.time>=p.respawnUntil)this.addScore(p,DT);
    }
    for(const object of this.room.physics.objects.values()){
      if(object.owner&&!this.players.some(p=>p.id===object.owner)){object.owner=null;object.body.collisionFilterMask=7;}
      const pos=xyz(object.body);if(!pos.every(Number.isFinite)||pos[1]<-8||Math.abs(pos[0])>65||Math.abs(pos[2])>80)this.room.physics.resetObject(object.data.id,object.data.position);
    }
    if(this.rule==='memory')this.memory();
    if(['football','basketball','volleyball'].includes(this.rule))this.sport();
    if(['collect','hoops','buttons','snowball'].includes(this.rule))this.collect();
    if(['collection','hoard'].includes(this.rule))this.territoryObjects();
    if(['territory','pattern'].includes(this.rule))this.paint();
    if(this.rule==='zone'){
      const position=[Math.sin(this.time*0.18)*11,0.1,Math.cos(this.time*0.18)*8];this.effects.push({id:'spotlight',kind:'zone',p:position,radius:4});
      for(const p of this.players)if(horizontal(xyz(this.body(p)),position)<4&&this.time>=p.respawnUntil)this.addScore(p,DT);
    }
    if(this.rule==='laps')for(const p of [...this.players]){
      const gate=this.map.gates[p.nextGate];if(horizontal(xyz(this.body(p)),gate.position)<gate.radius&&this.time>=(p.gateAfter||0)){
        p.nextGate++;p.gateAfter=this.time+0.3;if(p.nextGate===this.map.gates.length){p.nextGate=0;p.laps++;}
        p.score=p.laps*4+p.nextGate;if(p.laps>=3)this.qualify(p);
      }
    }
    if(this.rule==='push')for(const object of this.room.physics.objects.values()){
      const team=object.data.team;if(team>=this.teamCount)continue;this.teamScores[team]=Math.max(this.teamScores[team],12-object.body.position.z);
      if(object.body.position.z<=-24&&Math.abs(object.body.position.x-this.map.zones[team].position[0])<4)this.finish(this.players.filter(p=>p.team===team).map(p=>p.id));
    }
    if(this.rule==='infection')for(let team=0;team<this.teamCount;team++){
      const members=this.players.filter(p=>p.team===team);this.teamScores[team]=members.filter(p=>!p.infected).length;
      if(this.time>3&&members.length&&members.every(p=>p.infected))this.finish(this.players.filter(p=>p.team!==team).map(p=>p.id));
    }
    if(['lasers','charge','reactive','blast'].includes(this.rule))this.hazards();
    if(this.ended)return;
    for(const p of this.players)p.previousArenaPosition=xyz(this.body(p));
    if(this.finished.length>=this.room.target)return this.finish(this.finished.slice(0,this.room.target));
    if(this.definition.elimination&&(this.room.settings.format==='grandprix'?this.players.length===0:this.players.length<=this.room.target&&(this.room.roundEntrants>this.room.target||this.players.length<this.room.roundEntrants)))return this.finish(this.players.map(p=>p.id));
    if(this.time>=this.room.roundLimit)this.timeout();
  }
  memory(){
    const cycle=Math.floor(this.time/11),phase=this.time%11;
    if(cycle!==this.lastCycle){this.lastCycle=cycle;this.symbols=shuffle(Array.from({length:16},(_,i)=>i%4),this.rng);this.answer=this.rng.int(0,3);for(let i=0;i<16;i++)this.room.physics.setPlatformEnabled('cell-'+i,true);}
    this.message=phase<4?'MEMORISE THE SYMBOLS':phase<7?`MOVE TO ${SYMBOLS[this.answer]}`:'HOLD ON!';
    if(phase>=7)for(let i=0;i<16;i++)this.room.physics.setPlatformEnabled('cell-'+i,this.symbols[i]===this.answer);
  }
  sport(){
    const object=this.room.physics.objects.get('ball');if(!object)return;const p=xyz(object.body);
    if(this.time<this.pauseUntil){this.room.physics.resetObject('ball',object.data.position);return;}
    if(this.serveDirection){object.body.velocity.set(this.serveDirection*5,5,0);this.serveDirection=0;}
    if(object.owner)return;
    if(this.rule==='football'&&Math.abs(p[0])>21&&Math.abs(p[2])<5.5&&p[1]<4)this.goal(p[0]>0?0:1,object);
    if(this.rule==='basketball'&&object.previousY>4&&p[1]<=4&&Math.hypot(Math.abs(p[0])-20,p[2])<2-object.data.radius)this.goal(p[0]>0?0:1,object);
    if(this.rule==='volleyball'&&p[1]<0.9){this.serveDirection=p[0]>0?-1:1;this.goal(p[0]>0?0:1,object);}
  }
  collect(){
    const targets=[...this.targets.values()];
    const active=this.rule==='buttons'?this.buttonIndex:-1;
    if(this.rule==='buttons')this.message='TOUCH THE GLOWING BUTTON';
    for(const [index,target]of targets.entries()){
      if(this.time<target.readyAt||this.rule==='buttons'&&index!==active)continue;
      if(this.rule==='snowball'){
        const ball=[...this.room.physics.objects.values()].find(o=>horizontal(xyz(o.body),target.position)<o.body.shapes[0].radius+0.7);
        if(ball){this.teamScores[ball.data.team]++;target.readyAt=Infinity;const radius=Math.min(2.6,1.4+this.teamScores[ball.data.team]*0.04);ball.body.shapes[0].radius=radius;ball.body.shapes[0].updateBoundingSphereRadius();ball.body.updateBoundingRadius();ball.body.aabbNeedsUpdate=true;}
        continue;
      }
      const candidates=this.players.filter(p=>{
        if(this.time<p.respawnUntil)return false;
        const pos=xyz(this.body(p));
        if(this.rule!=='hoops')return distance(pos,target.position)<1.2;
        if(!p.previousArenaPosition||this.room.physics.players.get(p.id).grounded)return false;
        const before=p.previousArenaPosition[2]-target.position[2],after=pos[2]-target.position[2];
        if(before*after>0||Math.abs(before-after)<0.001)return false;
        const t=before/(before-after),x=p.previousArenaPosition[0]+(pos[0]-p.previousArenaPosition[0])*t,y=p.previousArenaPosition[1]+(pos[1]-p.previousArenaPosition[1])*t;
        return Math.hypot(x-target.position[0],y-target.position[1])<target.radius-0.25;
      });
      candidates.sort((a,b)=>distance(xyz(this.body(a)),target.position)-distance(xyz(this.body(b)),target.position)||((a.netId+this.room.tick)%31)-((b.netId+this.room.tick)%31));
      const p=candidates[0];if(!p)continue;
      if(this.rule==='hoops'&&this.room.physics.players.get(p.id).grounded)continue;
      this.addScore(p,target.value||1);target.readyAt=this.time+(this.rule==='buttons'?4.6:6);this.event('claim',{player:p.id,target:target.id});
      if(this.rule==='buttons')this.buttonIndex=(index+1)%targets.length;
    }
  }
  territoryObjects(){
    this.teamScores.fill(0);
    for(const object of this.room.physics.objects.values())if(!object.owner){
      const zone=this.map.zones.filter(z=>z.team<this.teamCount&&horizontal(xyz(object.body),z.position)<z.radius).sort((a,b)=>horizontal(xyz(object.body),a.position)-horizontal(xyz(object.body),b.position))[0];
      if(zone)this.teamScores[zone.team]++;
    }
  }
  paint(){
    for(const p of this.players){const bean=this.room.physics.players.get(p.id);if(!bean?.grounded)continue;
      const pos=xyz(bean.body),cell=this.map.platforms.find(f=>f.cell!==undefined&&Math.abs(pos[0]-f.position[0])<2.98&&Math.abs(pos[2]-f.position[2])<2.98)?.cell;
      if(cell===undefined){p.lastCell=-1;continue;}
      if(this.rule==='territory'&&p.holding)this.cells[cell]=p.team;
      if(this.rule==='pattern'&&p.lastCell!==cell&&Math.floor(cell/9)===p.team)this.cells[cell]=this.cells[cell]===1?0:1;
      p.lastCell=cell;
    }
    if(this.rule==='territory')this.teamScores=this.teamScores.map((_,team)=>this.cells.filter(c=>c===team).length);
    else for(let team=0;team<this.teamCount;team++){
      const matching=this.pattern.reduce((n,v,i)=>n+(Math.max(0,this.cells[team*9+i])===v?1:0),0);this.teamScores[team]=matching;
      if(matching===9&&this.time>1)this.finish(this.players.filter(p=>p.team===team).map(p=>p.id));
    }
  }
  hazards(){
    if(this.rule==='lasers'){
      const phase=this.time%6,angle=this.time*(0.3+this.map.difficulty*0.2),active=phase>=2;
      this.effects.push({id:'laser',kind:'laser',p:[0,0.65,0],angle,active});this.message=active?'JUMP THE BEAM':'LASER CHARGING';
      if(active)for(const p of [...this.players]){const pos=xyz(this.body(p)),side=pos[0]*Math.sin(angle)+pos[2]*Math.cos(angle),along=pos[0]*Math.cos(angle)-pos[2]*Math.sin(angle);if(Math.abs(side)<0.45&&Math.abs(along)<24.4&&pos[1]<1.75&&this.time>=p.respawnUntil)this.eliminate(p,'Hit by the laser');}
    }
    if(this.rule==='reactive'){
      const cycle=Math.floor(this.time/4.5),phase=this.time%4.5;
      if(cycle!==this.lastCycle){this.lastCycle=cycle;this.strikeCells=shuffle(Array.from({length:16},(_,i)=>i),this.rng).slice(0,3);}
      for(const cell of this.strikeCells){const floor=this.map.platforms.find(p=>p.cell===cell);this.effects.push({id:'strike-'+cell,kind:'strike',p:[floor.position[0],0.1,floor.position[2]],active:phase>=2&&phase<2.5,radius:2.8});
        if(phase>=2&&phase<2.5)for(const p of this.players)if(horizontal(xyz(this.body(p)),floor.position)<3)this.knock(p,floor.position,12);}
      this.message=phase<2?'LEAVE THE MARKED TILES':'TENTACLE STRIKE';
    }
    if(this.rule==='charge'){
      this.chargers||=Array.from({length:3},(_,i)=>({id:'beetle-'+i,origin:[(i-1)*14,1,-14],target:[0,1,10],cycle:-1}));
      for(const c of this.chargers){const at=this.time+c.origin[0]*0.03,cycle=Math.floor(at/6),phase=((at%6)+6)%6;
        if(c.cycle!==cycle){c.cycle=cycle;const target=this.players[Math.abs(cycle+c.origin[0])%Math.max(1,this.players.length)];if(target)c.target=xyz(this.body(target));}
        const t=Math.max(0,Math.min(1,(phase-1.5)/2));const pos=c.origin.map((v,i)=>v+(c.target[i]-v)*t);pos[1]=1;
        this.effects.push({id:c.id,kind:'creature',p:pos,target:c.target,active:phase>=1.5&&phase<3.5});
        if(phase>=1.5&&phase<3.5)for(const p of this.players)if(horizontal(xyz(this.body(p)),pos)<2)this.knock(p,pos,12);
      }
    }
    if(this.rule==='blast')for(const object of this.room.physics.objects.values())if(this.time>=object.fuse){
      const pos=xyz(object.body);for(const p of this.players)if(distance(xyz(this.body(p)),pos)<5)this.knock(p,pos,13);
      if(object.owner){const p=this.room.players.get(object.owner);if(p)p.holding=null;}
      this.blastEffects||=[];this.blastEffects.push({id:'blast-'+object.data.id,kind:'strike',p:pos,radius:5,active:true,until:this.time+0.45});this.resetBall(object);this.pauseUntil=0;this.room.gameLockedUntil=0;object.fuse=this.time+7;
    }
    if(this.blastEffects){this.blastEffects=this.blastEffects.filter(e=>e.until>this.time);this.effects.push(...this.blastEffects);}
  }
  timeout(){
    if(this.definition.elimination)return this.finish(this.players.map(p=>p.id));
    if(this.rule==='tail')return this.finish(this.players.filter(p=>p.tail).map(p=>p.id));
    if(this.teamCount){
      const top=Math.max(...this.teamScores),teams=this.teamScores.map((n,i)=>n===top?i:null).filter(n=>n!==null);
      if(teams.length>1&&!this.overtime&&['football','basketball','volleyball'].includes(this.rule)){this.overtime=true;this.room.roundLimit+=25;this.message='SUDDEN DEATH · NEXT GOAL WINS';return;}
      // A tied score after bounded overtime is a declared shared result.
      this.room.winnerTeams=teams;return this.finish(this.players.filter(p=>teams.includes(p.team)).map(p=>p.id));
    }
    const ranked=[...this.players].sort((a,b)=>b.score-a.score||a.falls-b.falls||a.netId-b.netId);
    const count=Math.max(0,this.room.target-this.finished.length),cut=ranked[count-1]?.score;
    this.finish([...this.finished,...ranked.filter((p,i)=>i<count||(cut!==undefined&&p.score===cut)).map(p=>p.id)]);
  }
  snapshot(){
    const phase=this.time%11;
    return {rule:this.rule,message:this.message,scoreType:this.definition.scoreType,teams:this.teamScores.map(q),overtime:this.overtime,locked:this.time<this.pauseUntil,
      cells:['pattern','territory'].includes(this.rule)?this.cells:undefined,
      pattern:this.rule==='pattern'?this.pattern:undefined,
      symbols:this.rule==='memory'&&phase<4?this.symbols:undefined,
      answer:this.rule==='memory'&&phase>=4?this.answer:undefined,
      players:[...this.room.players.values()].map(p=>({id:p.id,team:p.team,score:q(p.score||0),tail:!!p.tail,infected:!!p.infected,holding:p.holding,laps:p.laps,nextGate:p.nextGate})),
      objects:[...this.room.physics.objects.values()].map(o=>({id:o.data.id,kind:o.data.kind,p:xyz(o.body).map(q),v:[o.body.velocity.x,o.body.velocity.y,o.body.velocity.z].map(q),owner:o.owner,radius:o.body.shapes[0].radius,fuse:o.fuse?Math.max(0,q(o.fuse-this.time)):undefined})),
      targets:[...this.targets.values()].map((o,i)=>({id:o.id,visible:this.time>=o.readyAt,active:this.rule!=='buttons'||this.buttonIndex===i})),effects:this.effects};
  }
}
