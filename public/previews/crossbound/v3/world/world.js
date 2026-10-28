// REQ-053 §3 3D room scenes: W1 选品展厅, W2 定价财务室, W5 物流仓 opened full-screen from the campus map.
// No walking and no camera follow — a fixed oblique camera with the near wall cut away, and the player clicks
// what they want to use. Player actions go through the engine's own select / commit calls; no rule is re-implemented.
import * as THREE from 'three';
import { FIRST_MILE } from '../../v2/catalog.js';
import { balanceRules } from '../../v11/balance.js';
import { WORLDS, QUALITY, PICKS_KEY, downgrade, createFpsMonitor, taskFor, nearestInteractable, pickShowcase, money, cashPlan } from './logic.js';
import { createUI, createSounds } from './ui.js';
import { buildShowroom, SUPPLIERS, STANDS } from './showroom.js';
import { buildFinance, buildWarehouse } from './rooms.js';
import { lightPillar, PALETTE, disposeTree } from './kit.js';

const FLY_MS = 400;                 // F-002: pick-up flight
const OPEN_MS = 900;                // F-003: open animation
const HOLD_SIZE = 1.1;              // held model size (m)
// Fixed oblique cameras (2.5D dollhouse): the whole 24 × 18 m room in frame, near wall hidden.
const VIEWS = {
  w1: { pos: [0, 15.5, 15], look: [0, 0, -0.8] },
  w2: { pos: [-2, 11.5, 11.5], look: [-2.5, 0, -0.5] },
  w5: { pos: [0, 15, 14.5], look: [0, 0, -1.5] },
};
const nextFrame = () => new Promise(r => requestAnimationFrame(() => r()));
const ease = p => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const readJSON = key => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };
const writeJSON = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage optional */ } };

// onExit(): back to the map. onNext(id): hand over to the next scene (a 2D scene the host opens).
export function mountRoom({ store, room: firstRoom, quality: initialQuality, onExit, onNext }) {
  const touch = matchMedia('(pointer: coarse)').matches;
  const root = document.createElement('div');
  root.id = 'v3-world';
  root.className = 'v3-scene-enter';
  document.body.append(root);
  const canvas = document.createElement('canvas');
  canvas.className = 'v3-canvas';
  canvas.tabIndex = 0;
  canvas.setAttribute('aria-label', '3D 房间：点击物件进行操作');
  root.append(canvas);
  const ui = createUI(root, { touch });
  const sound = createSounds();
  ui.onBack(() => leave());

  let quality = initialQuality || 'high';
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: quality === 'high', powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 200);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.night);
  scene.fog = new THREE.Fog(0x0b1020, 26, 48);

  // Lights: dim neon night. Only the key light casts shadows (性能红线).
  const hemi = new THREE.HemisphereLight(0x9aa8ff, 0x2a2238, 2.6);
  const ambient = new THREE.AmbientLight(0xffffff, 0.8);
  const key = new THREE.DirectionalLight(0xd2e0ff, 2.6);
  key.position.set(-14, 22, 12);
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -16, right: 16, top: 12, bottom: -12, far: 80 });
  key.shadow.bias = -0.0005;
  const neonA = new THREE.PointLight(PALETTE.magenta, 60, 22, 2);
  const neonB = new THREE.PointLight(PALETTE.cyan, 60, 22, 2);
  neonA.position.set(-6, 5, -4); neonB.position.set(6, 5, 2);
  scene.add(hemi, ambient, key, neonA, neonB);
  const pillar = lightPillar(PALETTE.gold);
  scene.add(pillar);

  let active = null, inside = null, transitioning = false, roomBusy = false, enteredAt = performance.now(), showPage = 0;
  const picks = loadPicks();

  function roundKey() { const c = store.snapshot()?.company; return c ? `${c.runSeed}:${c.round}` : null; }
  function loadPicks() {
    const saved = readJSON(PICKS_KEY);
    if (saved && saved.key === roundKey()) return { product: saved.product, supplier: saved.supplier };
    return { product: null, supplier: null };
  }
  function savePicks() { const k = roundKey(); if (k) writeJSON(PICKS_KEY, { key: k, ...picks }); }

  function applyQuality(next) {
    quality = next;
    const q = QUALITY[quality];
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2) * q.pixelRatio);
    renderer.shadowMap.enabled = q.shadows;
    key.castShadow = q.shadows;
    neonA.intensity = neonB.intensity = 36 + 24 * q.glow;   // 3D-074: neon strength follows the tier
    active?.setGlow?.(q.glow);
    scene.traverse(o => { if (o.material) o.material.needsUpdate = true; });
    resize();
  }

  const BUILD = {
    w1: () => {
      const s = store.snapshot();
      // Every product on sale, recommended + current pick first; 20 stands per batch, 「换一批」 shows the next.
      const all = pickShowcase(s?.options || [], { recommendedId: s?.recommendedId, currentId: picks.product, limit: Infinity });
      const pages = Math.max(1, Math.ceil(all.length / STANDS));
      showPage %= pages;
      const products = all.slice(showPage * STANDS, (showPage + 1) * STANDS);
      return buildShowroom({ products, recommendedId: s?.recommendedId, marketId: s?.company?.marketId, marketLabel: s?.market?.name, batch: { page: showPage, pages, total: all.length } });
    },
    w2: () => buildFinance({ snapshot: store.snapshot() }),
    w5: () => buildWarehouse({ snapshot: store.snapshot() }),
  };
  // Dollhouse cut: the south wall, exit frame and exit sign stand between the camera and the room.
  function cutaway(group) {
    const box = new THREE.Box3();
    for (const child of [...group.children]) {
      box.setFromObject(child);
      if (!box.isEmpty() && box.min.z > 8.6) child.visible = false;   // empty groups (a crate yard before stock) stay visible
    }
  }
  function setRoom(id) {
    if (active) { scene.remove(active.group); disposeTree(active.group); }
    active = BUILD[id]();
    inside = id;
    cutaway(active.group);
    active.interactables = active.interactables.filter(i => i.kind !== 'exit');
    if (id === 'w5') active.interactables.push({ id: 'firstMile', kind: 'firstMile', x: 8.6, z: 3.2, y: 2.4, label: '选头程航线', setHighlight: active.firstMileHighlight || (() => {}) });
    scene.add(active.group);
    active.setGlow?.(QUALITY[quality].glow);
    const v = VIEWS[id];
    camera.position.set(...v.pos); camera.lookAt(...v.look);
    resize();
    const w = WORLDS.find(x => x.id === id);
    ui.setTitle(`第 ${store.snapshot()?.company?.round ?? 1} 轮 · ${w.step}`, w.name);
    enteredAt = performance.now();
    refresh();
  }
  async function switchRoom(id) {
    if (transitioning) return;
    transitioning = true;
    sound.door();
    await ui.fade(true);
    setRoom(id);
    await nextFrame();
    await ui.fade(false);
    transitioning = false;
  }
  function leave() { if (!transitioning && !roomBusy) onExit?.(); }

  // ---------- Engine bridge ----------
  const engine = {
    act: () => store.snapshot()?.actions,
    async select(id) {
      engine.act()?.select(id);
      return store.waitFor(s => s.choice?.id === id, 1500);
    },
    // Same as clicking the option card: also resets that option's quantity / price / budget defaults.
    async choose(id) {
      const a = engine.act();
      (a?.choose || a?.select)?.(id);
      return store.waitFor(s => s.choice?.id === id, 1500);
    },
    async commit() {
      const before = store.snapshot()?.company?.stage;
      engine.act()?.commit();
      const after = await store.waitFor(s => s.company?.stage !== before, 2500);
      await nextFrame();
      if (after) closeNextPanel();
      return after;
    },
    // The engine resets the supplier when stage 2 starts, so re-apply until it sticks.
    async supplier(id) {
      for (let i = 0; i < 5; i++) {
        await nextFrame();
        store.snapshot()?.actions?.setSupplier(id);
        if (await store.waitFor(s => s.supplier === id, 400)) return true;
      }
      return false;
    },
  };
  // The engine opens the next step's panel right after a commit; keep it shut while a room is on screen.
  function closeNextPanel() { const s = store.snapshot(); if (s?.view) s.actions?.close(); }

  // ---------- Held product (F-002 / F-003): lifts off its stand toward the camera, opens, returns ----------
  let held = null;
  const v3a = new THREE.Vector3(), v3b = new THREE.Vector3();
  function liftProduct(stand) {
    if (!stand) return Promise.resolve();
    const obj = stand.model.group;
    stand.held = true;
    obj.getWorldPosition(v3a);
    const startScale = obj.getWorldScale(v3b).x;
    const to = v3a.clone().add(new THREE.Vector3(0, 1.7, 1.2));
    scene.attach(obj);
    return new Promise(resolve => {
      held = { stand, obj, phase: 'lift', t0: performance.now(), from: v3a.clone(), to, fromScale: startScale, toScale: HOLD_SIZE / 1.15, open: 0, done: resolve };
    });
  }
  function returnProduct() {
    if (!held) return Promise.resolve();
    const { stand, obj } = held;
    const target = new THREE.Vector3(); stand.holder.getWorldPosition(target);
    return new Promise(resolve => {
      Object.assign(held, { phase: 'return', t0: performance.now(), from: obj.position.clone(), to: target, fromScale: obj.scale.x, toScale: stand.holder.getWorldScale(v3b).x, openFrom: held.open, done: () => {
        stand.holder.attach(obj);
        obj.position.set(0, 0, 0); obj.scale.setScalar(1); obj.rotation.set(0, obj.rotation.y, 0);
        stand.model.open(0, 0, 0);
        stand.held = false;
        held = null;
        resolve();
      } });
    });
  }
  function updateHeld(now, t, dt) {
    if (!held) return;
    const { obj, stand } = held;
    const p = Math.min(1, (now - held.t0) / FLY_MS), k = ease(p);
    if (held.phase === 'lift') {
      obj.position.lerpVectors(held.from, held.to, k);
      obj.position.y += Math.sin(k * Math.PI) * 0.4;
      obj.scale.setScalar(THREE.MathUtils.lerp(held.fromScale, held.toScale, k));
      obj.rotation.y += dt * 6 * (1 - k);
      if (p >= 1) { held.phase = 'hold'; held.t0 = now; const done = held.done; held.done = null; done?.(); }
    } else if (held.phase === 'hold') {
      obj.position.copy(held.to); obj.position.y += Math.sin(t * 2) * 0.04;
      obj.rotation.y += dt * 0.6;
      held.open = Math.min(1, (now - held.t0) / OPEN_MS);
      stand.model.open(held.open, t, dt);
    } else if (held.phase === 'return') {
      obj.position.lerpVectors(held.from, held.to, k);
      obj.position.y += Math.sin(k * Math.PI) * 0.4;
      obj.scale.setScalar(THREE.MathUtils.lerp(held.fromScale, held.toScale, k));
      stand.model.open(held.openFrom * (1 - k), t, dt);
      if (p >= 1) held.done();
    }
  }

  // ---------- Interactions ----------
  function bubbleAt(text, x, z, y = 2.6) { const p = project(x, y, z); ui.bubble(text, p?.x, p?.y); }
  async function interact(item) {
    if (!item || ui.busy || transitioning || held || roomBusy) return;
    switch (item.kind) {
      case 'product': return productStand(item.productId);
      case 'shuffle': showPage++; return switchRoom('w1');
      case 'supplier': return supplierTalk(item.supplierId);
      case 'lever': return stockLever();
      case 'console': return financeConsole();
      case 'finetune': return advancedOptions();
      case 'belt': return beltTalk(item.fulfillmentId);
      case 'firstMile': return firstMileTerminal();
      default: return undefined;
    }
  }

  // ---------- W1 选品展厅 ----------
  async function productStand(productId) {
    const s = store.snapshot();
    const p = (s?.options || []).find(o => o.id === productId);
    if (!p) return;
    const stand = active.stand?.(productId);
    sound.door();
    await liftProduct(stand);          // F-002: 0.4 s flight, then the open animation runs
    const r = await ui.screen({
      side: true,
      kicker: `${p.categoryLabel || '商品'} · ${p.english || ''}`,
      title: p.name,
      body: p.sellingPoint || '',
      rows: [['参考价', `$${p.basePrice ?? '-'}`], ['进货成本', `$${p.cost ?? '-'}`], ['供货交期', p.supplierDays ? `${p.supplierDays} 天` : '-'], ...(stand?.recommended ? [['总部推荐', '★ 推荐']] : [])],
      actions: [{ label: '放回去', value: 'back' }, { label: '就它了', value: 'pick', primary: true }],
    });
    if (r?.action === 'pick') {
      if (picks.product !== productId) picks.supplier = null;   // quotes depend on the product
      picks.product = productId;
      savePicks();
      engine.act()?.select(productId);
      sound.confirm();
    } else if (r?.action === 'back' && picks.product === productId) {
      picks.product = null; picks.supplier = null; savePicks();
    }
    refresh();   // selection ring / ×1.2 first, so the model flies back to its final size
    await returnProduct();
    if (r?.action === 'pick') {
      if (picks.supplier) await finishShowroom();
      else bubbleAt('选好了！再点左边的供应商谈一家', -8, -1.5, 3);
    }
  }
  async function supplierTalk(supplierId) {
    const meta = SUPPLIERS.find(x => x.id === supplierId);
    if (!picks.product) {
      await ui.talk({ speaker: `供应商 · ${meta.name}`, lines: ['先挑一件商品吧，', '我再按那件商品给你报价。'] });
      return;
    }
    const quote = (store.snapshot()?.quotes?.(picks.product) || []).find(q => q.id === supplierId);
    const lines = quote
      ? [`我是${quote.name}。`, `单价 $${quote.unitCost}，起订 ${quote.moq} 件，交期 ${quote.leadDays} 天。`, quote.benefit]
      : [`我是${meta.name}，报价稍后给你。`];
    const choice = await ui.talk({ speaker: `供应商 · ${meta.name}`, lines, choices: [{ label: '再看看', value: 'later' }, { label: '选他', value: 'pick', primary: true }] });
    if (choice === 'pick') {
      picks.supplier = supplierId; savePicks(); sound.confirm(); refresh();
      if (picks.product) await finishShowroom();
    }
  }
  // Product + supplier chosen → commit and go straight into the next room (3D-067).
  async function finishShowroom() {
    if (transitioning || store.snapshot()?.company?.stage !== 1) return;
    ui.notice('商品和供应商都选好了，前往定价财务室…', 1800);
    await new Promise(r => setTimeout(r, 600));
    await engine.select(picks.product);
    const after = await engine.commit();
    if (!after) { sound.error(); ui.notice('这件商品现在不能选（现金不足），换一件试试', 3600); return; }
    await engine.supplier(picks.supplier);
    store.send('world_complete', { world: 'w1', dwell_ms: Math.round(performance.now() - enteredAt) });
    await switchRoom('w2');
    complete('选品展厅完成！进入定价财务室');
  }

  // ---------- W2 定价财务室 (3D-024 ~ 3D-027; REQ-053 §4.3: 售价、数量、供应商 3 个决策，精细调价不回面板) ----------
  async function stockLever() {
    const s = store.snapshot();
    if (s?.company?.stage !== 2) return;
    const list = (s.options || []).map(o => ({ id: o.id, title: o.name, badge: o.preview ? `采购 ${money(-o.preview.cashDelta)}` : '', detail: `${o.summary || ''}${o.preview ? ` 预计利润 ${money(o.preview.profit)}` : ''}`, disabled: o.disabled || o.preview?.affordable === false }));
    const r = await ui.screen({ kicker: 'STOCK LEVER · 备货拉杆', title: '这一轮备多少货？', body: '先选一档，再到中央控制台微调售价和数量。没卖完的货按成本退回（扣5%手续费）。', list, selected: s.choice?.id || s.recommendedId, actions: [{ label: '拉到这一档', value: 'set', primary: true, needsSelection: true }] });
    if (r?.action !== 'set' || !r.id) return;
    await engine.choose(r.id);
    sound.confirm(); refresh();
  }
  function priceBounds(s) {
    const p = s?.engine?.products?.find(x => x.id === s.company?.productId), base = p?.basePrice || s?.draft?.price || 40;
    return { base, min: Math.round(base * .7), max: Math.round(base * balanceRules(s.company).maxPrice) };
  }
  async function financeConsole() {
    let s = store.snapshot();
    if (s?.company?.stage !== 2) return;
    if (!s.choice?.id) { bubbleAt('先点右边的备货拉杆选一档', 4.2, -3, 2.6); return; }
    if (picks.supplier && s.supplier !== picks.supplier) { await engine.supplier(picks.supplier); s = store.snapshot(); }
    const { base, min, max } = priceBounds(s);
    // Live values go straight into the engine draft; the cost board behind the panel redraws with every change.
    const r = await ui.screen({
      side: true, kicker: 'CONSOLE · 中央控制台', title: '调售价和数量，然后确认',
      body: `参考价 $${base}。售价超过参考价 1.3 倍后，每贵 10% 退款率涨 12 点；左边成本板随时更新。`,
      fields: [
        { id: 'price', type: 'range', label: '售价', min, max, step: 1, unit: ' 美元' },
        { id: 'quantity', type: 'range', label: '备货数量', min: 200, max: 1600, step: 100, unit: ' 件' },
      ],
      values: { price: s.draft?.price ?? s.preview?.price ?? base, quantity: s.draft?.quantity ?? s.preview?.quantity ?? 400 },
      onChange: v => { const a = engine.act(); a?.setPrice?.(v.price); a?.setQuantity?.(v.quantity); },
      actions: [{ label: '高级选项', value: 'advanced' }, { label: '确认定价与备货', value: 'ok', primary: true }],
    });
    if (r?.action === 'advanced') return advancedOptions();
    if (r?.action !== 'ok') return;
    s = store.snapshot();
    if (s.preview?.affordable === false) { if (!s.preview.supplyBlockedReason && await offerLoan(s)) return; sound.error(); ui.notice(s.preview.supplyBlockedReason || `现金不够：还差 ${money(s.preview.cashShortfall)}，减少数量或换一档`, 4200); return; }
    engine.act()?.commit();
    if (!await store.waitFor(x => x.company?.stage !== 2, 2500)) { sound.error(); ui.notice('这一档暂时买不起，换一档或减少数量', 3600); }
  }
  // REQ-057: a cash gap (settlement included) is met before the spend, with the bridge loan offered right there.
  // Returns true when the player saw the offer (borrowed or chose to adjust), false when no loan is possible.
  async function offerLoan(s) {
    const plan = cashPlan(s.preview), c = s.company;
    if (!plan?.short || !s.engine || (c.v2?.loans || []).some(l => l.round === c.round)) return false;
    const r = await ui.screen({ side: true, kicker: 'CASH · 资金缺口', title: `现金还差 ${money(plan.short)}`,
      body: `${plan.text}。可以回去减少数量，或借过桥贷：下轮开局还 ${money(plan.loan * 1.12)}（含 12% 利息）。`,
      actions: [{ label: '回去调整', value: 'back' }, { label: `借 ${money(plan.loan)}`, value: 'loan', primary: true }] });
    if (r?.action !== 'loan') return true;
    engine.act()?.setCompany?.(s.engine.act(c, { type: 'loan', amount: plan.loan }));
    sound.confirm(); ui.notice(`已借入 ${money(plan.loan)}，下轮开局偿还`, 3000);
    return true;
  }
  // 账期、谈判、备战、测款、商标、贷款 stay in the classic panel as advanced options (REQ-053 §4.3 ③).
  function advancedOptions() {
    ui.notice('高级选项：账期、谈判、备战、测款、商标与贷款。确认后会回到这里', 3600);
    engine.act()?.open();
  }

  // ---------- W5 物流仓 (3D-038 / 3D-040; REQ-053 §4.6 头程移到这一步) ----------
  async function firstMileTerminal() {
    const s = store.snapshot();
    if (s?.company?.stage !== 4 || !s.engine) return;
    const current = s.engine.config(s.company).firstMile;
    const list = FIRST_MILE.map(f => {
      const p = s.engine.simulate(s.engine.configure(s.company, { firstMile: f.id }), 'mean');
      const rate = p ? Math.round(p.arrivedUnits / Math.max(1, p.unitsToBuy) * 100) : null;
      return { id: f.id, title: f.name, badge: p ? `头程 ${money(p.firstMileCost)}` : '', detail: `${f.detail} · 加上供应商备货共 ${p?.leadDays ?? '-'} 天，约 ${rate ?? '-'}% 本轮到货` };
    });
    const r = await ui.screen({ side: true, kicker: 'FIRST MILE · 头程航线', title: '货怎么运到海外仓？', body: '没到货的件：头程运费已付不退，货款结算时按成本退回（扣5%手续费）。', list, selected: current, actions: [{ label: '用这条航线', value: 'set', primary: true, needsSelection: true }] });
    if (r?.action !== 'set' || !r.id || r.id === current) return;
    engine.act()?.setCompany?.(s.engine.configure(s.company, { firstMile: r.id }));
    sound.confirm(); ui.notice(`头程改为${FIRST_MILE.find(f => f.id === r.id)?.name}`, 2400);
  }
  async function beltTalk(id) {
    const s = store.snapshot();
    if (s?.company?.stage !== 4) return;
    const o = (s.options || []).find(x => x.id === id);
    if (!o) return;
    await engine.choose(id); refresh();
    const pv = store.snapshot()?.preview || o.preview || {};
    const fm = s.engine ? FIRST_MILE.find(f => f.id === s.engine.config(s.company).firstMile) : null;
    const r = await ui.screen({
      side: true, kicker: `出货线 · ${o.english || ''}`, title: o.name, body: o.summary || '',
      rows: [['运费', `$${o.costPerOrder} / 单`], ['时效', `${o.days} 天`], ['退款比例', `${Math.round((o.refundRate || 0) * 100)}%`], ['头程', fm ? `${fm.name}（可在右侧终端改）` : '-'], ['预计订单', `${pv.orders ?? '-'} 单`], ['预计利润', money(pv.profit)], ['没卖完的货', '结算时按成本退回（扣5%）'], ...(pv.cashNeed ? [['发货要付', pv.cashShortfall ? `${money(pv.cashNeed)}（现金还差 ${money(pv.cashShortfall)}）` : money(pv.cashNeed)]] : [])],
      actions: [{ label: '再看看', value: 'back' }, { label: '选这条线发货', value: 'ship', primary: true }],
    });
    if (r?.action !== 'ship') return;
    const now = store.snapshot();
    if (now?.preview?.affordable === false && await offerLoan(now)) return;
    engine.act()?.commit();
    if (!await store.waitFor(x => x.company?.stage !== 4, 2500)) { sound.error(); ui.notice('发货前现金不够，先在高级选项里看资金方案', 3600); engine.act()?.open(); }
  }

  // Stage changes can come from the room or from the classic panel; both finish the room the same way.
  let lastStage = store.snapshot()?.company?.stage;
  function watchStage() {
    const s = store.snapshot(), stage = s?.company?.stage;
    if (stage === lastStage) return;
    const prev = lastStage; lastStage = stage;
    if (inside === 'w2' && prev === 2 && stage === 3) financeDone(s);
    if (inside === 'w5' && prev === 4 && stage >= 5) warehouseDone(s);
  }
  async function financeDone(s) {
    roomBusy = true;
    closeNextPanel();
    const units = s.company.inventory?.[s.company.productId] || 0;
    sound.confirm();
    await active.playStocked(units);
    store.send('world_complete', { world: 'w2', dwell_ms: Math.round(performance.now() - enteredAt) });
    complete(`备货已确认：${units} 件，前往商品页工作室`);
    await new Promise(r => setTimeout(r, 900));
    roomBusy = false;
    onNext?.('w3');
  }
  async function warehouseDone(s) {
    roomBusy = true;
    closeNextPanel();
    const report = s.company.report || {};
    sound.door();
    await active.playSettlement({ beltId: s.choice?.id || s.company.fulfillmentPlanId, unitsBefore: active.units, returnedUnits: report.stockReturnUnits || 0, returnedCash: report.stockReturn || 0 });
    store.send('world_complete', { world: 'w5', dwell_ms: Math.round(performance.now() - enteredAt) });
    complete(report.stockReturn ? `已发货 ${report.orders ?? ''} 单，未售出 ${report.stockReturnUnits} 件按成本退回 ${money(report.stockReturn)}` : `已发货 ${report.orders ?? ''} 单`);
    await new Promise(r => setTimeout(r, 1200));
    roomBusy = false;
    onNext?.('w6');
  }
  function complete(message) { ui.flash(); sound.complete(); ui.notice(message, 3200); refresh(); }

  // ---------- HUD / task / pillar ----------
  function localState() { return { inside, ...picks, planned: !!active?.planned }; }
  function refresh() {
    const s = store.snapshot();
    if (!s?.company || !active) return;
    active.update(picks, s);
    ui.setMoney(money(s.company.cash), s.profitText ? `本轮利润 ${s.profitText}` : '本轮利润 待结算');
    ui.setTask(taskFor(s, localState()));
    const target = active.targetFor(picks);
    pillar.visible = !!target && !roomBusy;
    if (target) pillar.position.set(target.x, 0, target.z);
  }
  const unsubscribe = store.subscribe(() => { refresh(); watchStage(); if (roomBusy) closeNextPanel(); });

  // ---------- Pointer: hover shows what a click does, click acts (REQ-053 §3: no WASD, no camera motion) ----------
  const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2(), tmp = new THREE.Vector3();
  let focus = null, pointer = null;
  function pick(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(active.group.children, true).filter(h => h.object.visible && !h.object.userData.noOutline);
    for (const h of hits) { const item = nearestInteractable({ x: h.point.x, z: h.point.z }, active.interactables, 2.2); if (item) return item; }
    return null;
  }
  canvas.addEventListener('pointermove', e => { pointer = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener('pointerleave', () => { pointer = null; });
  canvas.addEventListener('click', e => { if (ui.busy || store.dialogOpen) return; const item = pick(e.clientX, e.clientY); if (item) interact(item); });
  const onKey = e => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    const k = e.key.toLowerCase();
    if (k === 'escape') { if (ui.busy) ui.closeActive(); else if (!store.dialogOpen) leave(); return; }
    if (ui.busy && (k === 'enter' || k === ' ')) {
      if (ui.hasChoices) return;          // let Enter activate the focused button
      e.preventDefault(); ui.advance();   // otherwise advance the dialog line (and don't click the next button)
    }
  };
  addEventListener('keydown', onKey);

  function resize() {
    const w = root.clientWidth || innerWidth, h = root.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Fit the room's full width (≈ 26 m incl. the supplier booths) on narrow screens too; never zoom in past 52°.
    const v = VIEWS[inside], dist = v ? Math.hypot(v.pos[0] - v.look[0], v.pos[1] - v.look[1], v.pos[2] - v.look[2]) : 21;
    const halfH = Math.atan(13.5 / dist), fitV = 2 * Math.atan(Math.tan(halfH) / camera.aspect) * 180 / Math.PI;
    camera.fov = Math.min(84, Math.max(52, fitV));
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);
  function project(x, y, z) {
    tmp.set(x, y, z).project(camera);
    if (tmp.z > 1) return null;
    return { x: (tmp.x + 1) / 2 * root.clientWidth, y: (1 - tmp.y) / 2 * root.clientHeight };
  }

  // Mirror the campus 消息提醒 (same rules, same dismiss state, same actions) so rooms show 总部来电 / 新成就 too.
  function syncInbox() {
    if (store.dialogOpen || ui.busy) return;
    const rows = [...document.querySelectorAll('.v11-notification-dock .v11-notification-row')];
    const keyOf = row => { const link = row.querySelector('.v11-notification-link'); return `${link?.querySelector('strong')?.textContent || ''}|${link?.querySelector('small')?.textContent || ''}`; };
    // React replaces the dock's nodes on re-render, so find the live row at click time (a stored node may be detached).
    // The game's Button renders <span class=…><button>…</button></span>: the click must go to the inner button.
    const press = (row, cls) => { const el = row?.querySelector(cls); (el?.matches('button') ? el : el?.querySelector('button'))?.click(); };
    const live = id => [...document.querySelectorAll('.v11-notification-dock .v11-notification-row')].find(row => keyOf(row) === id);
    const items = rows.map(row => {
      const id = keyOf(row), [title, detail] = id.split('|');
      return { id, title, detail,
        open: () => { store.send('world_inbox_open', { title }); press(live(id), '.v11-notification-link'); },
        dismiss: row.querySelector('.v11-notification-dismiss') ? () => press(live(id), '.v11-notification-dismiss') : null };
    });
    ui.setMessages(items);
  }

  // ---------- Loop ----------
  const clock = new THREE.Clock();
  const fps = createFpsMonitor();
  let raf = 0, inboxTimer = 0, last = performance.now(), rendered = 0, markReady;
  const ready = new Promise(r => { markReady = r; });
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (document.hidden) { last = now; return; }
    const dt = Math.min(0.05, (now - last) / 1000), frameMs = now - last; last = now;
    if (rendered > 2 && fps(now, frameMs) && quality !== 'low') { const q = downgrade(quality); applyQuality(q); store.setQuality(q); store.send('world_quality_down', { quality: q }); }
    const t = clock.getElapsedTime();
    active.tick(t, dt);
    updateHeld(now, t, dt);
    pillar.userData.tick(t);
    const paused = ui.busy || store.dialogOpen || transitioning || !!held || roomBusy;
    const near = paused || !pointer ? null : pick(pointer.x, pointer.y);
    if (near !== focus) { focus?.setHighlight?.(false); near?.setHighlight?.(true); focus = near; canvas.style.cursor = near ? 'pointer' : ''; }
    if (focus) { const p = project(focus.x, focus.y ?? 2.4, focus.z); ui.showPrompt(p ? focus.label : null, p?.x, p?.y, () => interact(focus)); }
    else ui.showPrompt(null);
    if (now - inboxTimer > 500) { inboxTimer = now; syncInbox(); }
    renderer.render(scene, camera);
    if (++rendered === 2) markReady();
  }

  applyQuality(quality);
  setRoom(firstRoom);
  try { renderer.compile(scene, camera); } catch { /* optional */ }
  raf = requestAnimationFrame(frame);

  // Test / QA hooks (read-only state + direct interaction); harmless in production.
  window.CrossboundWorld = {
    get state() { return { scene: inside, picks: { ...picks }, quality, held: held ? { id: held.stand.p.id, phase: held.phase, open: held.open } : null, focus: focus?.id || null, task: taskFor(store.snapshot(), localState()), frames: rendered, roomBusy }; },
    interactWith: id => interact(active.interactables.find(i => i.id === id)),
    pointAt(id) { const i = active.interactables.find(x => x.id === id); return i ? project(i.x, 0.5, i.z) : null; },
    // Screen positions of visible meshes inside a world-space box (QA: "are the crates on screen?").
    visibleIn(box) { const out = []; active.group.traverse(o => { if (!o.isMesh || !o.visible) return; o.getWorldPosition(tmp); if (tmp.x >= box.minX && tmp.x <= box.maxX && tmp.z >= box.minZ && tmp.z <= box.maxZ) out.push({ ...project(tmp.x, tmp.y, tmp.z), wx: +tmp.x.toFixed(2), wy: +tmp.y.toFixed(2), wz: +tmp.z.toFixed(2), mat: o.material.type, op: o.material.opacity, parentVisible: o.parent?.visible, chain: (() => { let p = o, n = 0; while (p && p !== active.group) { if (!p.visible) return "hidden@" + n; p = p.parent; n++; } return "ok"; })() }); }); return out; },
  };

  return {
    ready,
    get room() { return inside; },
    focus() { canvas.focus({ preventScroll: true }); },
    dispose() {
      cancelAnimationFrame(raf);
      unsubscribe();
      removeEventListener('keydown', onKey); removeEventListener('resize', resize);
      ui.closeActive();
      if (active) disposeTree(active.group);
      disposeTree(scene);
      renderer.dispose();
      renderer.forceContextLoss();
      ui.destroy();
      root.remove();
      delete window.CrossboundWorld;
    },
  };
}
