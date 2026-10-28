// Shared building blocks for the neon-toon world: materials, labels, signs, characters.
import * as THREE from 'three';
import { industrialColor } from '../../details/room-materials.js?v=01295b5f6d';

export const PALETTE = Object.fromEntries(Object.entries({
  night: 0x0a1020, asphalt: 0x1e2636, curb: 0x34405a, wall: 0x2a3650, wallDark: 0x1a2232, glass: 0x2a5878,
  cyan: 0x52cadd, lime: 0xc9ff9f, magenta: 0xff4fb3, gold: 0xffd34d, violet: 0x8a7dff, ink: 0xf2f6f8, red: 0xff5a5a, green: 0x5dff9a,
}).map(([name, color]) => [name, industrialColor(color)]));
const FONT = '"PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif';

export function toon(color, extra = {}) {
  return new THREE.MeshStandardMaterial({ color: industrialColor(color), roughness: 0.48, metalness: 0.18, ...extra });
}
export function neon(color, opacity = 1) {
  return new THREE.MeshBasicMaterial({ color: industrialColor(color), toneMapped: false, transparent: opacity < 1, opacity });
}

export function mesh(geometry, material, { x = 0, y = 0, z = 0, ry = 0, shadow = true, parent } = {}) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  m.castShadow = shadow;
  m.receiveShadow = true;
  parent?.add(m);
  return m;
}
export function block(w, h, d, material, opts = {}) {
  return mesh(new THREE.BoxGeometry(w, h, d), material, opts);
}

// Canvas text on a plane. `lines` = [{ text, size, color, weight }].
export function textPlane(lines, { width = 4, height = 1, px = 256, bg = null, border = null, glow = false } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(px * width / height);
  canvas.height = px;
  const ctx = canvas.getContext('2d');
  if (bg) { ctx.fillStyle = industrialColor(bg); ctx.fillRect(0, 0, canvas.width, canvas.height); }
  if (border) { ctx.strokeStyle = industrialColor(border); ctx.lineWidth = px * 0.04; ctx.strokeRect(0, 0, canvas.width, canvas.height); }
  const total = lines.reduce((s, l) => s + (l.size || 0.4) * px * 1.25, 0);
  let y = (canvas.height - total) / 2;
  for (const l of lines) {
    const size = (l.size || 0.4) * px;
    ctx.font = `${l.weight || 600} ${size}px ${FONT}`;
    ctx.fillStyle = industrialColor(l.color || '#f2f6f8');
    ctx.textAlign = l.align || 'center';
    ctx.textBaseline = 'top';
    if (glow) { ctx.shadowColor = industrialColor(l.color || '#fff'); ctx.shadowBlur = size * 0.35; }
    const x = ctx.textAlign === 'left' ? px * 0.12 : canvas.width / 2;
    ctx.fillText(l.text, x, y + size * 0.1, canvas.width * 0.94);
    y += size * 1.25;
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: !bg, toneMapped: false, side: THREE.DoubleSide, depthWrite: !!bg });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
  plane.userData.redraw = next => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const fresh = textPlane(next, { width, height, px, bg, border, glow });
    plane.material.map.dispose();
    plane.material.map = fresh.material.map;
    plane.material.needsUpdate = true;
    fresh.geometry.dispose();
  };
  return plane;
}

export function neonSign(text, color, { width = 3, height = 0.9 } = {}) {
  const hex = '#' + new THREE.Color(color).getHexString();
  const group = new THREE.Group();
  block(width + 0.2, height + 0.2, 0.12, toon(0x0b0f18), { parent: group, shadow: false });
  const label = textPlane([{ text, size: 0.62, color: hex }], { width, height, glow: true });
  label.position.z = 0.07;
  group.add(label);
  block(width + 0.2, 0.05, 0.05, neon(color), { y: height / 2 + 0.1, z: 0.07, parent: group, shadow: false });
  block(width + 0.2, 0.05, 0.05, neon(color), { y: -height / 2 - 0.1, z: 0.07, parent: group, shadow: false });
  return group;
}

// Inverted-hull outline used for the 3D-016 highlight.
export function addOutline(target, color = PALETTE.gold, scale = 1.06) {
  const mat = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide, toneMapped: false });
  const outlines = [];
  target.traverse(o => {
    if (!o.isMesh || o.userData.noOutline) return;
    const hull = new THREE.Mesh(o.geometry, mat);
    hull.scale.setScalar(scale);
    hull.userData.noOutline = true;
    hull.visible = false;
    o.add(hull);
    outlines.push(hull);
  });
  return on => outlines.forEach(h => { h.visible = on; });
}

// Low-poly character with pivoted limbs: walk / run / idle / reach (3D-013).
export function character({ body = PALETTE.cyan, trim = PALETTE.lime, skin = 0xf1c7a5, hair = 0x1b1f2a, scale = 1 } = {}) {
  const root = new THREE.Group();
  const rig = new THREE.Group();
  rig.scale.setScalar(scale);
  root.add(rig);
  const m = { body: toon(body), trim: toon(trim), skin: toon(skin), hair: toon(hair), dark: toon(0x1a2030) };
  const limb = (r, len, mat) => { const g = new THREE.CapsuleGeometry(r, len, 4, 8); g.translate(0, -len / 2 - r, 0); return new THREE.Mesh(g, mat); };
  const hip = new THREE.Group(); hip.position.y = 0.92; rig.add(hip);
  const torso = mesh(new THREE.CapsuleGeometry(0.27, 0.42, 4, 10), m.body, { y: 0.36, parent: hip });
  block(0.58, 0.06, 0.34, m.trim, { y: 0.12, parent: hip });
  const head = new THREE.Group(); head.position.y = 0.98; hip.add(head);
  mesh(new THREE.SphereGeometry(0.25, 16, 12), m.skin, { y: 0.06, parent: head });
  mesh(new THREE.SphereGeometry(0.265, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), m.hair, { y: 0.1, parent: head });
  block(0.32, 0.06, 0.04, m.dark, { y: 0.07, z: 0.23, parent: head, shadow: false });
  const parts = {};
  for (const [name, x] of [['armL', -0.36], ['armR', 0.36]]) {
    const pivot = new THREE.Group(); pivot.position.set(x, 0.66, 0); hip.add(pivot);
    const arm = limb(0.08, 0.42, m.body); arm.castShadow = true; pivot.add(arm);
    const hand = mesh(new THREE.SphereGeometry(0.08, 8, 6), m.skin, { y: -0.6, parent: pivot });
    hand.castShadow = true;
    parts[name] = pivot;
  }
  for (const [name, x] of [['legL', -0.14], ['legR', 0.14]]) {
    const pivot = new THREE.Group(); pivot.position.set(x, 0, 0); hip.add(pivot);
    const leg = limb(0.1, 0.56, m.dark); leg.castShadow = true; pivot.add(leg);
    block(0.2, 0.1, 0.3, m.trim, { y: -0.86, z: 0.05, parent: pivot });
    parts[name] = pivot;
  }
  torso.userData.primary = true;
  let phase = 0, reach = 0;
  return {
    root,
    reach() { reach = 1; },
    // speed in m/s; 0 = idle.
    animate(dt, speed) {
      const moving = speed > 0.1;
      phase += dt * (moving ? 2.2 + speed * 1.1 : 1.6);
      const amp = moving ? Math.min(0.95, 0.35 + speed * 0.09) : 0;
      parts.legL.rotation.x = Math.sin(phase) * amp;
      parts.legR.rotation.x = -Math.sin(phase) * amp;
      parts.armL.rotation.x = -Math.sin(phase) * amp * 0.8;
      parts.armR.rotation.x = Math.sin(phase) * amp * 0.8 - reach * 1.6;
      hip.position.y = 0.92 + (moving ? Math.abs(Math.sin(phase)) * 0.06 : Math.sin(phase) * 0.012);
      head.rotation.z = moving ? 0 : Math.sin(phase * 0.5) * 0.03;
      reach = Math.max(0, reach - dt * 2.2);
    },
  };
}

// Golden (or blue) light pillar for task targets (3D-054): 8 m tall, 1.5 m wide.
export function lightPillar(color = PALETTE.gold) {
  const group = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.28, toneMapped: false, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
  group.add(new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 8, 24, 1, true), mat));
  group.children[0].position.y = 4;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.05, 6, 32), neon(color));
  ring.rotation.x = Math.PI / 2;
  group.add(ring);
  group.userData.tick = t => { ring.position.y = 0.1 + ((t * 1.2) % 3); ring.material.opacity = 1; mat.opacity = 0.22 + Math.sin(t * 3) * 0.06; };
  return group;
}

export function disposeTree(object) {
  object.traverse(o => {
    if (o.geometry && !o.userData.noOutline) o.geometry.dispose();
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    mats.forEach(m => { m.map?.dispose(); m.dispose(); });
  });
}
