// W1 选品展厅 (3D-018 ~ 3D-022): product stands, three supplier booths, exit door.
// F-001: each stand carries a recognisable product model; F-004: selected = steady green ring, ×1.2 and a floating "已选" tag.
import * as THREE from 'three';
import { PALETTE as P, toon, neon, block, mesh, textPlane, neonSign, addOutline, character } from './kit.js?v=13cef6754e';
import { fitTier } from './logic.js?v=13cef6754e';
import { productModel } from './products.js?v=13cef6754e';

const COLS = [-5.5, -2, 1.5, 5, 8.5];
const ROWS = [-6, -2.5, 1, 4.5];
export const STANDS = COLS.length * ROWS.length;   // products per batch; 「换一批」 pages through the rest
export const SUPPLIERS = [
  { id: 'standard', name: '常规供货', z: -5.5, color: P.cyan },
  { id: 'fast', name: '现货快补', z: -1.5, color: P.magenta },
  { id: 'factory', name: '工厂排产', z: 2.5, color: P.lime },
];
const CATEGORY_COLOR = { home: P.cyan, electronics: P.violet, lifestyle: P.magenta, future: P.gold, furniture: P.lime, outdoor: 0xff9f43 };
const MODEL_SIZE = 1.15;
const MODEL_Y = 0.92;

function boardLines(p, marketLabel, marketId, { selected, recommended }) {
  // REQ-056 ④: a tier from real fit data; no data is 匹配度待测, never a default middle rating.
  const tier = fitTier(p, marketId);
  return [
    { text: `${recommended ? '★推荐 · ' : ''}${p.name}`, size: 0.2, color: selected ? '#5dff9a' : '#f2f6f8' },
    { text: `参考价 $${p.basePrice ?? '-'} · 成本 $${p.cost ?? '-'}`, size: 0.15, color: '#c7d3dc', weight: 500 },
    tier
      ? { text: `${marketLabel || '本市场'}匹配度 ${tier.label} ${'★'.repeat(tier.stars)}${'☆'.repeat(5 - tier.stars)}`, size: 0.15, color: '#ffd34d', weight: 500 }
      : { text: '匹配度待测 · 首次测款免费', size: 0.15, color: '#9fb0ba', weight: 500 },
  ];
}

// batch: { page, pages, total } for the 「换一批」 terminal.
export function buildShowroom({ products, recommendedId, marketId, marketLabel, batch = { page: 0, pages: 1, total: products.length } }) {
  const group = new THREE.Group();
  const boxes = [], circles = [], occluders = [], interactables = [], ticks = [];
  const solid = (minX, maxX, minZ, maxZ) => boxes.push({ minX, maxX, minZ, maxZ });

  // Shell 24 x 18 m, exit gap in the south wall.
  block(24, 0.2, 18, toon(0x1a2232), { y: -0.1, parent: group, shadow: false });
  for (let x = -11; x <= 11; x += 2) block(0.04, 0.01, 18, neon(0x223047), { x, y: 0.01, parent: group, shadow: false });
  const wallMat = toon(0x202a3c);
  const walls = [
    block(24, 5.5, 0.3, wallMat, { y: 2.75, z: -9.15, parent: group }),
    block(0.3, 5.5, 18, wallMat, { x: -12.15, y: 2.75, parent: group }),
    block(0.3, 5.5, 18, wallMat, { x: 12.15, y: 2.75, parent: group }),
    block(10.4, 5.5, 0.3, wallMat, { x: -6.8, y: 2.75, z: 9.15, parent: group }),
    block(10.4, 5.5, 0.3, wallMat, { x: 6.8, y: 2.75, z: 9.15, parent: group }),
    block(3.2, 2, 0.3, wallMat, { y: 4.5, z: 9.15, parent: group }),
  ];
  occluders.push(...walls);
  solid(-13, 13, -10, -9); solid(-13, -12, -10, 10); solid(12, 13, -10, 10); solid(-13, -1.6, 9, 10); solid(1.6, 13, 9, 10); solid(-13, 13, 10, 11);
  const glowStrips = [];
  for (const [x, z, w, d] of [[0, -8.95, 23.6, 0.06], [-11.95, 0, 0.06, 17.6], [11.95, 0, 0.06, 17.6]]) glowStrips.push(block(w, 0.08, d, neon(P.violet, 0.8), { x, y: 5.3, z, parent: group, shadow: false }));
  const title = neonSign('选品展厅 · SHOWROOM', P.cyan, { width: 8, height: 1.3 });
  title.position.set(0, 3.9, -8.95); group.add(title);

  // Product stands.
  const stands = new Map();
  products.slice(0, COLS.length * ROWS.length).forEach((p, i) => {
    const x = COLS[i % COLS.length], z = ROWS[Math.floor(i / COLS.length)];
    const color = CATEGORY_COLOR[p.category] || P.cyan;
    const g = new THREE.Group(); g.position.set(x, 0, z); group.add(g);
    mesh(new THREE.CylinderGeometry(0.6, 0.7, 0.9, 20), toon(0x2a3448), { y: 0.45, parent: g });
    mesh(new THREE.TorusGeometry(0.62, 0.03, 6, 32), neon(color, 0.9), { y: 0.91, parent: g, shadow: false }).rotation.x = Math.PI / 2;
    const model = productModel(p, { size: MODEL_SIZE });
    const holder = new THREE.Group(); holder.position.y = MODEL_Y; g.add(holder);
    holder.add(model.group);
    const recommended = p.id === recommendedId;
    const board = textPlane(boardLines(p, marketLabel, marketId, { recommended }), { width: 1.9, height: 0.75, px: 200, bg: '#0a1220', border: recommended ? '#ffd34d' : '#29414a' });
    // Lectern-style board below the model so it never hides the product from the walkway (F-001: readable at 5 m).
    board.position.set(0, 0.62, 0.9); board.rotation.x = -0.95; g.add(board);
    const ring = mesh(new THREE.RingGeometry(0.85, 1.05, 32), neon(P.green, 0.85), { y: 0.03, parent: g, shadow: false });
    ring.rotation.x = -Math.PI / 2; ring.visible = false;
    const tag = textPlane([{ text: '✓ 已选', size: 0.55, color: '#0a1220', weight: 800 }], { width: 1.1, height: 0.4, px: 128, bg: '#5dff9a' });
    tag.position.y = MODEL_Y + model.height * 1.2 + 0.45; tag.visible = false; g.add(tag);
    circles.push({ x, z, r: 0.75 });
    const st = { p, x, z, g, holder, model, board, ring, tag, recommended, held: false, selected: false };
    stands.set(p.id, st);
    interactables.push({ id: `product:${p.id}`, kind: 'product', productId: p.id, x, z: z + 1.25, y: 2.2, label: `拿起「${p.name}」`, setHighlight: addOutline(model.group) });
    ticks.push(t => {
      if (st.held) return;
      model.group.rotation.y = t * 0.5 + i;
      if (st.selected) { tag.position.y = MODEL_Y + model.height * 1.2 + 0.45 + Math.sin(t * 2.4) * 0.06; tag.lookAt(tag.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0, 1))); }
    });
  });

  // Supplier booths with NPCs (3D-020).
  const booths = new Map();
  SUPPLIERS.forEach(s => {
    block(0.7, 1.05, 1.8, toon(0x2a3448), { x: -9, y: 0.52, z: s.z, parent: group });
    block(0.72, 0.06, 1.82, neon(s.color, 0.9), { x: -9, y: 1.06, z: s.z, parent: group, shadow: false });
    const npc = character({ body: s.color, trim: 0x1a2030, hair: 0x2b2a35 });
    npc.root.position.set(-10.3, 0, s.z); npc.root.rotation.y = Math.PI / 2; group.add(npc.root);   // faces the hall (+x)
    const sign = textPlane([{ text: s.name, size: 0.4, color: '#' + new THREE.Color(s.color).getHexString() }], { width: 2, height: 0.6, bg: '#0a1220', border: '#29414a' });
    sign.position.set(-11.95, 2.9, s.z); sign.rotation.y = Math.PI / 2; group.add(sign);
    const bang = textPlane([{ text: '!', size: 0.9, color: '#ffd34d' }], { width: 0.5, height: 0.7, glow: true });
    bang.position.set(-10.3, 2.5, s.z); group.add(bang);
    solid(-12, -8.6, s.z - 0.95, s.z + 0.95);
    booths.set(s.id, { s, npc, bang });
    interactables.push({ id: `supplier:${s.id}`, kind: 'supplier', supplierId: s.id, x: -7.9, z: s.z, y: 2.4, label: `和「${s.name}」谈谈`, setHighlight: addOutline(npc.root, P.gold, 1.08) });
    ticks.push((t, dt) => { npc.animate(dt, 0); bang.position.y = 2.5 + Math.sin(t * 3 + s.z) * 0.08; });
  });

  // 「换一批」 terminal (front centre, where the entrance was): 20 stands per batch; this pages through every product on sale here.
  if (batch.pages > 1) {
    const kiosk = block(2.2, 0.9, 0.7, toon(0x2a3448), { x: 0, y: 0.45, z: 7.4, parent: group });
    block(2.22, 0.06, 0.72, neon(P.gold, 0.9), { x: 0, y: 0.91, z: 7.4, parent: group, shadow: false });
    const label = textPlane([{ text: '换一批', size: 0.42, color: '#ffd34d' }, { text: `第 ${batch.page + 1}/${batch.pages} 批 · 共 ${batch.total} 件`, size: 0.22, color: '#c7d3dc', weight: 500 }], { width: 1.6, height: 0.8, px: 180, bg: '#0a1220', border: '#ffd34d' });
    label.position.set(0, 1.0, 7.8); label.rotation.x = -0.9; group.add(label);
    boxes.push({ minX: -1.1, maxX: 1.1, minZ: 7, maxZ: 7.8 });
    interactables.push({ id: 'shuffle', kind: 'shuffle', x: 0, z: 7.4, y: 2.6, label: `换一批商品（第 ${batch.page + 1}/${batch.pages} 批）`, setHighlight: addOutline(kiosk) });
  }

  // Exit (3D-021): red until product + supplier are chosen.
  const exitMat = neon(P.red);
  for (const [fx, fy, fw, fh] of [[-1.6, 1.75, 0.1, 3.5], [1.6, 1.75, 0.1, 3.5], [0, 3.5, 3.3, 0.1]]) block(fw, fh, 0.12, exitMat, { x: fx, y: fy, z: 8.95, parent: group, shadow: false });
  const exitSign = textPlane([{ text: '出口 EXIT', size: 0.5, color: '#f2f6f8' }], { width: 2.4, height: 0.6, bg: '#0a1220', border: '#ff5a5a' });
  exitSign.position.set(0, 3.95, 8.98); exitSign.rotation.y = Math.PI; group.add(exitSign);
  interactables.push({ id: 'exit', kind: 'exit', x: 0, z: 8.1, y: 3.2, label: '离开展厅', setHighlight: addOutline(exitSign) });

  let state = { product: null, supplier: null, ready: false };
  return {
    id: 'w1', group, boxes, circles, occluders, interactables,
    spawn: { x: 0, z: 6.8, yaw: 0 },
    camera: { distance: 4 },
    stand: id => stands.get(id),
    // 3D-074: quality tiers scale neon intensity rather than adding weather.
    setGlow(level) { for (const s of glowStrips) { s.material.opacity = 0.35 + 0.55 * level; } },
    targetFor(local) {
      if (!local.product) { const r = stands.get(recommendedId) || [...stands.values()][0]; return r && { x: r.x, z: r.z }; }
      if (!local.supplier) return { x: -9, z: SUPPLIERS[0].z };
      return { x: 0, z: 8.6 };
    },
    update(local) {
      if (local.product === state.product && local.supplier === state.supplier) return;
      for (const [id, st] of stands) {
        const on = id === local.product;
        if (st.selected !== on) {
          st.selected = on;
          st.ring.visible = on;
          st.tag.visible = on;
          st.holder.scale.setScalar(on ? 1.2 : 1);
          st.board.userData.redraw(boardLines(st.p, marketLabel, marketId, { selected: on, recommended: st.recommended }));
        }
      }
      for (const b of booths.values()) b.bang.visible = !local.supplier;
      const ready = !!(local.product && local.supplier);
      exitMat.color.set(ready ? P.green : P.red);
      state = { product: local.product, supplier: local.supplier, ready };
    },
    tick(t, dt) { for (const f of ticks) f(t, dt); },
    drawMap(ctx, player) {
      const s = ctx.canvas.width, k = s / 30, cx = s / 2, cy = s / 2;
      const P2 = (x, z) => [cx + (x - player.x) * k, cy + (z - player.z) * k];
      ctx.clearRect(0, 0, s, s);
      ctx.strokeStyle = '#8a7dff'; ctx.lineWidth = 3; ctx.strokeRect(...P2(-12, -9), 24 * k, 18 * k);
      for (const st of stands.values()) { const [x, y] = P2(st.x, st.z); ctx.fillStyle = st.selected ? '#5dff9a' : '#52cadd'; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill(); }
      for (const b of booths.values()) { const [x, y] = P2(-9, b.s.z); ctx.fillStyle = '#' + new THREE.Color(b.s.color).getHexString(); ctx.fillRect(x - 5, y - 8, 10, 16); }
      const [ex, ey] = P2(0, 9); ctx.fillStyle = state.ready ? '#5dff9a' : '#ff5a5a'; ctx.fillRect(ex - 14, ey - 3, 28, 6);
      return { project: P2 };
    },
  };
}
