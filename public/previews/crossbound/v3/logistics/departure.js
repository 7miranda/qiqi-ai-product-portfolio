async function confirmRoute(){
 if(state.phase!=='route'||!world)return;
 if(pendingAction)return;pendingAction=true;try{await request('route');}catch(e){say(e.message);pendingAction=false;return;}pendingAction=false;state.route=state.draft;state.phase='transit';skipVoyage=false;world.restore();render();
 const token=++runToken,reduced=matchMedia('(prefers-reduced-motion:reduce)').matches,r=routes[state.route],fx=$('fx');
 $('experience').classList.add('moving');
 const dur=LogisticsMotion.duration[state.route]*1000,fxLead=reduced?0:1300;
 const fxTimer=setTimeout(()=>{if(token===runToken)fx.className='fx on '+['fx-sea','fx-rail','fx-air'][state.route]},Math.max(0,dur-fxLead));
 await world.depart(state.route,pose=>{if(token!==runToken)return;const bar=$('transit-panel-progress');if(bar)bar.style.width=pose.progress*100+'%';$('live-operation').textContent=pose.stage;$('operation-detail').textContent=' · '+r.name+' / '+model.quantity+' 件';$('panel-title').textContent=pose.stage},reduced);
 clearTimeout(fxTimer);if(token!==runToken)return;
 fx.className='fx on '+['fx-sea','fx-rail','fx-air'][state.route];await sleep(reduced?0:500,token);if(token!==runToken)return;
 fx.classList.add('black');
 // Voyage card on black: origin → (via) → destination, day counter.
 const v=$('voyage');v.innerHTML=`<span class="v-kicker">FIRST MILE · IN TRANSIT · ${r.code}</span><div class="v-route"><div class="v-node"><b>${r.fromCode}</b><span>${r.from}</span></div><div class="v-track"><i class="v-fill" id="v-fill"></i><i class="v-mark" id="v-mark"></i>${r.via?`<div class="v-via"><b>${r.viaCode}</b><span>${r.via}</span></div>`:''}</div><div class="v-node end"><b>${r.toCode}</b><span>${r.to}</span></div></div><div class="v-day"><b class="num" id="v-day">0</b><span>/ ${r.days} 天 · ${r.vehicle} · ${model.quantity} 件</span></div><span class="v-skip"><kbd>S</kbd> 跳过</span>`;
 v.hidden=false;v.classList.remove('out');requestAnimationFrame(()=>v.classList.add('in'));
 state.phase='moving';render();$('panel-title').textContent='跨境运输中';$('panel-subtitle').textContent=r.from+' → '+r.to;
 const vt=reduced?300:2600,vs=performance.now();
 await new Promise(res=>{(function f(){if(token!==runToken)return res();const p=skipVoyage?1:Math.min(1,(performance.now()-vs)/vt),e=p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2;$('v-day').textContent=Math.round(e*r.days);$('v-fill').style.width=e*100+'%';$('v-mark').style.left=e*100+'%';const bar=$('transit-panel-progress');if(bar)bar.style.width=e*100+'%';p<1?requestAnimationFrame(f):res()})()});
 if(token!==runToken)return;
 await sleep(reduced?0:450,token);if(token!==runToken)return;
 // Arrival: the camera is already inside the overseas warehouse; a roller shutter drops over the black,
 // then rolls up bottom-to-top to reveal the running lines. No exterior shot, no dolly through the door.
 state.zone='warehouse';state.line=model.line;world.select(state.line);
 render();$('panel-title').textContent='抵达'+model.destination+'海外仓';$('panel-subtitle').textContent='卸货完成 · 卷帘门开启';$('live-operation').textContent='抵达海外仓';$('operation-detail').textContent=' · 卷帘门开启中';
 v.classList.add('out');fx.className='fx on shutter';await sleep(reduced?0:600,token);v.hidden=true;v.className='voyage';if(token!==runToken)return;
 const settle=world.enter('warehouse',{push:reduced?0:2.5,duration:2400});
 fx.classList.add('lift');await sleep(reduced?0:1900,token);fx.className='fx';if(token!==runToken)return;
 state.phase='line';$('experience').classList.remove('moving');render();
 await settle;if(token!==runToken)return;
 say(`${model.quantity} 件 · ${model.available} 件本轮可用 · 已入${model.destination}海外仓 · ${r.name} ${r.days} 天运输`);
}
