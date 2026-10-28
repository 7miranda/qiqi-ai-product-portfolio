// REQ-053 §3 single mode: the campus is the one 2.5D headquarters map; each step opens its own full-screen scene.
// No mode choice, no walkable street, no avatar. W1/W2/W5 are 3D rooms (lazy-loaded three.js); W3/W4/W6 are
// 2D scenes. Entering the current step goes through the game's nr(), patched to call CrossboundScenes.enter().
import { track, userId } from '../../v2/records.js?v=01295b5f6d';
import { parseMode, variantFor, qualityFor, currentWorld, zoneStates, ROOMS_3D, VARIANT_KEY, QUALITY_KEY } from './logic.js?v=01295b5f6d';

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
  get dialogOpen() { return state.dialogOpen; },
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
let worldModule = null, scenesModule = null;
const loadWorld = () => (worldModule ||= import('./world.js?v=01295b5f6d').catch(e => { worldModule = null; throw e; }));
const loadScenes = () => (scenesModule ||= import('./scenes.js?v=01295b5f6d').catch(e => { scenesModule = null; throw e; }));
const idle = (fn, ms) => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: ms }) : setTimeout(fn, ms));

function closeScene() {
  const sc = state.scene;
  state.scene = null;
  try { sc?.dispose(); } catch (error) { console.warn('[crossbound] scene dispose failed', error); }
  delete root.dataset.v3Scene;
  evaluate();
}
// Opens the scene for `id`; returns false when it cannot (no WebGL for a 3D room), so the caller uses the panel.
async function openScene(id) {
  if (state.opening) return true;
  if (ROOMS_3D.has(id) && !hasWebgl()) return false;
  state.opening = true;
  const startedAt = performance.now();
  try {
    if (state.scene) closeScene();
    // The engine opened a panel on the way here (commit → next step); the scene replaces it.
    if (state.snapshot?.view) state.snapshot.actions?.close();
    const handlers = { onExit: () => closeScene(), onNext: next => next ? openScene(next) : closeScene() };
    if (ROOMS_3D.has(id)) {
      const { mountRoom } = await loadWorld();
      const quality = qualityFor({ webgl: true, coarse: matchMedia('(pointer: coarse)').matches, memory: navigator.deviceMemory, cores: navigator.hardwareConcurrency, width: innerWidth, stored: store.quality() }).quality;
      state.scene = mountRoom({ store, room: id, quality, ...handlers });
    } else {
      const { openScene: open2d } = await loadScenes();
      state.scene = open2d({ store, id, ...handlers });
    }
    root.dataset.v3Scene = id;
    store.send('scene_enter', { scene: id, ms: Math.round(performance.now() - startedAt) });
    return true;
  } catch (error) {
    console.warn('[crossbound] scene failed to open', error);
    store.send('view_fallback', { reason: 'scene_failed', scene: id });
    state.scene = null;
    return false;
  } finally {
    state.opening = false;
    evaluate();
  }
}

// Called by the patched nr(): open the current step's scene (REQ-056: the market too). Returns true when it took
// over; a scene that cannot open leaves the classic panel.
function enter() {
  if (!scenesOn() || !inGame()) return false;
  const id = currentWorld(state.snapshot);
  if (ROOMS_3D.has(id) && !hasWebgl()) return false;
  openScene(id).then(ok => { if (!ok) state.snapshot?.actions?.open?.(); });
  return true;
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
  value: { enter, open: id => openScene(id), close: () => closeScene(), get current() { return state.scene?.id || state.scene?.room || null; } },
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
function evaluate() {
  const s = state.snapshot;
  root.dataset.v3Mode = scenesOn() ? 'scenes' : 'classic';
  if (!inGame() && state.scene) closeScene();
  // After a commit the game opens the next step's panel itself (cr() → "decision"); with scenes on, the scene takes over.
  if (scenesOn() && inGame() && !state.scene && !state.opening && s.view === 'decision') {
    const id = currentWorld(s);
    if (!(ROOMS_3D.has(id) && !hasWebgl())) openScene(id);
  }
  setCampusPaused(!!state.scene || state.dialogOpen);
  markCampus();
}
// Warm the modules while the player reads the map, so the first room opens fast.
if (scenesOn()) idle(() => { loadScenes().catch(() => {}); if (hasWebgl()) loadWorld().catch(() => {}); }, 3000);

// Engine dialogs (reports, rewards, advanced options) pause scene input and the campus.
const dialogObserver = new MutationObserver(() => {
  const open = !!state.dialog?.open;
  if (open === state.dialogOpen) return;
  state.dialogOpen = open;
  for (const fn of [...listeners]) fn(state.snapshot);
  evaluate();
});
function watchDialog() {
  markCampus();
  const d = document.querySelector('dialog.campaign-dialog');
  if (d === state.dialog) return;
  dialogObserver.disconnect();
  state.dialog = d;
  if (d) dialogObserver.observe(d, { attributes: true, attributeFilter: ['open'] });
}
new MutationObserver(watchDialog).observe(document.documentElement, { childList: true, subtree: true });
document.addEventListener('DOMContentLoaded', watchDialog);
watchDialog();
