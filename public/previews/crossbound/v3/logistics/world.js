// Brand palette follows the homepage / HQ and the repository industrialColor finish.
// The showroom informs the fixed camera and spatial interaction only.
// No photographic backplates; the transport yard and warehouse share one 3D scene.
function createLogisticsWorld({host,onPick,onFrame,destinationLabel="海外履约中心"}){
 let disposed=false,hostSuspended=false,raf=0,dirty=true,lastDraw=0;
 const T=THREE,scene=new T.Scene(),camera=new T.PerspectiveCamera(44,1,.1,250);
 const renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:false});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.outputColorSpace=T.SRGBColorSpace;
 renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;renderer.shadowMap.autoUpdate=false;host.appendChild(renderer.domElement);
 scene.fog=new T.Fog('#a9b8bb',70,300);
 const mats=new Map(),geos=new Map(),animatedRollers=[],belts=[],parcels=[],beacons=[],fans=[],dynamicParts=[];
 function material(color,metal=.25,rough=.65){const k=color+metal+rough;if(!mats.has(k))mats.set(k,new T.MeshStandardMaterial({color,metalness:metal,roughness:rough}));return mats.get(k)}
 const graphite=material('#0f1d23',.35),steel=material('#747f83',.65,.38),trim=material('#acbec6',.5,.46),dark=material('#071218',.2),rubber=material('#12242b',.04,.88),gold=material('#b7b7a7',.4,.55),cream=material('#d6d9d6',.36,.30),blue=material('#344f5c',.38,.4),wood=material('#856e50',.02,.9),labelMat=material('#dad9c9',0,.9);
 const lampMat=new T.MeshStandardMaterial({color:'#c6e3eb',emissive:'#8fcfdd',emissiveIntensity:1.1,roughness:.5}),sageMat=new T.MeshStandardMaterial({color:'#c5f531',emissive:'#a4d52e',emissiveIntensity:.5});
 function box(w,h,d,x,y,z,m=graphite,parent=scene){const k=`b${w},${h},${d}`;if(!geos.has(k)){if(w<=4&&d<=7&&Math.min(w,h,d)>.3){const b=Math.min(.075,Math.min(w,h,d)*.07),s=new T.Shape();s.moveTo(-w/2+b,-h/2+b);s.lineTo(w/2-b,-h/2+b);s.lineTo(w/2-b,h/2-b);s.lineTo(-w/2+b,h/2-b);s.closePath();const g=new T.ExtrudeGeometry(s,{depth:d-2*b,bevelEnabled:true,bevelThickness:b,bevelSize:b,bevelSegments:3,steps:1});g.translate(0,0,-d/2+b);geos.set(k,g)}else geos.set(k,new T.BoxGeometry(w,h,d));}const o=new T.Mesh(geos.get(k),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
 function cylinder(r,h,x,y,z,m=steel,parent=scene,segments=16){const k=`c${r},${h},${segments}`;if(!geos.has(k))geos.set(k,new T.CylinderGeometry(r,r,h,segments));const o=new T.Mesh(geos.get(k),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
 function beam(a,b,w,m=steel,parent=scene){const av=new T.Vector3(...a),bv=new T.Vector3(...b),v=bv.clone().sub(av);const o=box(w,v.length(),w,...av.add(bv).multiplyScalar(.5).toArray(),m,parent);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return o}
 function line(points,color='#899389',parent=scene,opacity=.4){const o=new T.Line(new T.BufferGeometry().setFromPoints(points.map(p=>new T.Vector3(...p))),new T.LineBasicMaterial({color,transparent:true,opacity}));parent.add(o);return o}
 function canvasTexture(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t}
 function sign(text,w,h,x,y,z,parent=scene,color='#dbd9cc',bg=null){const tex=canvasTexture(1024,Math.max(24,Math.round(1024*h/w)),(g,cw,ch)=>{if(bg){g.fillStyle=bg;g.fillRect(0,0,cw,ch)}g.fillStyle=color;g.textAlign='center';g.textBaseline='middle';g.font=`600 ${Math.round(ch*.52)}px Oxanium, "Noto Sans SC"`;g.fillText(text,cw/2,ch*.52,cw*.95)});const o=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false}));o.position.set(x,y,z);parent.add(o);return o}
 // Captured sky radiance supplies soft reflections; all visible objects remain live geometry.
 const NOISE='float cbh(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}float cbn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(cbh(i),cbh(i+vec2(1,0)),f.x),mix(cbh(i+vec2(0,1)),cbh(i+vec2(1,1)),f.x),f.y);}float cbf(vec2 p){float a=.5,s=0.;for(int i=0;i<3;i++){s+=a*cbn(p);p=p*2.03+vec2(17.1,9.3);a*=.5;}return s;}';
 const SKY='uniform vec3 sunDir;vec3 skyCol(vec3 d){float h=d.y;vec3 top=vec3(.09,.21,.35),hor=vec3(.44,.53,.57);vec3 c=mix(hor,top,pow(clamp(h,0.,1.),.5));c=mix(c,vec3(.36,.42,.44),clamp(-h*5.,0.,1.));float s=max(dot(d,sunDir),0.);c+=vec3(1.,.84,.62)*(pow(s,1400.)*14.+pow(s,10.)*.22+pow(s,2.)*.05);return c;}';
 const sunDir=new T.Vector3(-.42,.34,-.84).normalize();
 const skyMat=new T.ShaderMaterial({uniforms:{sunDir:{value:sunDir},time:{value:0}},side:T.BackSide,depthWrite:false,fog:false,
  vertexShader:'varying vec3 vD;void main(){vD=normalize(position);vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_Position=p.xyww;}',
  fragmentShader:'varying vec3 vD;uniform float time;'+NOISE+SKY+'void main(){vec3 d=normalize(vD);vec3 c=skyCol(d);if(d.y>0.){vec2 uv=d.xz/(d.y+.1)*1.2;float k=cbf(uv*.7+vec2(time*.004,0.));float m=smoothstep(.52,.82,k)*smoothstep(.0,.18,d.y)*(1.-smoothstep(.45,.85,d.y));float s=max(dot(d,sunDir),0.);c=mix(c,vec3(.86,.87,.85)*(.82+.25*s)-vec3(.09)*smoothstep(.75,.95,k),m*.85);}gl_FragColor=vec4(c,1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'});
 const skyDome=new T.Mesh(new T.SphereGeometry(420,48,24),skyMat);skyDome.frustumCulled=false;skyDome.renderOrder=-1;
 {const s=new T.Scene();s.add(new T.Mesh(new T.SphereGeometry(50,32,16),skyMat));const pm=new T.PMREMGenerator(renderer),env=pm.fromScene(s,.03);scene.environment=env.texture;scene.environmentIntensity=.55;pm.dispose()}
 const portBg=new T.Color('#9fb0b4'),roomBg=new T.Color('#0b1215');scene.background=portBg;
 const ambient=new T.HemisphereLight('#b4c9d9','#3b3b39',.65);scene.add(ambient);
 const key=new T.DirectionalLight('#ffe4bd',3.0);key.position.set(-25,38,10);key.target.position.set(0,0,8);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-42,right:42,top:38,bottom:-38,near:1,far:110});key.shadow.radius=4;key.shadow.normalBias=.14;key.shadow.bias=-.001;scene.add(key,key.target);
 const fill=new T.DirectionalLight('#b1cfdf',.35);fill.position.set(18,16,-8);scene.add(fill);
 const indoorKey=new T.DirectionalLight('#ede5d7',2.0);indoorKey.position.set(-5,8,-2);indoorKey.target.position.set(0,0,-19);indoorKey.castShadow=true;indoorKey.shadow.mapSize.set(2048,2048);Object.assign(indoorKey.shadow.camera,{left:-16,right:16,top:14,bottom:-14,near:.1,far:55});indoorKey.shadow.normalBias=.08;indoorKey.shadow.bias=-.0005;scene.add(indoorKey,indoorKey.target);
 const yard=new T.Group(),room=new T.Group();scene.add(yard,room);
 for(const x of [-8,0,8]){const light=new T.PointLight('#e3e8df',28,23,2);light.position.set(x,7,-13);room.add(light)}
 

 const microFinish=canvasTexture(256,256,(g,w,h)=>{let seed=17;const image=g.createImageData(w,h);for(let i=0;i<image.data.length;i+=4){seed=(seed*1664525+1013904223)>>>0;const n=222+seed%12;image.data[i]=image.data[i+1]=image.data[i+2]=n;image.data[i+3]=255}g.putImageData(image,0,0);});
 microFinish.colorSpace=T.NoColorSpace;microFinish.wrapS=microFinish.wrapT=T.RepeatWrapping;microFinish.repeat.set(4,4);
 for(const m of [graphite,steel,trim,cream,blue]){m.roughnessMap=microFinish;m.bumpMap=null;m.envMapIntensity=.75;}
 const asphalt=canvasTexture(1024,1024,(g,w,h)=>{
  g.fillStyle='#8b9395';g.fillRect(0,0,w,h);let seed=28;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
  for(let j=0;j<18000;j++){const v=Math.floor(75+rand()*105);g.fillStyle=`rgba(${v},${v+2},${v+3},.2)`;const s=.5+rand()*2;g.fillRect(rand()*w,rand()*h,s,s)}
  for(let j=0;j<42;j++){const x=rand()*w,y=rand()*h,r=25+rand()*100,grad=g.createRadialGradient(x,y,0,x,y,r);grad.addColorStop(0,'rgba(31,43,47,.035)');grad.addColorStop(1,'rgba(31,43,47,0)');g.fillStyle=grad;g.fillRect(x-r,y-r,2*r,2*r)}
 });asphalt.wrapS=asphalt.wrapT=T.RepeatWrapping;asphalt.repeat.set(8,18);asphalt.anisotropy=renderer.capabilities.getMaxAnisotropy();

 const asphaltPhoto=new T.TextureLoader().load(logisticsTextures.diff),asphaltRough=new T.TextureLoader().load(logisticsTextures.rough);
 asphaltPhoto.colorSpace=T.SRGBColorSpace;for(const tex of [asphaltPhoto,asphaltRough]){tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(20,44);tex.anisotropy=renderer.capabilities.getMaxAnisotropy();}
 // Warm concrete pier. The water is a separately animated geometric surface.
 // Subtle manufactured surfaces, without a photographic background.
 const surface=canvasTexture(256,256,(g,w,h)=>{let seed=29;for(let y=0;y<h;y++)for(let x=0;x<w;x++){seed=(seed*1664525+1013904223)>>>0;const v=116+(seed%22);g.fillStyle=`rgb(${v},${v},${v})`;g.fillRect(x,y,1,1)}});surface.wrapS=surface.wrapT=T.RepeatWrapping;surface.repeat.set(36,48);
 const groundMat=new T.MeshStandardMaterial({color:'#a0abb3',map:asphaltPhoto,roughness:.94,metalness:0,bumpMap:asphaltRough,bumpScale:.018,roughnessMap:asphaltRough});groundMat.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\ndiffuseColor.rgb=mix(vec3(.16,.18,.19),diffuseColor.rgb,.50);')};box(95,.5,210,40,-.32,-8,groundMat,yard);
 box(.45,1.2,120,-7.4,-.15,25,material('#293f4b'),yard);
 for(let z=-25;z<85;z+=5)line([[-7,.012,z],[65,.012,z]],'#292f30',yard,.25);
 for(let x=-5;x<60;x+=5)line([[x,.013,-29],[x,.013,85]],'#303735',yard,.18);
 for(let z=14;z<33;z+=3.3)for(const x of [-5,5])box(.11,.018,1.25,x,.025,z,gold,yard);
 for(let z=-16;z<58;z+=7){cylinder(.22,.65,-6.4,.3,z,gold,yard);cylinder(.36,.13,-6.4,.63,z,graphite,yard);box(.8,.18,.7,-6.4,.05,z,dark,yard)}
 
 // Ocean: Gerstner swell + ripple normals, sky reflection, shallow-water tint, crest / shoreline / hull / wake foam.
 const waterMat=new T.ShaderMaterial({uniforms:{time:{value:0},sunDir:{value:sunDir},fogColor:{value:new T.Color('#a9b8bb')},fogNear:{value:70},fogFar:{value:300},shipPos:{value:new T.Vector2(-18,14)},shipYaw:{value:Math.PI},wakeAmt:{value:0}},
  vertexShader:`uniform float time;varying vec3 vW;varying vec3 vN;varying float vH;varying float vJ;
  void gw(vec2 dir,float st,float L,vec3 p,inout vec3 g,inout vec3 Tn,inout vec3 Bn){float k=6.28318/L,c=sqrt(9.8/k);vec2 d=normalize(dir);float f=k*(dot(d,p.xz)-c*time),a=st/k,sf=sin(f),cf=cos(f);g.x+=d.x*a*cf;g.y+=a*sf;g.z+=d.y*a*cf;Tn+=vec3(-d.x*d.x*st*sf,d.x*st*cf,-d.x*d.y*st*sf);Bn+=vec3(-d.x*d.y*st*sf,d.y*st*cf,-d.y*d.y*st*sf);}
  void main(){vec3 p=(modelMatrix*vec4(position,1.)).xyz;vec3 g=p,Tn=vec3(1,0,0),Bn=vec3(0,0,1);float at=.35+.65*smoothstep(0.,45.,-7.-p.x);
  gw(vec2(1.,.55),.11*at,42.,p,g,Tn,Bn);gw(vec2(.65,1.),.09*at,23.,p,g,Tn,Bn);gw(vec2(-.35,1.),.075*at,13.,p,g,Tn,Bn);gw(vec2(1.,-.25),.06*at,7.4,p,g,Tn,Bn);gw(vec2(.3,.95),.05*at,4.1,p,g,Tn,Bn);
  vN=normalize(cross(Bn,Tn));vW=g;vH=g.y-p.y;vJ=Tn.x*Bn.z-Tn.z*Bn.x;gl_Position=projectionMatrix*viewMatrix*vec4(g,1.);}`,
  fragmentShader:`uniform float time;uniform vec3 fogColor;uniform float fogNear;uniform float fogFar;uniform vec2 shipPos;uniform float shipYaw;uniform float wakeAmt;varying vec3 vW;varying vec3 vN;varying float vH;varying float vJ;`+NOISE+SKY+`
  float rip(vec2 q){return cbf(q*.32+vec2(time*.045,time*.028))+.45*cbn(q*1.3-vec2(time*.1,time*.02));}
  void main(){vec3 V=normalize(cameraPosition-vW);vec2 q=vW.xz;float e=.18,h0=rip(q),hx=rip(q+vec2(e,0.)),hz=rip(q+vec2(0.,e));
   float dist=length(vW-cameraPosition),detail=.22*(1.-smoothstep(40.,180.,dist));vec3 N=normalize(vN+vec3(-(hx-h0)/e*detail,0.,-(hz-h0)/e*detail));
   float fres=.02+.98*pow(1.-max(dot(N,V),0.),5.);vec3 R=reflect(-V,N);R.y=abs(R.y)+.02;vec3 refl=skyCol(normalize(R));
   float sh=-7.-vW.x,shore=smoothstep(16.,0.,sh);vec3 body=mix(vec3(.012,.075,.10),vec3(.03,.22,.23),shore*.8);
   body+=vec3(.03,.20,.19)*clamp(vH*1.3+.15,0.,1.)*.5;body+=vec3(.04,.26,.22)*pow(max(dot(V,-sunDir),0.),4.)*clamp(vH*2.,0.,1.);
   body*=.6+.4*max(dot(N,sunDir),0.);vec3 col=mix(body,refl*.85,fres);
   float sp=max(dot(R,sunDir),0.);col+=vec3(1.,.88,.7)*(pow(sp,700.)*7.+pow(sp,70.)*.18);
   float n1=cbf(q*1.7+vec2(time*.12,-time*.05)),n2=cbn(q*3.1-vec2(time*.2,0.))*.6+cbn(q*6.7+time*.15)*.4;
   float crest=smoothstep(.82,.45,vJ)*smoothstep(.45,.75,n1);
   float shoreF=smoothstep(2.6,0.,sh)*smoothstep(.35,.62,n1*.7+.3*(.5+.5*sin(sh*2.6-time*1.8)));
   vec2 d0=q-shipPos;vec2 fw=vec2(cos(shipYaw),-sin(shipYaw));vec2 d=vec2(-dot(d0,fw),dot(d0,vec2(-fw.y,fw.x)));float r=length(vec2(d.x/8.6,d.y/2.25));float hull=smoothstep(1.4,1.02,r)*smoothstep(.3,.62,n2);
   float b=d.x-7.,wid=1.8+max(b,0.)*.22,wk=step(0.,b)*(1.-smoothstep(wid*.45,wid,abs(d.y)))*exp(-max(b,0.)/60.),kel=step(0.,b)*smoothstep(1.1,0.,abs(abs(d.y)-wid))*exp(-max(b,0.)/50.);
   float foam=clamp(crest*.45+shoreF+hull*.7+wakeAmt*(wk*.85+kel)*smoothstep(.28,.58,n2),0.,1.);
   col=mix(col,vec3(.80,.85,.85)*(.72+.28*max(dot(N,sunDir),0.)),foam*.88);
   col=mix(col,fogColor,smoothstep(fogNear,fogFar,dist));gl_FragColor=vec4(col,1.);
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
  }`});
 const waterGeo=new T.PlaneGeometry(400,400,240,240);waterGeo.rotateX(-Math.PI/2);const water=new T.Mesh(waterGeo,waterMat);water.position.set(-207,-.42,24);water.frustumCulled=false;yard.add(water);yard.add(skyDome);
 // Container vessel: graphic forms, warm metal edges and practical proportions.
 function container(parent,x,y,z,w=3.6,h=1.6,d=1.7,col='#617579'){
  const g=new T.Group();g.position.set(x,y,z);parent.add(g);const m=material(col,.4,.62);box(w,h,d,0,h/2,0,m,g);
  for(let q=-w/2+.18;q<w/2;q+=.29)box(.045,h-.1,.045,q,h/2,d/2+.012,steel,g);
  for(const xx of [-w/2+.05,w/2-.05]){box(.09,h,.09,xx,h/2,d/2,trim,g);box(.09,h,.09,xx,h/2,-d/2,trim,g)}
  for(const yy of [.07,h-.07])box(w,.1,.07,0,yy,d/2+.02,steel,g);
  box(.34,.17,.02,w*.23,h*.7,d/2+.04,labelMat,g);
  for(let q=-w/2+.18;q<w/2;q+=.29)box(.045,h-.1,.045,q,h/2,-d/2-.012,steel,g);
  for(const side of [-1,1]){box(.03,h-.08,.04,side*(w/2+.01),h/2,0,trim,g);for(const z of [-d*.28,d*.28])box(.035,h*.8,.045,side*(w/2+.025),h/2,z,steel,g);}
  return g;
 }
 const ship=new T.Group();ship.name='ocean-vessel';ship.position.set(-18,-.18,14);ship.rotation.y=Math.PI;waterMat.uniforms.wakeAmt.value=0;ship.scale.setScalar(.8);ship.rotation.y=Math.PI;yard.add(ship);
 // Hull stations taper into a raked bow; the waterline and deck are distinct surfaces.
 const stations=[[-10,1.7],[-9.4,2.55],[-5,2.55],[4.8,2.55],[7.5,2.0],[9.4,.9],[10.5,.06]],hullVertices=[],hullIndices=[];
 for(const [x,r] of stations)for(const [y,s] of [[-.48,.52],[.15,.82],[1.1,1],[2.65,1]]){hullVertices.push(x,y,-r*s,x,y,r*s)}
 for(let i=0;i<stations.length-1;i++)for(let level=0;level<3;level++)for(let side=0;side<2;side++){const a=i*8+level*2+side,b=a+8,c=a+2,d=b+2;hullIndices.push(a,b,c,b,d,c)}
 const hullGeo=new T.BufferGeometry();hullGeo.setAttribute('position',new T.Float32BufferAttribute(hullVertices,3));hullGeo.setIndex(hullIndices);hullGeo.computeVertexNormals();
 const hullFinish=material('#355463',.4,.48).clone();hullFinish.side=T.DoubleSide;const hull=new T.Mesh(hullGeo,hullFinish);hull.castShadow=hull.receiveShadow=true;ship.add(hull);
 box(17.8,.38,4.2,-.6,.02,0,material('#695e58',.25,.7),ship);
 for(const side of [-1,1]){line(stations.map(([x,r])=>[x,.46,r*side]),'#91a3a9',ship,.85);line(stations.map(([x,r])=>[x,2.5,r*side]),'#94a9af',ship,.7);for(let i=0;i<5;i++)box(.12,.65,.07,-7.4+i*.25,.98,side*2.57,trim,ship);}
 box(1.8,.08,2.0,8.5,2.73,0,graphite,ship);
 for(const z of [-.5,.5])cylinder(.13,.48,8.8,2.95,z,steel,ship);
 box(17.7,.16,4.7,-.8,2.9,0,trim,ship);box(15,.16,.08,-.8,1.7,2.56,cream,ship);
 const stackCols=['#526975','#a3886c','#879594','#455560'];for(let x=0;x<4;x++)for(let z=0;z<2;z++)for(let y=0;y<(x===3?1:2);y++)container(ship,-4.5+x*3.5,3.0+y*1.55,-.98+z*1.96,3.35,1.5,1.8,stackCols[(x+z+y)%4]);
 box(2.9,3.9,3.9,-8,4.6,0,cream,ship);box(3.6,.25,4.4,-8,6.65,0,graphite,ship);box(3.5,.85,4.25,-8,6.1,0,steel,ship);
 for(let k=0;k<6;k++)box(.42,.44,.04,-9.3+k*.52,6.13,2.15,dark,ship);
 cylinder(.1,2.3,-8.1,7.8,0,trim,ship);beam([-9.1,8.4,0],[-7.1,8.4,0],.05,trim,ship);
 for(let x=-9.5;x<9;x+=1.25){box(.045,.7,.045,x,3.24,2.4,cream,ship);box(1.25,.045,.045,x+.62,3.58,2.4,cream,ship)}
 sign('CROSSBOUND  /  07',5.2,.46,1.5,1.05,2.59,ship,'#d4e3ec');
 const shipName=sign('CROSSBOUND  /  07',5.2,.46,1.5,1.05,-2.59,ship,'#d4e3ec');shipName.rotation.y=Math.PI;
 for(let k=0;k<6;k++)box(.42,.44,.04,-9.3+k*.52,6.13,-2.15,glassShip(),ship);
 function glassShip(){return material('#18323f',.5,.25)}
 for(let x=-9.5;x<9;x+=1.25){box(.045,.7,.045,x,3.24,-2.4,cream,ship);box(1.25,.045,.045,x+.62,3.58,-2.4,cream,ship)}
 for(let y=3.15;y<5.8;y+=.25)box(.42,.035,.08,-9.48,y,-1.95,trim,ship);
 box(.9,1.4,1,-8,7.12,-.4,graphite,ship);box(1.1,.12,1.2,-8,7.84,-.4,steel,ship);
 const wakeTexture=canvasTexture(256,64,(g,w,h)=>{for(let j=0;j<22;j++){g.strokeStyle='rgba(185,215,220,'+(.15*(1-j/24))+')';g.lineWidth=1+j%2;g.beginPath();g.moveTo(0,32);g.quadraticCurveTo(70,32+(j-11)*.8,230,32+(j-11)*2.5);g.stroke()}});
 const wakeMaterial=new T.MeshBasicMaterial({map:wakeTexture,color:'#a5c6ce',transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide});
 const wake=new T.Mesh(new T.PlaneGeometry(16,3.5),wakeMaterial);wake.rotation.x=-Math.PI/2;wake.position.set(-8,-.25,14);yard.add(wake);
 // Quayside crane. Hoist and cargo move continuously at a deliberately readable speed.
 const crane=new T.Group();crane.position.set(-3.8,0,14);yard.add(crane);
 for(const x of [-2,2])for(const z of [-1.5,1.5]){box(.42,13,.42,x,6.5,z,steel,crane);box(1.1,.45,2,x,.25,z,graphite,crane)}
 for(const z of [-1.5,1.5]){beam([-2,2,z],[2,9,z],.18,trim,crane);beam([2,2,z],[-2,9,z],.18,trim,crane)}
 box(24,.65,2,-8,13.3,0,steel,crane);box(24,.09,.1,-8,13.7,1,trim,crane);box(.25,4,.25,1.7,15.2,0,steel,crane);
 for(const end of [-19.5,-10])beam([1.7,17.1,0],[end,13.5,0],.045,trim,crane);
 box(2.4,1.4,1.5,-1.5,12.0,1.5,graphite,crane);box(1.7,.65,.035,-1.5,12.2,2.27,blue,crane);
 const hoist=new T.Group();hoist.position.set(-10,0,0);crane.add(hoist);box(1.4,.45,1.6,0,13.2,0,graphite,hoist);
 const cables=[-.9,.9].map(x=>box(.035,5,.035,x,10.5,0,trim,hoist));const suspended=container(hoist,0,7.0,0,4.5,1.75,1.9,'#728e9b');
 // Cargo aircraft with animated turbine fans, navigation lamps and a servicing tug.
 const glass=material('#1c3442',.65,.16);
 const plane=new T.Group();plane.name='cargo-aircraft';plane.position.set(23,1.91,21);plane.scale.setScalar(1);plane.rotation.y=-Math.PI/2;yard.add(plane);
 const bodyProfile=[[-7.2,0],[-7,.23],[-6.6,.52],[-5.8,.82],[-4.8,.94],[3.8,.94],[5,.78],[6.2,.42],[7.15,.12],[7.3,0]].map(([x,r])=>new T.Vector2(r,x));const body=new T.Mesh(new T.LatheGeometry(bodyProfile,40),cream);body.rotation.z=-Math.PI/2;body.castShadow=true;body.receiveShadow=true;plane.add(body);
 for(const x of [-5.9,-5.42,-4.94]){const pane=box(.38,.29,.04,x,.43,.78,glass,plane);pane.rotation.y=-.14;}
 for(let x=-3.8;x<3.5;x+=1.1)box(.07,.065,.025,x,.12,.948,steel,plane);
 
 function wing(points,y,m=steel){const s=new T.Shape();points.forEach((p,i)=>i?s.lineTo(...p):s.moveTo(...p));s.closePath();const o=new T.Mesh(new T.ExtrudeGeometry(s,{depth:.14,bevelEnabled:true,bevelSize:.03,bevelThickness:.02,bevelSegments:1}),m);o.rotation.x=-Math.PI/2;o.position.y=y;o.castShadow=true;plane.add(o);return o}
 wing([[-2,-.8],[.2,-7.6],[2,-8.1],[2.7,-.8]],-.15);wing([[-2,.8],[.2,7.6],[2,8.1],[2.7,.8]],-.15);
 wing([[4.2,-.3],[6.1,-3],[7,-3.1],[6.9,.4]],.3);wing([[4.2,.3],[6.1,3],[7,3.1],[6.9,-.4]],.3);
 const tail=new T.Shape();tail.moveTo(4.3,.3);tail.lineTo(6.1,3.4);tail.lineTo(7.0,3.4);tail.lineTo(7.0,.3);tail.closePath();const fin=new T.Mesh(new T.ExtrudeGeometry(tail,{depth:.17,bevelEnabled:false}),blue);fin.position.z=-.085;plane.add(fin);
 box(1.7,.4,.035,-5.1,.42,.85,dark,plane);box(7.7,.12,.025,-.1,.10,.94,blue,plane);box(2.0,1.22,.035,-2,.06,.94,material('#adb7ad'),plane);box(1.8,.025,.045,-2,.67,.98,trim,plane);
 sign('CROSSBOUND CARGO',7.2,.38,-.1,.48,.98,plane,'#294b60');
 for(const zz of [-3.35,3.35]){
  const engine=cylinder(.58,2.0,-.1,-.7,zz,cream,plane,24);engine.rotation.z=Math.PI/2;
  const lip=new T.Mesh(new T.TorusGeometry(.53,.07,8,24),trim);lip.rotation.y=Math.PI/2;lip.position.set(-1.15,-.7,zz);plane.add(lip);
  const turbine=new T.Group();turbine.position.set(-1.18,-.7,zz);plane.add(turbine);for(let k=0;k<8;k++){const blade=box(.03,.08,.8,0,0,0,steel,turbine);blade.rotation.x=k*Math.PI/8}fans.push(turbine);
 }
 const landingGear=new T.Group();plane.add(landingGear);
 for(const [x,zz] of [[-4.6,0],[1.5,-.8],[1.5,.8]]){box(.1,.8,.1,x,-1.2,zz,steel,landingGear);for(const side of [-1,1]){const w=cylinder(.31,.17,x,-1.6,zz+side*.16,rubber,landingGear,24);w.rotation.x=Math.PI/2;const hub=cylinder(.14,.18,x,-1.6,zz+side*.16,trim,landingGear,20);hub.rotation.x=Math.PI/2}}
 for(const side of [-1,1]){const cockpit=profileAircraft([[-6.6,.2],[-6.2,.53],[-5.25,.59],[-5.25,.24]],side*.72);for(let x=-4;x<3.5;x+=.65)box(.06,.07,.025,x,.12,side*.95,glass,plane);}
 function profileAircraft(points,z){const shape=new T.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();const o=new T.Mesh(new T.ShapeGeometry(shape),new T.MeshStandardMaterial({color:'#19323e',roughness:.18,metalness:.6,side:T.DoubleSide}));o.position.z=z;plane.add(o);return o;}
 const aircraftName=sign('CROSSBOUND CARGO',7.2,.38,-.1,.48,-.98,plane,'#294b60');aircraftName.rotation.y=Math.PI;
 for(const side of [-1,1]){line([[-1,-.22,side*1.1],[1.3,-.22,side*7.5]],'#6e838d',plane,.7);box(.18,.09,.14,1.8,-.1,side*7.8,side<0?material('#806a60'):material('#72a397'),plane);}
 // Runway and service apron are separate. All flight motion follows the centreline.
 box(12,.022,110,23,.002,-20,material('#394c57',.05,.92),yard);
 for(let z=-75;z<35;z+=5){box(.12,.025,2,23,.024,z,cream,yard);for(const x of [17.4,28.6])box(.14,.08,.14,x,.06,z,lampMat,yard)}
 for(const x of [17.5,28.5])box(.07,.025,108,x,.025,-20,trim,yard);
 const nav=box(.14,.09,.14,.3,.95,0,new T.MeshBasicMaterial({color:'#cf9b6e'}),plane);beacons.push(nav);
 // Truck staging links the selected head leg to the warehouse doorway.

 // Every wheel has its own steering pivot and axle; all dimensions are in metres.
 const contactTex=canvasTexture(128,128,(g,w,h)=>{const r=g.createRadialGradient(64,64,8,64,64,63);r.addColorStop(0,'#00000090');r.addColorStop(.5,'#00000055');r.addColorStop(1,'#00000000');g.fillStyle=r;g.fillRect(0,0,w,h)});
 function contact(parent,w,d,x=0,z=0){const m=new T.MeshBasicMaterial({map:contactTex,transparent:true,depthWrite:false,opacity:.7});const o=new T.Mesh(new T.PlaneGeometry(w,d),m);o.rotation.x=-Math.PI/2;o.position.set(x,.018,z);parent.add(o);return o}
 function wheel(parent,x,z,r=.48,steering=false){const pivot=new T.Group(),spin=new T.Group();pivot.position.set(x,r,z);parent.add(pivot);pivot.add(spin);dynamicParts.push(pivot,spin);const tire=cylinder(r,.32,0,0,0,material('#171c21',0,.95),spin,32);tire.rotation.z=Math.PI/2;
  for(const side of [-1,1]){const rim=cylinder(r*.57,.025,side*.17,0,0,trim,spin,24);rim.rotation.z=Math.PI/2;const hub=cylinder(r*.2,.045,side*.19,0,0,steel,spin,16);hub.rotation.z=Math.PI/2;for(let j=0;j<6;j++){const a=j*Math.PI/3;const bolt=cylinder(.027,.03,side*.197,Math.cos(a)*r*.38,Math.sin(a)*r*.38,graphite,spin,8);bolt.rotation.z=Math.PI/2}}
  for(const xx of [-.09,.09]){const t=new T.Mesh(new T.TorusGeometry(r-.012,.013,4,32),graphite);t.rotation.y=Math.PI/2;t.position.x=xx;spin.add(t)}
  for(let j=0;j<16;j++){const a=j*Math.PI/8;const tread=box(.29,.012,.075,0,Math.cos(a)*(r-.001),Math.sin(a)*(r-.001),graphite,spin);tread.rotation.x=a}
  return {pivot,spin,r,steering};
 }
 function profile(points,width,m,parent){const shape=new T.Shape();points.forEach(([z,y],i)=>i?shape.lineTo(z,y):shape.moveTo(z,y));shape.closePath();const bevel=Math.min(.06,width*.2);const geo=new T.ExtrudeGeometry(shape,{depth:width-2*bevel,bevelEnabled:true,bevelSize:bevel,bevelThickness:bevel,bevelSegments:4,steps:1});const mesh=new T.Mesh(geo,m);mesh.rotation.y=-Math.PI/2;mesh.position.x=width/2-bevel;mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh}
 function truckModel(){const g=new T.Group();g.userData.wheels=[];
  box(2.32,.25,6.4,0,.68,0,dark,g);box(2.48,2.45,4.25,0,2.1,-1.02,cream,g);
  box(2.56,.12,4.32,0,3.36,-1.02,trim,g);box(2.56,.12,4.32,0,.87,-1.02,steel,g);
  for(const side of [-1,1]){for(let z=-2.9;z<1;z+=.24)box(.023,2.24,.025,side*1.254,2.08,z,material('#9dabb2',.4),g);box(.03,.11,4,side*1.27,1.02,-1.02,blue,g);
   const name=sign('CROSSBOUND',2.7,.36,side*1.275,2.25,-1.05,g,'#294b60');name.rotation.y=side*Math.PI/2;
   for(const z of [-2.4,-1.3,2.12])g.userData.wheels.push(wheel(g,side*1.22,z,.48,z>0));
   // Rear mudguards, tread steps and mirrors.
   box(.12,.24,2,side*1.25,1.03,-1.84,steel,g);box(.12,.55,.07,side*1.25,.37,-2.94,rubber,g);
   box(.25,.12,.65,side*1.14,.77,1.5,steel,g);box(.04,.7,.05,side*1.43,2.18,2.7,graphite,g);box(.22,.43,.14,side*1.43,2.38,2.7,steel,g);box(.23,.34,.02,side*1.43,2.4,2.78,glass,g);
  }
  profile([[1.22,.9],[3.23,.9],[3.23,1.75],[2.73,2.86],[1.22,2.86]],2.32,cream,g);
  const frontGlass=box(2.03,.76,.035,0,2.32,3.09,glass,g);frontGlass.rotation.x=-.422;
  for(const side of [-1,1]){const window=profile([[1.45,1.97],[2.99,1.97],[2.62,2.68],[1.45,2.68]],.02,glass,g);window.position.x=side*1.171;box(.035,.62,.06,side*1.19,2.32,1.71,steel,g);box(.04,.07,.25,side*1.195,1.75,1.58,trim,g);box(.035,.016,1.42,side*1.18,1.84,2.14,steel,g)}
  box(2.33,.16,.08,0,1.72,3.32,blue,g);box(2.46,.26,.22,0,.87,3.22,trim,g);box(1.35,.35,.035,0,1.24,3.34,graphite,g);
  for(let y=1.12;y<1.4;y+=.07)box(1.22,.018,.035,0,y,3.37,steel,g);
  for(const side of [-1,1]){box(.44,.26,.045,side*.88,1.34,3.34,graphite,g);box(.34,.11,.05,side*.88,1.39,3.37,lampMat,g);box(.32,.055,.05,side*.88,1.26,3.37,material('#bba87e'),g);box(.3,.13,.045,side*.95,.97,-3.19,material('#813e39'),g)}
  box(.64,.13,.025,0,.86,3.345,labelMat,g);sign('CB · 026',.57,.11,0,.86,3.365,g,'#233642');
  box(2.35,.18,.4,0,2.93,1.58,cream,g);for(const x of [-.7,.7])beam([x,1.98,3.15],[x+.45,2.07,3.11],.025,graphite,g);
  for(const x of [-1.15,0,1.15])box(.045,2.2,.04,x,2.08,-3.16,steel,g);
  contact(g,4.6,8.4);return g;
 }
 // A straight lane followed by a circular 6 m right turn. Heading is its tangent.
 const routeLength=10+Math.PI*3+35;
 function truckRoute(distance){const d=T.MathUtils.clamp(distance,0,routeLength);if(d<=10)return {x:-1.8,z:23+d,yaw:0,steer:0};if(d<10+Math.PI*3){const a=(d-10)/6;return {x:4.2-6*Math.cos(a),z:33+6*Math.sin(a),yaw:a,steer:Math.atan(4.52/6)}}return {x:4.2+d-10-Math.PI*3,z:39,yaw:Math.PI/2,steer:0}}
 function setVehicle(g,pose,distance){g.position.x=pose.x;g.position.z=pose.z;g.rotation.y=pose.yaw;for(const w of g.userData.wheels){w.pivot.rotation.y=w.steering?pose.steer:0;w.spin.rotation.x=distance/w.r}}
 // Lane markings follow the very same analytic centreline as the truck.
 for(let d=11;d<routeLength;d+=2.6){const a=truckRoute(d),b=truckRoute(Math.min(d+1.1,routeLength));for(const side of [-1,1]){const offset=2.25*side;const pts=[[a.x+Math.cos(a.yaw)*offset,.029,a.z-Math.sin(a.yaw)*offset],[b.x+Math.cos(b.yaw)*offset,.029,b.z-Math.sin(b.yaw)*offset]];line(pts,'#b1c0c1',yard,.85)}}
 const truck=truckModel();truck.name='dispatch-truck';truck.position.set(-1.8,0,23);yard.add(truck);
 const cargoStaging=new T.Group();yard.add(cargoStaging);for(let i=0;i<3;i++)container(cargoStaging,6.6+i*3.2,0,-2,2.9,2.3,4.5,['#3e5c6c','#839caa','#4d6f80'][i]);
 const tug=new T.Group();tug.userData.wheels=[];tug.position.set(18,0,25);yard.add(tug);tug.name='airside-tug';
 box(1.6,.6,2.8,0,.66,0,cream,tug);box(1.48,.23,1,0,1.08,1,blue,tug);box(1.7,.17,.2,0,.39,1.5,graphite,tug);box(.65,.65,.55,0,1.22,-.15,rubber,tug);
 for(const x of [-.66,.66]){box(.065,1.4,.065,x,1.7,-.6,steel,tug);box(.065,1.4,.065,x,1.7,.8,steel,tug);for(const z of [-.8,.88])tug.userData.wheels.push(wheel(tug,x*1.18,z,.34,z>0))}box(1.65,.1,1.75,0,2.43,.1,blue,tug);contact(tug,3.3,4.3);
 // Parked equipment stays in the service lane; only the selected departure releases its loader.
 for(const x of [16.5,19.5])box(.06,.018,9,x,.024,26,gold,yard);
 const loader=new T.Group();loader.position.set(24,0,31);yard.add(loader);box(2.6,.4,5,0,.55,0,steel,loader);for(const x of [-1,1])for(const z of [-1.9,1.9])wheel(loader,x,z,.32);for(const x of [-1,1]){beam([x,.7,-1.6],[x,1.65,1.6],.12,trim,loader);beam([x,.7,1.6],[x,1.65,-1.6],.12,trim,loader)}box(2.6,.16,5,0,1.75,0,cream,loader);contact(loader,4,6.5);

 // Warehouse: graphite envelope, softened brushed metal and warm architectural light.
 const floor=material('#69777b',.12,.65);floor.map=asphalt;floor.roughnessMap=microFinish;floor.bumpMap=microFinish;floor.bumpScale=.018;box(28,.28,40,0,-.16,-10,floor,room);
 box(28,10,.32,0,5,-28,material('#4c606c',.25),room);box(.3,10,38,-14,5,-9,material('#435965',.25),room);box(.3,10,38,14,5,-9,material('#435965',.25),room);box(28,.2,38,0,10,-9,dark,room);
 for(let z=-26;z<9;z+=3.5)line([[-13.8,.01,z],[13.8,.01,z]],'#3d6472',room,.17);
 for(let x=-12;x<=12;x+=3)line([[x,.012,-27.8],[x,.012,9]],'#3d6472',room,.13);
 for(let z=-27;z<10;z+=6){box(27.6,.23,.23,0,9.65,z,steel,room);for(const x of [-13.4,13.4]){box(.28,9.6,.38,x,4.8,z,steel,room);beam([x,7.8,z],[x-Math.sign(x)*1.8,9.6,z],.13,trim,room)}for(const x of [-8,0,8]){box(3.5,.12,.24,x,9.45,z,gold,room);box(3.35,.025,.2,x,9.36,z,lampMat,room)}}
 for(let x=-13.5;x<=13.5;x+=.7)box(.025,9.2,.03,x,4.6,-27.8,material('#223c49'),room);
 for(const x of [-12.8,12.8]){box(.05,.05,35,x,7.7,-9,gold,room);box(.035,.035,35,x,7.63,-9,lampMat,room)}
 // A real open portal. Both spaces remain in the same scene during travel.
 for(const x of [-9.8,9.8]){box(8.4,9.4,.38,x,4.7,9,material('#3b515f',.3),room);for(let xx=x-4;xx<x+4;xx+=.45)box(.035,9.2,.06,xx,4.6,9.22,material('#5e7480',.3),room)}
 box(11.2,2.1,.45,0,8.35,9,graphite,room);box(28.5,.22,1,0,9.55,9,trim,room);box(11.5,.16,.9,0,7.24,9.2,trim,room);box(10.8,.045,.2,0,7.12,9.5,lampMat,room);
 for(const x of [-5.5,5.5]){box(.22,7.2,.6,x,3.6,9.1,steel,room);box(.22,1.5,.27,x, .75,9.5,gold,room);box(.8,.1,2,x,.05,10,gold,room)}
 const entryShutter=new T.Group();room.add(entryShutter);
 for(let y=.2;y<7.1;y+=.35)box(10.8,.32,.1,0,y,9.1,material('#526c79',.4,.56),entryShutter);
 box(10.8,.15,.18,0,.12,9.16,steel,entryShutter);
 sign('CROSSBOUND / CONSOLIDATION',16,.83,0,8.45,9.27,room);sign('深圳出口集货仓   /   W5',6,.40,0,7.70,9.27,room,'#80b7c5');
 sign('FULFILLMENT CENTER',13,1.0,0,7.8,-27.55,room);sign('CROSSBOUND  /  QUALITY TO THE WORLD',11,.33,0,6.9,-27.52,room,'#75b7c8');
 // Cargo racks: restrained ochre beams, grey-green uprights, labelled locations.
 // Concrete plinths, service conduits and glazed office fascia break up the mass.
 for(const x of [-9.8,9.8]){box(8.35,.65,.5,x,.325,9.18,material('#6c7e87',.1),room);box(6.8,1.5,.06,x,6.15,9.25,glass,room);for(let q=-3.4;q<=3.4;q+=.85)box(.045,1.55,.08,x+q,6.15,9.31,trim,room);box(6.9,.07,.12,x,5.4,9.31,trim,room)}
 for(const x of [-13.2,13.2]){box(.09,8,.09,x,4,9.45,trim,room);box(.3,.4,.12,x,.5,9.45,steel,room)}
 for(const x of [-10,10])for(let z=-25;z<4;z+=7){box(.65,.9,.2,x,.45,z,graphite,room);box(.5,.07,.22,x,.7,z,gold,room)}
 const cardboard=canvasTexture(512,512,(g,w,h)=>{g.fillStyle='#b69a72';g.fillRect(0,0,w,h);let seed=41;for(let j=0;j<16000;j++){seed=(seed*1664525+1013904223)>>>0;const x=seed%512;seed=(seed*1664525+1013904223)>>>0;const y=seed%512;g.fillStyle=j%2?'#fff0ce12':'#67503e12';g.fillRect(x,y,1+j%3,.7)}g.strokeStyle='#6d513a44';g.lineWidth=2;g.strokeRect(2,2,508,508);g.fillStyle='#312d2440';g.font='500 23px Oxanium';g.fillText('↑ ↑',350,435);g.font='400 12px Oxanium';g.fillText('HANDLE WITH CARE',300,458)});
 const paper=new T.MeshStandardMaterial({map:cardboard,color:'#fff9ed',roughness:.92,bumpMap:microFinish,bumpScale:.007});
 const barcode=canvasTexture(256,128,(g,w,h)=>{g.fillStyle='#e4e0d0';g.fillRect(0,0,w,h);g.fillStyle='#41483f';g.font='14px "JetBrains Mono"';g.fillText('CB / EXPORT',15,23);for(let i=0;i<47;i++)g.fillRect(15+i*4.6,43,1+i%3,47);g.font='11px "JetBrains Mono"';g.fillText('W5 · 026-700',15,113)});
 const barcodeMat=new T.MeshStandardMaterial({map:barcode,roughness:.85});
 const parcelShadowMat=new T.MeshBasicMaterial({map:contactTex,transparent:true,depthWrite:false,opacity:.65});
 function parcel(parent,x,y,z,w=.82,h=.66,d=.68){const g=new T.Group();g.position.set(x,y,z);parent.add(g);const shadow=new T.Mesh(new T.PlaneGeometry(w*1.6,d*1.6),parcelShadowMat);shadow.rotation.x=-Math.PI/2;shadow.position.y=-.009;g.add(shadow);box(w,h,d,0,h/2,0,paper,g);box(.13,.012,d+.02,0,h+.007,0,material('#c2b28e',.01,.7),g);box(.13,h,.014,0,h/2,d/2+.007,material('#c2b28e',.01,.7),g);const p=new T.Mesh(new T.PlaneGeometry(w*.39,h*.34),barcodeMat);p.position.set(w*.23,h*.47,d/2+.016);g.add(p);return g}
 for(const side of [-1,1])for(let bay=0;bay<4;bay++){
  const x=side*11.3,z=-23+bay*6.6;for(const dx of [-1.15,1.15])for(const dz of [-2.7,2.7])box(.12,6.1,.12,x+dx,3.05,z+dz,steel,room);
  for(const y of [.55,2.45,4.35,6.15]){box(2.65,.12,5.7,x,y,z,material('#7c8273',.35,.57),room);for(const zz of [-2.1,-.7,.7,2.1]){const count=bay%2?1:2;for(let row=0;row<count;row++)parcel(room,x+side*.16,y+.08+row*.72,z+zz,1.35,.7,1.18)}}
  for(const y of [2.33,4.23,6.03]){box(.045,.14,5.5,x-side*1.33,y,z,trim,room);for(const dz of [-1.8,1.8]){const loc=sign('A'+(bay+1)+' · '+Math.round(y),.58,.14,x-side*1.37,y,z+dz,room,'#193340','#c6d0d0');loc.rotation.y=-side*Math.PI/2}}
  for(const zz of [-2.7,2.7]){beam([x-1.1,.7,z+zz],[x+1.1,2.3,z+zz],.055,trim,room);beam([x+1.1,2.5,z+zz],[x-1.1,4.2,z+zz],.055,trim,room)}
  for(const zz of [-1.6,1.6]){const crate=box(1.4,.6,1.1,x,6.5,z+zz,blue,room);box(1.44,.07,1.14,x,6.82,z+zz,trim,room);for(let q=-.5;q<=.5;q+=.25)box(.045,.45,.04,x+q,6.49,z+zz+.56,steel,room)}
  contact(room,3.8,6.8,x,z);
 }
 // Three continuous conveyor loops. Slats travel over the top and return underneath.
 const beltXs=[-5.7,0,5.7],slatGeo=new T.BoxGeometry(2.54,.075,.24),slatMaterial=material('#91a0a7',.72,.38),slatDummy=new T.Object3D();
 const beltTop=1.03,zFront=0,zRear=-23.5,beltLength=zFront-zRear,radius=.28,loopLength=beltLength*2+2*Math.PI*radius,slatCount=Math.ceil(loopLength/.30);
 function beltPath(s){s=((s%loopLength)+loopLength)%loopLength;if(s<beltLength)return {y:beltTop,z:zFront-s,a:0};s-=beltLength;if(s<Math.PI*radius){const a=s/radius;return {y:beltTop-radius+Math.cos(a)*radius,z:zRear-Math.sin(a)*radius,a:-a}}s-=Math.PI*radius;if(s<beltLength)return {y:beltTop-radius*2,z:zRear+s,a:Math.PI};s-=beltLength;const a=s/radius;return {y:beltTop-radius-Math.cos(a)*radius,z:zFront+Math.sin(a)*radius,a:Math.PI-a}}
 for(let i=0;i<3;i++){
  const x=beltXs[i],g=new T.Group();room.add(g);g.position.x=x;
  box(3,.38,beltLength+.3,0,.65,(zFront+zRear)/2,graphite,g);
  for(const dx of [-1.42,1.42]){box(.13,.26,beltLength+.5,dx,1.02,(zFront+zRear)/2,trim,g);box(.07,.055,beltLength+.3,dx,1.18,(zFront+zRear)/2,gold,g)}
  for(const z of [zFront-.8,-13.8,zRear+.8])for(const dx of [-1.24,1.24]){box(.15,.65,.19,dx,.33,z,steel,g);box(.45,.06,.48,dx,.03,z,trim,g)}
  for(const z of [zFront,zRear]){const roller=cylinder(radius,2.6,0,beltTop-radius,z,steel,g,24);roller.rotation.z=Math.PI/2;const rotor=new T.Group();rotor.position.set(0,beltTop-radius,z);g.add(rotor);for(const xx of [-1.36,1.36]){const disc=cylinder(.22,.08,xx,0,0,graphite,rotor);disc.rotation.z=Math.PI/2;box(.09,.04,.37,xx,0,0,gold,rotor)}animatedRollers.push(rotor)}
  const slats=new T.InstancedMesh(slatGeo,slatMaterial,slatCount);slats.instanceMatrix.setUsage(T.DynamicDrawUsage);slats.castShadow=true;slats.receiveShadow=true;slats.frustumCulled=false;g.add(slats);
  // Conveyor drive motor, guard housing, inspection covers and fasteners.
  box(.55,.43,.8,1.76,.63,zFront-.8,steel,g);cylinder(.24,.8,1.77,.63,zFront-.8,graphite,g).rotation.x=Math.PI/2;
  for(let z=zRear+.7;z<zFront;z+=1.7)for(const xx of [-1.51,1.51])box(.025,.07,.07,xx,.89,z,graphite,g);
  box(1.8,.23,.1,0,.72,zFront+.22,steel,g);sign('L0'+(i+1)+'  /  CROSSBOUND',1.65,.17,0,.73,zFront+.28,g,'#bcd8e3');
  const indicator=box(.65,.045,.02,0,.56,zFront+.29,sageMat.clone(),g);
  // Physical scan gate sits above the moving parcels.
  const scanZ=-17.4;for(const dx of [-1.55,1.55])box(.16,2.4,.24,dx,1.2,scanZ,steel,g);box(3.25,.2,.3,0,2.4,scanZ,graphite,g);box(.6,.10,.08,0,2.27,scanZ+.2,sageMat.clone(),g);
  const beamMat=new T.MeshBasicMaterial({color:'#51c5d8',transparent:true,opacity:.12,side:T.DoubleSide,depthWrite:false});const scanner=new T.Mesh(new T.PlaneGeometry(2.8,1.28),beamMat);scanner.position.set(0,1.68,scanZ);g.add(scanner);
  const beacon=box(.11,.17,.11,1.52,2.55,scanZ,lampMat.clone(),g);beacons.push(beacon);
  // Dock door has warm metal guides and segmented shutter panels.
  box(4.4,4.9,.16,x,2.45,-27.6,steel,room);box(4.05,4.55,.18,x,2.28,-27.46,dark,room);
  for(let y=.25;y<4.5;y+=.27)box(3.8,.24,.08,x,y,-27.33,material('#3c5663',.45),room);
  for(const dx of [-1.9,1.9]){box(.12,1.3,.16,x+dx,.65,-27.22,gold,room);box(.09,.55,.18,x+dx,.6,-27.1,graphite,room)}
  box(.9,.16,.1,x,4.85,-27.3,lampMat,room);sign('0'+(i+1),.7,.5,x,5.6,-27.4,room,'#6dcad9');
  const outline=line([[x-1.75,.022,zFront+1],[x-1.75,.022,zRear],[x+1.75,.022,zRear],[x+1.75,.022,zFront+1],[x-1.75,.022,zFront+1]],'#59c4d8',room,.6);
  // A real feed enclosure hides parcel recycling; packages keep constant size.
  for(const z of [zRear+1]){box(3.05,.15,2.5,0,2.66,z,steel,g);for(const xx of [-1.43,1.43])box(.18,1.5,2.5,xx,1.9,z,cream,g);box(2.8,1.6,.12,0,1.93,z===zFront-1?zFront+.25:zRear-.25,graphite,g);sign(z===zFront-1?'AUTO FEED':'SORT / OUT',2.2,.19,0,2.53,z+1.27,g,'#b8ced4');}
  // Amber safety strip and motor inspection hardware are physical geometry.
  for(const dx of [-1.41,1.41])for(let z=zRear+2.3;z<zFront-2.3;z+=.8)box(.14,.018,.18,dx,1.161,z,material('#9fa88b'),g);
  const localParcels=[];for(let j=0;j<6;j++){const p=parcel(room,x+(j%2?.25:-.2),beltTop+.05,zFront-j*4.2,.79+(j%2)*.12,.62+(j%3)*.13,.7);p.rotation.y=(j%2?.04:-.04);localParcels.push(p);parcels.push(p)}
  belts.push({x,g,slats,indicator,scanner,outline,localParcels,offset:i*1.2});
 }
 // Safety lines, service equipment and a small working forklift give the room scale.
 for(const x of [-8.2,-2.85,2.85,8.2])box(.07,.012,22,x,.025,-15,gold,room);

 function forklift(){const g=new T.Group();g.userData.wheels=[];box(1.45,.65,1.85,0,.73,-.15,material('#a5aa91',.3,.5),g);box(1.4,.46,.55,0,1.13,-.9,steel,g);box(.7,.2,.55,0,1.16,-.3,rubber,g);const seat=box(.7,.7,.16,0,1.52,-.55,rubber,g);seat.rotation.x=-.15;
  for(const x of [-.61,.61]){box(.065,1.8,.065,x,1.65,.2,steel,g);box(.065,1.8,.065,x,1.65,-.85,steel,g);for(const z of [-.7,.67])g.userData.wheels.push(wheel(g,x*1.26,z,.33,z<0));box(.14,2.6,.17,x,1.4,1.06,graphite,g)}
  box(1.55,.12,1.5,0,2.6,-.3,graphite,g);for(const x of [-.45,0,.45])box(.08,.05,1.4,x,2.65,-.3,trim,g);
  const steering=cylinder(.2,.04,0,1.6,.27,rubber,g,20);steering.rotation.x=.65;beam([0,1.08,.5],[0,1.62,.27],.055,steel,g);
  const carriage=new T.Group();g.add(carriage);dynamicParts.push(carriage);box(1.3,.52,.1,0,.48,1.18,steel,carriage);for(const x of [-.48,.48])box(.13,.08,1.5,x,.24,1.82,trim,carriage);
  for(const x of [-.52,.52]){box(.075,2.4,.075,x,1.45,1.19,trim,g);box(.06,.3,.08,x,.4,1.29,graphite,carriage)}
  const cargo=new T.Group();carriage.add(cargo);for(let x=-.5;x<=.5;x+=.25)box(.2,.1,1.1,x,.32,1.75,wood,cargo);for(const x of [-.3,.3])parcel(cargo,x,.38,1.75,.57,.55,.9);g.userData.carriage=carriage;g.userData.cargo=cargo;contact(g,3.8,4.5,0,.5);return g;
 }
 const lift=forklift();lift.position.set(-8.8,0,-3.8);lift.rotation.y=Math.PI;lift.name='warehouse-forklift-west';room.add(lift);
 const lift2=forklift();lift2.position.set(8.8,0,-3.8);lift2.rotation.y=Math.PI;lift2.name='warehouse-forklift-east';room.add(lift2);
 function transferPallet(x,z){const g=new T.Group();g.position.set(x,0,z);room.add(g);for(let xx=-.5;xx<=.5;xx+=.25)box(.2,.1,1.1,xx,.32,0,wood,g);for(const xx of [-.3,.3])parcel(g,xx,.38,0,.57,.55,.9);return g;}
 // Port apron: three forklifts load export pallets into containers on independent cycles.
 function yardPallet(x,z,rot=0){const g=new T.Group();g.position.set(x,0,z);g.rotation.y=rot;yard.add(g);for(let xx=-.5;xx<=.5;xx+=.25)box(.2,.1,1.1,xx,.06,0,wood,g);for(const xx of [-.3,.3])parcel(g,xx,.12,0,.57,.55,.9);return g}
 function stack(x,z,n,rot=0){for(let k=0;k<n;k++){const g=new T.Group();g.position.set(x,k*.68,z);g.rotation.y=rot;yard.add(g);for(let xx=-.5;xx<=.5;xx+=.25)box(.2,.1,1.1,xx,.06,0,wood,g);for(const xx of [-.3,.3])parcel(g,xx,.12,0,.57,.5,.9)}}
 const portOps=[{axis:'z',lane:7,pick:12.4,drop:19.6,ph:0},{axis:'z',lane:11.2,pick:12.4,drop:19.6,ph:9},{axis:'z',lane:-5.1,pick:32,drop:23.5,ph:4}].map(o=>{const g=forklift();yard.add(g);const P=o.axis==='z'?[o.lane,o.pick]:[o.pick,o.lane],D=o.axis==='z'?[o.lane,o.drop]:[o.drop,o.lane];o.g=g;o.src=yardPallet(P[0],P[1],o.axis==='x'?Math.PI/2:0);o.dst=yardPallet(D[0],D[1],o.axis==='x'?Math.PI/2:0);
  if(o.axis==='z'){stack(o.lane+(o.lane<0?0:1.5),o.pick+Math.sign(o.pick-o.drop)*1.4,o.lane<0?2:3);if(o.lane>0)stack(o.lane-1.5,o.pick+Math.sign(o.pick-o.drop)*1.4,2);container(yard,o.lane,0,o.drop-Math.sign(o.pick-o.drop)*2.6,2.5,2.5,4.2,o.lane<0?'#4d6f80':o.lane<9?'#3e5c6c':'#8b6f55')}else{stack(o.pick-.2,o.lane+1.5,3,Math.PI/2);container(yard,o.drop+2.8,0,o.lane,4.2,2.5,2.5,'#4d6f80')}return o});
 function portLift(o,clock){const t=((clock+o.ph)%24+24)%24,E=LogisticsMotion.ease,dir=Math.sign(o.pick-o.drop),eP=o.pick-dir*2.3,bP=o.pick-dir*4.4,eD=o.drop+dir*2.3,bD=o.drop+dir*4.4;
  let s=bP,face=dir,mast=.08,loaded=false,turn=0;
  if(t<2)s=bP+(eP-bP)*E(t/2);else if(t<3.2){s=eP;mast=.08+.3*E((t-2)/1.2);loaded=t>2.4}else if(t<5){s=eP+(bP-eP)*E((t-3.2)/1.8);mast=.38;loaded=true}
  else if(t<6.8){s=bP;mast=.38;loaded=true;turn=E((t-5)/1.8)}else if(t<12){s=bP+(eD-bP)*E((t-6.8)/5.2);mast=.38;loaded=true;face=-dir}
  else if(t<13.2){s=eD;face=-dir;mast=.38-.3*E((t-12)/1.2);loaded=t<12.8}else if(t<15){s=eD+(bD-eD)*E((t-13.2)/1.8);face=-dir}
  else if(t<16.8){s=bD;face=-dir;turn=E((t-15)/1.8)}else if(t<22)s=bD+(bP-bD)*E((t-16.8)/5.2);
  const base=o.axis==='z'?(face>0?0:Math.PI):(face>0?Math.PI/2:-Math.PI/2),yaw=base+turn*Math.PI;
  const x=o.axis==='z'?o.lane:s,z=o.axis==='z'?s:o.lane;setVehicle(o.g,{x,z,yaw,steer:0},s*1.3+turn*2);o.g.userData.carriage.position.y=mast;o.g.userData.cargo.visible=loaded;
  o.src.visible=t<2.4||t>18;o.dst.visible=t>=12.8&&t<20.5}
 const arrival=new T.Group();arrival.visible=false;scene.add(arrival);
 box(60,.06,30,0,-.03,24,material('#30383c',.12,.86),arrival);for(const x of [-9,-3,3,9])box(.12,.012,12,x,.012,22,gold,arrival);box(14,.012,.16,0,.012,13.5,gold,arrival);
 for(const x of [-11,11]){box(.5,4.2,.5,x,2.1,12.5,graphite,arrival);box(1.4,.18,.5,x+(x<0?.5:-.5),4.2,12.5,steel,arrival);box(1.1,.06,.4,x+(x<0?.5:-.5),4.1,12.5,lampMat,arrival)}
 sign('CROSSBOUND / FULFILLMENT',16,.83,0,8.45,9.34,arrival,'#dbd9cc','#16252b');sign(destinationLabel,6,.40,0,7.70,9.34,arrival,'#80b7c5','#16252b');
 const liftStations=[-8.8,8.8].map(x=>({source:transferPallet(x,-7.25),destination:transferPallet(x,-15.75)}));
 for(const side of [-1,1])for(const z of [-7.25,-15.75]){box(2.5,.18,1.5,side*9.8,.17,z,steel,room);for(let x=8.6;x<11;x+=.16){const roller=cylinder(.07,1.4,side*x,.29,z,trim,room,10);roller.rotation.x=Math.PI/2;}const signpost=sign(z===-7.25?'PICK / 01':'PUT / 02',1.35,.2,side*10,1.5,z,room,'#a7c2cb');}

 // Dedicated aisle: forward approach, stop, lift, reverse; no sideways drifting.
 for(const x of [-10,-7.8])box(.04,.012,10,x,.026,-9,gold,room);
 const serviceBox=box(1.1,1.5,.5,8.9,.75,-25.9,steel,room);box(.65,.38,.03,8.9,1.1,-25.63,dark,room);box(.07,.07,.035,9.2,.8,-25.61,sageMat,room);
 // Far port buildings and mooring details stay deliberately simplified.
 for(let i=0;i<7;i++){box(6,3+i%3,8,36+i*7,1.5+i%3*.5,-16,material(i%2?'#29434f':'#36525f'),yard);box(6.3,.18,8.3,36+i*7,3+i%3,-16,trim,yard)}
 for(const [x,z] of [[11,31],[25,27],[-5,35],[-5,15]]){const cone=new T.Mesh(new T.ConeGeometry(.18,.55,12),gold);cone.position.set(x,.30,z);yard.add(cone);box(.5,.05,.5,x,.025,z,rubber,yard)}
 const bollardLight=box(.15,.22,.15,-4.8,1.4,10,lampMat,yard);box(.16,1.3,.16,-4.8,.65,10,steel,yard);
 for(const x of [-13.35,13.35])box(.035,.035,35,x,6.9,-9,new T.MeshBasicMaterial({color:'#4baabd'}),room);
 box(27.6,.035,.04,0,6.9,-27.62,new T.MeshBasicMaterial({color:'#4baabd'}),room);
 box(27.8,.035,.055,0,9.36,9.56,new T.MeshBasicMaterial({color:'#55b6c7'}),room);
 // Additional structural detail stays within the showroom's restrained model language.
 for(let x=-19;x<3;x+=2){beam([x,13.45,-.7],[x+2,14.15,-.7],.055,trim,crane);beam([x+2,14.15,-.7],[x+2,13.45,-.7],.055,trim,crane);}box(24,.06,.06,-8,14.15,-.7,steel,crane);
 for(const x of [-9.2,9.2]){box(3.1,.2,.16,x,6.4,9.27,trim,room);box(3,.9,.04,x,5.8,9.24,dark,room);for(let i=0;i<6;i++)box(2.9,.035,.06,x,5.45+i*.14,9.28,steel,room);box(.4,.15,.4,x,4.75,9.43,lampMat,room);}
 for(let z=-5;z<49;z+=6){box(.34,.65,1.2,-7.13,-.03,z,rubber,yard);box(.15,.5,1.0,-7.36,-.03,z,steel,yard);}
 const pallet=new T.Group();pallet.position.set(5.9,0,18);yard.add(pallet);for(let x=-.65;x<.8;x+=.32)box(.25,.1,1.55,x,.13,0,wood,pallet);for(const xx of [-.48,.48])for(const zz of [-.43,.43])parcel(pallet,xx,.22,zz,.8,.65,.7);parcel(pallet,0,.87,0,.8,.65,.7);

 for(let z=-24;z<6;z+=6){for(let x=-12;x<12;x+=3){beam([x,9.55,z],[x+1.5,8.85,z],.065,trim,room);beam([x+1.5,8.85,z],[x+3,9.55,z],.065,trim,room)}box(26,.08,.08,0,8.85,z,steel,room);}
 for(const x of [-9,9]){const pipe=cylinder(.07,35,x,8.5,-10,material('#806c63',.45),room);pipe.rotation.x=Math.PI/2;for(let z=-24;z<4;z+=5){box(.2,.035,.25,x,8.5,z,steel,room);box(.035,.5,.035,x,8.75,z,trim,room)}}
 for(const x of [-6.2,6.2]){cylinder(.12,1.25,x,.63,10.5,material('#a8ad96',.3),room);cylinder(.126,.15,x,.9,10.5,graphite,room);box(.45,.06,.45,x,.03,10.5,trim,room)}
 // Low-profile maintenance carts and wheeled cage give the working floor a human scale.
 const cart=new T.Group();cart.position.set(8.9,0,-21);room.add(cart);box(1.3,.15,1.7,0,.25,0,steel,cart);for(const x of [-.62,.62])for(const z of [-.8,.8]){box(.035,1.5,.035,x,1,z,trim,cart);wheel(cart,x,z,.14)}for(let y=.5;y<1.8;y+=.23)for(const x of [-.65,.65])box(.025,.025,1.6,x,y,0,steel,cart);for(let z=-.7;z<.8;z+=.23)for(const x of [-.65,.65])box(.025,1.4,.025,x,1.05,z,steel,cart);parcel(cart,0,.34,0,1.1,.7,1.3);contact(cart,2.6,3);
 // Inspection operator: helmet, fitted safety vest and handheld scanner.
 const worker=new T.Group();worker.position.set(-8.7,0,-23);room.add(worker);const workwear=material('#425867',.02,.86),vest=material('#9eaa85',.02,.9),skin=material('#ad9680',0,.85);
 for(const x of [-.14,.14]){box(.2,.73,.22,x,.46,0,workwear,worker);box(.24,.13,.38,x,.1,.06,rubber,worker)}box(.48,.62,.28,0,1.12,0,vest,worker);box(.05,.55,.018,-.16,1.13,.15,trim,worker);box(.05,.55,.018,.16,1.13,.15,trim,worker);cylinder(.14,.27,0,1.57,0,skin,worker,16);const helmet=new T.Mesh(new T.SphereGeometry(.18,20,12,0,Math.PI*2,0,Math.PI/2),cream);helmet.position.y=1.68;worker.add(helmet);cylinder(.2,.035,0,1.69,0,cream,worker,24);beam([-.28,1.35,0],[-.3,1.02,.12],.13,workwear,worker);beam([.28,1.35,0],[.33,1.12,.3],.13,workwear,worker);box(.14,.16,.08,.33,1.16,.33,graphite,worker);contact(worker,1.1,1);


 for(const vehicle of [lift,lift2]){
  const hydraulic=cylinder(.055,1.65,0,1.15,1.10,trim,vehicle,12);box(.16,.18,.1,0,2.05,1.1,steel,vehicle);
  for(const side of [-1,1]){box(.09,.3,.1,side*.67,1.7,.25,lampMat,vehicle);beam([side*.66,.9,.5],[side*.66,1.65,-.7],.045,trim,vehicle)}
  // Seated driver, muted workwear and helmet; no luminous decorative strips.
  box(.44,.52,.27,0,1.51,-.33,workwear,vehicle);cylinder(.14,.26,0,1.88,-.3,skin,vehicle,16);
  const hat=new T.Mesh(new T.SphereGeometry(.18,16,10,0,Math.PI*2,0,Math.PI/2),cream);hat.position.set(0,2.01,-.3);vehicle.add(hat);
  for(const side of [-1,1]){beam([side*.24,1.7,-.3],[side*.17,1.55,.25],.11,workwear,vehicle);box(.15,.3,.45,side*.15,1.11,.03,workwear,vehicle);}
 }
 // Floor marks indicate paths; they are not decorative light trails.
 for(const x of [-7.6,7.6])for(let z=-22;z<2;z+=2)box(.045,.012,.8,x,.028,z,gold,room);
 for(const x of [-3.3,3.3])for(let z=2;z<29;z+=2)box(.055,.014,.65,x,.03,z,trim,yard);


 // Aircraft panel joints and flush fasteners, rather than uniformly blank surfaces.
 for(const side of [-1,1]){
  const door=sign('CARGO / MAIN DECK',1.8,.13,-1.9,.64,side*.96,plane,'#51636a');if(side<0)door.rotation.y=Math.PI;
  line([[-4.6,.68,side*.65],[3.8,.68,side*.65]],'#73868d',plane,.35);
  for(const xx of [-2.9,-1.1])for(let y=-.35;y<.62;y+=.18)box(.018,.018,.025,xx,y,side*.961,steel,plane);
 }
 // Door seals, roof fairing and front wheel arches give the commercial truck weight.
 for(const side of [-1,1]){
  const arch=new T.Mesh(new T.TorusGeometry(.59,.075,6,28,Math.PI),cream);arch.rotation.y=Math.PI/2;arch.position.set(side*1.25,.48,2.12);truck.add(arch);
  const tank=cylinder(.26,1.25,side*1.05,.62,-.1,steel,truck,24);tank.rotation.x=Math.PI/2;
  for(let z=-2.9;z<.9;z+=.5)box(.027,.08,.26,side*1.29,1.04,z,z%1<.5?trim:material('#99534a',.05,.7),truck);
  const id=sign('CB-026 / EXPORT',1.7,.2,side*1.29,1.64,-1,truck,'#5d737b');id.rotation.y=side*Math.PI/2;
 }
 const dashboard=box(1.95,.15,.5,0,1.91,2.42,graphite,truck);
 for(const x of [-.55,.55]){box(.5,.6,.15,x,1.9,1.6,rubber,truck);beam([x-.18,1.98,3.18],[x+.17,2.08,3.12],.023,graphite,truck);}
 // Industrial facade: recessed panels, drip edge, utility pipes and loading signs.
 for(const side of [-1,1]){
  for(let x=6.3;x<13.5;x+=1.1)box(.03,4.7,.06,side*x,2.8,9.27,material('#809099',.5,.6),room);
  box(7.5,.12,.65,side*9.8,5.22,9.5,steel,room);
  const downpipe=cylinder(.055,7.8,side*13.1,4,9.5,steel,room,12);
  for(let y=.8;y<7.5;y+=1.5)box(.2,.045,.16,side*13.1,y,9.52,trim,room);
  sign(side<0?'01 / GOODS IN':'02 / AIRSIDE',3.1,.32,side*9.8,3.7,9.31,room,'#d4dfde','#263940');
 }
 // Painted apron areas and drain channels keep the yard from reading as an empty plane.
 for(const x of [-4.8,7]){box(.28,.025,16,x,.025,22,graphite,yard);for(let z=14;z<30;z+=.16)box(.29,.027,.035,x,.04,z,steel,yard);}
 for(const x of [2,8])for(let z=10.4;z<14;z+=.55)box(2,.012,.22,x,.03,z,material('#b7b8a6',.02,.85),yard);
 for(const x of [6.2,10.5]){const floorText=sign('KEEP CLEAR',3.4,.5,x,.045,15,yard,'#c3c6b8');floorText.rotation.x=-Math.PI/2;}
 for(const x of [-5.8,5.8]){cylinder(.09,1.05,x,.55,11,steel,yard,12);box(.5,.32,.08,x,1.02,11,material('#354b55'),yard);}
 // Low industrial roof furniture creates silhouettes, not neon decoration.
 for(const x of [-10,9]){box(2,.8,2,x,10.5,-2,steel,room);for(let z=-2.8;z<-1.1;z+=.15)box(1.85,.03,.025,x,10.91,z,graphite,room);}
 // Contact shading at the warehouse threshold and aircraft undercarriage.
 contact(yard,11,5,0,10);
 const warmLight=new T.PointLight('#f5d1a2',50,18,2);warmLight.position.set(0,6.8,10);scene.add(warmLight);

 // Instance repeated static parts, preserving independently animated assemblies.
 scene.updateMatrixWorld(true);
 const movable=new Set([arrival,skyDome,...portOps.flatMap(o=>[o.g,o.src,o.dst,o.g.userData.cargo]),ship,hoist,plane,truck,tug,lift,lift2,entryShutter,landingGear,loader,wake,...liftStations.flatMap(s=>[s.source,s.destination]),water,...parcels,lift.userData.cargo,lift2.userData.cargo,...dynamicParts,...animatedRollers,...beacons,...belts.flatMap(b=>[b.slats,b.indicator,b.scanner,b.outline])]);
 // Merge immutable geometry by finish, while retaining wheel/mast/parcel transforms.
 function mergeStatic(root,exclude){root.updateWorldMatrix(true,true);const inv=root.matrixWorld.clone().invert(),groups=new Map();
  root.traverse(o=>{if(!o.isMesh||o.isInstancedMesh||Array.isArray(o.material)||!o.material.visible)return;for(let p=o;p&&p!==root;p=p.parent)if(exclude.has(p))return;const key=o.material.uuid+o.castShadow+o.receiveShadow;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(o)});
  for(const objects of groups.values()){if(objects.length<2)continue;const geometries=objects.map(o=>{let g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.clearGroups();g.applyMatrix4(new T.Matrix4().multiplyMatrices(inv,o.matrixWorld));return g});const merged=T.mergeGeometries(geometries,false);if(!merged)continue;const mesh=new T.Mesh(merged,objects[0].material);mesh.castShadow=objects[0].castShadow;mesh.receiveShadow=objects[0].receiveShadow;root.add(mesh);objects.forEach(o=>o.removeFromParent());geometries.forEach(g=>g.dispose());}
 }
 mergeStatic(yard,movable);mergeStatic(room,movable);
 const exclusions=new Set([...portOps.map(o=>o.g.userData.cargo),landingGear,lift.userData.cargo,lift2.userData.cargo,...beacons,...fans,...dynamicParts]);
 for(const root of [...portOps.flatMap(o=>[o.g,o.src,o.dst]),ship,plane,truck,tug,lift,lift2,entryShutter,landingGear,loader,...liftStations.flatMap(s=>[s.source,s.destination]),suspended,...dynamicParts,...parcels])mergeStatic(root,exclusions);
 // Camera follows the showroom convention: locked eye-level views and a short guided dolly.
 let dolly=null;let zone='port',selected=1,active=true,labels=true,transition=null,shipping=false,complete=false,booking=false,bookedRoute=null,departure=null,doorOpen=0,clock=0,last=performance.now(),width=0,height=0,frameCount=0;
 renderer.info.autoReset=false;
 const composer=new T.EffectComposer(renderer,new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,samples:0}));
 composer.addPass(new T.RenderPass(scene,camera));
 const ao=new T.GTAOPass(scene,camera,1,1);ao.blendIntensity=.9;ao.updateGtaoMaterial({radius:.8,distanceExponent:1.5,thickness:1.5,samples:4});ao.updatePdMaterial({radius:4,rings:2,samples:8});composer.addPass(ao);composer.addPass(new T.OutputPass());
 const refs={port:{position:new T.Vector3(-34,8.5,52),target:new T.Vector3(4,1.2,12)},warehouse:{position:new T.Vector3(0,2.8,4.5),target:new T.Vector3(0,2.8,-28)}};
 const anchors={port:[new T.Vector3(-18,5.4,14),new T.Vector3(-1.8,4.5,23),new T.Vector3(23,5.5,21)],warehouse:beltXs.map(x=>new T.Vector3(x,3.0,-14.5))};
 camera.position.copy(refs.port.position);camera.lookAt(refs.port.target);
 function resize(){dirty=true;
  width=host.clientWidth;height=host.clientHeight;renderer.setSize(width,height);composer.setSize(width,height);ao.setSize(Math.round(width*.5),Math.round(height*.5));camera.aspect=width/height;camera.clearViewOffset();
  const mobile=innerWidth<=760,dockHeight=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dock-height'))||152;
  camera.fov=mobile?62:50;camera.zoom=mobile?(zone==='port'?.65:.45):1;
  // Reframe the same fixed camera around the unoccluded scene; no horizontal sidebar offset.
  camera.setViewOffset(width,height,0,mobile?92:64,width,height);
  camera.updateProjectionMatrix();
 }
 const observer=new ResizeObserver(resize);observer.observe(host);resize();
 function project(v){const p=v.clone().project(camera);return {x:(p.x*.5+.5)*width,y:(-p.y*.5+.5)*height,visible:p.z<1&&Math.abs(p.x)<1}}
 function choose(i){if(selected!==i)dirty=true;selected=i;belts.forEach((b,j)=>{b.outline.material.opacity=j===i?.9:.25;b.indicator.material.color.set(j===i?'#c5f531':'#70c5d7');b.indicator.material.emissive.set(j===i?'#a4d52e':'#3f9eb1')});}
 function moveTo(next,duration=850){if(transition)return Promise.resolve();const ref=refs[next],targetQ=new T.Quaternion(),tmp=camera.clone();tmp.position.copy(ref.position);tmp.lookAt(ref.target);targetQ.copy(tmp.quaternion);return new Promise(resolve=>{transition={start:performance.now(),duration,fromDoor:doorOpen,from:camera.position.clone(),to:ref.position.clone(),qa:camera.quaternion.clone(),qb:targetQ,next,resolve};});}
 const raycaster=new T.Raycaster(),pointer=new T.Vector2(),hitMeshes=[];
 for(const [area,positions] of Object.entries(anchors))positions.forEach((p,i)=>{const h=new T.Mesh(new T.BoxGeometry(area==='port'?10:3.5,area==='port'?8:3.4,area==='port'?8:16),new T.MeshBasicMaterial({visible:false}));h.position.copy(p);if(area==='warehouse')h.position.y=1.5;h.userData={area,index:i};scene.add(h);hitMeshes.push(h)});
 function hit(e){const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);raycaster.setFromCamera(pointer,camera);return raycaster.intersectObjects(hitMeshes.filter(h=>h.userData.area===zone),false)[0]?.object.userData.index}
 let down=null;renderer.domElement.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY}});renderer.domElement.addEventListener('pointerup',e=>{if(!down||transition||Math.hypot(e.clientX-down.x,e.clientY-down.y)>7)return;down=null;const i=hit(e);if(i!==undefined)onPick(i)});renderer.domElement.addEventListener('pointermove',e=>renderer.domElement.style.cursor=!transition&&hit(e)!==undefined?'pointer':'default');
 let renderQuality='auto',qualityStart=performance.now(),qualityFrames=0;
 const stats={time:0,waterPhase:0,beltOffset:0,parcelZ:0,shipY:0};
 function tick(now){if(disposed)return;raf=requestAnimationFrame(tick);if(document.hidden||hostSuspended){last=now;return;}const moving=transition||dolly||departure||shipping;if(!moving&&!dirty&&(!active||now-lastDraw<32))return;lastDraw=now;dirty=false;try{tickBody(now)}catch(e){if(!tick.err){tick.err=1;console.error(e)}try{composer.render()}catch(_){}}}
 function tickBody(now){const dt=Math.max(0,Math.min(.12,(now-last)/1000));last=now;if(document.hidden)return;frameCount++;qualityFrames++;if(renderQuality==='auto'&&now-qualityStart>3500){if(qualityFrames*1000/(now-qualityStart)<28)ao.enabled=false;qualityFrames=0;qualityStart=now;}renderer.info.reset();renderer.shadowMap.needsUpdate=frameCount%8===1||!!transition||!!dolly;if(active)clock+=dt;
  if(transition){const t=Math.min(1,(now-transition.start)/transition.duration),enter=transition.next==='warehouse';
   // Unlatch and raise first, then dolly through the opening; no cut, no reverse turn.
   doorOpen=enter?LogisticsMotion.ease(t/.3):1-LogisticsMotion.ease((t-.72)/.28);
   const e=LogisticsMotion.ease(enter?(t-.2)/.8:t/.8);
   camera.position.lerpVectors(transition.from,transition.to,e);camera.quaternion.slerpQuaternions(transition.qa,transition.qb,e);
   if(t===1){const done=transition;transition=null;zone=done.next;resize();done.resolve()}}
  entryShutter.scale.y=Math.max(.035,1-doorOpen);entryShutter.position.y=7.2*doorOpen;
  const indoor=T.MathUtils.clamp((22-camera.position.z)/18,0,1);if(zone==='warehouse'){scene.fog.color.set('#29373c');scene.fog.near=40;scene.fog.far=120}else{scene.fog.color.set('#a9b8bb');scene.fog.near=70;scene.fog.far=300}key.intensity=2.4-indoor*1.8;indoorKey.intensity=indoor*2.4;ambient.intensity=.65-indoor*.39;scene.environmentIntensity=.35-indoor*.13;
  waterMat.uniforms.time.value=clock;skyMat.uniforms.time.value=clock;waterMat.uniforms.shipPos.value.set(ship.position.x,ship.position.z);waterMat.uniforms.shipYaw.value=ship.rotation.y;waterMat.uniforms.fogColor.value.copy(scene.fog.color);waterMat.uniforms.fogNear.value=scene.fog.near;waterMat.uniforms.fogFar.value=scene.fog.far;ship.position.y=-.18+Math.sin(clock*.8)*.095;ship.rotation.z=Math.sin(clock*.65)*.006;ship.rotation.x=Math.sin(clock*.47)*.009;
  if(false)[].forEach((l,j)=>{const a=l.geometry.attributes.position;for(let i=0;i<a.count;i++){const x=-8-i*1.5,z=-25+j*4+Math.sin(clock*.35+j)*.6;a.setXYZ(i,x,-.25+Math.sin(x*.72+z*.48-clock*1.7)*.11,z+Math.sin(x*.4+clock*.8+j)*.18)}a.needsUpdate=true;l.material.opacity=.018+.022*(.5+.5*Math.sin(clock*.8+j))});
  const hoistY=booking&&bookedRoute!==2?8.7:7.9+.6*(.5-.5*Math.cos(clock*Math.PI/10));suspended.position.y=hoistY;cables.forEach(c=>{const len=13.1-(hoistY+1.75);c.scale.y=len/5;c.position.y=13.1-len/2});hoist.position.x=-10;
  fans.forEach(f=>f.rotation.x=clock*7);beacons.forEach((b,i)=>{b.material.emissiveIntensity=.7+Math.max(0,Math.sin(clock*3.8+i))*.8});
  // Ground equipment is independent of the maritime departure.
  setVehicle(tug,{x:18,z:25,yaw:0,steer:0},0);
  if(departure){departure.elapsed=(now-departure.start)/1000*(departure.reduced?30:1);const pose=LogisticsMotion.departure(departure.route,departure.elapsed);
   {const s=Math.max(0,(-18-pose.ship.x)),R=12,arc=R*Math.PI/2;let x,z,yaw;if(departure.route!==0){x=-18;z=14;yaw=Math.PI}else if(s<arc){const f=s/R;x=-18-R*Math.sin(f);z=2+R*Math.cos(f);yaw=Math.PI-f}else{x=-30;z=2-(s-arc);yaw=Math.PI/2}ship.position.x=x;ship.position.z=z;ship.rotation.y=yaw}
   plane.position.set(pose.plane.x,pose.plane.y,pose.plane.z);plane.rotation.z=pose.plane.pitch;landingGear.scale.y=Math.max(.08,pose.gear);
   truck.userData.distance=pose.truckDistance;loader.position.x=24+pose.loaderRetreat*7;
   wake.position.set(ship.position.x+13,-.24,14);wake.material.opacity=0;waterMat.uniforms.wakeAmt.value=departure.route===0?Math.min(1,pose.progress*1.6):0;wake.scale.x=1+pose.progress;
   departure.onProgress?.(pose);if(pose.done){const done=departure;departure=null;done.resolve();}
  }
  const truckD=truck.userData.distance||0;setVehicle(truck,truckRoute(truckD),truckD);
  if(active||shipping){belts.forEach((b,i)=>{const speed=shipping&&i===selected?1.75:1.10;b.offset+=dt*speed;
    for(let k=0;k<slatCount;k++){const p=beltPath(k*loopLength/slatCount+b.offset);slatDummy.position.set(0,p.y,p.z);slatDummy.rotation.set(p.a,0,0);slatDummy.updateMatrix();b.slats.setMatrixAt(k,slatDummy.matrix)}b.slats.instanceMatrix.needsUpdate=true;
    b.localParcels.forEach((p,j)=>{p.visible=i!==selected||!complete||b.offset<(p.userData.stopAt??-1);const travel=((b.offset+j*beltLength/6)%beltLength);p.position.z=zFront-travel;p.position.y=beltTop+.05;p.scale.setScalar(1)});
    const atScan=b.localParcels.some(p=>p.visible&&Math.abs(p.position.z+17.4)<.4);b.scanner.material.opacity=atScan?.30:.035;b.indicator.material.emissiveIntensity=atScan?.9:.25;
  });animatedRollers.forEach((r,i)=>r.rotation.x=-belts[Math.floor(i/2)].offset/radius);}
  if(!active&&!shipping&&frameCount===1){belts.forEach(b=>{for(let k=0;k<slatCount;k++){const p=beltPath(k*loopLength/slatCount+b.offset);slatDummy.position.set(0,p.y,p.z);slatDummy.rotation.set(p.a,0,0);slatDummy.updateMatrix();b.slats.setMatrixAt(k,slatDummy.matrix)}b.slats.instanceMatrix.needsUpdate=true})}
  if(zone==='port')portOps.forEach(o=>portLift(o,clock));
  if(dolly){const t=Math.min(1,(now-dolly.start)/dolly.dur),e=1-Math.pow(1-t,3);camera.position.lerpVectors(dolly.from,dolly.to,e);camera.quaternion.slerpQuaternions(dolly.qa,dolly.qb,e);if(t===1){const d=dolly;dolly=null;d.resolve()}}
  [lift,lift2].forEach((vehicle,i)=>{const pose=LogisticsMotion.forklift(clock,i*12),x=i?8.8:-8.8;
   setVehicle(vehicle,{x,z:pose.z,yaw:pose.yaw,steer:0},-pose.z-3.8);vehicle.userData.carriage.position.y=pose.mast;vehicle.userData.cargo.visible=pose.loaded;
   const station=liftStations[i];station.source.visible=pose.source;station.source.position.x=x+Math.sign(x)*2.2*pose.sourceSlide;station.destination.visible=pose.destination;station.destination.position.x=x+Math.sign(x)*2.2*pose.destinationSlide;
   vehicle.userData.operation=pose.stage;
  });
  ao._renderGBuffer=frameCount%2===1||!!transition;composer.render();stats.calls=renderer.info.render.calls;stats.triangles=renderer.info.render.triangles;stats.truck={x:truck.position.x,z:truck.position.z,yaw:truck.rotation.y,distance:truckD,wheel:truck.userData.wheels[0].spin.rotation.x,steer:truck.userData.wheels[2].pivot.rotation.y};stats.forklift={z:lift.position.z,yaw:lift.rotation.y,mast:lift.userData.carriage.position.y};stats.time=clock;stats.waterPhase=waterMat.uniforms.time.value;stats.beltOffset=belts[1].offset;stats.parcelZ=belts[1].localParcels[0].position.z;stats.shipY=ship.position.y;stats.shipX=ship.position.x;stats.plane={x:plane.position.x,y:plane.position.y,z:plane.position.z};stats.belts=belts.map(b=>({offset:b.offset,visible:b.localParcels.filter(p=>p.visible).length}));stats.lifts=[lift,lift2].map(l=>({x:l.position.x,z:l.position.z,mast:l.userData.carriage.position.y,loaded:l.userData.cargo.visible,stage:l.userData.operation}));stats.loaderX=loader.position.x;stats.tugZ=tug.position.z;stats.door=doorOpen;stats.departure=departure?.route??null;
  onFrame?.({zone,moving:!!transition||!!dolly,points:anchors[zone].map(project),stats});
 }
 choose(1);raf=requestAnimationFrame(tick);
 function enter(name,{push=0,duration=2400,outside=false}={}){transition=null;zone=name;yard.visible=name==='port';arrival.visible=name!=='port';scene.background=name==='port'?portBg:roomBg;doorOpen=0;
  const r=outside?{position:new T.Vector3(0,3.1,21),target:new T.Vector3(0,3.4,9)}:refs[name],look=new T.PerspectiveCamera();look.position.copy(r.position);look.lookAt(r.target);camera.position.copy(r.position);camera.quaternion.copy(look.quaternion);resize();renderer.shadowMap.needsUpdate=true;
  if(!push)return Promise.resolve();const back=r.position.clone().sub(r.target).normalize().multiplyScalar(push);const from=r.position.clone().add(back).add(new T.Vector3(0,.5,0));const l2=new T.PerspectiveCamera();l2.position.copy(from);l2.lookAt(r.target);camera.position.copy(from);camera.quaternion.copy(l2.quaternion);
  return new Promise(resolve=>{dolly={from,to:r.position.clone(),qa:l2.quaternion.clone(),qb:look.quaternion.clone(),start:performance.now(),dur:duration,resolve}})}
 function openAndEnter(ms=3600){doorOpen=0;return moveTo('warehouse',ms)}
 function dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(raf);observer.disconnect();transition?.resolve();dolly?.resolve();departure?.resolve();const resources=new Set();scene.traverse(o=>{if(o.geometry)resources.add(o.geometry);for(const m of (Array.isArray(o.material)?o.material:[o.material]).filter(Boolean)){resources.add(m);for(const v of Object.values(m))if(v?.isTexture)resources.add(v);}});resources.forEach(r=>r.dispose());scene.environment?.dispose();for(const p of composer.passes)p.dispose?.();composer.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();}
 return {dispose,setSuspended(v){hostSuspended=v;dirty=true;},enter,openAndEnter,moveTo,resize,setQuality(v){dirty=true;renderQuality=v;ao.enabled=v!=='smooth';qualityFrames=0;qualityStart=performance.now()},select:choose,setActive(v){active=v;dirty=true;},depart(route,onProgress,reduced=false){booking=true;bookedRoute=route;truck.userData.distance=0;return new Promise(resolve=>{departure={route,onProgress,reduced,start:performance.now(),elapsed:0,resolve}})},ship(i){selected=i;shipping=true;complete=false;choose(i)},finish(){shipping=false;complete=true;belts.forEach(b=>b.localParcels.forEach((p,j)=>{p.userData.stopAt=b.offset+beltLength-((b.offset+j*beltLength/6)%beltLength)}))},restore(){shipping=false;complete=false;booking=false;departure=null;ship.position.set(-18,-.18,14);ship.rotation.y=Math.PI;waterMat.uniforms.wakeAmt.value=0;plane.position.set(23,1.91,21);plane.rotation.z=0;landingGear.scale.y=1;loader.position.set(24,0,31);wake.material.opacity=0;truck.userData.distance=0;truck.userData.elapsed=0;parcels.forEach(p=>p.visible=true)},reset(){shipping=false;complete=false;booking=false;departure=null;doorOpen=0;ship.position.set(-18,-.18,14);ship.rotation.y=Math.PI;waterMat.uniforms.wakeAmt.value=0;plane.position.set(23,1.91,21);plane.rotation.z=0;landingGear.scale.y=1;loader.position.set(24,0,31);wake.material.opacity=0;truck.userData.distance=0;truck.userData.elapsed=0;selected=1;dolly=null;enter('port');parcels.forEach(p=>p.visible=true);choose(1)},stats,camera,renderer,scene,ao,composer,truckRoute,routeLength,zone:()=>zone};
}
