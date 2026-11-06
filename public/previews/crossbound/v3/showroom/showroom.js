import * as THREE from 'three';
import { createNegotiation } from './negotiation.js';
import { createWorld } from './room.js';
import { template } from './template.js';
import { createShowroomSession, roundKey } from './session.js';
import { money, fitTier } from '../world/logic.js';

export function mountShowroom({store,quality='high',onExit,onNext}){
 const previousFocus=document.activeElement;
 const root=document.createElement('section');root.id='v3-showroom';root.className='room-experience details-collapsed';root.tabIndex=-1;root.setAttribute('aria-label','选品展厅');root.innerHTML=template;document.body.append(root);
 let resolveReady,rejectReady;const ready=new Promise((resolve,reject)=>{resolveReady=resolve;rejectReady=reject;});
 const abort=new AbortController();let disposed=false,supplyTab=false;
 let storage;try{storage=window.localStorage;}catch{}
 const catalog=(store.snapshot()?.engine?.products||store.snapshot()?.options||[]).map(p=>({...p,...(store.snapshot()?.options||[]).find(o=>o.id===p.id)}));
 const session=createShowroomSession({store,storage,onChange:()=>{if(!disposed)updateSelection();},onNext:(id,details)=>{store.send('world_complete',{world:'w1',supplierApplied:details.supplierApplied});onNext?.(id);}});
const $=s=>root.querySelector(s);
const marketFit=document.createElement('p');marketFit.id='market-fit';$('#product-english').after(marketFit);
const byId=new Map(catalog.map(p=>[p.id,p]));
const featured=['living','tech','care','lamp','fan','powerbank','earbuds','bottle','adaptive-sofa','luma-bed','guide-cabinet','lift-desk'];
const ordered=[...featured.map(id=>byId.get(id)).filter(Boolean),...catalog.filter(p=>!featured.includes(p.id))];
const CATEGORIES=[['all','全部商品'],['home','家居用品'],['furniture','家具空间'],['electronics','3C 电子'],['outdoor','户外生活'],['lifestyle','个护生活'],['future','未来家居']];
const counts=Object.fromEntries(CATEGORIES.map(([id])=>[id,id==='all'?catalog.length:catalog.filter(p=>p.category===id).length]));
const assetURL=id=>new URL(`../../assets/showroom/images/${id}.png`,import.meta.url).href;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let category='all',page=0,inspected=byId.get('lamp'),selected=null,muted=true,overviewOpen=false;
let entries=[],pickables=[],hoverId=null,width=0,height=0,drawPending=false,renderSerial=0,firstBatch=true,loadingIds=new Set();
let viewer=null,viewerMode='rest',viewerProduct=null,viewerObserver=null;


let world;try{world=createWorld(THREE,$('#scene'));}catch(error){session.dispose();root.remove();throw error;}
const {scene,camera,renderer,stations}=world;
let negotiation;
negotiation=createNegotiation({world,root,draw,resize,onReturn:()=>{mountViewer();$('#choose-product').focus({preventScroll:true});},getQuotes:id=>store.snapshot()?.quotes?.(id)||[],onConfirm:q=>session.confirmSupplier(q.id,q)});
const keyboardHint=document.createElement('div');keyboardHint.className='keyboard-guide';keyboardHint.innerHTML='<kbd>↑ ↓ ← →</kbd> 挑选商品 <kbd>Enter</kbd> 查看 / 确认 <kbd>PgUp / PgDn</kbd> 换组 <kbd>G</kbd> 总览 <kbd>Esc</kbd> 返回';root.append(keyboardHint);
let keyboardId=null;
function startMeeting(){if(!selected||disposed||session.state.busy)return;const offers=store.snapshot()?.quotes?.(selected.id)||[];if(!offers.length){announce('当前没有可用报价，请稍后重试。');return;}setOverview(false);$('#utility-panel').hidden=true;$('#settings').setAttribute('aria-expanded','false');unmountViewer();negotiation.enter(selected,offers);}

renderer.setPixelRatio(Math.min(devicePixelRatio||1,quality==='high'?1.7:quality==='mid'?1.25:1));renderer.shadowMap.enabled=quality!=='low';
const modelCache=new Map(),objectLoader=new THREE.ObjectLoader();
const roomPool=()=>category==='all'?ordered:ordered.filter(p=>p.category===category);
const categoryLabel=()=>CATEGORIES.find(([id])=>id===category)?.[1]||'全部商品';
function announce(text){$('#toast').textContent=text;$('#toast').classList.add('visible');clearTimeout(announce.timer);announce.timer=setTimeout(()=>$('#toast').classList.remove('visible'),2500);}
function bleep(){if(muted)return;try{const ctx=bleep.ctx||(bleep.ctx=new AudioContext()),o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);o.frequency.setValueAtTime(650,ctx.currentTime);g.gain.setValueAtTime(.025,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.07);o.start();o.stop(ctx.currentTime+.07);}catch{}}
function draw(){if(disposed||!width||!height)return;renderer.render(scene,camera);positionLabels();negotiation?.layout();}
function requestDraw(){if(disposed||drawPending)return;drawPending=true;requestAnimationFrame(()=>{drawPending=false;draw();});}
function resize(){width=$('#scene').clientWidth;height=$('#scene').clientHeight;if(!width||!height)return;renderer.setSize(width,height);if(negotiation?.active){negotiation.resize();return;}camera.aspect=width/height;camera.fov=36;
 const mobile=innerWidth<=760,open=!$('.inspector').hidden;
 const left=mobile?0:$('.collection-nav').getBoundingClientRect().right+21;
 const right=(!mobile&&open)?$('.inspector').getBoundingClientRect().width+44:0;
 const bottom=(mobile&&open)?Math.max(0,height-$('.inspector').getBoundingClientRect().top+8):0;
 const availableAspect=Math.max(.4,(width-left-right)/Math.max(270,height-bottom));
 // Fit the nearest edge of the front islands inside the free area beside the archive.
 const distance=Math.max(17.5,8.3/(Math.tan(THREE.MathUtils.degToRad(18))*availableAspect)+2.65);
 camera.clearViewOffset();camera.setViewOffset(width,height,(right-left)/2,bottom/2,width,height);
 // The main exhibition is a locked, level still view. Only the archive viewer is interactive.
 camera.position.set(0,2.65,distance);camera.lookAt(0,2.65,-5);camera.updateProjectionMatrix();requestDraw();
}
function setInspector(open){root.classList.toggle('details-collapsed',!open);$('.inspector').hidden=!open;$('#show-details').hidden=open;if(!open)unmountViewer();resize();}
async function modelData(id){
 const url=new URL(`../../assets/showroom/models/${id}.json.gz`,import.meta.url);
 const response=await fetch(url,{signal:abort.signal});if(!response.ok)throw Error('商品模型未能加载');
 const bytes=new Uint8Array(await response.arrayBuffer());
 if(bytes[0]===31&&bytes[1]===139)return new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).json();
 return JSON.parse(new TextDecoder().decode(bytes));
}
async function loadModel(p){let cached=modelCache.get(p.id);if(cached){cached.used=performance.now();return cached.promise;}
 cached={used:performance.now(),root:null};cached.promise=(async()=>{
  const raw=await modelData(p.id);
  const root=await objectLoader.parseAsync(raw);if(disposed){disposeRoot(root);throw new DOMException('展厅已关闭','AbortError');}root.rotation.set(0,0,0);root.position.set(0,0,0);root.scale.setScalar(1);
  const bounds=new THREE.Box3().setFromObject(root),dims=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
  root.traverse(o=>{if(!o.isMesh)return;o.castShadow=true;o.receiveShadow=true;for(const m of Array.isArray(o.material)?o.material:[o.material]){m.envMapIntensity=.65;m.metalness=Math.min(.65,m.metalness??.25);m.roughness=Math.max(.34,m.roughness??.6);}});
  const result={root,dims,center,minY:bounds.min.y};cached.root=root;cached.result=result;queueMicrotask(()=>{if(!disposed)pruneModels();});return result;
 })().catch(error=>{modelCache.delete(p.id);throw error;});modelCache.set(p.id,cached);return cached.promise;
}
function disposeRoot(root){const geometries=new Set(),materials=new Set(),textures=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);for(const k of ['map','normalMap','roughnessMap','metalnessMap','bumpMap','alphaMap'])if(m[k])textures.add(m[k]);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}
function pruneModels(){if(modelCache.size<=24)return;const active=new Set([...entries.map(e=>e.p.id),...loadingIds]);for(const [id,c] of [...modelCache].sort((a,b)=>a[1].used-b[1].used)){if(modelCache.size<=24)break;if(!active.has(id)&&c.root){disposeRoot(c.root);modelCache.delete(id);}}}
function slotsFor(n){if(n<=4)return Array.from({length:n},(_,i)=>8+i);if(n<=8)return [5,6,4,7].slice(0,n-4).sort((a,b)=>a-b).concat([8,9,10,11]);return Array.from({length:n-4},(_,i)=>i).concat([8,9,10,11]);}
function resetStations(){for(const s of stations){s.group.visible=false;s.holder.clear();s.group.position.set(s.original.x,0,s.original.z);s.position={...s.original};s.outline.visible=false;s.holder.userData.productId=null;}}
function makeMarker(p,index,station){const button=document.createElement('button');button.type='button';button.className='product-marker '+station.position.kind;button.dataset.id=p.id;button.title=p.name;button.setAttribute('aria-label','查看'+p.name);button.setAttribute('aria-pressed','false');
 button.innerHTML='<span class="marker-title"><span class="marker-number"></span><span class="marker-name"></span><span class="marker-check">✓</span></span><span class="marker-price"></span>';
 button.querySelector('.marker-number').textContent=String(index+1).padStart(2,'0');button.querySelector('.marker-name').textContent=p.name;button.querySelector('.marker-price').textContent=`成本 $${p.cost} · 参考 $${p.basePrice}`;
 button.addEventListener('click',()=>inspect(p));button.addEventListener('mouseenter',()=>setHover(p.id));button.addEventListener('mouseleave',()=>setHover(null));return button;
}
async function renderBatch(){const serial=++renderSerial,pool=roomPool();page=Math.max(0,Math.min(page,Math.ceil(pool.length/12)-1));const batch=pool.slice(page*12,page*12+12);loadingIds=new Set(batch.map(p=>p.id));updateRoomNavigation();$('#scene-status').textContent='正在陈列…';$('#load-progress').textContent=`准备 ${batch.length} 件原版商品`;
 try{const loaded=await Promise.all(batch.map(loadModel));if(disposed||serial!==renderSerial)return;
  resetStations();entries=[];pickables=[];const slots=slotsFor(batch.length),fragment=document.createDocumentFragment();
  batch.forEach((p,i)=>{const station=stations[slots[i]],data=loaded[i];if(batch.length<=4){station.group.position.x=(i-(batch.length-1)/2)*4.1;station.position.x=station.group.position.x;}
   const floor=station.position.kind==='floor';const maxSize=floor?(batch.length<=4?2.3:2.0):1.65,maxHeight=floor?1.5:1.24;
   const scale=Math.min(maxSize/Math.max(data.dims.x,data.dims.y,data.dims.z,.001),maxHeight/Math.max(data.dims.y,.001));
   data.root.scale.setScalar(scale);data.root.position.set(-data.center.x*scale,-data.minY*scale,-data.center.z*scale);station.holder.add(data.root);station.holder.userData.productId=p.id;station.group.visible=true;
   data.root.traverse(o=>{if(o.isMesh)pickables.push(o);});const marker=makeMarker(p,i,station);fragment.append(marker);
   entries.push({p,station,marker,root:data.root,anchor:new THREE.Vector3(station.group.position.x,station.position.y-.07,station.group.position.z+station.depth/2+.05)});
  });
  $('#product-labels').replaceChildren(fragment);root.dataset.modelsLoaded=String(entries.length);root.dataset.visibleProducts=batch.map(p=>p.id).join(',');root.dataset.catalogCount=String(catalog.length);
  $('#loader').classList.add('done');$('#scene-status').textContent=`当前 ${batch.length} 件 / ${pool.length} 件`;updateRoomNavigation();updateExhibits();draw();pruneModels();
  if(!firstBatch&&!reduced)$('#scene').animate([{opacity:.5},{opacity:1}],{duration:180,easing:'ease-out'});firstBatch=false;resolveReady();

 }catch(error){if(disposed||serial!==renderSerial)return;if(firstBatch)rejectReady(error);$('#scene-status').textContent='商品模型加载未完成';$('#loader').classList.remove('done');$('#loader b').textContent='商品模型未能加载';$('#load-progress').textContent='请点击重试重新加载当前商品组。';$('#retry-models').hidden=false;console.error(error);announce('商品加载未完成，可重试加载。');}
}
function updateExhibits(){for(const e of entries){const focused=inspected?.id===e.p.id,on=selected?.id===e.p.id,hover=hoverId===e.p.id;e.station.outline.visible=focused||on||hover;e.station.outline.material.color.set(on?'#c7fc30':'#bda77c');e.marker.classList.toggle('focused',focused);e.marker.classList.toggle('selected',on);e.marker.setAttribute('aria-pressed',String(focused));}}
function positionLabels(){for(const e of entries){const p=e.anchor.clone().project(camera);e.marker.style.left=`${(p.x*.5+.5)*width}px`;e.marker.style.top=`${(-p.y*.5+.5)*height}px`;}}
function setHover(id){if(id===hoverId)return;hoverId=id;renderer.domElement.style.cursor=id?'pointer':'default';updateExhibits();requestDraw();}
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
function hit(event){if(negotiation?.active)return null;const r=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);for(const h of raycaster.intersectObjects(pickables,false)){let o=h.object;while(o&&!o.userData.productId)o=o.parent;if(o?.userData.productId)return byId.get(o.userData.productId);}return null;}
renderer.domElement.addEventListener('pointermove',e=>setHover(hit(e)?.id||null));renderer.domElement.addEventListener('pointerleave',()=>setHover(null));renderer.domElement.addEventListener('click',e=>{const p=hit(e);if(p)inspect(p);});
// No drag, orbit, zoom or animation handlers are attached to the main exhibition.
function renderCategories(){const fragment=document.createDocumentFragment();for(const [id,label] of CATEGORIES){const b=document.createElement('button');b.type='button';b.dataset.category=id;b.setAttribute('aria-pressed',String(id===category));b.className=id===category?'active':'';const name=document.createElement('span'),count=document.createElement('small');name.textContent=label;count.textContent=counts[id];b.append(name,count);b.addEventListener('click',()=>setCategory(id));fragment.append(b);}$('#category-buttons').replaceChildren(fragment);}
function updateRoomNavigation(){const n=roomPool().length,pages=Math.max(1,Math.ceil(n/12));$('#room-count').textContent=`${Math.min(12,Math.max(0,n-page*12))} / ${n} 件`;$('#room-page').textContent=`${String(page+1).padStart(2,'0')} / ${String(pages).padStart(2,'0')}`;$('#previous-page').disabled=page===0;$('#next-page').disabled=page>=pages-1;$('#zone-name').textContent=categoryLabel();}
function setCategory(id){if(session.state.busy)return;if(!counts[id])return;category=id;page=0;renderCategories();renderOverview();renderBatch();$('#category-buttons').querySelector(`[data-category="${id}"]`)?.focus({preventScroll:true});}
function flipPage(direction){if(session.state.busy)return;const pages=Math.ceil(roomPool().length/12),next=Math.max(0,Math.min(pages-1,page+direction));if(next!==page){page=next;renderBatch();}}
function setOverview(open){overviewOpen=open;$('#catalog-overview').hidden=!open;$('#open-overview').setAttribute('aria-pressed',String(open));root.classList.toggle('overview-open',open);if(open){renderOverview();$('#catalog-search').focus({preventScroll:true});}else $('#open-overview').focus({preventScroll:true});}
function overviewResults(){const q=$('#catalog-search').value.trim().toLocaleLowerCase();let list=roomPool().filter(p=>!q||[p.name,p.english,p.categoryLabel,p.baseCategory,p.id,...(p.specs||[])].join(' ').toLocaleLowerCase().includes(q));const sort=$('#catalog-sort').value;if(sort==='cost-asc')list.sort((a,b)=>a.cost-b.cost);if(sort==='cost-desc')list.sort((a,b)=>b.cost-a.cost);if(sort==='price-asc')list.sort((a,b)=>a.basePrice-b.basePrice);return list;}
function renderOverview(){const list=overviewResults(),q=$('#catalog-search').value.trim();$('#overview-total').textContent=catalog.length;$('#overview-result').textContent=`${categoryLabel()} · ${list.length} 件${q?' · “'+q+'”':''}`;$('#clear-filters').hidden=category==='all'&&!q;$('#catalog-empty').hidden=!!list.length;$('#catalog-grid').hidden=!list.length;const fragment=document.createDocumentFragment();
 for(const p of list){const b=document.createElement('button');b.type='button';b.className='catalog-card';b.dataset.id=p.id;b.setAttribute('aria-label','查看'+p.name);b.setAttribute('aria-pressed',String(inspected?.id===p.id));b.classList.toggle('is-selected',selected?.id===p.id);
  b.innerHTML='<span class="catalog-card-code"></span><img alt="" loading="lazy" decoding="async"><strong></strong><span class="catalog-card-cost"></span><span class="catalog-chosen">✓</span>';
  b.querySelector('.catalog-card-code').textContent=String(catalog.indexOf(p)+1).padStart(3,'0');b.querySelector('img').src=assetURL(p.id);b.querySelector('strong').textContent=p.name;b.querySelector('.catalog-card-cost').textContent=`成本 $${p.cost} · 售价 $${p.basePrice}`;b.addEventListener('click',()=>inspect(p));fragment.append(b);
 }$('#catalog-grid').replaceChildren(fragment);$('#catalog-grid').dataset.resultCount=String(list.length);
}
function clearFilters(){category='all';page=0;$('#catalog-search').value='';renderCategories();renderOverview();renderBatch();}
function showTab(supply){supplyTab=supply;$('#tab-details').setAttribute('aria-selected',String(!supply));$('#tab-supply').setAttribute('aria-selected',String(supply));$('#tab-details').tabIndex=supply?-1:0;$('#tab-supply').tabIndex=supply?0:-1;$('#details-panel').hidden=supply;$('#supply-panel').hidden=!supply;renderQuotes();updateSelection();}
function unmountViewer(){viewerObserver?.disconnect();viewerObserver=null;if(viewer){viewer.unmount();viewer=null;}viewerProduct=null;$('#detail-viewer').replaceChildren();$('#product-image').hidden=false;}
function updateDemoMode(mode){viewerMode=mode;const active=mode==='active',info=window.CrossboundProductViewer?.demo(inspected.id);$('#demo-rest').classList.toggle('active',!active);$('#demo-active').classList.toggle('active',active);$('#demo-rest').setAttribute('aria-pressed',String(!active));$('#demo-active').setAttribute('aria-pressed',String(active));$('#demo-active').textContent=(info?.demoLabel||info?.activeLabel||'功能演示')+' ↗';$('#demo-feedback').textContent=active?(info?.feedback||'正在展示商品功能。'):(info?.purpose||'在这里旋转查看商品，点击功能按钮体验原版演示。');viewer?.update({product:inspected.id,designMode:mode,onDesignModeChange:updateDemoMode});}
function mountViewer(){if(!window.CrossboundProductViewer){$('#viewer-hint').textContent='原版商品图';return;}
 if(viewerProduct!==inspected.id){$('#product-image').hidden=false;viewerProduct=inspected.id;const props={product:inspected.id,designMode:'rest',onDesignModeChange:updateDemoMode};if(viewer)viewer.update(props);else viewer=window.CrossboundProductViewer.mount($('#detail-viewer'),props);}
 viewerObserver?.disconnect();viewerObserver=new MutationObserver(()=>{if($('#detail-viewer canvas')){$('#product-image').hidden=true;viewerObserver.disconnect();}});viewerObserver.observe($('#detail-viewer'),{childList:true,subtree:true});if($('#detail-viewer canvas'))$('#product-image').hidden=true;$('#viewer-hint').textContent='拖动旋转 · 点击体验功能';updateDemoMode('rest');
}
function inspect(p){if(session.state.busy||disposed)return;inspected=p;setInspector(true);$('.inspector-scroll').scrollTop=0;$('#product-image').src=assetURL(p.id);$('#product-image').alt=p.name+'原版商品图';$('#sku-label').textContent=`CB / ${String(catalog.indexOf(p)+1).padStart(3,'0')}`;$('#product-category').textContent=p.categoryLabel;$('#product-name').textContent=p.name;$('#product-english').textContent=p.english;$('#product-cost').textContent=`$${p.cost}`;$('#product-price').textContent=`$${p.basePrice}`;$('#product-days').replaceChildren(document.createTextNode(String(p.supplierDays)),Object.assign(document.createElement('em'),{textContent:'天'}));$('#product-description').textContent=p.sellingPoint;$('#product-specs').replaceChildren(...(p.specs||[]).map(s=>Object.assign(document.createElement('li'),{textContent:s})));$('#supply-days').textContent=`${p.supplierDays} 天`;$('#supply-packing').textContent=p.packing||'按供应商包装方案';$('#supply-cost').textContent=`$${p.cost} / 件`;showTab(false);mountViewer();updateSelection();bleep();$('#choose-product').focus({preventScroll:true});}
function updateSelection(){
 selected=byId.get(session.state.product)||null;
 const tier=fitTier(inspected,store.snapshot()?.company?.marketId);
 marketFit.textContent=`当前市场 ${store.snapshot()?.market?.name||''} · ${tier?`匹配度 ${tier.label} ${'★'.repeat(tier.stars)}`:'匹配度待测'}`;
 const on=selected?.id===inspected?.id,busy=session.state.busy;
 $('#inspector-state').textContent=on?'本轮已选':'查看中';$('#inspector-state').classList.toggle('is-selected',on);
 $('#choose-product').classList.toggle('selected',on&&!supplyTab);
 const label=busy?'正在确认…':on?'和供货伙伴聊聊 →':'就选这件 →';
 $('#choose-product').textContent=label;$('#choose-product').disabled=busy||!!inspected?.disabled;
 $('#put-back').disabled=busy;$('#home').disabled=busy;root.setAttribute('aria-busy',String(busy));
 $('#put-back').textContent=on?'取消选定':'放回去';
 $('#task-text').textContent=selected?`本轮已选：${selected.name} · 前往洽谈区认识供货伙伴`:'方向键挑选 · Enter 查看 · 选定后前往洽谈区';
 $('.task-hud').classList.toggle('has-selection',!!selected);
 $('#choose-note').textContent=on?'确认供货伙伴后进入定价；此处不采购、不扣款。':'选择商品后，转向同一房间的洽谈区。';
 updateExhibits();requestDraw();
 if(overviewOpen)for(const b of $('#catalog-grid').children){b.classList.toggle('is-selected',b.dataset.id===selected?.id);b.setAttribute('aria-pressed',String(b.dataset.id===inspected?.id));}
}
async function locateProduct(){if(!inspected)return;const p=inspected;if(category!=='all'&&category!==p.category){category=p.category;renderCategories();}page=Math.floor(roomPool().findIndex(x=>x.id===p.id)/12);setOverview(false);await renderBatch();$('#product-labels').querySelector(`[data-id="${p.id}"]`)?.focus({preventScroll:true});announce('已定位「'+p.name+'」');}
function utility(title,text){$('#utility-title').textContent=title;$('#utility-body').replaceChildren();if(typeof text==='string')$('#utility-body').textContent=text;else $('#utility-body').append(text);$('#utility-panel').hidden=false;}
function openSettings(){if(!$('#utility-panel').hidden){$('#utility-panel').hidden=true;$('#settings').setAttribute('aria-expanded','false');return;}const container=document.createElement('div');container.className='settings-menu';const sound=document.createElement('button');sound.textContent=muted?'开启音效':'关闭音效';sound.addEventListener('click',()=>{muted=!muted;sound.textContent=muted?'开启音效':'关闭音效';bleep();});const help=document.createElement('button');help.textContent='操作说明';help.addEventListener('click',()=>utility('展厅操作说明','键盘：方向键挑选商品，Enter 查看或确认；PgUp/PgDn 换组；G 打开总览；Tab 切换按钮；Esc 返回。洽谈区使用左右键或 1/2/3 切换角色，Enter 推进对话。\n主展厅是静态陈列，点选商品后在右侧查看、旋转和体验功能。\n每屏最多展示 12 件，左侧可切换品类和翻页。\n全部商品总览支持搜索与排序；点选后可在右侧定位到展厅。\n点击「就选这件」保存本轮选择；比较并确认供货方案后进入定价，不在此处采购或扣款。'));container.append(sound,help);utility('展厅设置',container);$('#settings').setAttribute('aria-expanded','true');}
$('#choose-product').addEventListener('click',async()=>{
 if(!inspected||session.state.busy)return;
 try{
  if(session.state.product===inspected.id){
   startMeeting();
  }else if(await session.choose(inspected.id)){renderQuotes();announce('已选定「'+inspected.name+'」，前往洽谈区。');bleep();startMeeting();}
 }catch(error){announce(error.message);}finally{if(!disposed)updateSelection();}
});
$('#put-back').addEventListener('click',()=>{try{if(session.state.product===inspected?.id){session.cancel();renderQuotes();announce('已取消本轮选定。');}else setInspector(false);}catch(error){announce(error.message);}});
$('#close-details').addEventListener('click',()=>{setInspector(false);$('#show-details').focus();});$('#show-details').addEventListener('click',()=>inspect(inspected||selected||ordered[0]));$('#locate-product').addEventListener('click',locateProduct);
$('#demo-rest').addEventListener('click',()=>updateDemoMode('rest'));$('#demo-active').addEventListener('click',()=>updateDemoMode('active'));$('#reset-detail').addEventListener('click',()=>{unmountViewer();mountViewer();});
$('#previous-page').addEventListener('click',()=>flipPage(-1));$('#next-page').addEventListener('click',()=>flipPage(1));$('#open-overview').addEventListener('click',()=>setOverview(!overviewOpen));$('#close-overview').addEventListener('click',()=>setOverview(false));$('#catalog-search').addEventListener('input',renderOverview);$('#catalog-sort').addEventListener('change',renderOverview);$('#clear-filters').addEventListener('click',clearFilters);$('#reset-search').addEventListener('click',clearFilters);
$('#tab-details').addEventListener('click',()=>showTab(false));$('#tab-supply').addEventListener('click',()=>showTab(true));for(const b of [$('#tab-details'),$('#tab-supply')])b.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();const supply=$('#tab-supply').getAttribute('aria-selected')!=='true';showTab(supply);(supply?$('#tab-supply'):$('#tab-details')).focus();}});
$('#settings').addEventListener('click',openSettings);$('#close-utility').addEventListener('click',()=>{$('#utility-panel').hidden=true;$('#settings').setAttribute('aria-expanded','false');});$('#home').addEventListener('click',()=>{if(!session.state.busy)onExit?.();});
root.addEventListener('keydown',e=>{
 if(e.defaultPrevented)return;if(session.state.busy){e.preventDefault();return;}if(e.ctrlKey||e.metaKey||e.altKey)return;
 if(e.key==='Escape'){e.preventDefault();if(session.state.busy)return;if(!$('#utility-panel').hidden){$('#utility-panel').hidden=true;$('#settings').setAttribute('aria-expanded','false');}else if(overviewOpen){setOverview(false);root.focus();}else if(!$('.inspector').hidden){setInspector(false);const marker=entries.find(x=>x.p.id===inspected?.id)?.marker;marker?marker.focus({preventScroll:true}):root.focus();}else onExit?.();return;}
 if(e.target.closest('input,select,[role="tablist"],#detail-viewer'))return;
 if(e.repeat&&e.key==='Enter'){e.preventDefault();return;}
 if(e.key.toLowerCase()==='g'){e.preventDefault();setOverview(!overviewOpen);if(!overviewOpen)root.focus();return;}
 if(e.key==='PageDown'||e.key==='PageUp'){e.preventDefault();flipPage(e.key==='PageDown'?1:-1);root.focus();return;}
 if(e.target.closest('#category-buttons')&&['ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const buttons=[...$('#category-buttons').children],i=buttons.indexOf(e.target);buttons[(i+(e.key==='ArrowUp'?-1:1)+buttons.length)%buttons.length].focus();return;}
 if(overviewOpen&&e.target.closest('.catalog-card')&&e.key.startsWith('Arrow')){e.preventDefault();const cards=[...$('#catalog-grid').children],i=cards.indexOf(e.target.closest('.catalog-card')),cols=getComputedStyle($('#catalog-grid')).gridTemplateColumns.split(' ').length,delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-cols,ArrowDown:cols}[e.key];cards[Math.max(0,Math.min(cards.length-1,i+delta))]?.focus();return;}
 if(overviewOpen||e.target.closest('.inspector,#utility-panel,.collection-nav,.settings-button,.back-hud'))return;
 if(e.key.startsWith('Arrow')&&entries.length){e.preventDefault();const current=entries.findIndex(x=>x.p.id===(e.target.dataset.id||keyboardId)),delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-4,ArrowDown:4}[e.key];const index=current<0?0:Math.max(0,Math.min(entries.length-1,current+delta));keyboardId=entries[index].p.id;entries[index].marker.focus({preventScroll:true});setHover(keyboardId);return;}
 if(e.key==='Enter'&&e.target===root){e.preventDefault();inspect(entries.find(x=>x.p.id===keyboardId)?.p||entries[0]?.p||ordered[0]);}
});
const observer=new ResizeObserver(resize);observer.observe($('#scene'));renderCategories();renderOverview();updateSelection();resize();renderBatch();
root.addEventListener('keydown',e=>{if(e.key!=='Tab')return;const controls=[...root.querySelectorAll('button,input,select,[tabindex="0"]')].filter(n=>!n.disabled&&n.tabIndex>=0&&n.getClientRects().length&&getComputedStyle(n).visibility!=='hidden');const first=controls[0],last=controls.at(-1);if(e.shiftKey&&(e.target===first||e.target===root)){e.preventDefault();last?.focus();}else if(!e.shiftKey&&(e.target===last||e.target===root)){e.preventDefault();first?.focus();}});

 function renderQuotes(){
  const host=$('#supplier-offers');host.replaceChildren();
  const note=document.createElement('p');note.textContent='常规供货、现货快补和工厂排产的三位负责人就在展厅另一侧。选定商品后，去听听他们的报价与建议。';host.append(note);
  if(session.state.product===inspected?.id){const button=document.createElement('button');button.type='button';button.className='supplier-offer';button.textContent='前往供货洽谈区 →';button.addEventListener('click',startMeeting);host.append(button);}
 }
 function refreshBusiness(){
  if(disposed)return;const s=store.snapshot();
  if(roundKey(s)!==initialRound){onExit?.();return;}
  if(s.company?.stage!==1&&!session.state.busy){s.company?.stage===2?onNext?.('w2'):onExit?.();return;}
  $('.money-hud strong').textContent=money(s.company?.cash||0);
  $('.money-hud>span').replaceChildren(document.createTextNode('本轮利润 '),Object.assign(document.createElement('b'),{textContent:s.profitText||'待结算'}));
  $('.title-hud small').textContent=`第 ${s.company?.round||1} 轮 · 挑商品、选供应商`;
  updateSelection();if(!$('#supply-panel').hidden)renderQuotes();
 }
 const initialRound=roundKey(store.snapshot());
 const unsubscribe=store.subscribe(refreshBusiness);refreshBusiness();root.focus({preventScroll:true});
 const retry=document.createElement('button');retry.id='retry-models';retry.type='button';retry.textContent='重试加载';retry.hidden=true;
 $('#loader').append(retry);retry.addEventListener('click',()=>{retry.hidden=true;for(const [id,c] of modelCache)if(!c.root)modelCache.delete(id);renderBatch();});
 return {id:'w1',room:'w1',element:root,ready,focus(){if(negotiation.active)negotiation.focus();else root.focus({preventScroll:true});},dispose(){
  if(disposed)return;disposed=true;resolveReady();renderSerial++;abort.abort();session.dispose();unsubscribe();observer.disconnect();
  clearTimeout(announce.timer);bleep.ctx?.close();unmountViewer();for(const c of modelCache.values())if(c.root)disposeRoot(c.root);modelCache.clear();negotiation.dispose();world.dispose();root.remove();if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});
 }};
}
