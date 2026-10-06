import * as THREE from 'three';
import { SYMBOLS, TEAM_COLORS } from '../shared/objectives.js';

// Procedural geometry only. Every scoring target is positioned from the same
// manifest used by the server, and only server snapshots reveal puzzle states.
export class ArenaView {
  constructor(view, map) {
    this.view=view;this.map=map;this.items=new Map();this.effects=new Map();this.cells=new Map();this.symbolLabels=new Map();
    this.group=new THREE.Group();view.world.add(this.group);
    const mesh=(kind,color,p,s,parent=this.group)=>view.mesh(kind,color,p,s,parent);
    for(const zone of map.zones||[]) {
      const ring=mesh('torus',zone.color,[zone.position[0],0.06,zone.position[2]],[zone.radius,zone.radius,0.25]);ring.rotation.x=-Math.PI/2;
      this.label('TEAM '+(zone.team+1),zone.color,[zone.position[0],0.08,zone.position[2]],3,true);
      if(map.rule==='football'){
        for(const z of [-5.5,5.5])mesh('cylinder',zone.color,[zone.position[0]*1.075,2,z],[0.16,4,0.16]);
        mesh('box','#ffffff',[zone.position[0]*1.075,4,0],[0.25,0.25,11.3]);
      }
      if(map.rule==='basketball'){
        mesh('cylinder',zone.color,[zone.position[0]*1.1,2.5,0],[0.14,5,0.14]);
        mesh('box','#fff4e9',[zone.position[0]*1.1,5,0],[0.15,2,3.4]);
        const rim=mesh('torus',zone.color,[zone.position[0],4,0],[2,2,0.75]);rim.rotation.x=-Math.PI/2;
      }
    }
    for(const gate of map.gates||[]){
      const ring=mesh('torus','#ffd154',gate.position,[gate.radius,gate.radius,0.8]);ring.rotation.y=gate.position[0]>0?Math.PI/2:0;
      this.label(String(Number(gate.id.split('-')[1])+1),'#fff4e9',[gate.position[0],5,gate.position[2]],2);
    }
    for(const data of map.items||[]) {
      const color=data.team!==undefined?TEAM_COLORS[data.team]:data.kind==='bomb'?'#344364':data.kind==='egg'?'#fff4e9':data.kind==='beacon'?'#77f6e0':data.value===3?'#ffbc31':'#ffe278';
      const root=new THREE.Group();this.group.add(root);root.position.set(...data.position);
      if(data.kind==='hoop')mesh('torus',color,null,[data.radius,data.radius,0.8],root);
      else if(data.kind==='button'||data.kind==='snow')mesh('cylinder',color,null,[data.radius,0.15,data.radius],root);
      else if(data.kind==='beacon'){
        mesh('box',color,null,[0.55,0.8,0.5],root);mesh('box','#fff4e9',[0,0.5,0],[0.22,0.2,0.25],root);
      }else{
        mesh('sphere',color,null,[data.radius,data.radius*(data.kind==='egg'?1.3:1),data.radius],root);
        if(data.kind==='ball')mesh('torus','#fff4e9',null,[data.radius*0.97,data.radius*0.97,0.5],root);
        if(data.kind==='bomb')mesh('cylinder','#ff905a',[0,data.radius+0.13,0],[0.07,0.3,0.07],root);
      }
      this.items.set(data.id,{root,data,positioned:false});
    }
    for(const p of map.platforms.filter(p=>p.cell!==undefined)){
      const parent=view.platformMeshes.get(p.id);
      const tile=mesh('box',map.theme.secondary,[0,0.614,0],[p.size[0]-0.12,0.025,p.size[2]-0.12],parent);
      this.cells.set(p.cell,tile);
      if(map.rule==='memory'){
        const labels=SYMBOLS.map(symbol=>this.label(symbol,'#ffffff',[0,0.65,0],3,true,parent));
        labels.forEach(label=>label.visible=false);this.symbolLabels.set(p.cell,labels);
      }
    }
  }
  label(text,color,position,width=3,floor=false,parent=this.group){
    const canvas=document.createElement('canvas');canvas.width=256;canvas.height=128;
    const ctx=canvas.getContext('2d');ctx.fillStyle=color;ctx.font='900 86px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,128,68);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,side:THREE.DoubleSide,depthWrite:false});
    const label=new THREE.Mesh(new THREE.PlaneGeometry(width,width/2),material);label.position.set(...position);
    if(floor)label.rotation.x=-Math.PI/2;
    label.userData.ownedGeometry=true;label.userData.ownedMaterial=true;parent.add(label);return label;
  }
  update(state,time,delta){
    if(!state)return;
    const view=this.view;
    for(const s of state.objects||[]){
      const item=this.items.get(s.id);if(!item)continue;
      const target=new THREE.Vector3(...s.p);
      if(!item.positioned||item.root.position.distanceTo(target)>5)item.root.position.copy(target);
      else item.root.position.lerp(target,1-Math.exp(-delta*24));
      item.positioned=true;item.root.scale.setScalar(s.radius/item.data.radius);
      item.root.rotation.y=time*0.4;
      if(s.fuse!==undefined&&s.fuse<2)item.root.children[0].material=view.material(Math.floor(time*8)%2?'#ff658c':'#ffe278');
    }
    for(const target of state.targets||[]){
      const item=this.items.get(target.id);if(!item)continue;
      item.root.visible=target.visible;
      if(item.data.kind==='button')item.root.children[0].material=view.material(target.active?'#ffe278':'#46516e');
      else if(item.data.kind==='star'){item.root.rotation.y=time;item.root.position.y=item.data.position[1]+Math.sin(time*3)*0.08;}
    }
    for(const [cell,tile]of this.cells){
      const value=state.cells?.[cell];
      tile.material=view.material(this.map.rule==='pattern'?(value===1?'#ffe278':'#46516e'):value>=0?TEAM_COLORS[value]:this.map.theme.secondary);
      const labels=this.symbolLabels.get(cell);if(labels)labels.forEach((label,i)=>label.visible=state.symbols?.[cell]===i);
    }
    for(const a of view.avatars.values()){
      const p=state.players?.find(p=>p.id===a.player.id);if(!p)continue;
      let marker=a.root.userData.objectiveMarker;
      if(!marker){marker=view.mesh('cone','#ffe278',[0,1.5,0],[0.24,0.4,0.24],a.root);marker.rotation.z=Math.PI;a.root.userData.objectiveMarker=marker;}
      marker.visible=p.tail||p.infected||p.team!==null&&p.team!==undefined;
      marker.material=view.material(p.infected?'#91df8c':p.tail?'#ffe278':TEAM_COLORS[p.team]||'#ffffff');
      a.label.textContent=`${a.player.name}${p.team!==null&&p.team!==undefined?' · T'+(p.team+1):''}${p.tail?' · RIBBON':''}${p.infected?' · TAGGER':''}`;
    }
    const seen=new Set();
    for(const e of state.effects||[]){
      seen.add(e.id);let root=this.effects.get(e.id);
      if(!root){root=new THREE.Group();this.group.add(root);this.effects.set(e.id,root);
        if(e.kind==='laser')view.mesh('box','#ff658c',null,[48,0.18,0.32],root);
        else if(e.kind==='creature'){
          view.mesh('sphere','#d790ff',null,[1.4,1,1.7],root);
          for(const x of [-0.6,0.6])view.mesh('cone','#ffe278',[x,0.8,-0.6],[0.3,0.8,0.3],root);
        }else{const m=view.mesh('torus','#ffe278',null,[e.radius,e.radius,0.4],root);m.rotation.x=-Math.PI/2;}
      }
      root.visible=true;root.position.set(...e.p);root.rotation.y=e.kind==='laser'?e.angle:0;
      if(e.kind==='laser')root.children[0].scale.y=e.active?0.22:0.07;
      if(e.kind==='creature'&&e.target)root.lookAt(e.target[0],e.p[1],e.target[2]);
      root.children[0].material=view.material(e.kind==='zone'?'#77f6e0':e.active?'#ff658c':'#ffe278');
    }
    for(const [id,e]of this.effects)e.visible=seen.has(id);
  }
}
