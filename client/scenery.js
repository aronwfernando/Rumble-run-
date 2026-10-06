import { random } from '../shared/random.js';

export function addScenery(view,map){
  const rng=random(map.seed+':scenery:'+map.theme.id+':'+map.round),t=map.theme;
  const m=(shape,color,x,y,z,sx,sy,sz)=>view.mesh(shape,color,[x,y,z],[sx,sy,sz]);
  const count=map.mode==='race'?14:10;
  for(let i=0;i<count;i++){
    const a=i/count*Math.PI*2,r=rng.range(40,50),x=map.mode==='race'?(i%2?1:-1)*r:Math.cos(a)*r,z=map.mode==='race'?-i/count*map.length:Math.sin(a)*r;
    const y=rng.range(-4,-1),size=rng.range(3,5);
    m('cone',t.edge,x,y-3,z,size,6,size).rotation.z=Math.PI;
    m('cylinder',t.floor,x,y,z,size,.6,size);
    if(t.id==='candy-carnival'){
      for(const side of [-1,1]){m('cylinder','#fff4e9',x+side*2,y+3,z,.13,6,.13);m('sphere',side>0?t.accent:t.secondary,x+side*2,y+6,z,1.8,1.8,1.8);}
    }else if(t.id==='toy-workshop'){
      for(let j=0;j<3;j++){const b=m('box',j%2?t.secondary:t.accent,x+(j%2-.5),y+1.5+j*2.3,z,3,2.8,3);b.rotation.y=j*.45;}
      m('cone','#fff4e9',x,y+9,z,2,2,2);
    }else if(t.id==='jungle-canopy'||t.id==='pirate-islands'){
      m('cylinder','#a56c55',x,y+3.5,z,.35,7,.35);
      if(t.id==='jungle-canopy')for(let j=0;j<3;j++)m('sphere',j%2?t.floor:t.accent,x+(j-1)*1.8,y+7+j%2,z,2.7,1.8,2.7);
      else{
        for(let j=0;j<5;j++){const leaf=m('box',t.accent,x+Math.sin(j)*1.3,y+7,z+Math.cos(j)*1.3,.8,.18,4.5);leaf.rotation.y=j;leaf.rotation.x=.2;}
        m('box','#fff4e9',x+3,y+3,z,2.6,2,.12).rotation.z=-.2;
        m('cylinder',t.secondary,x+3,y+2,z,.09,5,.09);
      }
    }else if(t.id==='orbital-station'){
      m('sphere',t.accent,x,y+7,z,2.5,2.5,2.5);
      const ring=m('torus',t.secondary,x,y+7,z,4,4,.7);ring.rotation.x=1.1;ring.rotation.z=.5;
      m('cylinder','#fff4e9',x,y+2,z,.3,4,.3);
    }else if(t.id==='frozen-docks'){
      for(let j=0;j<3;j++){const ice=m('cone',j%2?'#eaf5ff':t.secondary,x+(j-1)*2,y+2+j,z,1.4,5+j*2,1.4);ice.rotation.z=(j-1)*.16;}
    }else if(t.id==='desert-ruins'){
      for(const side of [-1,1])m('box',t.secondary,x+side*2,y+3,z,1.4,6,1.6);
      m('box',t.accent,x,y+6,z,5.5,1.3,2);m('cone',t.floor,x+3,y+1,z+3,1,3,1);
    }else{
      for(const side of [-1,1])m('cylinder',t.secondary,x+side*2,y+3,z,.65,6,.65);
      const pipe=m('cylinder',t.accent,x,y+6,z,.65,5,.65);pipe.rotation.z=Math.PI/2;
      m('box',t.accent,x,y+1,z,3.5,2,2);
    }
  }
}
