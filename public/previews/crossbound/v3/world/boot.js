// REQ-053 §3 single mode: the campus is the one 2.5D headquarters map; each step opens its own full-screen scene.
// No mode choice, no walkable street, no avatar. W1/W2/W5 are 3D rooms (lazy-loaded three.js); W3/W4/W6 are
// 2D scenes. Entering the current step goes through the game's nr(), patched to call CrossboundScenes.enter().
import {createSceneTransition,createSceneScope} from './transition.js';
import {stageScene,revealScene} from './motion.js';
import { track, userId } from '../../v2/records.js';
import { parseMode, variantFor, qualityFor, currentWorld, zoneStates, ROOMS_3D, VARIANT_KEY, QUALITY_KEY } from './logic.js';

const root = document.documentElement;
const local = {
  get: k => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* private mode */ } },
};
let webglCache = null;
function hasWebgl() {
  if (webglCache != null) return webglCache;
  try { const c = document.createElement('canvas'); webglCache = !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { webglCache = false; }
  return webglCache;
}
// Old dual-mode keys are no longer read (the mode choice is gone).
for (const k of ['crossbound-view-mode-v1', 'crossbound-world-classic-v1', 'crossbound-world-state-v1', 'crossbound-world-comfort-v1']) local.set(k, null);

const flag = parseMode(window.CROSSBOUND_WORLD, location.search);
const listeners = new Set();
const state = {
  snapshot: null, dialogOpen: false, campusPaused: false, scene: null, opening: false,
  variant: flag === 'off' ? 'classic' : flag === 'on' ? 'world' : (['world', 'classic'].includes(local.get(VARIANT_KEY)) ? local.get(VARIANT_KEY) : null),
};
const scenesOn = () => state.variant === 'world';
// The snapshot's inBusiness follows a ?start=1 URL flag, not what is on screen; the game screen itself is the signal.
const inGame = () => !!state.snapshot?.company && !!document.querySelector('main.campaign-playing');

const store = {
  snapshot: () => state.snapshot,
  get dialogOpen() { return state.dialogOpen || state.opening || !!transitionCover; },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  // Resolves with the first snapshot matching `test`, or null after `ms`.
  waitFor(test, ms = 1500) {
    if (state.snapshot && test(state.snapshot)) return Promise.resolve(state.snapshot);
    return new Promise(resolve => {
      const off = store.subscribe(s => { if (test(s)) { off(); clearTimeout(timer); resolve(s); } });
      const timer = setTimeout(() => { off(); resolve(null); }, ms);
    });
  },
  send(event, details = {}) { const c = state.snapshot?.company; if (c) track(c, event, details); },
  quality: () => local.get(QUALITY_KEY),
  setQuality: q => local.set(QUALITY_KEY, q),
};

// ---------- Scene host ----------
let pricingModule = null, worldModule = null, scenesModule = null, showroomModule = null, marketModule = null, studioModule = null, promotionModule = null, logisticsModule = null;

const loadLogistics = () => (logisticsModule ||= import('../logistics/host.js').catch(e => { logisticsModule = null; throw e; }));
const loadPromotion = () => (promotionModule ||= import('../promotion/host.js').catch(e => { promotionModule = null; throw e; }));
const loadPricing = () => (pricingModule ||= import('../pricing/host.js').catch(e => { pricingModule = null; throw e; }));
const loadStudio = () => (studioModule ||= import('../studio/host.js').catch(e => { studioModule = null; throw e; }));
const loadMarket = () => (marketModule ||= import('../market/host.js').catch(e => { marketModule = null; throw e; }));
const loadShowroom = () => (showroomModule ||= import('../showroom/showroom.js').catch(e => { showroomModule = null; throw e; }));
const loadWorld = () => (worldModule ||= import('./world.js').catch(e => { worldModule = null; throw e; }));
const loadScenes = () => (scenesModule ||= import('./scenes.js').catch(e => { scenesModule = null; throw e; }));
const idle = (fn, ms) => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: ms }) : setTimeout(fn, ms));

let transitionCover=null,transitionStarted=0,slowTimer;
function clearCover(){clearTimeout(slowTimer);transitionCover?.remove();transitionCover=null;delete root.dataset.v3Transition;}
function cover(id,error){
  clearCover();root.dataset.v3Transition=id;
  const names={w0:'市场研究所',w1:'选品展厅',w2:'定价财务室',w3:'商品页工作室',w4:'推广室',w5:'物流仓',w6:'财报结算厅'};
  const el=document.createElement('section');el.id='v3-transition';el.tabIndex=-1;el.setAttribute('aria-label','场景切换');
  const panel=document.createElement('div');panel.className='v3-transition-status';
  const label=document.createElement('p');label.setAttribute('role','status');label.textContent=error?`${names[id]}暂未加载完成`:`正在准备${names[id]}`;panel.append(label);
  if(error){el.classList.add('is-error','is-slow');const retry=document.createElement('button');retry.textContent='重新加载';retry.onclick=()=>openScene(id);panel.append(retry);}
  const back=document.createElement('button');back.textContent='返回园区';back.onclick=()=>closeScene();panel.append(back);el.append(panel);
  el.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();closeScene();}});
  document.body.append(el);transitionCover=el;el.focus({preventScroll:true});
  if(!error)slowTimer=setTimeout(()=>el.classList.add('is-slow'),2200);
}
function loadScene(id){
  if(ROOMS_3D.has(id)&&!hasWebgl())throw Error('当前设备无法打开3D场景');
  return id==='w5'?loadLogistics():id==='w2'?loadPricing():id==='w0'?loadMarket():id==='w3'?loadStudio():id==='w4'?loadPromotion():id==='w1'?loadShowroom():ROOMS_3D.has(id)?loadWorld():loadScenes();
}
function warmNext(id){
  const next={w0:'w1',w1:'w2',w2:'w3',w3:'w4',w4:'w5',w5:'w6',w6:'w0'}[id];
  if(next)idle(()=>{try{loadScene(next).catch(()=>{});}catch{}},1200);
}
const transitions=createSceneTransition({
  load:loadScene,
  mount(id,module,handlers){
    const scope=createSceneScope(store),sceneStore=scope.store;
    const quality=()=>qualityFor({webgl:true,coarse:matchMedia('(pointer: coarse)').matches,memory:navigator.deviceMemory,cores:navigator.hardwareConcurrency,width:innerWidth,stored:store.quality()}).quality;
    const scene=id==='w5'?module.mountLogistics({store:sceneStore,...handlers}):id==='w2'?module.mountPricing({store:sceneStore,quality:quality(),...handlers}):id==='w0'?module.mountMarket({store:sceneStore,...handlers}):id==='w3'?module.mountStudio({store:sceneStore,...handlers}):id==='w4'?module.mountPromotion({store:sceneStore,...handlers}):id==='w1'?module.mountShowroom({store:sceneStore,quality:quality(),...handlers}):ROOMS_3D.has(id)?module.mountRoom({store:sceneStore,room:id,quality:quality(),...handlers}):module.openScene({store:sceneStore,id,...handlers});
    const dispose=scene.dispose.bind(scene),suspend=scene.suspend?.bind(scene);
    scene.suspend=()=>{scope.suspend();suspend?.();if(scene.element)scene.element.inert=true;};
    scene.dispose=()=>{scope.suspend();dispose();};
    stageScene(scene);state.scene=scene;return scene;
  },
  reveal(scene,previous,signal){clearTimeout(slowTimer);transitionCover?.classList.remove('is-slow');return revealScene(scene,previous,signal);},
  paint:()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))),
  onPending(id){state.opening=true;transitionStarted=performance.now();cover(id);if(state.snapshot?.view==='decision')state.snapshot.actions?.close();setCampusPaused(true);},
  onReady(id){state.opening=false;root.dataset.v3Scene=id;clearCover();store.send('scene_enter',{scene:id,ms:Math.round(performance.now()-transitionStarted)});evaluate();warmNext(id);},
  onError(id,error){state.opening=false;state.scene=null;delete root.dataset.v3Scene;console.warn('[crossbound] scene failed to open',error);store.send('scene_load_failed',{scene:id});cover(id,error);},
  onClear(){state.opening=false;state.scene=null;delete root.dataset.v3Scene;clearCover();if(state.snapshot?.view==='decision')state.snapshot.actions?.close();setCampusPaused(state.dialogOpen);},
});
function closeScene(){transitions.close();}
function openScene(id){return transitions.open(id);}
function enter(){
  if(!scenesOn()||!inGame())return false;
  // Resume buttons can be inside achievements/tutorial dialogs, including when
  // their destination scene is already mounted underneath the native modal.
  if(state.snapshot?.view)state.snapshot.actions?.close();
  openScene(currentWorld(state.snapshot));return true;
}

// ---------- Public bridge used by the patched app ----------
Object.defineProperty(window, 'CrossboundView', {
  configurable: true,
  value: {
    get variant() { return state.variant; },
    get dualMode() { return false; },
    get campusPaused() { return state.campusPaused; },
    // Called from the app's layout effect (before paint).
    publish(snapshot) {
      state.snapshot = snapshot;
      if (!state.variant && snapshot?.company) {
        state.variant = variantFor(flag, userId(snapshot.company), local.get(VARIANT_KEY));
        if (flag === 'split') local.set(VARIANT_KEY, state.variant);
      }
      for (const fn of [...listeners]) fn(snapshot);
      evaluate();
    },
    snapshot: () => state.snapshot,
  },
});
Object.defineProperty(window, 'CrossboundScenes', {
  configurable: true,
  value: { enter, handlesDecision:scenesOn, open:openScene, close:closeScene, reset:closeScene, get current() { return transitions.id; } },
});

function setCampusPaused(paused) {
  if (state.campusPaused === paused) return;
  state.campusPaused = paused;
  window.dispatchEvent(new CustomEvent('crossbound:campus-pause', { detail: paused }));
}
// Map progress (REQ-053 §3): campus building labels get ✓ / ⚑ through data attributes the CSS reads.
function markCampus() {
  const s = state.snapshot;
  if (!scenesOn() || !inGame()) return;
  const zones = zoneStates(s);
  for (const label of document.querySelectorAll('.enterprise-campus-v18__label[data-zone]')) {
    const st = zones[label.dataset.zone] || 'upcoming';
    if (label.dataset.v3Progress !== st) label.dataset.v3Progress = st;
  }
}
// Render the chosen product's picture as soon as it is chosen, so the listing studio (W3) opens with it.
let warmedProduct = null;
function warmShot(s) {
  const c = s?.company, id = c?.productId;
  if (!id || id === warmedProduct || c.stage < 2 || c.stage > 3) return;
  warmedProduct = id;
  const p = s.engine?.products?.find(x => x.id === id);
  if (p) loadScenes().then(m => m.warmProductShot?.(p)).catch(() => {});
}
function evaluate() {
  warmShot(state.snapshot);
  const s = state.snapshot;
  root.dataset.v3Mode = scenesOn() ? 'scenes' : 'classic';
  if (!inGame() && (state.scene || state.opening || transitionCover)) closeScene();
  // After a commit the game opens the next step's panel itself (cr() → "decision"); with scenes on, the scene takes over.
  if (scenesOn() && inGame() && s.view === 'decision') {
    if(!state.scene&&!state.opening&&!transitionCover)openScene(currentWorld(s));
    // Commits still publish the legacy decision route; it must never become a visible dialog.
    s.actions?.close();
  }
  setCampusPaused(!!state.scene || state.opening || !!transitionCover || state.dialogOpen);
  markCampus();
}
// Warm the modules while the player reads the map, so the first room opens fast.
if (scenesOn()) idle(() => { loadScenes().catch(() => {}); if(currentWorld(state.snapshot)==='w0')loadMarket().catch(()=>{}); else if (hasWebgl()) (currentWorld(state.snapshot) === 'w2' ? loadPricing() : currentWorld(state.snapshot) === 'w1' ? loadShowroom() : loadWorld()).catch(() => {}); }, 3000);

// Engine dialogs (reports, rewards, advanced options) pause scene input and the campus.
function syncDialogState() {
  const open = (state.dialogs||[]).some(d=>d.open);
  if (open === state.dialogOpen) return;
  state.dialogOpen = open;
  for (const fn of [...listeners]) fn(state.snapshot);
  evaluate();
}
const dialogObserver = new MutationObserver(syncDialogState);
function watchDialog() {
  markCampus();
  const dialogs = [...document.querySelectorAll('dialog.campaign-dialog,dialog.cb-recovery')];
  if(dialogs.length===(state.dialogs||[]).length&&dialogs.every((d,i)=>d===state.dialogs[i]))return;
  dialogObserver.disconnect();
  state.dialogs = dialogs;
  for(const d of dialogs)dialogObserver.observe(d, { attributes: true, attributeFilter: ['open'] });
  syncDialogState();
}
new MutationObserver(watchDialog).observe(document.documentElement, { childList: true, subtree: true });
document.addEventListener('DOMContentLoaded', watchDialog);
watchDialog();
