// Hub: 总部街区 (3D-008 ~ 3D-012). Neon street, HQ facade with seven world doors, terminals, receptionist.
import * as THREE from 'three';
import { PALETTE as P, toon, neon, block, mesh, textPlane, neonSign, addOutline, character } from './kit.js';
import { WORLDS } from './logic.js';

export const DOOR_X = WORLDS.map((_, i) => -12.6 + i * 4.2);
const FACADE_Z = -14;
const STATE_STYLE = {
  locked: { color: 0x5a6475, label: '未解锁' },
  current: { color: P.gold, label: '进行中' },
  completed: { color: P.green, label: '已完成' },
  open: { color: P.violet, label: '常驻开放' },
};

export function buildHub({ quality }) {
  const group = new THREE.Group();
  const boxes = [], circles = [], occluders = [], interactables = [], ticks = [];
  const solid = (minX, maxX, minZ, maxZ) => boxes.push({ minX, maxX, minZ, maxZ });

  // Ground, sidewalks, lane marks, puddle glows.
  block(70, 0.2, 44, toon(P.asphalt), { y: -0.1, z: 3, parent: group, shadow: false });
  block(70, 0.16, 2.6, toon(P.curb), { y: 0, z: -12.7, parent: group, shadow: false });
  block(70, 0.16, 2.6, toon(P.curb), { y: 0, z: 9.3, parent: group, shadow: false });
  for (let x = -30; x <= 30; x += 6) block(3, 0.02, 0.18, neon(P.lime, 0.55), { x, y: 0.01, z: -1.5, parent: group, shadow: false });
  const puddleTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d').createRadialGradient(64, 64, 4, 64, 64, 62);
    g.addColorStop(0, '#ffffffaa'); g.addColorStop(1, '#ffffff00');
    const ctx = c.getContext('2d'); ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();
  [[-18, 3, P.magenta], [-4, 5.5, P.cyan], [9, 1, P.violet], [20, 4, P.cyan], [-10, -6, P.lime], [14, -7, P.magenta]].forEach(([x, z, color]) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(5, 3), new THREE.MeshBasicMaterial({ map: puddleTex, color, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    p.rotation.x = -Math.PI / 2; p.position.set(x, 0.02, z); group.add(p);
  });

  // HQ building: facade with neon window bands and the seven doors (3D-009/010).
  const hq = block(38, 24, 14, toon(P.wall), { y: 12, z: FACADE_Z - 7, parent: group });
  occluders.push(hq);
  solid(-19, 19, FACADE_Z - 14, FACADE_Z);
  for (let y = 6; y < 23; y += 2.4) block(36, 0.12, 0.05, neon(y % 4.8 < 2.4 ? P.cyan : P.violet, 0.75), { y, z: FACADE_Z + 0.03, parent: group, shadow: false });
  const hqSign = neonSign('CROSSBOUND 总部', P.cyan, { width: 10, height: 1.6 });
  hqSign.position.set(0, 7.2, FACADE_Z + 0.1); group.add(hqSign);
  block(36, 0.3, 2, toon(P.wallDark), { y: 5.1, z: FACADE_Z + 1, parent: group });
  const doors = {};
  WORLDS.forEach((w, i) => {
    const x = DOOR_X[i];
    block(3, 3.8, 0.4, toon(0x0b0f18), { x, y: 1.9, z: FACADE_Z + 0.1, parent: group });
    const frameMat = neon(STATE_STYLE.locked.color);
    for (const [fx, fy, fw, fh] of [[-1.3, 1.75, 0.08, 3.5], [1.3, 1.75, 0.08, 3.5], [0, 3.5, 2.68, 0.08]]) block(fw, fh, 0.08, frameMat, { x: x + fx, y: fy, z: FACADE_Z + 0.35, parent: group, shadow: false });
    const panel = block(2.4, 3.2, 0.1, toon(P.glass, { transparent: true, opacity: 0.85 }), { x, y: 1.65, z: FACADE_Z + 0.3, parent: group });
    const plate = textPlane([{ text: w.name, size: 0.42, color: '#f2f6f8' }, { text: '未解锁', size: 0.26, color: '#8fa6b8' }], { width: 3, height: 1, bg: '#0a1220', border: '#29414a' });
    plate.position.set(x, 4.35, FACADE_Z + 0.32); group.add(plate);
    const lamp = mesh(new THREE.SphereGeometry(0.16, 12, 8), frameMat, { x: x + 1.3, y: 3.85, z: FACADE_Z + 0.4, parent: group, shadow: false });
    const highlight = addOutline(panel);
    doors[w.id] = { x, z: FACADE_Z + 1.2, frameMat, panel, plate, lamp, state: null };
    interactables.push({ id: `door:${w.id}`, kind: 'door', world: w.id, x, z: FACADE_Z + 1.1, y: 2.4, label: `进入${w.name}`, setHighlight: highlight });
  });

  // World map terminal (stage 0: choose market, 3D-009 ②).
  function kiosk(x, z, color, title, sub) {
    const k = new THREE.Group(); k.position.set(x, 0, z); group.add(k);
    block(1.3, 1.1, 0.9, toon(0x18212f), { y: 0.55, parent: k });
    const screen = textPlane([{ text: title, size: 0.36, color: '#' + new THREE.Color(color).getHexString() }, { text: sub, size: 0.22, color: '#c7d3dc' }], { width: 1.6, height: 1, bg: '#06101a', border: '#' + new THREE.Color(color).getHexString(), glow: true });
    screen.position.set(0, 1.75, 0.1); screen.rotation.x = -0.25; k.add(screen);
    block(0.12, 1.2, 0.12, toon(0x2a3344), { y: 1.2, z: -0.2, parent: k });
    block(1.5, 0.06, 0.06, neon(color), { y: 1.13, z: 0.46, parent: k, shadow: false });
    circles.push({ x, z, r: 0.85 });
    return { group: k, screen, highlight: addOutline(k.children[0]) };
  }
  const mapK = kiosk(-6, -4, P.cyan, '世界地图终端', '选市场 · 12 国');
  interactables.push({ id: 'map', kind: 'map', x: -6, z: -3.1, y: 2.6, label: '使用世界地图终端', setHighlight: mapK.highlight });
  const helpK = kiosk(7, -4, P.lime, '帮助终端', '经营逻辑卡');
  interactables.push({ id: 'help', kind: 'help', x: 7, z: -3.1, y: 2.6, label: '查看帮助终端', setHighlight: helpK.highlight });
  const setK = kiosk(-15, -10.6, P.violet, '设置终端', '画质 · 模式 · 舒适度');
  interactables.push({ id: 'settings', kind: 'settings', x: -15, z: -9.7, y: 2.6, label: '打开设置终端', setHighlight: setK.highlight });

  // Receptionist NPC at the HQ door (3D-011: within 3 m of the spawn).
  const receptionist = character({ body: P.magenta, trim: P.cyan, hair: 0x2b1a3a });
  receptionist.root.position.set(2.4, 0, -11.2);
  receptionist.root.rotation.y = -0.9;   // faces the spawn point on the street
  group.add(receptionist.root);
  circles.push({ x: 2.4, z: -11.2, r: 0.45 });
  const bang = textPlane([{ text: '!', size: 0.9, color: '#ffd34d' }], { width: 0.6, height: 0.8, glow: true });
  bang.position.set(2.4, 2.55, -11.2); group.add(bang);
  interactables.push({ id: 'reception', kind: 'npc', x: 2.4, z: -11.2, y: 2.4, label: '和接待员说话', setHighlight: addOutline(receptionist.root, P.gold, 1.08) });
  ticks.push((t, dt) => { receptionist.animate(dt, 0); bang.position.y = 2.55 + Math.sin(t * 3) * 0.08; });

  // Decorative buildings (not enterable): convenience store, ad tower, parking (3D-009 ④).
  function deco(minX, maxX, minZ, maxZ, h, color, sign, signColor) {
    const b = block(maxX - minX, h, maxZ - minZ, toon(color), { x: (minX + maxX) / 2, y: h / 2, z: (minZ + maxZ) / 2, parent: group });
    occluders.push(b); solid(minX, maxX, minZ, maxZ);
    const s = neonSign(sign, signColor, { width: Math.min(6, maxX - minX - 2), height: 1.1 });
    s.position.set((minX + maxX) / 2, Math.min(h - 1, 3.6), minZ - 0.08); s.rotation.y = Math.PI; group.add(s);
    return b;
  }
  deco(-26, -12, 10.6, 18, 5, 0x1f2232, '便利店 24H', P.magenta);
  deco(-5, 5, 10.6, 16, 18, 0x161c2b, '出海 · 从一件好产品开始', P.cyan);
  deco(12, 26, 10.6, 18, 4, 0x1a2230, 'P 停车场', P.lime);
  const adLines = ['选对市场，比选对价格更重要', '慢一点的物流，退款会多一点', '账上赚钱 ≠ 手里有钱'];
  const ad = textPlane([{ text: adLines[0], size: 0.34, color: '#52cadd' }], { width: 8, height: 4, bg: '#06101a', border: '#52cadd', glow: true });
  ad.position.set(0, 11, 10.5); ad.rotation.y = Math.PI; group.add(ad);
  let adIndex = 0;
  ticks.push(t => { const i = Math.floor(t / 4) % adLines.length; if (i !== adIndex) { adIndex = i; ad.userData.redraw([{ text: adLines[i], size: 0.34, color: '#52cadd' }]); } });
  solid(-36, -30, -30, 30); solid(30, 36, -30, 30); solid(-30, -26, 10.6, 30); solid(26, 30, 10.6, 30);
  solid(-12, -5, 10.6, 30); solid(5, 12, 10.6, 30);
  solid(-30, -19, -30, FACADE_Z); solid(19, 30, -30, FACADE_Z);
  block(11, 2.4, 0.4, toon(P.wallDark), { x: -24.5, y: 1.2, z: FACADE_Z, parent: group });
  block(11, 2.4, 0.4, toon(P.wallDark), { x: 24.5, y: 1.2, z: FACADE_Z, parent: group });
  block(0.4, 1.2, 40, toon(P.curb), { x: -30, y: 0.6, z: 0, parent: group });
  block(0.4, 1.2, 40, toon(P.curb), { x: 30, y: 0.6, z: 0, parent: group });

  // Street lamps.
  const lampSpots = [-26, -21, 21, 26].map(x => [x, -11.4]).concat([-22, -14, -6, 6, 14, 22].map(x => [x, 9.2]));
  for (const [x, z] of lampSpots) {
    block(0.14, 4.6, 0.14, toon(0x2a3344), { x, y: 2.3, z, parent: group });
    block(0.9, 0.12, 0.3, neon(z < 0 ? P.cyan : P.magenta), { x, y: 4.6, z, parent: group, shadow: false });
    circles.push({ x, z, r: 0.25 });
  }

  // Passers-by (3D-050: no dialogue, just walking).
  const walkers = [[-22, 2.2, 1.3, P.lime], [10, 4.8, -1.1, P.violet], [-4, 6.4, 1.6, 0xff9f43]].map(([x, z, dir, color]) => {
    const c = character({ body: color, trim: 0x1a2030, hair: 0x2a2030, scale: 0.95 });
    c.root.position.set(x, 0, z); group.add(c.root);
    const walker = { c, x, z, dir, circle: { x, z, r: 0.4 } };
    circles.push(walker.circle);
    return walker;
  });
  ticks.push((t, dt) => {
    for (const w of walkers) {
      w.x += w.dir * dt; if (Math.abs(w.x) > 26) w.dir = -w.dir;
      w.c.root.position.x = w.x; w.c.root.rotation.y = w.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      w.circle.x = w.x; w.c.animate(dt, Math.abs(w.dir));
    }
  });

  // 3D-070: no weather. 3D-074: quality tiers scale neon glow halos instead (high 1 · mid .5 · low 0).
  const halos = [];
  const haloMat = color => new THREE.SpriteMaterial({ map: puddleTex, color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  for (const [x, z] of lampSpots) { const h = new THREE.Sprite(haloMat(z < 0 ? P.cyan : P.magenta)); h.position.set(x, 4.6, z); h.scale.set(3, 3, 1); group.add(h); halos.push({ h, base: 0.55 }); }
  [[0, 7.2, P.cyan, 14, 4]].forEach(([x, y, color, w, hgt]) => { const h = new THREE.Sprite(haloMat(color)); h.position.set(x, y, FACADE_Z + 0.4); h.scale.set(w, hgt, 1); group.add(h); halos.push({ h, base: 0.4 }); });
  const puddles = group.children.filter(o => o.material?.map === puddleTex && !o.isSprite);
  function setGlow(level) {
    for (const { h, base } of halos) { h.material.opacity = base * level; h.visible = level > 0; }
    for (const p of puddles) p.material.opacity = 0.08 + 0.14 * level;
  }
  setGlow(quality?.glow ?? 1);

  let talked = false;
  return {
    id: 'hub', group, boxes, circles, occluders, interactables,
    spawn: { x: 0, z: -8, yaw: 0 },
    camera: { distance: 6 },
    setGlow,
    // Far enough back that the door's name plate and status light stay in frame (still within 2.5 m reach).
    doorFront(worldId) { const d = doors[worldId]; return { x: d.x, z: d.z + 2.2, yaw: 0 }; },
    targetFor(id) {
      if (id === 'map') return { x: -6, z: -4 };
      if (id?.startsWith('door:')) { const d = doors[id.slice(5)]; return { x: d.x, z: d.z }; }
      if (id === 'reception') return { x: 2.4, z: -11.2 };
      return null;
    },
    markTalked() { talked = true; bang.visible = false; },
    get talked() { return talked; },
    update(states) {
      for (const [id, state] of Object.entries(states)) {
        const d = doors[id];
        if (!d || d.state === state) continue;
        d.state = state;
        const style = STATE_STYLE[state];
        d.frameMat.color.set(style.color);
        d.panel.material.opacity = state === 'locked' ? 0.92 : 0.55;
        const w = WORLDS.find(x => x.id === id);
        d.plate.userData.redraw([{ text: w.name, size: 0.42, color: '#f2f6f8' }, { text: style.label, size: 0.26, color: '#' + new THREE.Color(style.color).getHexString() }]);
      }
    },
    tick(t, dt) { for (const f of ticks) f(t, dt); },
    // Minimap (3D-012): north-up, player-centred, ~30 m radius.
    drawMap(ctx, player, target, states) {
      const s = ctx.canvas.width, k = s / 64, cx = s / 2, cy = s / 2;
      const P2 = (x, z) => [cx + (x - player.x) * k, cy + (z - player.z) * k];
      ctx.clearRect(0, 0, s, s);
      ctx.fillStyle = '#0d1624'; ctx.fillRect(...P2(-19, FACADE_Z - 14), 38 * k, 14 * k);
      ctx.fillStyle = '#121a28';
      for (const [a, b, c, d] of [[-26, -12, 10.6, 18], [-5, 5, 10.6, 16], [12, 26, 10.6, 18]]) ctx.fillRect(...P2(a, c), (b - a) * k, (d - c) * k);
      WORLDS.forEach(w => {
        const d = doors[w.id]; const [x, y] = P2(d.x, FACADE_Z);
        ctx.fillStyle = '#' + new THREE.Color(STATE_STYLE[states[w.id] || 'locked'].color).getHexString();
        ctx.fillRect(x - 0.9 * k, y - 0.6 * k, 1.8 * k, 1.2 * k);
      });
      for (const [x, z, c] of [[-6, -4, '#52cadd'], [7, -4, '#c9ff9f'], [-15, -10.6, '#8a7dff']]) { const [px, py] = P2(x, z); ctx.fillStyle = c; ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2); ctx.fill(); }
      return { project: P2 };
    },
  };
}
