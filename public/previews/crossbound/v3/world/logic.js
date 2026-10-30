// Pure rules for the REQ-053 single-mode 2.5D view. No DOM / three.js, so Node tests can import it.
// The engine stays authoritative: these helpers only map engine state to scenes and back.

export const MODES = ['off', 'on', 'split'];
export const VARIANT_KEY = 'crossbound-world-variant-v1';
export const QUALITY_KEY = 'crossbound-world-quality-v1';
export const PICKS_KEY = 'crossbound-world-w1-v1';          // W1 product/supplier picks per round

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

// REQ-053 §3: one map, one full-screen scene per step. W1/W2/W5 are the 3D rooms (fixed camera, click to act);
// W0/W3/W4/W6 are 2D scenes. REQ-056: choosing the market (stage 0) is its own scene, opened from 市场研究.
export const WORLDS = Object.freeze([
  { id: 'w0', code: 'W0 · MARKET', name: '市场研究所', step: '选市场与平台', zone: 'market', render: '2d' },
  { id: 'w1', code: 'W1 · SHOWROOM', name: '选品展厅', step: '挑商品、选供应商', zone: 'product', render: '3d' },
  { id: 'w2', code: 'W2 · PRICING', name: '定价财务室', step: '定价与备货', zone: 'supply', render: '3d' },
  { id: 'w3', code: 'W3 · LISTING', name: '商品页工作室', step: '制作商品页并上架', zone: 'growth', render: '2d' },
  { id: 'w4', code: 'W4 · PROMOTION', name: '推广室', step: '选推广渠道', zone: 'growth', render: '2d' },
  { id: 'w5', code: 'W5 · FULFILMENT', name: '物流仓', step: '选头程与履约、发货', zone: 'fulfillment', render: '3d' },
  { id: 'w6', code: 'W6 · SETTLEMENT', name: '财报结算厅', step: '安排下轮并结算', zone: 'headquarters', render: '2d' },
]);
export const ROOMS_3D = new Set(WORLDS.filter(w => w.render === '3d').map(w => w.id));

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

// 3D-074 quality tiers for the 3D rooms.
export function qualityFor({ webgl = true, coarse = false, memory, cores, width = 1440, stored } = {}) {
  if (!webgl) return { quality: null, classic: true, reason: 'no_webgl' };
  if (['high', 'mid', 'low'].includes(stored)) return { quality: stored, classic: false, reason: null };
  if ((memory && memory < 3) || (cores && cores < 4)) return { quality: 'low', classic: false, reason: null };
  if (coarse || width < 1024) return { quality: 'mid', classic: false, reason: null };
  return { quality: 'high', classic: false, reason: null };
}
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

// The scene for an engine snapshot. Stage 3 is W3 (listing) until the page is published, then W4 (promotion).
export function currentWorld(snapshot) {
  const stage = snapshot?.company?.stage ?? 0;
  if (stage === 0) return 'w0';
  if (stage === 1) return 'w1';
  if (stage === 2) return 'w2';
  if (stage === 3) return snapshot?.company?.currentListing ? 'w4' : 'w3';
  if (stage === 4) return 'w5';
  return 'w6';
}

// Map progress (REQ-053 §3): every room is done, current or upcoming. A settled round keeps W6 current —
// its report is what starts the next round.
export function roomStates(snapshot) {
  const current = currentWorld(snapshot);
  const at = WORLDS.findIndex(w => w.id === current);
  return Object.fromEntries(WORLDS.map((w, i) => [w.id, i < at ? 'done' : i === at ? 'current' : 'upcoming']));
}
// Campus zones carry the same progress; the growth building holds both W3 and W4.
export function zoneStates(snapshot) {
  const rooms = roomStates(snapshot), out = {};
  for (const w of WORLDS) {
    const prev = out[w.zone], s = rooms[w.id];
    out[w.zone] = !prev ? s : prev === 'current' || s === 'current' ? 'current' : prev === 'done' && s === 'done' ? 'done' : 'upcoming';
  }
  return out;
}

// 3D-055: one task sentence at a time.
export function taskFor(snapshot, local = {}) {
  const c = snapshot?.company;
  if (!c) return '';
  if (c.stage >= 6) return '本轮已结算，看完结果就能开启下一轮';
  const world = currentWorld(snapshot);
  if (world === 'w0') return '点市场研究，选一个销售市场';
  if (world === 'w1') {
    if (!local.product) return '点一件商品拿起来看看，挑 1 件';
    if (!local.supplier) return '点左边的供应商，谈一家';
    return '都选好了，正在前往定价财务室';
  }
  if (world === 'w2') return local.planned ? '点中央控制台，调好售价和数量后确认' : '点备货拉杆，选一档备货';
  if (world === 'w5') return '点一条出货传送带，选履约方式发货';
  const w = WORLDS.find(x => x.id === world);
  return w ? `${w.name}：${w.step}` : '';
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

// Nearest interactable to a floor point (the pointer's hit on the room), within reach.
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
// REQ-056: no data is not "average" — it returns null and the board says 匹配度待测 instead of showing stars.
export function fitStars(product, marketId) {
  const f = product?.fit?.[marketId];
  if (!Number.isFinite(f)) return null;
  return Math.max(1, Math.min(5, Math.round((f - 0.7) / 0.12)));
}
// REQ-056 ④: a coarse tier (高 / 中 / 低) from the real fit, never the exact number; null when there is no data.
export function fitTier(product, marketId) {
  const stars = fitStars(product, marketId);
  if (stars == null) return null;
  return { stars, label: stars >= 4 ? '高' : stars >= 3 ? '中' : '低' };
}
// REQ-056 ②: expected visits against the market's capacity; past capacity, extra visits count half.
export function capacityBar(visitors, capacity) {
  if (!(capacity > 0)) return null;
  const v = Math.max(0, Math.round(visitors || 0)), ratio = v / capacity;
  return { visitors: v, capacity, ratio, fill: Math.min(1, ratio), over: v > capacity,
    text: v > capacity ? `预计到访 ${v.toLocaleString()} 超过容量 ${capacity.toLocaleString()}：再多流量也只能算一半` : `预计到访 ${v.toLocaleString()} / 容量 ${capacity.toLocaleString()}` };
}

// REQ-053 §4.5 ③: visits grow with the square root of budget; say what the next $1,000 buys.
export function budgetCurve(visitors, budget, step = 1000) {
  if (!(visitors > 0) || !(budget > 0)) return { extra: 0, points: [] };
  const at = b => Math.round(visitors * Math.sqrt(b / budget));
  const points = [];
  for (let b = 300; b <= 8000; b += 100) points.push([b, at(b)]);
  return { extra: Math.max(0, at(budget + step) - visitors), points };
}

export function money(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);
}

// REQ-057: what this round still has to pay before the sales money arrives next round, and the smallest
// bridge loan that covers a gap (whole thousands, $2,000–$200,000, the engine's loan rule).
export function cashPlan(preview) {
  if (!preview || !(preview.cashNeed > 0)) return null;
  const short = preview.cashShortfall || 0;
  const parts = [preview.settlementCash ? `发货结算约 ${money(preview.settlementCash)}` : null, preview.laterSpend ? `推广约 ${money(preview.laterSpend)}` : null].filter(Boolean);
  return {
    text: `本轮还要付约 ${money(preview.cashNeed)}${parts.length ? `（含${parts.join('、')}）` : ''}，销售款下轮开局才到账`,
    short, loan: short > 0 ? loanFor(short) : 0,
  };
}
export function loanFor(shortfall) {
  return Math.min(200000, Math.max(2000, Math.ceil(shortfall / 1000) * 1000));
}
