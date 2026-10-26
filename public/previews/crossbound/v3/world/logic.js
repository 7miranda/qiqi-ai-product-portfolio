// Pure rules for the REQ-051 walkable world (3D-xxx). No DOM / three.js, so Node tests can import it.
// The engine stays authoritative: these helpers only map engine state to world state and back.

export const MODES = ['off', 'on', 'split'];
export const VARIANT_KEY = 'crossbound-world-variant-v1';
export const CLASSIC_KEY = 'crossbound-world-classic-v1';   // P0 opt-out flag, migrated to MODE_KEY = '2d'
export const QUALITY_KEY = 'crossbound-world-quality-v1';
export const MODE_KEY = 'crossbound-view-mode-v1';          // '3d' | '2d' (M-001: remembered choice)
export const STATE_KEY = 'crossbound-world-state-v1';       // 3D-078/080: scene + position per round
export const COMFORT_KEY = 'crossbound-world-comfort-v1';   // M-006
export const PICKS_KEY = 'crossbound-world-w1-v1';          // W1 product/supplier picks per round
export const SAVE_KEY = 'crossbound-company-v1';            // engine save written by the original game

// M-001 / M-007 / B-002: decide the view before the first frame.
// Returns { choose: show the choice screen, mode: '3d' | '2d', autoStart: skip the lobby into the business view }.
export function decideMode({ dual, stored, legacyClassic = false, hasSave = false, webgl = true }) {
  if (!dual || !webgl) return { choose: false, mode: '2d', autoStart: false };
  const mode = stored === '3d' || stored === '2d' ? stored : legacyClassic ? '2d' : null;
  if (!mode) return { choose: true, mode: null, autoStart: false };
  return { choose: false, mode, autoStart: mode === '3d' && hasSave };
}

// M-007: recommend (never force) 2D on weak devices or when the probe measures < 30 fps.
export function recommend2D({ fps, quality }) {
  return (Number.isFinite(fps) && fps < 30) || quality === 'low';
}

// M-006 comfort settings with clamped values.
export const COMFORT_DEFAULTS = Object.freeze({ sensitivity: 50, headBob: false, fov: 55 });
export function comfortFrom(raw) {
  const c = { ...COMFORT_DEFAULTS, ...(raw && typeof raw === 'object' ? raw : {}) };
  return {
    sensitivity: Math.max(10, Math.min(100, Math.round(Number(c.sensitivity) || 50))),
    headBob: c.headBob === true,
    fov: Math.max(55, Math.min(75, Math.round(Number(c.fov) || 55))),
  };
}

// B-003: restore the saved scene/position only for the same run+round and a scene that is still valid.
export function restoreSpot(saved, snapshot) {
  const c = snapshot?.company;
  if (!saved || !c || saved.key !== `${c.runSeed}:${c.round}`) return null;
  if (!Number.isFinite(saved.x) || !Number.isFinite(saved.z)) return null;
  if (INTERIORS.includes(saved.scene) && currentWorld(snapshot) !== saved.scene) return null;
  if (saved.scene !== 'hub' && !INTERIORS.includes(saved.scene)) return null;
  return { scene: saved.scene, x: saved.x, z: saved.z, yaw: Number.isFinite(saved.yaw) ? saved.yaw : 0 };
}

// F-001: recognisable model archetype from the catalog entry. Order matters (most specific first).
const ARCHETYPES = [
  ['earbuds', /耳机|EARBUD|HEADPHONE/],
  ['speaker', /音箱|SPEAKER/],
  ['fan', /风扇|桌扇|DESK FAN|DESK AIR/],
  ['powerbank', /POWER BANK|移动电源/],
  ['table', /\bTABLES?\b|TRAY|ISLAND|茶几|餐桌|餐台|边几/],
  ['organizer', /ORGANIZER|收纳套装|EVERYDAY READY/],
  ['care', /CARE SET|个护/],
  ['bottle', /TUMBLER|BOTTLE|杯/],
  ['charger', /POWER KIT|POWER DOCK|快充|充电/],
  ['mirror', /MIRROR|VANITY|镜/],
  ['bed', /\bBED\b|SLEEP|床/],
  ['desk', /DESK(?! LIGHT)|WORKSTATION|\bPOD\b|工位|工作台|拼装台/],
  ['bench', /BENCH|长凳/],
  ['lamp', /\bLIGHT\b|LAMP|灯/],
  ['chair', /CHAIR|ROCKER|椅/],
  ['sofa', /SOFA|LOUNGE|沙发/],
  ['canopy', /CANOPY|遮阳/],
  ['plant', /GROW STATION|种植/],
  ['cart', /\bCART\b|推车/],
  ['cabinet', /CABINET|SHELF|BOOKCASE|SIDEBOARD|WARDROBE|STORAGE|STATION|DOCK|RACK|WALL|柜|架/],
];
export function archetypeFor(product) {
  const text = `${product?.name || ''} ${product?.english || ''} ${product?.baseCategory || ''}`.toUpperCase();
  for (const [kind, re] of ARCHETYPES) if (re.test(text)) return kind;
  return 'parcel';
}

// Seven interior worlds (3D 方案 v2 §3). `stages` are the engine stages each world completes.
export const WORLDS = Object.freeze([
  { id: 'w1', name: '选品展厅', step: '挑商品、选供应商', stages: [1] },
  { id: 'w2', name: '定价财务室', step: '定价与备货', stages: [2] },
  { id: 'w3', name: '商品页工作室', step: '制作商品页并上架', stages: [3] },
  { id: 'w4', name: '推广室', step: '选推广渠道', stages: [3] },
  { id: 'w5', name: '物流仓', step: '选履约方式', stages: [4] },
  { id: 'w6', name: '财报结算厅', step: '安排下轮并结算', stages: [5, 6] },
  { id: 'w7', name: '荣誉墙展厅', step: '看成就、交反馈', stages: [] },
]);
// P0 builds the hub (stage 0 terminal) and W1; P1 adds W2 and W5 (REQ-052 crates). Other worlds fall back to the classic panel.
export const BUILT = new Set(['w1', 'w2', 'w5']);
const INTERIORS = ['w1', 'w2', 'w5'];

export function parseMode(config, search = '') {
  let override = null;
  try { override = new URLSearchParams(search).get('world'); } catch { override = null; }
  if (override === 'on' || override === 'off') return override;
  return MODES.includes(config) ? config : 'off';
}

// FNV-1a: stable, dependency-free 32-bit hash for a 50/50 split.
export function hash(text) {
  let h = 0x811c9dc5;
  for (const ch of String(text)) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}

export function variantFor(mode, id, stored) {
  if (mode === 'on') return 'world';
  if (mode === 'off') return 'classic';
  if (stored === 'world' || stored === 'classic') return stored;
  return hash(id) % 2 === 0 ? 'world' : 'classic';
}

// 3D-074 quality tiers. Only a missing WebGL forces the classic view (3D-076 keeps classic opt-in).
export function qualityFor({ webgl = true, coarse = false, memory, cores, width = 1440, stored } = {}) {
  if (!webgl) return { quality: null, classic: true, reason: 'no_webgl' };
  if (['high', 'mid', 'low'].includes(stored)) return { quality: stored, classic: false, reason: null };
  if ((memory && memory < 3) || (cores && cores < 4)) return { quality: 'low', classic: false, reason: null };
  if (coarse || width < 1024) return { quality: 'mid', classic: false, reason: null };
  return { quality: 'high', classic: false, reason: null };
}
// 3D-074 (revised 2026-10-25): no weather; tiers scale neon glow instead of rain.
export const QUALITY = Object.freeze({
  high: { shadows: true, glow: 1, pixelRatio: 1 },
  mid: { shadows: false, glow: 0.5, pixelRatio: 0.9 },
  low: { shadows: false, glow: 0, pixelRatio: 0.75 },
});
export function downgrade(quality) { return quality === 'high' ? 'mid' : 'low'; }

// 3D-074: <45 fps for 5 s lowers quality one step.
export function createFpsMonitor({ minFps = 45, windowMs = 5000 } = {}) {
  let slowSince = null;
  return function sample(now, frameMs) {
    if (frameMs > 250) { slowSince = null; return false; }
    if (1000 / frameMs < minFps) {
      if (slowSince === null) slowSince = now;
      if (now - slowSince >= windowMs) { slowSince = null; return true; }
      return false;
    }
    slowSince = null;
    return false;
  };
}

// Which world is "current" for an engine snapshot. Stage 3 covers W3 (listing) then W4 (promotion).
export function currentWorld(snapshot) {
  const stage = snapshot?.company?.stage ?? 0;
  if (stage === 0) return 'hub';
  if (stage === 1) return 'w1';
  if (stage === 2) return 'w2';
  if (stage === 3) return snapshot?.company?.currentListing ? 'w4' : 'w3';
  if (stage === 4) return 'w5';
  return 'w6';
}

// 3D-010 / 3D-079: door lights derived from the engine stage (corrected mapping, see 需求文档 附录).
export function doorStates(snapshot) {
  const current = currentWorld(snapshot);
  const settled = (snapshot?.company?.stage ?? 0) >= 6;
  const order = WORLDS.map(w => w.id);
  const at = current === 'hub' ? -1 : order.indexOf(current);
  return Object.fromEntries(WORLDS.map((w, i) => {
    if (w.id === 'w7') return [w.id, 'open'];
    // Settled rounds still point at the settlement hall: the report there is what starts the next round.
    if (settled) return [w.id, w.id === 'w6' ? 'current' : 'completed'];
    if (i < at) return [w.id, 'completed'];
    if (i === at) return [w.id, 'current'];
    return [w.id, 'locked'];
  }));
}

// 3D-055: one task sentence at a time.
export function taskFor(snapshot, local = {}) {
  const c = snapshot?.company;
  if (!c) return '';
  if (c.stage >= 6) return '本轮已结算，去财报结算厅看战报、开启下一轮';
  const world = currentWorld(snapshot);
  if (world === 'hub') return '去世界地图终端，选一个市场';
  if (world === 'w1') {
    if (local.inside !== 'w1') return '去选品展厅挑 1 件商品';
    if (!local.product) return '走到展位前，挑 1 件商品';
    if (!local.supplier) return '跟供应商谈谈，选一家';
    return '都选好了，正在前往定价财务室';
  }
  if (world === 'w2' && local.inside === 'w2') return local.planned ? '到中央控制台确认定价与备货' : '拉动备货拉杆，选一档备货';
  if (world === 'w5' && local.inside === 'w5') return '走到一条出货传送带前，选履约方式发货';
  const w = WORLDS.find(x => x.id === world);
  return `去${w.name}${w.step}`;
}

// 3D-025: one stack = 100 units; at most 12 stacks, beyond that the stacks only grow taller.
export const CRATE_UNITS = 100;
export function crateLayout(units) {
  const n = Math.max(0, Math.floor(units || 0));
  if (!n) return { stacks: 0, height: 0 };
  const stacks = Math.min(12, Math.ceil(n / CRATE_UNITS));
  return { stacks, height: n <= 12 * CRATE_UNITS ? 3 : Math.ceil(3 * n / (12 * CRATE_UNITS)) };
}

// REQ-052 settlement animation: how many of the visible stacks ship out vs. return at cost.
export function settlementSplit(stacks, unitsBefore, returnedUnits) {
  if (!stacks || !unitsBefore) return { shipped: 0, returned: 0 };
  const returned = returnedUnits > 0 ? Math.max(1, Math.min(stacks, Math.round(stacks * returnedUnits / unitsBefore))) : 0;
  return { shipped: stacks - returned, returned };
}

// Circle-vs-AABB push-out on the XZ plane (3D-014: no walking through walls, people or crates).
export function resolveCollisions(pos, radius, boxes, circles = []) {
  let { x, z } = pos;
  for (let pass = 0; pass < 2; pass++) {
    for (const b of boxes) {
      const cx = Math.max(b.minX, Math.min(x, b.maxX));
      const cz = Math.max(b.minZ, Math.min(z, b.maxZ));
      const dx = x - cx, dz = z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= radius * radius) continue;
      if (d2 > 1e-9) {
        const d = Math.sqrt(d2), push = radius - d;
        x += (dx / d) * push; z += (dz / d) * push;
      } else {
        // Centre inside the box: leave by the nearest face.
        const exits = [[b.minX - radius - x, 0], [b.maxX + radius - x, 0], [0, b.minZ - radius - z], [0, b.maxZ + radius - z]];
        exits.sort((a, c) => Math.hypot(...a) - Math.hypot(...c));
        x += exits[0][0]; z += exits[0][1];
      }
    }
    for (const c of circles) {
      const dx = x - c.x, dz = z - c.z, min = radius + c.r;
      const d = Math.hypot(dx, dz);
      if (d >= min || d < 1e-9) continue;
      x += (dx / d) * (min - d); z += (dz / d) * (min - d);
    }
  }
  return { x, z };
}

// 3D-016: nearest interactable within reach.
export function nearestInteractable(pos, items, reach = 2.5) {
  let best = null, bestD = reach;
  for (const item of items) {
    if (item.enabled === false) continue;
    const d = Math.hypot(pos.x - item.x, pos.z - item.z);
    if (d <= bestD) { best = item; bestD = d; }
  }
  return best;
}

// Showroom selection: recommended first, then round-robin across categories, current pick kept.
export function pickShowcase(options = [], { recommendedId, currentId, limit = 15 } = {}) {
  const usable = options.filter(o => !o.disabled);
  const out = [];
  const add = o => { if (o && !out.includes(o) && out.length < limit) out.push(o); };
  add(usable.find(o => o.id === recommendedId));
  add(usable.find(o => o.id === currentId));
  const byCat = new Map();
  for (const o of usable) { const k = o.category || 'other'; if (!byCat.has(k)) byCat.set(k, []); byCat.get(k).push(o); }
  const queues = [...byCat.values()];
  for (let i = 0; out.length < limit && queues.some(q => q.length > i); i++) for (const q of queues) add(q[i]);
  return out;
}

// Market fit stars (1-5) for the product stand board, from the catalog `fit` multipliers.
export function fitStars(product, marketId) {
  const f = product?.fit?.[marketId];
  if (!Number.isFinite(f)) return 3;
  return Math.max(1, Math.min(5, Math.round((f - 0.7) / 0.12)));
}

export function money(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);
}
