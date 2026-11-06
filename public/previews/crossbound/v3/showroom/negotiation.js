import * as THREE from 'three';
import { character } from '../world/kit.js';

const ROLES=[
 {id:'standard',name:'常规供货',tag:'稳步试单 · 灵活补货',english:'STANDARD SUPPLY',color:'#8da7a6',intro:'我是常规供货负责人。先把第一批生意做稳，再慢慢放大。',advice:'起订量低一些，资金安排更灵活。如果你还在测试这个市场，可以先从小批量开始。'},
 {id:'fast',name:'现货快补',tag:'现货响应 · 缩短等待',english:'READY STOCK',color:'#b69c7b',intro:'我是现货快补负责人。如果你的销售窗口很近，我们可以把等待时间缩短。',advice:'这份方案的单价会高一些，换来更短的交期。是否值得，要看你有多急着补上库存。'},
 {id:'factory',name:'工厂排产',tag:'批量生产 · 成本优化',english:'FACTORY DIRECT',color:'#9da97f',intro:'我是工厂排产负责人。需求有把握的话，我们可以把批量成本谈下来。',advice:'价格更有优势，但起订量更高、排期也更长。先确认销量和现金能撑住这一批，再做决定。'}
];

export function createNegotiation({world,root,draw,resize,onReturn,onConfirm,getQuotes}){
 const {scene,camera,renderer}=world;
 const events=new AbortController();let disposed=false,busy=false,errorMessage='';
 const wing=new THREE.Group();wing.position.x=28;wing.rotation.y=-Math.PI/2;wing.visible=false;scene.add(wing);
 const materials=new Map();
 const material=c=>{if(!materials.has(c))materials.set(c,new THREE.MeshStandardMaterial({color:c,roughness:.68,metalness:.24}));return materials.get(c);};
 function box(w,h,d,c,x,y,z,parent=wing){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material(c));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 function sign(text,w,h,x,y,z,color='#ccc5b6',size=40,parent=wing){const cv=document.createElement('canvas');cv.width=1024;cv.height=160;const ctx=cv.getContext('2d');ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`500 ${size}px "Segoe UI","Microsoft YaHei",sans-serif`;ctx.fillStyle=color;ctx.fillText(text,512,80);const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false}));mesh.position.set(x,y,z);parent.add(mesh);return mesh;}
 box(25,.2,32,'#30312f',0,-.12,4);box(25,9,.24,'#2c3030',0,4.5,-5);box(.24,9,25,'#252929',-12.5,4.5,5);box(.24,9,25,'#252929',12.5,4.5,5);box(25,.2,28,'#252727',0,8.4,5);
 for(let x=-12;x<=12;x+=2.5)box(.018,.01,25,'#56564f',x,0,6);
 for(let z=-4;z<19;z+=2.5)box(25,.01,.018,'#56564f',0,0,z);
 sign('SUPPLY PARTNERS',10,1.2,0,6.8,-4.83,'#d4cbb8',67);
 sign('CROSSBOUND  /  SHOWROOM — MEETING AREA',10,.6,0,5.97,-4.82,'#9b9d93',23);
 const booths=[],targets=[];
 ROLES.forEach((role,i)=>{
  const x=(i-1)*7.1,g=new THREE.Group();g.position.x=x;wing.add(g);
  box(6.45,4.3,.14,'#363b39',0,2.3,-4.77,g);box(.055,4.4,.12,'#99876a',-3.27,2.3,-4.66,g);
  box(6.45,.07,2.2,'#51483a',0,4.55,-3.8,g);
  const strip=box(6.1,.025,.07,'#ead7af',0,4.47,-2.8,g);strip.material=new THREE.MeshStandardMaterial({color:'#ead7af',emissive:'#d8b886',emissiveIntensity:1.5});
  const spot=new THREE.PointLight('#ffdfb1',24,9,1.5);spot.position.set(x,4.15,-1.8);wing.add(spot);
  sign('0'+(i+1)+' / '+role.english,5.9,.5,0,3.99,-4.59,'#beb7a6',30,g);
  const npc=character({body:new THREE.Color(role.color).getHex(),trim:0xc4bca5,scale:1.28});npc.root.position.set(.28,.03,-.75);g.add(npc.root);
  const pad=box(5.6,.08,3.5,'#454741',0,.015,.1,g);
  box(4.5,1.02,1.32,'#2b2e2d',0,.55,1.4,g);box(4.64,.12,1.5,'#766b58',0,1.12,1.4,g);box(4.4,.045,.05,'#b9a37b',0,1.02,2.18,g);
  for(let slat=0;slat<18;slat++)box(.13,.65,.025,'#50483c',-2.06+slat*.24,.54,2.08,g);
  // A folder and a small desk terminal, with different contextual props behind each partner.
  box(.7,.04,.5,'#b9b5a4',-.9,1.21,1.45,g);box(.52,.34,.04,'#55635e',1.15,1.42,1.32,g).rotation.x=-.22;
  if(i===0){for(let j=0;j<3;j++){box(.85,.07,.75,'#786d5b',-1.7,1.25+j*.82,-3.9,g);box(.38,.45,.35,['#9aa6a1','#8c8271','#b3ad96'][j],-1.7,1.51+j*.82,-3.9,g);}box(1.2,.7,.5,'#62594c',1.6,.4,-3.8,g);}
  if(i===1){for(const sx of [-1.9,1.9]){for(let j=0;j<3;j++){box(1.25,.07,.9,'#746e5e',sx,.45+j*.8,-3.8,g);box(.85,.56,.65,'#9c8b70',sx,.77+j*.8,-3.8,g);box(.04,.56,.67,'#c4b99c',sx,.77+j*.8,-3.8,g);}}}
  if(i===2){box(4.8,1.9,.04,'#272e2c',0,2.45,-4.64,g);for(let row=0;row<4;row++){box(4.4,.012,.02,'#5b655b',0,1.8+row*.4,-4.59,g);box(1.05,.2,.035,['#96a478','#b3a17c','#809793','#9aab83'][row],-1.1+row*.6,1.97+row*.4,-4.56,g);}box(1.1,.55,.9,'#6b6c59',-1.9,.33,-2.9,g);}
  const rim=new THREE.Mesh(new THREE.RingGeometry(1.12,1.16,64),new THREE.MeshBasicMaterial({color:'#d1b988',side:THREE.DoubleSide}));rim.rotation.x=-Math.PI/2;rim.position.set(.28,.07,-.75);g.add(rim);
  npc.root.traverse(o=>{if(o.isMesh){o.userData.partner=i;targets.push(o);}});pad.userData.partner=i;targets.push(pad);
  booths.push({npc,rim,pad,anchor:new THREE.Vector3(x,3.17,-.75)});
 });
 const ui=document.createElement('section');ui.className='negotiation-ui';ui.hidden=true;ui.tabIndex=-1;ui.setAttribute('aria-label','供货洽谈区');
 ui.innerHTML=`<header class="meeting-header"><button id="back-exhibits">← 返回展品区</button><div><h1>供货洽谈区</h1><p>和三位负责人聊聊，找到适合这一轮的供货方式。</p></div><span class="prototype-tag">供货确认后进入定价 · 尚未采购</span></header><aside class="meeting-product"><img alt=""><div><small>正在为这件商品询价</small><strong></strong><span>01 选定商品 <b>→ 02 洽谈供货</b></span></div></aside><div class="partner-labels"></div><section class="conversation" aria-label="供应商对话"><div class="speaker"><span class="speaker-code">01 / SUPPLY PARTNER</span><h2></h2><p></p><div class="talk-progress"></div></div><div class="conversation-body"><p id="speech" aria-live="polite"></p><div class="quote-facts"><div><small>单件进货价</small><strong id="quote-cost"></strong></div><div><small>最低起订量</small><strong id="quote-moq"></strong></div><div><small>供货交期</small><strong id="quote-days"></strong></div></div><p class="quote-caution"></p><p id="negotiation-error" role="alert" hidden></p><div class="talk-actions"><button id="reconsider-partner" class="secondary">← 再看看其他伙伴 <kbd>Esc</kbd></button><button id="ask-tradeoff">我需要注意什么？</button><button id="talk-next" class="primary">继续听报价 <kbd>Enter ↵</kbd></button><button id="confirm-partner" class="primary" hidden>就选这位伙伴 <kbd>Enter ↵</kbd></button></div></div></section><section class="partner-browse" hidden aria-label="选择供货伙伴"><div><strong>再和其他伙伴聊聊</strong><p>点击上方人物或名牌，继续比较供货方案；当前商品保持不变。</p></div><button id="resume-talk">和常规供货聊聊 <kbd>Enter ↵</kbd></button></section><footer class="meeting-keys"><span><kbd>←</kbd><kbd>→</kbd> 切换伙伴 <kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> 直接选择</span><span><kbd>Enter</kbd> 对话 / 确认 <kbd>Esc</kbd> <span id="escape-hint">退出对话</span> <kbd>Tab</kbd> 切换按钮</span></footer>`;
 root.append(ui);const $=s=>ui.querySelector(s);let open=false,moving=false,index=0,step=0,product=null,quotes=[],savedPose=null,frame=0,completed=false,browsing=false;
 const visited=new Set();
 const labels=ROLES.map((r,i)=>{const b=document.createElement('button');b.className='partner-label';b.innerHTML=`<small>0${i+1} / ${r.english}</small><strong>${r.name}<span>↗</span></strong><em>${r.tag}</em>`;b.addEventListener('click',()=>select(i));$('.partner-labels').append(b);return b;});
 function layout(){if(!open)return;const w=renderer.domElement.clientWidth,h=renderer.domElement.clientHeight;wing.updateMatrixWorld(true);booths.forEach((b,i)=>{const p=wing.localToWorld(b.anchor.clone()).project(camera);labels[i].style.left=`${(p.x*.5+.5)*w}px`;labels[i].style.top=`${(-p.y*.5+.5)*h}px`;});}
 function view(){if(!open)return;camera.clearViewOffset();camera.aspect=renderer.domElement.clientWidth/renderer.domElement.clientHeight;camera.fov=40;const d=Math.max(18,12.7/(Math.tan(Math.PI/9)*camera.aspect));camera.position.set(28-d,3.2,0);camera.lookAt(28,3.2,0);camera.updateProjectionMatrix();draw();layout();}
 function paint(){if(disposed)return;const role=ROLES[index],offer=quotes.find(q=>q.id===role.id),q=offer||{name:role.name,unitCost:'—',moq:'—',leadDays:'—'};
  for(const b of ui.querySelectorAll('button'))b.disabled=busy||completed;
  $('#negotiation-error').textContent=errorMessage||(!offer?'当前伙伴暂时无法报价，请选择其他伙伴。':'');
  $('#negotiation-error').hidden=!$('#negotiation-error').textContent;
  ui.setAttribute('aria-busy',String(busy));
  $('#confirm-partner').disabled=busy||completed||!offer;
  $('#confirm-partner').innerHTML=busy?'正在确认供货…':errorMessage?'重试确认伙伴 <kbd>Enter ↵</kbd>':'就选这位伙伴 <kbd>Enter ↵</kbd>';

  $('.conversation').hidden=browsing;$('.partner-browse').hidden=!browsing;
  $('#reconsider-partner').hidden=browsing||completed||step!==2;
  $('#escape-hint').textContent=browsing?'返回展品区':'退出对话';
  $('#resume-talk').innerHTML='和'+role.name+'聊聊 <kbd>Enter ↵</kbd>';

  $('.speaker h2').textContent=role.name;$('.speaker>p').textContent=role.tag;$('.speaker-code').textContent=`0${index+1} / SUPPLY PARTNER`;
  $('.talk-progress').innerHTML=[0,1,2].map(i=>`<i class="${i<=step?'on':''}"></i>`).join('');
  $('#speech').textContent=completed?`合作方向定下了。我们按「${q.name}」继续准备，下一步再设置售价和采购数量。`:step===0?role.intro:step===1?`这件「${product.name}」，我给你的单价是 $${q.unitCost}，${q.moq} 件起订，交期 ${q.leadDays} 天。${q.benefit||''}`:role.advice;
  $('#quote-cost').textContent=`$${q.unitCost}`;$('#quote-moq').textContent=`${q.moq} 件`;$('#quote-days').textContent=`${q.leadDays} 天`;
  $('.quote-facts').hidden=step===0||!offer;$('.quote-caution').hidden=step===0||!offer;$('.quote-caution').textContent=completed?'已确认供货，正在进入定价备货。':`最低起订货值 $${Math.round(q.unitCost*q.moq).toLocaleString()} · 尚未采购`;
  $('#ask-tradeoff').hidden=completed||step===2;$('#talk-next').hidden=step===2&&!completed;$('#confirm-partner').hidden=step!==2||completed;
  $('#talk-next').innerHTML=completed?'正在进入定价备货…':step===0?'继续听报价 <kbd>Enter ↵</kbd>':'了解取舍 <kbd>Enter ↵</kbd>';
  labels.forEach((b,i)=>{b.classList.toggle('active',i===index);b.setAttribute('aria-pressed',String(i===index));b.querySelector('strong span').textContent=visited.has(i)?'已了解':'↗';b.querySelector('strong span').classList.toggle('visited',visited.has(i));booths[i].rim.visible=i===index;});
  ui.dataset.partner=role.id;ui.dataset.step=browsing?'browse':completed?'complete':String(step);draw();layout();
 }
 function focusAction(){if(disposed)return;if(busy||completed){ui.focus({preventScroll:true});return;}if(browsing){labels[index].focus({preventScroll:true});return;}(step===2&&!completed?$('#confirm-partner'):$('#talk-next')).focus({preventScroll:true});}
 function select(i){if(moving||busy||completed||disposed)return;errorMessage='';index=(i+3)%3;step=0;completed=false;browsing=false;paint();focusAction();}
 function next(){if(moving||busy||browsing||completed||disposed)return;if(step<2){step++;if(step===2)visited.add(index);paint();focusAction();}}
 async function confirm(){
  if(moving||busy||browsing||completed||disposed||step!==2)return;
  const quote=quotes.find(q=>q.id===ROLES[index].id);if(!quote)return;
  busy=true;errorMessage='';paint();focusAction();
  try{const result=await onConfirm(quote);if(disposed)return;if(!result)throw new Error('本次确认未完成，请重试。');completed=true;}
  catch(error){if(disposed)return;errorMessage=error.message||'供货确认未完成，请重试。';quotes=getQuotes(product.id);}
  finally{busy=false;if(!disposed){paint();focusAction();}}
 }

 function transition(to){if(disposed)return;cancelAnimationFrame(frame);moving=true;ui.classList.add('camera-moving');const from=camera.position.clone(),rotation=camera.quaternion.clone();view();const dest=camera.position.clone(),rot=camera.quaternion.clone();if(!to){dest.copy(savedPose.position);rot.copy(savedPose.quaternion);camera.fov=savedPose.fov;}camera.position.copy(from);camera.quaternion.copy(rotation);const start=performance.now(),duration=matchMedia('(prefers-reduced-motion: reduce)').matches?0:650;
  function tick(time){if(disposed)return;const t=duration?Math.min(1,(time-start)/duration):1,e=t*t*(3-2*t);camera.position.lerpVectors(from,dest,e);camera.quaternion.slerpQuaternions(rotation,rot,e);camera.updateProjectionMatrix();draw();layout();if(t<1)frame=requestAnimationFrame(tick);else {moving=false;ui.classList.remove('camera-moving');if(!to){open=false;ui.hidden=true;wing.visible=false;world.room.visible=true;root.classList.remove('in-negotiation');resize();onReturn();}else focusAction();}}
  frame=requestAnimationFrame(tick);
 }
 function enter(p,offers){if(open||disposed||!offers.length)return;errorMessage='';product=p;quotes=offers;index=0;step=0;completed=false;browsing=false;visited.clear();savedPose={position:camera.position.clone(),quaternion:camera.quaternion.clone(),fov:camera.fov};open=true;ui.hidden=false;wing.visible=true;world.room.visible=false;root.classList.add('in-negotiation');$('.meeting-product img').src=new URL(`../../assets/showroom/images/${p.id}.png`,import.meta.url).href;$('.meeting-product img').alt=p.name;$('.meeting-product strong').textContent=p.name;paint();transition(true);}
 function leave(){if(moving||busy||completed||disposed||!open)return;transition(false);}
 function reconsider(){if(moving||busy||completed||disposed)return;errorMessage='';browsing=true;completed=false;step=0;paint();focusAction();}
 function browsePartner(i){index=(i+3)%3;paint();focusAction();}
 $('#reconsider-partner').addEventListener('click',reconsider);
 $('#resume-talk').addEventListener('click',()=>select(index));

 $('#back-exhibits').addEventListener('click',leave);$('#talk-next').addEventListener('click',next);$('#confirm-partner').addEventListener('click',confirm);$('#ask-tradeoff').addEventListener('click',()=>{if(busy||moving||disposed)return;step=2;visited.add(index);paint();focusAction();});
 root.addEventListener('keydown',e=>{if(!open||disposed)return;e.stopImmediatePropagation();if(moving||busy||completed){e.preventDefault();return;}if(e.repeat&&e.key==='Enter'){e.preventDefault();return;}if(['ArrowLeft','ArrowRight','1','2','3','Escape'].includes(e.key)){e.preventDefault();if(e.key==='Escape'){browsing?leave():reconsider();}else {const target=e.key==='ArrowLeft'?index-1:e.key==='ArrowRight'?index+1:Number(e.key)-1;browsing?browsePartner(target):select(target);}}else if(e.key==='Enter'&&e.target===ui){e.preventDefault();browsing?select(index):step===2?confirm():next();}else if(e.key==='Tab'){const controls=[...ui.querySelectorAll('button')].filter(b=>!b.disabled&&b.getClientRects().length);if(e.shiftKey&&e.target===controls[0]){e.preventDefault();controls.at(-1).focus();}else if(!e.shiftKey&&e.target===controls.at(-1)){e.preventDefault();controls[0].focus();}}},{capture:true,signal:events.signal});
 const ray=new THREE.Raycaster();renderer.domElement.addEventListener('click',e=>{if(!open||moving||busy||disposed)return;const rect=renderer.domElement.getBoundingClientRect();ray.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);const hit=ray.intersectObjects(targets)[0];if(hit)select(hit.object.userData.partner);},{signal:events.signal});
 return {enter,leave,layout,resize:view,focus:focusAction,get active(){return open;},dispose(){disposed=true;open=false;events.abort();cancelAnimationFrame(frame);ui.remove();}};
}
