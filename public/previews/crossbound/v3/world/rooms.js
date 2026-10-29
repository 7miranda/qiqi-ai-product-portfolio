// P1 interiors: W2 定价财务室 (3D-023 ~ 3D-027) and W5 物流仓 (3D-037 / 3D-038 / 3D-040).
// Crates show the round's stock (3D-025: one stack = 100 units). REQ-052: at settlement the W5 crates
// ship out along the chosen belt, and the unsold ones lift away into a "+$X 按成本退回" counter.
import * as THREE from 'three';
import { PALETTE as P, toon, neon, block, mesh, textPlane, neonSign, addOutline } from './kit.js?v=13cef6754e';
import { crateLayout, settlementSplit, money, cashPlan } from './logic.js?v=13cef6754e';

const CRATE = 0.7, GAP = 0.18;
const ease = p => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const cash2 = n => `$${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// 24 x 18 m shell with the entrance gap in the south wall (same footprint as W1).
function shell(group, title, color) {
  const boxes = [], occluders = [], glowStrips = [];
  block(24, 0.2, 18, toon(0x1a2232), { y: -0.1, parent: group, shadow: false });
  for (let x = -11; x <= 11; x += 2) block(0.04, 0.01, 18, neon(0x223047), { x, y: 0.01, parent: group, shadow: false });
  const wallMat = toon(0x202a3c);
  occluders.push(
    block(24, 5.5, 0.3, wallMat, { y: 2.75, z: -9.15, parent: group }),
    block(0.3, 5.5, 18, wallMat, { x: -12.15, y: 2.75, parent: group }),
    block(0.3, 5.5, 18, wallMat, { x: 12.15, y: 2.75, parent: group }),
    block(10.4, 5.5, 0.3, wallMat, { x: -6.8, y: 2.75, z: 9.15, parent: group }),
    block(10.4, 5.5, 0.3, wallMat, { x: 6.8, y: 2.75, z: 9.15, parent: group }),
    block(3.2, 2, 0.3, wallMat, { y: 4.5, z: 9.15, parent: group }),
  );
  for (const [minX, maxX, minZ, maxZ] of [[-13, 13, -10, -9], [-13, -12, -10, 10], [12, 13, -10, 10], [-13, -1.6, 9, 10], [1.6, 13, 9, 10], [-13, 13, 10, 11]]) boxes.push({ minX, maxX, minZ, maxZ });
  for (const [x, z, w, d] of [[0, -8.95, 23.6, 0.06], [-11.95, 0, 0.06, 17.6], [11.95, 0, 0.06, 17.6]]) glowStrips.push(block(w, 0.08, d, neon(color, 0.8), { x, y: 5.3, z, parent: group, shadow: false }));
  const sign = neonSign(title, color, { width: 8, height: 1.3 });
  sign.position.set(0, 3.9, -8.95); group.add(sign);
  // Exit: green, the step is done by the time the player walks back out.
  const exitMat = neon(P.green);
  for (const [fx, fy, fw, fh] of [[-1.6, 1.75, 0.1, 3.5], [1.6, 1.75, 0.1, 3.5], [0, 3.5, 3.3, 0.1]]) block(fw, fh, 0.12, exitMat, { x: fx, y: fy, z: 8.95, parent: group, shadow: false });
  const exitSign = textPlane([{ text: '出口 EXIT', size: 0.5, color: '#f2f6f8' }], { width: 2.4, height: 0.6, bg: '#0a1220', border: '#5dff9a' });
  exitSign.position.set(0, 3.95, 8.98); exitSign.rotation.y = Math.PI; group.add(exitSign);
  const exit = { id: 'exit', kind: 'exit', x: 0, z: 8.1, y: 3.2, label: '回到街区', setHighlight: addOutline(exitSign) };
  return { boxes, occluders, glowStrips, exit };
}

// A crate yard: `stacks` piles laid out in rows of `cols`, each `height` crates tall.
function crateYard(parent, { x, z, cols = 4 }) {
  const yard = new THREE.Group(); yard.position.set(x, 0, z); parent.add(yard);
  const wood = toon(0xb98a4e), tape = toon(0xe8d9a8), ghost = new THREE.MeshBasicMaterial({ color: 0x8ff0ff, transparent: true, opacity: 0.42, depthWrite: false, toneMapped: false });
  const geo = new THREE.BoxGeometry(CRATE, CRATE, CRATE), tapeGeo = new THREE.BoxGeometry(CRATE + 0.01, 0.08, CRATE * 0.3);
  let piles = [];
  const slot = i => [(i % cols) * (CRATE + GAP), Math.floor(i / cols) * (CRATE + GAP)];
  function set(units, { ghosted = false } = {}) {
    for (const p of piles) yard.remove(p);
    piles = [];
    const { stacks, height } = crateLayout(units);
    for (let i = 0; i < stacks; i++) {
      const pile = new THREE.Group(); const [sx, sz] = slot(i); pile.position.set(sx, 0, sz); yard.add(pile);
      for (let h = 0; h < height; h++) {
        const c = new THREE.Mesh(geo, ghosted ? ghost : wood); c.position.y = CRATE / 2 + h * CRATE; c.castShadow = !ghosted; c.receiveShadow = true; pile.add(c);
        if (!ghosted) { const t = new THREE.Mesh(tapeGeo, tape); t.position.y = CRATE / 2 + h * CRATE + CRATE / 2; pile.add(t); }
      }
      piles.push(pile);
    }
    return piles;
  }
  const rows = 3;
  const footprint = { minX: x - 0.6, maxX: x + cols * (CRATE + GAP), minZ: z - 0.6, maxZ: z + rows * (CRATE + GAP) };
  return { yard, set, get piles() { return piles; }, footprint };
}

// Frame-driven tweens; each resolves its promise when finished.
function animator() {
  const list = [];
  let now = 0;
  return {
    tick(t) { now = t; for (let i = list.length - 1; i >= 0; i--) { const a = list[i]; a.start ??= now + a.delay; const p = Math.max(0, Math.min(1, (now - a.start) / a.dur)); if (now >= a.start) a.fn(p); if (p >= 1) { list.splice(i, 1); a.done(); } } },
    add(fn, dur, delay = 0) { return new Promise(done => list.push({ fn, dur, delay, done })); },
  };
}

// ---------- W2 定价财务室 ----------
const PLANS = ['pilot', 'scale', 'premium'];
// extra: { base, cash } — reference price for the high-price warning (3D-024) and cash for the share line (REQ-053 §4.3 ④).
function costLines(preview, plan, extra = {}) {
  if (!preview || !plan) return [{ text: '成本板 · COST BOARD', size: 0.16, color: '#52cadd' }, { text: '先拉动备货拉杆选一档', size: 0.13, color: '#c7d3dc', weight: 500 }];
  const spend = -(preview.cashDelta || 0), share = extra.cash ? Math.round(spend / extra.cash * 100) : null;
  const pricey = extra.base && preview.price >= extra.base * 1.5, gap = cashPlan(preview);
  return [
    { text: `成本板 · ${plan.name}`, size: 0.14, color: '#52cadd' },
    { text: `售价 $${preview.price} · 备货 ${preview.quantity} 件`, size: 0.13, color: '#f2f6f8' },
    { text: `单件成本 ${cash2(preview.unitCost)} · 交期 ${preview.leadDays ?? '-'} 天`, size: 0.11, color: '#c7d3dc', weight: 500 },
    { text: `本单采购 ${money(spend)}${share != null ? ` · 占现金 ${share}%` : ''}`, size: 0.11, color: share > 60 ? '#ff5a5a' : '#ffd34d', weight: 500 },
    pricey ? { text: '定太贵了，退货会变多', size: 0.12, color: '#ff5a5a' } : { text: `预计利润 ${money(preview.profit)}`, size: 0.13, color: (preview.profit || 0) >= 0 ? '#5dff9a' : '#ff5a5a' },
    // REQ-057: settlement cash is counted now, not discovered at shipping.
    gap ? { text: gap.short ? `连发货结算共需 ${money(preview.cashNeed)} · 还差 ${money(gap.short)}` : `连推广和发货结算共需约 ${money(preview.cashNeed)}`, size: 0.1, color: gap.short ? '#ff5a5a' : '#c7d3dc', weight: 500 } : null,
  ].filter(Boolean);
}

export function buildFinance({ snapshot }) {
  const group = new THREE.Group();
  const { boxes, occluders, glowStrips, exit } = shell(group, '定价财务室 · FINANCE', P.gold);
  const circles = [], interactables = [exit];
  const anim = animator();

  // Central console with the cost board (3D-023) and a lever with three notches (3D-025).
  block(4.2, 1, 1.4, toon(0x2a3448), { y: 0.5, z: -3, parent: group });
  const top = block(4.24, 0.06, 1.44, neon(P.gold, 0.9), { y: 1.02, z: -3, parent: group, shadow: false });
  const board = textPlane(costLines(null), { width: 4.4, height: 2.2, px: 220, bg: '#0a1220', border: '#ffd34d' });
  board.position.set(0, 2.6, -3.6); group.add(board);
  boxes.push({ minX: -2.2, maxX: 2.2, minZ: -3.8, maxZ: -2.2 });
  interactables.push({ id: 'console', kind: 'console', x: 0, z: -1.5, y: 2.2, label: '确认定价与备货', setHighlight: addOutline(top) });

  const leverBase = block(0.9, 0.9, 0.9, toon(0x2a3448), { x: 4.2, y: 0.45, z: -3, parent: group });
  const pivot = new THREE.Group(); pivot.position.set(4.2, 0.95, -3); group.add(pivot);
  mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.1, 8), toon(0xc7d3dc), { y: 0.55, parent: pivot });
  mesh(new THREE.SphereGeometry(0.14, 12, 10), neon(P.magenta), { y: 1.12, parent: pivot, shadow: false });
  const notch = textPlane([{ text: '小批 · 规模 · 溢价', size: 0.32, color: '#ff4fb3' }], { width: 1.6, height: 0.35, bg: '#0a1220' });
  notch.position.set(4.2, 0.6, -2.53); group.add(notch);
  boxes.push({ minX: 3.7, maxX: 4.7, minZ: -3.5, maxZ: -2.5 });
  interactables.push({ id: 'lever', kind: 'lever', x: 4.2, z: -1.6, y: 2.2, label: '拉动备货拉杆', setHighlight: addOutline(leverBase) });

  // Fine-tune terminal: the classic panel keeps custom price / quantity available.
  const term = block(0.8, 1.4, 0.5, toon(0x2a3448), { x: -4.4, y: 0.7, z: -3, parent: group });
  const termScreen = textPlane([{ text: '高级选项', size: 0.32, color: '#52cadd' }, { text: '账期·谈判·贷款', size: 0.2, color: '#c7d3dc', weight: 500 }], { width: 0.9, height: 0.6, px: 160, bg: '#0a1220', border: '#52cadd' });
  termScreen.position.set(-4.4, 1.75, -2.74); group.add(termScreen);
  boxes.push({ minX: -4.8, maxX: -4, minZ: -3.25, maxZ: -2.75 });
  interactables.push({ id: 'finetune', kind: 'finetune', x: -4.4, z: -1.8, y: 2.2, label: '高级选项：账期、谈判、备战、贷款', setHighlight: addOutline(term) });

  // Corner crate yard (3D-023): ghost crates preview the chosen plan, solid crates once bought.
  const yard = crateYard(group, { x: -9.6, z: 3 });
  boxes.push(yard.footprint);
  const c = snapshot?.company;
  const owned = c?.productId ? c.inventory?.[c.productId] || 0 : 0;
  yard.set(owned);

  let plan = null;
  const lever = { angle: 0, want: 0 };
  return {
    id: 'w2', group, boxes, circles, occluders, interactables,
    spawn: { x: 0, z: 6.8, yaw: 0 },
    viewSpot: { x: -3.5, z: 4.5, yaw: 1.2 },   // camera framing the crate yard while the stock drops in
    camera: { distance: 5 },
    get planned() { return !!plan; },
    setGlow(level) { for (const s of glowStrips) s.material.opacity = 0.35 + 0.55 * level; },
    targetFor() { return plan ? { x: 0, z: -2.2 } : { x: 4.2, z: -2.2 }; },
    // local: picks (unused); s: engine snapshot.
    update(local, s) {
      if (!s || s.company?.stage !== 2) return;
      const id = PLANS.includes(s.choice?.id) ? s.choice.id : null;
      if (id === plan?.id && s.preview?.quantity === plan.quantity && s.preview?.price === plan.price && s.company.cash === plan.cash) return;
      plan = id ? { id, name: (s.options || []).find(o => o.id === id)?.name || '', quantity: s.preview?.quantity, price: s.preview?.price, cash: s.company.cash } : null;
      const base = s.engine?.products?.find(p => p.id === s.company.productId)?.basePrice;
      board.userData.redraw(costLines(s.preview, plan, { base, cash: s.company.cash }));
      lever.want = id ? (PLANS.indexOf(id) - 1) * 0.6 : 0;
      yard.set(s.preview?.quantity || 0, { ghosted: true });
    },
    // 3D-027: confirmed → console turns green and the bought crates drop in.
    playStocked(units) {
      top.material.color.set(P.green);
      board.userData.redraw([{ text: '已确认 · 定价与备货', size: 0.2, color: '#5dff9a' }, { text: `${units} 件已下单`, size: 0.15, color: '#f2f6f8' }]);
      const piles = yard.set(units);
      const runs = piles.map((pile, i) => { pile.position.y = 4; return anim.add(p => { pile.position.y = 4 * (1 - ease(p)); }, 0.45, i * 0.06); });
      return Promise.all(runs);
    },
    tick(t, dt) {
      lever.angle += (lever.want - lever.angle) * Math.min(1, dt * 10);
      pivot.rotation.x = lever.angle;
      anim.tick(t);
    },
    drawMap(ctx, player) {
      const s = ctx.canvas.width, k = s / 30, cx = s / 2, cy = s / 2;
      const P2 = (x, z) => [cx + (x - player.x) * k, cy + (z - player.z) * k];
      ctx.clearRect(0, 0, s, s);
      ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 3; ctx.strokeRect(...P2(-12, -9), 24 * k, 18 * k);
      ctx.fillStyle = '#ffd34d'; ctx.fillRect(...P2(-2.1, -3.7), 4.2 * k, 1.4 * k);
      ctx.fillStyle = '#ff4fb3'; { const [x, y] = P2(4.2, -3); ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#b98a4e'; ctx.fillRect(...P2(-9.6, 3), 3.5 * k, 2.6 * k);
      const [ex, ey] = P2(0, 9); ctx.fillStyle = '#5dff9a'; ctx.fillRect(ex - 14, ey - 3, 28, 6);
      return { project: P2 };
    },
  };
}

// ---------- W5 物流仓 ----------
const BELTS = [{ id: 'economy', x: -6, color: P.cyan }, { id: 'standard', x: 0, color: P.lime }, { id: 'express', x: 6, color: P.magenta }];
const BELT_FRONT = -2, BELT_BACK = -8.6;

export function buildWarehouse({ snapshot }) {
  const group = new THREE.Group();
  const { boxes, occluders, glowStrips, exit } = shell(group, '物流仓 · WAREHOUSE', P.cyan);
  const circles = [], interactables = [exit];
  const anim = animator();
  const options = snapshot?.options || [];

  // Three outbound belts running into dock doors in the north wall (3D-037).
  const belts = new Map();
  for (const b of BELTS) {
    const o = options.find(x => x.id === b.id);
    const len = BELT_FRONT - BELT_BACK;
    block(1.6, 0.6, len, toon(0x2a3448), { x: b.x, y: 0.3, z: (BELT_FRONT + BELT_BACK) / 2, parent: group });
    const surface = block(1.4, 0.04, len, neon(0x16202e), { x: b.x, y: 0.62, z: (BELT_FRONT + BELT_BACK) / 2, parent: group, shadow: false });
    const edge = neon(b.color, 0.7);
    for (const dx of [-0.78, 0.78]) block(0.05, 0.06, len, edge, { x: b.x + dx, y: 0.64, z: (BELT_FRONT + BELT_BACK) / 2, parent: group, shadow: false });
    block(2, 2.6, 0.1, neon(0x05080f), { x: b.x, y: 1.3, z: -9, parent: group, shadow: false });   // dock door opening
    const sign = textPlane([
      { text: o?.name || b.id, size: 0.3, color: '#' + new THREE.Color(b.color).getHexString() },
      { text: o ? `$${o.costPerOrder}/单 · ${o.days} 天 · 退款 ${Math.round((o.refundRate || 0) * 100)}%` : '', size: 0.2, color: '#c7d3dc', weight: 500 },
    ], { width: 2.6, height: 0.9, px: 180, bg: '#0a1220', border: '#29414a' });
    sign.position.set(b.x, 3.4, -8.9); group.add(sign);
    // Moving slats show the belt running.
    const slats = [];
    for (let i = 0; i < 6; i++) slats.push(block(1.36, 0.02, 0.12, edge, { x: b.x, y: 0.65, z: BELT_FRONT - i * len / 6, parent: group, shadow: false }));
    boxes.push({ minX: b.x - 0.8, maxX: b.x + 0.8, minZ: BELT_BACK, maxZ: BELT_FRONT });
    belts.set(b.id, { ...b, o, surface, slats, edge });
    interactables.push({ id: `belt:${b.id}`, kind: 'belt', fulfillmentId: b.id, x: b.x, z: BELT_FRONT + 1, y: 2.2, label: `选「${o?.name || b.id}」发货`, enabled: !!o && !o.disabled, setHighlight: addOutline(surface) });
  }

  // Stock in the middle of the floor: what W2 bought this round.
  const c = snapshot?.company;
  const units = c?.productId ? c.inventory?.[c.productId] || 0 : 0;
  const yard = crateYard(group, { x: -1.7, z: 1.4 });
  yard.set(units);
  boxes.push(yard.footprint);
  const yardTag = textPlane([{ text: `本轮库存 ${units} 件`, size: 0.36, color: '#ffd34d' }], { width: 2.6, height: 0.5, bg: '#0a1220', border: '#29414a' });
  yardTag.position.set(-0.05, 3.1, 1.4); group.add(yardTag);

  // REQ-053 §4.6 first-mile terminal (east wall): sea / sea-air / air, picked here now that it is a fulfilment decision.
  const fmTerm = block(1, 1.5, 0.6, toon(0x2a3448), { x: 9.6, y: 0.75, z: 3.2, parent: group });
  const fmScreen = textPlane([{ text: '头程航线', size: 0.34, color: '#ffd34d' }, { text: '海运 · 海空 · 空运', size: 0.2, color: '#c7d3dc', weight: 500 }], { width: 1.2, height: 0.7, px: 160, bg: '#0a1220', border: '#ffd34d' });
  fmScreen.position.set(9.6, 1.95, 3.52); group.add(fmScreen);
  boxes.push({ minX: 9.1, maxX: 10.1, minZ: 2.9, maxZ: 3.5 });
  const firstMileHighlight = addOutline(fmTerm);

  // REQ-052 counter: appears above the yard while the unsold stock returns at cost.
  const counter = textPlane([{ text: '', size: 0.5 }], { width: 4.2, height: 1.1, px: 200, glow: true });
  counter.position.set(-0.05, 4.2, 1.6); counter.visible = false; group.add(counter);

  let chosen = null, running = 0;
  return {
    id: 'w5', group, boxes, circles, occluders, interactables, units, firstMileHighlight,
    spawn: { x: 0, z: 6.8, yaw: 0 },
    viewSpot: { x: 4, z: 4.5, yaw: 0.9 },   // yard and belts both in frame for the settlement
    camera: { distance: 5.5 },
    setGlow(level) { for (const s of glowStrips) s.material.opacity = 0.35 + 0.55 * level; },
    targetFor() { const b = belts.get(snapshot?.recommendedId) || belts.get('standard'); return { x: b.x, z: BELT_FRONT + 0.6 }; },
    update(local, s) {
      const id = s?.company?.stage === 4 ? s.choice?.id : chosen;
      if (id === chosen) return;
      chosen = id;
      for (const b of belts.values()) b.edge.opacity = b.id === id ? 1 : 0.45;
    },
    // REQ-052: ship the sold share down the chosen belt, return the rest at cost with a counting label.
    playSettlement({ beltId, unitsBefore, returnedUnits, returnedCash }) {
      const b = belts.get(beltId) || belts.get('standard');
      running = 1;
      const piles = yard.piles.slice();
      const { shipped } = settlementSplit(piles.length, unitsBefore, returnedUnits);
      const runs = [];
      piles.forEach((pile, i) => {
        const from = pile.getWorldPosition(new THREE.Vector3());
        group.attach(pile);
        if (i < shipped) {
          const start = new THREE.Vector3(b.x, 0.65, BELT_FRONT), end = new THREE.Vector3(b.x, 0.65, BELT_BACK + 0.4);
          runs.push(anim.add(p => {
            const k = ease(p);
            if (k < 0.35) pile.position.lerpVectors(from, start, k / 0.35).setY(from.y + Math.sin(k / 0.35 * Math.PI) * 0.8);
            else pile.position.lerpVectors(start, end, (k - 0.35) / 0.65);
            if (p >= 1) pile.visible = false;
          }, 1.8, i * 0.12));
        } else {
          const to = new THREE.Vector3(-0.05, 4, 1.6);
          runs.push(anim.add(p => {
            const k = ease(p);
            pile.position.lerpVectors(from, to, k);
            pile.scale.setScalar(Math.max(0.001, 1 - k));
          }, 1.1, shipped * 0.12 + 0.4 + (i - shipped) * 0.1));
        }
      });
      yardTag.userData.redraw([{ text: '库存清零 · 下一轮重新备货', size: 0.3, color: '#5dff9a' }]);
      if (returnedUnits > 0) {
        counter.visible = true;
        let shown = -1;
        runs.push(anim.add(p => {
          const v = Math.round(returnedCash * ease(p));
          if (v === shown && p < 1) return;
          shown = v;
          counter.userData.redraw([{ text: `+${money(p >= 1 ? returnedCash : v)}`, size: 0.5, color: '#5dff9a', weight: 800 }, { text: `未售出 ${returnedUnits} 件 · 按成本退回`, size: 0.2, color: '#f2f6f8' }]);
        }, 1.4, shipped * 0.12 + 0.6));
      }
      return Promise.all(runs).then(() => anim.add(() => {}, 1.2)).then(() => { running = 0; });
    },
    tick(t, dt) {
      const speed = running ? 2.2 : 0.6;
      for (const b of belts.values()) {
        const len = BELT_FRONT - BELT_BACK;
        for (const s of b.slats) { s.position.z -= dt * speed * (b.id === chosen ? 1.6 : 1); if (s.position.z < BELT_BACK) s.position.z += len; }
      }
      counter.position.y = 4.2 + Math.sin(t * 2) * 0.05;
      anim.tick(t);
    },
    drawMap(ctx, player) {
      const s = ctx.canvas.width, k = s / 30, cx = s / 2, cy = s / 2;
      const P2 = (x, z) => [cx + (x - player.x) * k, cy + (z - player.z) * k];
      ctx.clearRect(0, 0, s, s);
      ctx.strokeStyle = '#52cadd'; ctx.lineWidth = 3; ctx.strokeRect(...P2(-12, -9), 24 * k, 18 * k);
      for (const b of belts.values()) { ctx.fillStyle = '#' + new THREE.Color(b.color).getHexString(); ctx.fillRect(...P2(b.x - 0.8, BELT_BACK), 1.6 * k, (BELT_FRONT - BELT_BACK) * k); }
      ctx.fillStyle = '#b98a4e'; ctx.fillRect(...P2(-1.7, 1.4), 3.5 * k, 2.6 * k);
      const [ex, ey] = P2(0, 9); ctx.fillStyle = '#5dff9a'; ctx.fillRect(ex - 14, ey - 3, 28, 6);
      return { project: P2 };
    },
  };
}
