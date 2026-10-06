import * as THREE from 'three';

// Keep the scene graph as the source of transforms, while rendering repeated
// low-poly shapes in instanced batches. Textured labels remain ordinary meshes.
export class SceneBatches {
  constructor(scene,source){
    this.source=source;this.root=new THREE.Group();scene.add(this.root);this.batches=[];this.normalised=new Map();
    this.matrix=new THREE.Matrix4();this.color=new THREE.Color();
  }
  clear(){
    for(const b of this.batches){b.mesh.dispose();b.mesh.material.dispose();}
    for(const geometry of this.normalised.values())geometry.dispose();
    this.root.clear();this.batches=[];this.normalised.clear();
  }
  rebuild(){
    this.clear();const groups=new Map();
    this.source.traverse(object=>{
      if(!object.isMesh||Array.isArray(object.material)||object.material.map)return;
      let geometry=object.geometry,scale=null,key=geometry.uuid;
      const p=geometry.parameters,colors=geometry.getAttribute('color');
      const box=geometry.type==='BoxGeometry'&&p.widthSegments===1&&p.heightSegments===1&&p.depthSegments===1;
      const cylinder=geometry.type==='CylinderGeometry'&&p.radiusTop===p.radiusBottom&&!p.openEnded;
      if(box||cylinder){
        key=(box?'box':'cylinder:'+p.radialSegments)+':'+(colors?Array.from(colors.array).join(','):'solid');
        scale=box?new THREE.Vector3(p.width,p.height,p.depth):new THREE.Vector3(p.radiusTop,p.height,p.radiusTop);
        if(!this.normalised.has(key)){
          const normal=box?new THREE.BoxGeometry(1,1,1):new THREE.CylinderGeometry(1,1,1,p.radialSegments);
          if(colors)normal.setAttribute('color',colors.clone());this.normalised.set(key,normal);
        }
        geometry=this.normalised.get(key);
      }
      const m=object.material;
      key+=':'+m.type+':'+m.transparent+':'+m.opacity+':'+m.depthWrite+':'+m.side;
      if(!groups.has(key)){
        const options={color:0xffffff,vertexColors:!!geometry.getAttribute('color'),transparent:m.transparent,opacity:m.opacity,depthWrite:m.depthWrite,side:m.side};
        const material=m.isMeshBasicMaterial?new THREE.MeshBasicMaterial(options):new THREE.MeshLambertMaterial({...options,flatShading:true});
        groups.set(key,{geometry,material,sources:[]});
      }
      groups.get(key).sources.push({object,scale});
      // Layer 1 is available to the camera collision ray, but not the camera.
      object.layers.set(1);
    });
    for(const group of groups.values()){
      const mesh=new THREE.InstancedMesh(group.geometry,group.material,group.sources.length);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;this.root.add(mesh);
      this.batches.push({mesh,sources:group.sources});
    }
  }
  update(){
    this.source.updateMatrixWorld(true);
    for(const {mesh,sources}of this.batches){
      let count=0;
      for(const {object,scale}of sources){
        let visible=true;for(let p=object;p;p=p.parent)if(!p.visible){visible=false;break;}
        if(!visible)continue;
        this.matrix.copy(object.matrixWorld);if(scale)this.matrix.scale(scale);
        mesh.setMatrixAt(count,this.matrix);mesh.setColorAt(count,object.material.color||this.color.set(0xffffff));count++;
      }
      mesh.count=count;mesh.visible=count>0;mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
    }
  }
  metrics(){return {batches:this.batches.filter(b=>b.mesh.count).length,instances:this.batches.reduce((n,b)=>n+b.mesh.count,0)};}
}
