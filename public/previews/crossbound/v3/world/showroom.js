// W1 选品展厅 (3D-018 ~ 3D-022): product stands, three supplier booths, exit door.
import * as THREE from 'three';
import { PALETTE as P, toon, neon, block, mesh, textPlane, neonSign, addOutline, character } from './kit.js';
import { fitStars } from './logic.js';

const COLS = [-5.5, -2, 1.5, 5, 8.5];
const ROWS = [-6, -2.5, 1];
export const SUPPLIERS = [
  { id: 'standard', name: '常规供货', z: -5.5, color: P.cyan },
  { id: 'fast', name: '现货快补', z: -1.5, color: P.magenta },
  { id: 'factory', name: '工厂排产', z: 2.5, color: P.lime },
];
const CATEGORY_COLOR = { home: P.cyan, tech: P.violet, beauty: P.magenta, outdoor: P.lime, future: P.gold };

function productShape(category, color) {
  const mat = toon(color);
  const g = new THREE.Group();
  if (category === 'tech') { block(0.7, 0.08, 0.5, mat, { y: 0.06, parent: g }); block(0.66, 0.42, 0.04, toon(0x0b1220), { y: 0.3, z: -0.2, parent: g }); }
  else if (category === 'beauty') { mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.5, 14), mat, { y: 0.25, parent: g }); mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.14, 10), toon(P.ink), { y: 0.57, parent: g }); }
  else if (category === 'outdoor') { mesh(new THREE.ConeGeometry(0.38, 0.6, 5), mat, { y: 0.3, parent: g }); }
  else if (category === 'future') { mesh(new THREE.TorusKnotGeometry(0.2, 0.07, 48, 8), mat, { y: 0.35, parent: g }); }
  else { block(0.56, 0.44, 0.42, mat, { y: 0.22, parent: g }); block(0.58, 0.06, 0.44, toon(P.ink), { y: 0.3, parent: g }); }
  return g;
}

function boardLines(p, marketLabel, marketId, { selected, recommended }) {
  const stars = fitStars(p, marketId);
  return [
    { text: `${recommended ? '★推荐 · ' : ''}${p.name}`, size: 0.2, color: selected ? '#5dff9a' : '#f2f6f8' },
    { text: `参考价 $${p.basePrice ?? '-'} · 成本 $${p.cost ?? '-'}`, size: 0.15, color: '#c7d3dc', weight: 500 },
    { text: `${marketLabel || '本市场'}适配 ${'★'.repeat(stars)}${'☆'.repeat(5 - stars)}`, size: 0.15, color: '#ffd34d', weight: 500 },
  ];
}

export function buildShowroom({ products, recommendedId, marketId, marketLabel }) {
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
  for (const [x, z, w, d] of [[0, -8.95, 23.6, 0.06], [-11.95, 0, 0.06, 17.6], [11.95, 0, 0.06, 17.6]]) block(w, 0.08, d, neon(P.violet, 0.8), { x, y: 5.3, z, parent: group, shadow: false });
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
    const shape = productShape(p.category, color); shape.position.y = 0.92; g.add(shape);
    const recommended = p.id === recommendedId;
    const board = textPlane(boardLines(p, marketLabel, marketId, { recommended }), { width: 1.9, height: 0.75, px: 200, bg: '#0a1220', border: recommended ? '#ffd34d' : '#29414a' });
    board.position.set(0, 1.0, 0.95); board.rotation.x = -0.5; g.add(board);
    const ring = mesh(new THREE.RingGeometry(0.85, 1.05, 32), neon(P.green, 0.85), { y: 0.03, parent: g, shadow: false });
    ring.rotation.x = -Math.PI / 2; ring.visible = false;
    circles.push({ x, z, r: 0.75 });
    stands.set(p.id, { p, x, z, g, shape, board, ring, recommended });
    interactables.push({ id: `product:${p.id}`, kind: 'product', productId: p.id, x, z: z + 1.25, y: 2.2, label: `拿起「${p.name}」`, setHighlight: addOutline(shape) });
    ticks.push(t => { shape.rotation.y = t * 0.6 + i; });
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
    targetFor(local) {
      if (!local.product) { const r = stands.get(recommendedId) || [...stands.values()][0]; return r && { x: r.x, z: r.z }; }
      if (!local.supplier) return { x: -9, z: SUPPLIERS[0].z };
      return { x: 0, z: 8.6 };
    },
    update(local) {
      if (local.product === state.product && local.supplier === state.supplier) return;
      for (const [id, st] of stands) {
        const on = id === local.product;
        if (st.ring.visible !== on) {
          st.ring.visible = on;
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
      for (const st of stands.values()) { const [x, y] = P2(st.x, st.z); ctx.fillStyle = st.ring.visible ? '#5dff9a' : '#52cadd'; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill(); }
      for (const b of booths.values()) { const [x, y] = P2(-9, b.s.z); ctx.fillStyle = '#' + new THREE.Color(b.s.color).getHexString(); ctx.fillRect(x - 5, y - 8, 10, 16); }
      const [ex, ey] = P2(0, 9); ctx.fillStyle = state.ready ? '#5dff9a' : '#ff5a5a'; ctx.fillRect(ex - 14, ey - 3, 28, 6);
      return { project: P2 };
    },
  };
}
