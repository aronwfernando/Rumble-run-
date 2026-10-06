import { THEMES } from './maps.js';
import { OBJECTIVES, TEAM_COLORS } from './objectives.js';
import { random } from './random.js';

const slab=(id,x,z,w,l,color,y=0,extra={})=>({id,position:[x,y-0.6,z],size:[w,1.2,l],rotation:[0,0,0],color,...extra});
export function createArena(rule, {seed='arena',round=0,difficulty=0.4,themeId='',type='objective'}={}) {
  const objective=OBJECTIVES[rule];if(!objective)throw new Error('Unknown arena objective');
  const rng=random(seed+':arena:'+round),theme={...THEMES.find(t=>t.id===themeId)||THEMES[rng.int(0,THEMES.length-1)]};
  const map={version:2,seed,round,type,mode:'arena',rule,name:objective.name,objective:objective.instructions,
    difficulty,theme,platforms:[],hazards:[],spawn:[],checkpoints:[],sections:[],finish:null,length:48,killY:-7,
    teams:objective.teams,decor:['clouds','crystals','balloons','towers'][rng.int(0,3)],zones:[],items:[]};
  const grid=['memory','pattern','territory','reactive'].includes(rule),pattern=rule==='pattern';
  const halfX=pattern?18:12,halfZ=pattern?9:12;
  if(grid) for(let x=0;x<(pattern?6:4);x++)for(let z=0;z<(pattern?3:4);z++){
    const cell=x*(pattern?3:4)+z;
    map.platforms.push(slab('cell-'+cell,(x-(pattern?2.5:1.5))*6,(z-(pattern?1:1.5))*6,5.98,5.98,(x+z)%2?theme.floor:theme.secondary,0,{cell,tile:true,dynamic:rule==='memory'}));
  }
  else map.platforms.push(slab('arena',0,0,48,rule==='push'?60:38,theme.floor));
  if(!objective.elimination) {
    for(const side of [-1,1])map.platforms.push(slab('rail-z'+side,0,side*(grid?halfZ:rule==='push'?30:19),grid?halfX*2+1:49,0.5,theme.edge,1.5,{size:[grid?halfX*2+1:49,4,0.5]}));
    if(!['football','basketball'].includes(rule))for(const side of [-1,1])map.platforms.push(slab('rail-x'+side,side*(grid?halfX:24),0,0.5,grid?halfZ*2+1:rule==='push'?61:39,theme.edge,1.5,{size:[0.5,4,grid?halfZ*2+1:rule==='push'?61:39]}));
  }
  const count=map.teams||2;
  for(let team=0;team<count;team++) {
    const a=team/count*Math.PI*2;
    const pos=['football','basketball','volleyball'].includes(rule)?[(team?1:-1)*20,0,0]:[Math.cos(a)*15,0,Math.sin(a)*12];
    if(map.teams)map.zones.push({id:'home-'+team,kind:'goal',team,position:pos,radius:rule==='hoard'?9:4,color:TEAM_COLORS[team]});
  }
  if(rule==='push') map.zones=Array.from({length:3},(_,team)=>({id:'goal-'+team,kind:'goal',team,position:[(team-1)*13,0,-24],radius:4,color:TEAM_COLORS[team]}));
  if(rule==='laps') map.gates=[[18,1,12],[-18,1,12],[-18,1,-12],[18,1,-12]].map((position,i)=>({id:'lap-'+i,position,radius:4}));
  if(rule==='volleyball')map.platforms.push(slab('net',0,0,0.25,37,'#fff4e9',1.05,{size:[0.25,2.1,37]}));
  if(rule==='football')for(const side of [-1,1])for(const z of [-12,12])map.platforms.push(slab('goal-wall-'+side+'-'+z,side*24,z,0.5,13,theme.edge,1.5,{size:[0.5,4,13]}));
  if(rule==='rolling') {
    map.platforms=[];
    for(let i=0;i<5;i++)map.platforms.push({id:'drum-'+i,position:[(i-2)*7.2,-4.4,0],size:[6.8,8.8,8.8],rotation:[0,0,0],color:i%2?theme.secondary:theme.floor,drum:{radius:4,span:6.8,speed:(i%2?1:-1)*(0.18+difficulty*0.15),gap:3+i%3}});
  }
  for(let i=0;i<30;i++) {
    const x=(i%6-2.5)*2.6,z=(Math.floor(i/6)-2)*2.6;
    const cells=map.platforms.filter(p=>p.cell!==undefined),cell=cells[i%cells.length];
    map.spawn.push(rule==='rolling'?[(i%5-2)*7.2,1.1,(Math.floor(i/5)-2.5)*0.4]:grid?[cell.position[0]+(i<cells.length?-0.7:0.7),1.1,cell.position[2]]:[x,1.1,z]);
  }
  if(rule==='football'||rule==='basketball'||rule==='volleyball')map.items.push({id:'ball',kind:'ball',position:[0,rule==='volleyball'?5:1,0],radius:0.8,mass:0.65});
  if(rule==='hoard')for(let i=0;i<6;i++)map.items.push({id:'ball-'+i,kind:'ball',position:[(i%3-1)*3,1,(Math.floor(i/3)-0.5)*3],radius:0.85,mass:0.8});
  if(rule==='push'||rule==='snowball')for(let team=0;team<map.teams;team++)map.items.push({id:'ball-'+team,kind:'ball',team,position:[(team-(map.teams-1)/2)*13,1.5,rule==='push'?12:0],radius:1.4,mass:3});
  if(rule==='collection')for(let i=0;i<12;i++)map.items.push({id:'egg-'+i,kind:'egg',position:[(i%4-1.5)*2,1,(Math.floor(i/4)-1)*2],radius:0.45,mass:0.3,carry:true});
  if(rule==='territory'||rule==='possession')for(let i=0;i<(rule==='territory'?2:1);i++)map.items.push({id:'beacon-'+i,kind:'beacon',position:[i?6:-6,1,0],radius:0.4,mass:0.3,carry:true});
  if(rule==='blast')for(let i=0;i<4;i++)map.items.push({id:'bomb-'+i,kind:'bomb',position:[(i%2?1:-1)*7,1,(i<2?1:-1)*7],radius:0.45,mass:0.4,carry:true});
  if(['collect','hoops','buttons','snowball'].includes(rule))for(let i=0;i<(rule==='buttons'?8:rule==='snowball'?36:16);i++) {
    const a=rng.range(0,Math.PI*2),r=rng.range(3,grid?9:16);
    map.items.push({id:'target-'+i,kind:rule==='hoops'?'hoop':rule==='buttons'?'button':rule==='snowball'?'snow':'star',position:[Math.cos(a)*r,rule==='hoops'?rng.range(1.5,2.5):0.65,Math.sin(a)*r],radius:rule==='hoops'?1.5:0.7,value:rule==='hoops'&&i%5===0?3:1,trigger:true});
  }
  return map;
}
