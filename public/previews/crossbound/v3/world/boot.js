// REQ-051 boot (P0.1): tiny, always loaded, runs before the app module.
// - B-001/B-002: the view mode is decided before the first frame; a loading gate ("正在布置世界") covers the
//   page until the first 3D frame is on screen, so no flat UI ever flashes for 3D players.
// - M-001~M-007: first-time choice between 3D 世界 and 2D 经典, switching from anywhere in ≤1.5 s, shared progress.
// three.js + the world are lazy-loaded; 2D players never download them unless they switch.
import { track, userId } from '../../v2/records.js';
import {
  parseMode, variantFor, qualityFor, decideMode, recommend2D,
  VARIANT_KEY, CLASSIC_KEY, QUALITY_KEY, MODE_KEY, SAVE_KEY, PICKS_KEY,
} from './logic.js';

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
const coarse = () => matchMedia('(pointer: coarse)').matches;

// P0 opt-out flag → remembered 2D choice (M-001).
if (local.get(CLASSIC_KEY) === '1') { if (!local.get(MODE_KEY)) local.set(MODE_KEY, '2d'); local.set(CLASSIC_KEY, null); }

const flag = parseMode(window.CROSSBOUND_WORLD, location.search);
const listeners = new Set();
const state = {
  snapshot: null, world: null, loading: null, dialogOpen: false, campusPaused: false,
  variant: flag === 'off' ? 'classic' : flag === 'on' ? 'world' : (['world', 'classic'].includes(local.get(VARIANT_KEY)) ? local.get(VARIANT_KEY) : null),
  mode: null, choosing: false, fps: null, fallback: false, supplierTries: 0,
};
const dual = () => state.variant === 'world' && hasWebgl();
function decide() {
  if (!state.variant) return;
  const d = decideMode({ dual: dual(), stored: local.get(MODE_KEY), hasSave: !!local.get(SAVE_KEY), webgl: hasWebgl() });
  state.mode = d.mode;
  return d;
}
decide();

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
  switchMode: (to, source) => switchMode(to, source),
};

// ---------- World module: fetched early when 3D is likely, so the gate is short (B-004 ≤ 5 s) ----------
let worldModule = null;
const loadWorldModule = () => (worldModule ||= import('./world.js').catch(error => { worldModule = null; throw error; }));
const idle = (fn, ms) => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: ms }) : setTimeout(fn, ms));
if (state.mode === '3d' && dual()) loadWorldModule().catch(() => {});
// Undecided or 2D players warm the module cache when the page is idle, so a later switch stays under 1.5 s (M-003).
else if (dual()) idle(() => loadWorldModule().catch(() => {}), state.mode === null ? 2500 : 8000);

// ---------- Loading gate (B-001) ----------
let gate = null, gateBar = null, gateShownAt = 0;
function showGate(title = '正在布置世界') {
  if (!gate) {
    gate = document.createElement('div');
    gate.className = 'v3-gate';
    gate.setAttribute('role', 'progressbar');
    gate.setAttribute('aria-label', title);
    gate.innerHTML = '<div class="v3-gate-card"><div class="v3-gate-logo">CROSSBOUND</div><strong></strong><div class="v3-gate-track"><i></i></div><small>霓虹街区加载中 · 进度会自动接上</small></div>';
    gateBar = gate.querySelector('i');
    (document.body || root).append(gate);
    gateShownAt = performance.now();
  }
  gate.querySelector('strong').textContent = title;
  gate.classList.remove('is-out');
  root.dataset.v3Gate = 'on';
  setProgress(0.12);
}
function setProgress(p) { if (gateBar) gateBar.style.transform = `scaleX(${Math.max(0, Math.min(1, p))})`; }
function hideGate() {
  delete root.dataset.v3Gate;
  if (!gate) return;
  const g = gate; gate = null; gateBar = null;
  g.classList.add('is-out');
  setTimeout(() => g.remove(), 260);
}
if (root.dataset.v3Gate === 'boot') {
  // The inline head script already hid the page; take over with the real gate (or release it if 3D is off).
  if (state.mode === '3d' && dual()) showGate(); else delete root.dataset.v3Gate;
}

// ---------- Curtain for 3D → 2D (M-003) ----------
function curtain(on) {
  let c = document.querySelector('.v3-curtain');
  if (!c) { c = document.createElement('div'); c.className = 'v3-curtain'; document.body.append(c); }
  c.classList.toggle('is-on', on);
  return new Promise(r => setTimeout(r, on ? 200 : 10));
}

// ---------- First-time choice (M-001 / M-007) ----------
let choice = null;
// Sampled after the page settles (load work would read as a slow device), median frame time over ~1 s.
function probeFps() {
  if (state.fps != null || state.probing) return;
  state.probing = true;
  setTimeout(() => {
    const times = [];
    let last = 0;
    const step = now => {
      if (last) times.push(now - last);
      last = now;
      if (times.length < 50) requestAnimationFrame(step);
      else { times.sort((a, b) => a - b); state.fps = Math.round(1000 / times[times.length >> 1]); choice?.mark(); }
    };
    requestAnimationFrame(step);
  }, 700);
}
function showChoice() {
  if (choice) return;
  state.choosing = true;
  probeFps();
  const el = document.createElement('div');
  el.className = 'v3-choice';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-labelledby', 'v3-choice-title');
  el.innerHTML = `
    <div class="v3-choice-inner">
      <p class="v3-choice-kicker">CROSSBOUND · 开始经营</p>
      <h2 id="v3-choice-title">选择你的经营方式</h2>
      <p class="v3-choice-sub">两种方式规则、数据、进度完全一致，之后随时可以在顶部按钮或设置里切换。</p>
      <div class="v3-choice-cards">
        <button type="button" class="v3-choice-card" data-mode="3d">
          <img src="./v3/world/assets/mode-3d.webp" alt="" width="640" height="360" loading="eager">
          <span class="v3-choice-badge" hidden>推荐</span>
          <strong>3D 世界</strong>
          <span>像玩游戏一样在霓虹街区里走动，进展厅挑商品、和供应商谈。</span>
          <small>需要较好的设备 · 首次进入约加载 3 秒</small>
        </button>
        <button type="button" class="v3-choice-card" data-mode="2d">
          <img src="./v3/world/assets/mode-2d.webp" alt="" width="640" height="360" loading="eager">
          <span class="v3-choice-badge" hidden>推荐</span>
          <strong>2D 经典</strong>
          <span>熟悉的园区面板，信息一屏看全，点几下就能完成一步。</span>
          <small>任何设备都流畅 · 不晕 3D</small>
        </button>
      </div>
      <p class="v3-choice-note" hidden></p>
    </div>`;
  el.addEventListener('click', e => {
    const card = e.target.closest('.v3-choice-card');
    if (!card) return;
    const mode = card.dataset.mode;
    const recommended = recommend2D({ fps: state.fps, quality: qualityNow().quality }) ? '2d' : null;
    store.send('mode_choose', { mode, recommended, fps: state.fps });
    local.set(MODE_KEY, mode);
    state.mode = mode;
    closeChoice();
    evaluate();
  });
  choice = {
    el,
    // M-007: low-end devices get "推荐" on 2D; 3D stays available.
    mark() {
      const weak = recommend2D({ fps: state.fps, quality: qualityNow().quality });
      el.querySelector('[data-mode="2d"] .v3-choice-badge').hidden = !weak;
      const note = el.querySelector('.v3-choice-note');
      note.hidden = !weak;
      note.textContent = weak ? '检测到这台设备运行 3D 可能不够流畅，推荐 2D 经典；你仍然可以选 3D。' : '';
    },
  };
  choice.mark();
  document.body.append(el);
  // M-001: no preselection — focus the dialog itself, not either card.
  el.tabIndex = -1;
  el.focus({ preventScroll: true });
}
function closeChoice() {
  state.choosing = false;
  if (!choice) return;
  const el = choice.el; choice = null;
  el.classList.add('is-out');
  setTimeout(() => el.remove(), 220);
}

// ---------- Public bridge used by the patched app ----------
Object.defineProperty(window, 'CrossboundView', {
  configurable: true,
  value: {
    get variant() { return state.variant; },
    get dualMode() { return dual(); },
    get mode() { return state.mode; },
    get campusPaused() { return state.campusPaused; },
    switchMode: (to, source = 'header') => switchMode(to, source),
    // Called from the app's layout effect (before paint), so gate / choice decisions land in the same frame.
    publish(snapshot) {
      state.snapshot = snapshot;
      if (!state.variant && snapshot?.company) {
        state.variant = variantFor(flag, userId(snapshot.company), local.get(VARIANT_KEY));
        if (flag === 'split') local.set(VARIANT_KEY, state.variant);
        decide();
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
function qualityNow() {
  return qualityFor({ webgl: hasWebgl(), coarse: coarse(), memory: navigator.deviceMemory, cores: navigator.hardwareConcurrency, width: innerWidth, stored: store.quality() });
}

// Synchronous part first (gate / choice / dispose) so nothing flat is painted in between.
function evaluate() {
  const s = state.snapshot;
  const inBusiness = !!s?.inBusiness;
  root.dataset.v3Mode = dual() ? (state.mode || 'choose') : '2d';
  if (!inBusiness) {
    // Lobby / home: no world. A boot gate without a valid save (no business view) is released.
    if (state.world) disposeWorld();
    if (s && gate && !state.loading) hideGate();
    closeChoice();
  } else if (!dual() || state.fallback) {
    if (state.world) disposeWorld();
    if (!state.loading) hideGate();
    closeChoice();
    applyPendingSupplier();
  } else if (state.mode === null) {
    if (!state.world) { hideGate(); showChoice(); }
  } else if (state.mode === '3d') {
    if (!state.world && !state.loading) { showGate(); state.loading = mount({ restore: true }); }
  } else {
    if (state.world) disposeWorld();
    if (!state.loading) hideGate();
    applyPendingSupplier();
  }
  setCampusPaused(!!state.world || !!state.loading || state.dialogOpen || state.choosing);
}

async function mount({ restore, startedAt = performance.now(), source = 'load' }) {
  const q = qualityNow();
  let world = null;
  try {
    setProgress(0.3);
    const { mountWorld } = await loadWorldModule();
    if (state.mode !== '3d' || !state.snapshot?.inBusiness) return null;
    setProgress(0.62);
    world = mountWorld({ store, quality: q.quality, restore });
    state.world = world;
    root.dataset.v3World = 'on';
    if (coarse()) root.dataset.v3Touch = 'on';
    const ok = await Promise.race([world.ready.then(() => true), new Promise(r => setTimeout(() => r(false), 15000))]);
    if (!ok) throw new Error('first frame timeout');
    if (state.world !== world) return null;
    setProgress(1);
    // Keep the gate up for at least a beat so the bar doesn't blink on fast machines.
    const wait = Math.max(0, 260 - (performance.now() - gateShownAt));
    if (wait) await new Promise(r => setTimeout(r, wait));
    hideGate();
    world.focus();
    store.send('world_enter', { quality: q.quality, ms: Math.round(performance.now() - startedAt), source });
    return world;
  } catch (error) {
    console.warn('[crossbound] world failed to load', error);
    store.send('view_fallback', { reason: error?.message === 'first frame timeout' ? 'timeout' : 'load_failed' });
    if (world) { try { world.dispose(); } catch { /* ignore */ } }
    if (state.world === world) state.world = null;
    delete root.dataset.v3World;
    state.fallback = true;     // this page load only; the remembered choice stays 3D
    hideGate();
    return null;
  } finally {
    state.loading = null;
    evaluate();
  }
}

function disposeWorld() {
  const w = state.world;
  state.world = null;
  try { w?.dispose(); } catch (error) { console.warn('[crossbound] world dispose failed', error); }
  delete root.dataset.v3World;
  delete root.dataset.v3Touch;
}

// M-002/M-003: switch in ≤ 1.5 s, progress untouched (both views drive the same engine state).
async function switchMode(to, source = 'header') {
  if (!dual() || (to !== '2d' && to !== '3d')) return;
  const from = state.world ? '3d' : '2d';
  if (from === to || state.loading) return;
  const startedAt = performance.now();
  local.set(MODE_KEY, to);
  state.mode = to;
  state.fallback = false;
  store.send('mode_switch', { from, to, source });
  if (to === '2d') {
    await curtain(true);
    disposeWorld();
    evaluate();
    // Land on the current step: open the engine's own panel for it.
    const s = state.snapshot;
    if (s?.inBusiness && !s.settled && (s.company?.stage ?? 0) > 0) s.actions?.open?.();
    await curtain(false);
    store.send('mode_switch_done', { to, ms: Math.round(performance.now() - startedAt) });
  } else {
    closeChoice();
    showGate('正在进入 3D 世界');
    state.loading = mount({ restore: false, startedAt, source: 'switch' });
    setCampusPaused(true);
    const world = await state.loading;
    if (world) store.send('mode_switch_done', { to, ms: Math.round(performance.now() - startedAt) });
  }
}

// A supplier picked in the W1 showroom is applied once the engine reaches 定价备货 in 2D too.
function applyPendingSupplier() {
  const s = state.snapshot;
  if (!s?.company || s.company.stage !== 2 || state.supplierTries > 8) return;
  let picks = null;
  try { picks = JSON.parse(local.get(PICKS_KEY) || 'null'); } catch { picks = null; }
  if (!picks?.supplier || picks.key !== `${s.company.runSeed}:${s.company.round}` || picks.applied) return;
  if (s.supplier === picks.supplier) {
    local.set(PICKS_KEY, JSON.stringify({ ...picks, applied: true }));
    return;
  }
  state.supplierTries++;
  requestAnimationFrame(() => state.snapshot?.actions?.setSupplier?.(picks.supplier));
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
