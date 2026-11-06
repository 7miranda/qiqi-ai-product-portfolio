export function createWorld(THREE,stage){
 const scene=new THREE.Scene();scene.background=new THREE.Color('#17191b');scene.fog=new THREE.Fog('#17191b',40,90);
 const camera=new THREE.PerspectiveCamera(36,1,.1,120);
 const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;stage.append(renderer.domElement);
 scene.add(new THREE.HemisphereLight('#e5e7e5','#292d30',1.75));
 const key=new THREE.DirectionalLight('#fff8ed',2.8);key.position.set(-6,12,7);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-16,right:16,top:13,bottom:-13,near:.1,far:55});key.shadow.normalBias=.025;key.shadow.bias=-.0003;key.shadow.radius=4;scene.add(key,key.target);
 const fill=new THREE.DirectionalLight('#c6d6df',1.4);fill.position.set(9,6,-1);scene.add(fill);const rim=new THREE.DirectionalLight('#fff4e4',1.15);rim.position.set(0,5,-8);scene.add(rim);
 const materials=new Map();
 const mat=(color,metalness=.3)=>{const k=color+metalness;if(!materials.has(k))materials.set(k,new THREE.MeshStandardMaterial({color,metalness,roughness:.65}));return materials.get(k);};
 function box(w,h,d,color,x,y,z,parent=scene,metal=.3){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color,metal));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 function line(points,color,parent=scene,opacity=1){const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p))),new THREE.LineBasicMaterial({color,transparent:opacity<1,opacity}));parent.add(l);return l;}
 function panel(w,h,color,x,y,z,parent,rotation){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide}));m.position.set(x,y,z);if(rotation)m.rotation.set(...rotation);parent.add(m);}
 const environment=new THREE.Scene();environment.background=new THREE.Color('#aaa59b');panel(8,8,'#fff5e5',-8,5,0,environment,[0,Math.PI/2,0]);panel(4,7,'#8c9399',8,4,0,environment,[0,-Math.PI/2,0]);panel(10,5,'#f6f2e9',0,9,0,environment,[Math.PI/2,0,0]);const pmrem=new THREE.PMREMGenerator(renderer),env=pmrem.fromScene(environment,.025);scene.environment=env.texture;scene.environmentIntensity=.43;pmrem.dispose();
 const room=new THREE.Group();scene.add(room);
 box(80,.25,90,'#292a2a',0,-.14,25,room,.22);box(22,8.5,.24,'#2d3031',0,4.25,-7,room,.25);box(.22,8.5,24,'#252728',-11,4.25,4,room,.2);box(.22,8.5,24,'#27292a',11,4.25,4,room,.25);box(22,.18,24,'#202223',0,8.5,4,room,.3);
 for(let x=-10.5;x<=10.5;x+=3.5)box(.025,8.2,.025,'#191c1e',x,4.2,-6.84,room);
 for(const x of [-8,0,8]){box(.10,.09,12,'#5c5346',x,8.32,0,room);panel(.11,11,'#eadcc7',x,8.25,0,room,[-Math.PI/2,0,0]);}
 for(let x=-10;x<=10;x+=2.5)line([[x,.005,-6.7],[x,.005,14]],'#5c5952',room,.2);for(let z=-6;z<16;z+=2.5)line([[-10.8,.005,z],[10.8,.005,z]],'#5c5952',room,.2);
 for(const x of [-10,10]){box(.27,8.2,.48,'#454646',x,4.1,-6.5,room,.65);box(.055,7.2,.05,'#947d5c',x,4,-6.24,room,.75);}
 // A built-in two-tier display wall, with four low islands in the room.
 const displayBack=box(14.3,6.05,.13,'#353a3c',0,3.25,-6.76,room,.25);displayBack.material.emissive.set('#262b2d');displayBack.material.emissiveIntensity=.22;
 for(const x of [-5.175,-1.725,1.725,5.175]){const light=new THREE.SpotLight('#fff2dc',24,9,.58,.65,1.7);light.position.set(x,6.08,-4.45);light.target.position.set(x,2.4,-6.6);scene.add(light,light.target);}
 for(const x of [-6.9,-3.45,0,3.45,6.9])box(.07,5.9,.25,'#60594f',x,3.3,-6.57,room,.7);
 for(const y of [2.20,4.36,6.27]){box(14.1,.08,1.3,'#55483b',0,y,-6.05,room,.3);box(14.05,.025,.04,'#a88f69',0,y-.08,-5.37,room,.7);}
 // Warm-white under-shelf lighting separates the objects from the graphite backing.
 for(const y of [4.30,6.21]){const strip=box(13.8,.014,.06,'#c5b08d',0,y,-5.55,room,.2);strip.material=new THREE.MeshStandardMaterial({color:'#e4d5ba',emissive:'#d2b78c',emissiveIntensity:.6,roughness:.5});}
 // Subtle smoked-oak grain belongs to the display furniture, not the product assets.
 const woodCanvas=document.createElement('canvas');woodCanvas.width=512;woodCanvas.height=64;const wc=woodCanvas.getContext('2d');wc.fillStyle='#5b4b3d';wc.fillRect(0,0,512,64);let seed=37;const random=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};for(let i=0;i<170;i++){wc.strokeStyle=`rgba(${random()>.5?'132,108,80':'30,25,21'},${.035+random()*.09})`;wc.lineWidth=.3+random()*.9;wc.beginPath();const y=random()*64;wc.moveTo(0,y);wc.bezierCurveTo(160,y+random()*3,330,y-random()*3,512,y);wc.stroke();}const wood=new THREE.CanvasTexture(woodCanvas);wood.colorSpace=THREE.SRGBColorSpace;wood.wrapS=THREE.RepeatWrapping;wood.repeat.set(2,1);const woodMat=new THREE.MeshStandardMaterial({map:wood,color:'#9b8f7a',roughness:.8,metalness:.05});
 const signCanvas=document.createElement('canvas');signCanvas.width=1200;signCanvas.height=220;const ctx=signCanvas.getContext('2d');ctx.textAlign='center';ctx.fillStyle='#d5d1c6';ctx.font='600 76px Segoe UI';ctx.fillText('SHOWROOM',600,105);ctx.fillStyle='#9a9588';ctx.font='17px Consolas';ctx.fillText('CROSSBOUND / THE ORIGINAL 100',600,165);const signTexture=new THREE.CanvasTexture(signCanvas);signTexture.colorSpace=THREE.SRGBColorSpace;const sign=new THREE.Mesh(new THREE.PlaneGeometry(7.8,1.4),new THREE.MeshBasicMaterial({map:signTexture,transparent:true,depthWrite:false}));sign.position.set(0,7.13,-6.77);room.add(sign);
 const positions=[];
 for(let row=0;row<2;row++)for(let col=0;col<4;col++)positions.push({x:-5.175+col*3.45,y:row===0?4.48:2.32,z:row===0?-5.85:-5.45,kind:'wall'});
 for(let i=0;i<4;i++)positions.push({x:-5.7+i*3.8,y:.46,z:i%2?1.3:.6,kind:'floor'});
 const stations=positions.map((p,index)=>{
  const group=new THREE.Group();group.position.set(p.x,0,p.z);room.add(group);const floor=p.kind==='floor',w=floor?3.35:2.95,d=floor?2.65:1.7;
  if(floor){box(w,p.y-.10,d,'#343435',0,(p.y-.10)/2,0,group,.35);box(w-.2,.065,d-.2,'#181b1d',0,.033,0,group,.3);box(w-.15,.22,.04,'#514337',0,.19,d/2+.015,group,.1).material=woodMat;}
  box(w+.10,.10,d+.10,'#69665d',0,p.y-.05,0,group,.42);box(w-.08,.025,.04,'#a88f69',0,p.y-.13,d/2+.03,group,.72);
  const outline=line([[-w/2,p.y+.015,-d/2],[w/2,p.y+.015,-d/2],[w/2,p.y+.015,d/2],[-w/2,p.y+.015,d/2],[-w/2,p.y+.015,-d/2]],'#46bfd5',group);outline.visible=false;
  const holder=new THREE.Group();holder.position.y=p.y;holder.rotation.y=-.20;group.add(holder);group.visible=false;
  return {index,group,holder,outline,position:{...p},original:{...p},width:w,depth:d};
 });
 return {scene,camera,renderer,room,stations,env,dispose(){const geometries=new Set(),materials=new Set(),textures=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[]){materials.add(m);for(const value of Object.values(m))if(value?.isTexture)textures.add(value);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());env.dispose();renderer.dispose();renderer.forceContextLoss();}};
}
