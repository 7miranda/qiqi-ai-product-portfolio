// REQ-051 boot: tiny, always loaded. Receives the engine snapshot, decides world vs classic,
// and lazy-loads three.js + the world only when the player is actually in the business view.
import { track, userId } from '../../v2/records.js';
import { parseMode, variantFor, qualityFor, VARIANT_KEY, CLASSIC_KEY, QUALITY_KEY } from './logic.js';

const root = document.documentElement;
const local = {
  get: k => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* private mode */ } },
};
function hasWebgl() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

const mode = parseMode(window.CROSSBOUND_WORLD, location.search);
const listeners = new Set();
const state = { snapshot: null, variant: mode === 'off' ? 'classic' : null, world: null, loading: false, dialogOpen: false, campusPaused: false, fallbackSent: false };

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
  goClassic() { local.set(CLASSIC_KEY, '1'); store.send('world_classic_on'); evaluate(); },
};

Object.defineProperty(window, 'CrossboundView', {
  configurable: true,
  value: {
    get variant() { return state.variant; },
    get campusPaused() { return state.campusPaused; },
    publish(snapshot) {
      state.snapshot = snapshot;
      if (!state.variant && snapshot?.company) {
        state.variant = variantFor(mode, userId(snapshot.company), local.get(VARIANT_KEY));
        if (mode === 'split') local.set(VARIANT_KEY, state.variant);
      }
      for (const fn of [...listeners]) fn(snapshot);
      evaluate();
    },
    snapshot: () => state.snapshot,
  },
});

function setCampusPaused(paused) {
  if (state.campusPaused === paused) return;
  state.campusPaused = paused;
  window.dispatchEvent(new CustomEvent('crossbound:campus-pause', { detail: paused }));
}

let classicButton = null;
function showClassicReturn(show) {
  if (show && !classicButton) {
    classicButton = document.createElement('button');
    classicButton.className = 'v3-classic-return';
    classicButton.textContent = '回到 3D 世界';
    classicButton.addEventListener('click', () => { local.set(CLASSIC_KEY, null); store.send('world_classic_off'); evaluate(); });
    document.body.append(classicButton);
  }
  if (classicButton) classicButton.hidden = !show;
}

async function evaluate() {
  const s = state.snapshot;
  const inBusiness = !!s?.inBusiness;
  const classic = local.get(CLASSIC_KEY) === '1';
  const eligible = inBusiness && state.variant === 'world';
  const q = qualityFor({ webgl: eligible ? hasWebgl() : true, coarse: matchMedia('(pointer: coarse)').matches, memory: navigator.deviceMemory, cores: navigator.hardwareConcurrency, width: innerWidth, stored: store.quality() });
  if (eligible && q.classic && !state.fallbackSent) { state.fallbackSent = true; store.send('view_fallback', { reason: q.reason }); }
  const want = eligible && !classic && !q.classic;
  showClassicReturn(eligible && classic && !q.classic && !state.dialogOpen);
  setCampusPaused(!!state.world || state.dialogOpen);
  if (want && !state.world && !state.loading) {
    state.loading = true;
    try {
      const { mountWorld } = await import('./world.js');
      if (!state.loading) return;
      state.world = mountWorld({ store, quality: q.quality });
      root.dataset.v3World = 'on';
      if (matchMedia('(pointer: coarse)').matches) root.dataset.v3Touch = 'on';
      store.send('world_enter', { quality: q.quality });
    } catch (error) {
      console.warn('[crossbound] world failed to load', error);
      store.send('view_fallback', { reason: 'load_failed' });
      local.set(CLASSIC_KEY, '1');
    } finally {
      state.loading = false;
      setCampusPaused(!!state.world || state.dialogOpen);
    }
  } else if (!want && state.world) {
    state.world.dispose();
    state.world = null;
    delete root.dataset.v3World;
    delete root.dataset.v3Touch;
    setCampusPaused(state.dialogOpen);
  }
}

// Engine dialogs (reports, rewards, the classic fallback panels) pause world input and the campus.
const dialogObserver = new MutationObserver(() => {
  const open = !!state.dialog?.open;
  if (open === state.dialogOpen) return;
  state.dialogOpen = open;
  for (const fn of [...listeners]) fn(state.snapshot);
  evaluate();
});
function watchDialog() {
  const d = document.querySelector('dialog.campaign-dialog');
  if (d === state.dialog) return;
  dialogObserver.disconnect();
  state.dialog = d;
  if (d) dialogObserver.observe(d, { attributes: true, attributeFilter: ['open'] });
}
new MutationObserver(watchDialog).observe(document.documentElement, { childList: true, subtree: true });
document.addEventListener('DOMContentLoaded', watchDialog);
watchDialog();
