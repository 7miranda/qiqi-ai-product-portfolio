// F-001 / F-003: recognisable low-poly product models with one signature "open" motion each.
// Every model is procedural (no third-party assets) and well under the 5,000-face cap (3D-073).
import * as THREE from 'three';
import { toon, neon, block, mesh, PALETTE as P } from './kit.js?v=01295b5f6d';
import { archetypeFor } from './logic.js?v=01295b5f6d';

const ease = p => 1 - Math.pow(1 - Math.max(0, Math.min(1, p)), 3);
const cyl = (rt, rb, h, seg = 16) => new THREE.CylinderGeometry(rt, rb, h, seg);
const pivot = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
function glowMat(color) { return new THREE.MeshStandardMaterial({ color: 0x222831, emissive: color, emissiveIntensity: 0, toneMapped: false }); }

// Each builder returns { group, open(p, t) } in metres, roughly real-world proportions.
const BUILDERS = {
  lamp(c) {
    const g = new THREE.Group();
    mesh(cyl(0.16, 0.18, 0.04, 20), toon(c.dark), { y: 0.02, parent: g });
    const arm = pivot(g, 0, 0.04, 0);
    mesh(cyl(0.018, 0.018, 0.42, 8), toon(c.metal), { y: 0.21, parent: arm });
    const head = pivot(arm, 0, 0.42, 0);
    mesh(new THREE.ConeGeometry(0.12, 0.14, 18, 1, true), toon(c.body, { side: THREE.DoubleSide }), { y: -0.04, parent: head }).rotation.x = Math.PI;
    const bulbMat = glowMat(0xfff2c4);
    mesh(new THREE.SphereGeometry(0.05, 12, 8), bulbMat, { y: -0.08, parent: head });
    arm.rotation.z = 0.25; head.rotation.z = -0.9;
    return { group: g, open(p) { bulbMat.emissiveIntensity = 3 * ease(p); head.rotation.z = -0.9 + 0.3 * ease(p); } };
  },
  fan(c) {
    const g = new THREE.Group();
    mesh(cyl(0.12, 0.14, 0.04, 20), toon(c.dark), { y: 0.02, parent: g });
    mesh(cyl(0.02, 0.02, 0.26, 8), toon(c.metal), { y: 0.15, parent: g });
    const head = pivot(g, 0, 0.36, 0);
    mesh(new THREE.TorusGeometry(0.17, 0.012, 6, 28), toon(c.body), { parent: head });
    const rotor = pivot(head, 0, 0, 0.01);
    mesh(cyl(0.035, 0.035, 0.04, 12), toon(c.dark), { parent: rotor }).rotation.x = Math.PI / 2;
    for (let i = 0; i < 3; i++) { const b = block(0.05, 0.15, 0.01, toon(c.accent), { y: 0.085, parent: pivot(rotor) }); b.parent.rotation.z = i * Math.PI * 2 / 3; }
    let spin = 0;
    return { group: g, open(p, t, dt = 0.016) { spin += dt * 22 * ease(p); rotor.rotation.z = spin; } };
  },
  earbuds(c) {
    const g = new THREE.Group();
    block(0.2, 0.08, 0.13, toon(c.body), { y: 0.04, parent: g });
    const lid = pivot(g, 0, 0.08, -0.065);
    block(0.2, 0.04, 0.13, toon(c.body), { y: 0.02, z: 0.065, parent: lid });
    const buds = pivot(g, 0, 0.06, 0);
    for (const x of [-0.045, 0.045]) { mesh(new THREE.SphereGeometry(0.03, 10, 8), toon(c.accent), { x, y: 0.02, parent: buds }); mesh(cyl(0.01, 0.01, 0.06, 6), toon(c.accent), { x, y: -0.02, parent: buds }); }
    return { group: g, open(p) { lid.rotation.x = -1.9 * ease(p); buds.position.y = 0.06 + 0.05 * ease(p); } };
  },
  speaker(c) {
    const g = new THREE.Group();
    const body = mesh(cyl(0.09, 0.09, 0.3, 20), toon(c.body), { y: 0.15, parent: g });
    const rings = [0.08, 0.15, 0.22].map(y => mesh(new THREE.TorusGeometry(0.092, 0.006, 4, 24), neon(c.glow, 0.0), { y, parent: g }));
    rings.forEach(r => { r.rotation.x = Math.PI / 2; r.material.transparent = true; });
    mesh(cyl(0.03, 0.03, 0.01, 12), toon(c.accent), { y: 0.305, parent: g });
    return { group: g, open(p, t) { const k = ease(p); body.scale.setScalar(1 + Math.sin(t * 12) * 0.03 * k); rings.forEach((r, i) => { r.material.opacity = k * (0.5 + 0.5 * Math.sin(t * 8 - i)); }); } };
  },
  powerbank(c) {
    const g = new THREE.Group();
    block(0.14, 0.22, 0.03, toon(c.body), { y: 0.11, parent: g });
    const leds = [0, 1, 2, 3].map(i => block(0.016, 0.016, 0.005, glowMat(c.glow), { x: -0.03 + i * 0.02, y: 0.03, z: 0.017, parent: g }));
    const phone = block(0.12, 0.22, 0.012, toon(c.dark), { y: 0.11, z: -0.03, parent: g });
    return { group: g, open(p, t) { const k = ease(p); leds.forEach((l, i) => { l.material.emissiveIntensity = k * (i / 4 < ((t * 0.8) % 1.2) ? 3 : 0.4); }); phone.position.z = -0.03 - 0.06 * (1 - k); } };
  },
  charger(c) {
    const g = new THREE.Group();
    block(0.14, 0.07, 0.1, toon(c.body), { y: 0.035, parent: g });
    const leds = [0, 1, 2].map(i => block(0.015, 0.015, 0.005, glowMat(c.glow), { x: -0.03 + i * 0.03, y: 0.05, z: 0.052, parent: g }));
    const cable = mesh(new THREE.TorusGeometry(0.09, 0.008, 6, 24, Math.PI * 1.4), toon(c.dark), { x: 0.13, y: 0.02, parent: g });
    cable.rotation.x = Math.PI / 2;
    const plug = block(0.04, 0.02, 0.06, toon(c.metal), { x: 0.2, y: 0.02, z: 0.06, parent: g });
    return { group: g, open(p, t) { const k = ease(p); leds.forEach((l, i) => { l.material.emissiveIntensity = k * (Math.sin(t * 6 - i) > 0 ? 3 : 0.6); }); plug.position.z = 0.06 + 0.05 * k; } };
  },
  organizer(c) {
    const g = new THREE.Group();
    block(0.5, 0.16, 0.34, toon(c.body), { y: 0.08, parent: g });
    const lid = pivot(g, 0, 0.16, -0.17);
    block(0.5, 0.1, 0.34, toon(c.body), { y: 0.05, z: 0.17, parent: lid });
    block(0.14, 0.03, 0.03, toon(c.dark), { y: 0.11, z: 0.17, parent: lid });
    const cubes = [-0.14, 0, 0.14].map((x, i) => block(0.12, 0.08, 0.26, toon([c.accent, P.cyan, P.lime][i]), { x, y: 0.08, parent: g }));
    return { group: g, open(p) { const k = ease(p); lid.rotation.x = -1.7 * k; cubes.forEach((cb, i) => { cb.position.y = 0.08 + k * (0.06 + i * 0.025); }); } };
  },
  care(c) {
    const g = new THREE.Group();
    block(0.32, 0.14, 0.14, toon(c.body), { y: 0.07, parent: g });
    const bottles = [-0.09, 0, 0.09].map((x, i) => { const b = pivot(g, x, 0.06, 0); mesh(cyl(0.03, 0.035, 0.14, 10), toon([c.accent, P.ink, P.cyan][i]), { y: 0.07, parent: b }); mesh(cyl(0.015, 0.015, 0.03, 8), toon(c.dark), { y: 0.155, parent: b }); return b; });
    return { group: g, open(p) { bottles.forEach((b, i) => { b.position.y = 0.06 + ease(p - i * 0.15) * 0.12; }); } };
  },
  bottle(c) {
    const g = new THREE.Group();
    mesh(cyl(0.05, 0.042, 0.22, 18), toon(c.body), { y: 0.11, parent: g });
    block(0.09, 0.01, 0.002, neon(c.glow), { y: 0.12, z: 0.051, parent: g, shadow: false });
    const cap = pivot(g, 0, 0.22, 0);
    mesh(cyl(0.048, 0.05, 0.05, 18), toon(c.dark), { y: 0.025, parent: cap });
    return { group: g, open(p) { const k = ease(p); cap.position.y = 0.22 + 0.08 * k; cap.rotation.y = 4 * k; } };
  },
  mirror(c) {
    const g = new THREE.Group();
    block(0.42, 1.2, 0.05, toon(c.dark), { y: 0.62, parent: g });
    mesh(new THREE.PlaneGeometry(0.36, 1.12), new THREE.MeshStandardMaterial({ color: 0x9fb8c8, metalness: 0.9, roughness: 0.15 }), { y: 0.62, z: 0.027, parent: g });
    const strip = glowMat(0xfff2c4);
    for (const x of [-0.2, 0.2]) block(0.015, 1.12, 0.01, strip, { x, y: 0.62, z: 0.03, parent: g });
    block(0.5, 0.04, 0.25, toon(c.dark), { y: 0.02, parent: g });
    return { group: g, open(p) { strip.emissiveIntensity = 2.5 * ease(p); } };
  },
  chair(c) {
    const g = new THREE.Group();
    for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; block(0.04, 0.03, 0.28, toon(c.metal), { x: Math.sin(a) * 0.12, y: 0.04, z: Math.cos(a) * 0.12, ry: a, parent: g }); }
    mesh(cyl(0.03, 0.03, 0.36, 8), toon(c.metal), { y: 0.22, parent: g });
    block(0.48, 0.07, 0.46, toon(c.body), { y: 0.43, parent: g });
    const back = pivot(g, 0, 0.47, -0.22);
    block(0.46, 0.55, 0.06, toon(c.body), { y: 0.3, parent: back });
    block(0.3, 0.12, 0.07, toon(c.accent), { y: 0.62, parent: back });
    for (const x of [-0.26, 0.26]) block(0.05, 0.05, 0.3, toon(c.dark), { x, y: 0.6, parent: g });
    return { group: g, open(p) { back.rotation.x = -0.45 * ease(p); } };
  },
  sofa(c) {
    const g = new THREE.Group();
    block(1.4, 0.22, 0.7, toon(c.dark), { y: 0.13, parent: g });
    block(1.3, 0.14, 0.62, toon(c.body), { y: 0.31, z: 0.02, parent: g });
    block(1.4, 0.45, 0.16, toon(c.body), { y: 0.47, z: -0.29, parent: g });
    for (const x of [-0.68, 0.68]) block(0.14, 0.34, 0.7, toon(c.body), { x, y: 0.33, parent: g });
    const rest = pivot(g, 0, 0.2, 0.35);
    block(0.6, 0.12, 0.34, toon(c.accent), { y: -0.04, z: 0.17, parent: rest });
    rest.rotation.x = 1.4;
    return { group: g, open(p) { rest.rotation.x = 1.4 * (1 - ease(p)); } };
  },
  bed(c) {
    const g = new THREE.Group();
    block(1.1, 0.24, 1.6, toon(c.dark), { y: 0.12, parent: g });
    const mattress = block(1.04, 0.18, 1.52, toon(c.body), { y: 0.33, parent: g });
    block(1.1, 0.7, 0.08, toon(c.dark), { y: 0.47, z: -0.8, parent: g });
    const light = glowMat(0xfff2c4);
    block(0.9, 0.04, 0.03, light, { y: 0.78, z: -0.76, parent: g });
    block(0.4, 0.08, 0.24, toon(P.ink), { x: -0.25, y: 0.46, z: -0.6, parent: g });
    block(0.4, 0.08, 0.24, toon(P.ink), { x: 0.25, y: 0.46, z: -0.6, parent: g });
    return { group: g, open(p) { const k = ease(p); light.emissiveIntensity = 2.5 * k; mattress.position.y = 0.33 + 0.12 * k; } };
  },
  cabinet(c) {
    const g = new THREE.Group();
    block(0.8, 1.0, 0.4, toon(c.dark), { y: 0.5, parent: g });
    for (const y of [0.35, 0.68]) block(0.74, 0.02, 0.36, toon(c.metal), { y, parent: g });
    [[-0.22, 0.42, P.cyan], [0.18, 0.75, c.accent], [-0.1, 0.1, P.lime]].forEach(([x, y, col]) => block(0.18, 0.14, 0.2, toon(col), { x, y, z: 0.02, parent: g }));
    const doorL = pivot(g, -0.4, 0.5, 0.2), doorR = pivot(g, 0.4, 0.5, 0.2);
    block(0.4, 0.98, 0.03, toon(c.body), { x: 0.2, parent: doorL });
    block(0.4, 0.98, 0.03, toon(c.body), { x: -0.2, parent: doorR });
    block(0.015, 0.2, 0.02, toon(c.metal), { x: 0.37, parent: doorL });
    block(0.015, 0.2, 0.02, toon(c.metal), { x: -0.37, parent: doorR });
    return { group: g, open(p) { const k = ease(p); doorL.rotation.y = -1.6 * k; doorR.rotation.y = 1.6 * k; } };
  },
  desk(c) {
    const g = new THREE.Group();
    const lift = pivot(g, 0, 0, 0);
    for (const x of [-0.5, 0.5]) { block(0.06, 0.04, 0.5, toon(c.metal), { x, y: 0.02, parent: g }); block(0.06, 0.4, 0.06, toon(c.metal), { x, y: 0.22, parent: g }); block(0.045, 0.4, 0.045, toon(c.dark), { x, y: 0.42, parent: lift }); }
    block(1.2, 0.04, 0.6, toon(c.body), { y: 0.64, parent: lift });
    block(0.4, 0.26, 0.02, toon(P.wallDark), { y: 0.84, z: -0.18, parent: lift });
    block(0.06, 0.12, 0.04, toon(c.metal), { y: 0.7, z: -0.18, parent: lift });
    return { group: g, open(p) { lift.position.y = 0.3 * ease(p); } };
  },
  table(c) {
    const g = new THREE.Group();
    const top = pivot(g, 0, 0, 0);
    block(1.0, 0.05, 0.6, toon(c.body), { y: 0.5, parent: top });
    for (const [x, z] of [[-0.42, -0.24], [0.42, -0.24], [-0.42, 0.24], [0.42, 0.24]]) block(0.05, 0.5, 0.05, toon(c.dark), { x, y: 0.25, z, parent: g });
    const leaf = block(0.35, 0.05, 0.6, toon(c.accent), { x: 0.32, y: 0.47, parent: top });
    block(0.3, 0.12, 0.3, toon(P.ink), { y: 0.58, z: -0.05, parent: top }).scale.set(1, 0.4, 1);
    return { group: g, open(p) { const k = ease(p); leaf.position.x = 0.32 + 0.36 * k; leaf.position.y = 0.47 + 0.03 * k; } };
  },
  bench(c) {
    const g = new THREE.Group();
    block(1.3, 0.08, 0.36, toon(c.body), { y: 0.42, parent: g });
    for (const x of [-0.55, 0.55]) block(0.08, 0.4, 0.3, toon(c.dark), { x, y: 0.2, parent: g });
    const strip = glowMat(c.glow);
    block(1.28, 0.02, 0.02, strip, { y: 0.37, z: 0.17, parent: g });
    return { group: g, open(p, t) { strip.emissiveIntensity = ease(p) * (2 + Math.sin(t * 5)); } };
  },
  canopy(c) {
    const g = new THREE.Group();
    block(0.3, 0.06, 0.3, toon(c.dark), { y: 0.03, parent: g });
    mesh(cyl(0.025, 0.025, 1.3, 8), toon(c.metal), { y: 0.68, parent: g });
    const panels = [0, 1, 2, 3].map(i => { const pv = pivot(g, 0, 1.32, 0); pv.rotation.y = i * Math.PI / 2; const panel = pivot(pv); block(0.7, 0.02, 0.5, toon(i % 2 ? c.body : c.accent), { x: 0.35, parent: panel }); return panel; });
    return { group: g, open(p) { const k = ease(p); panels.forEach(pn => { pn.rotation.z = -1.3 * (1 - k) - 0.15 * k; }); } };
  },
  plant(c) {
    const g = new THREE.Group();
    block(0.8, 0.26, 0.3, toon(c.dark), { y: 0.13, parent: g });
    const sprouts = [-0.28, -0.1, 0.1, 0.28].map(x => { const s = pivot(g, x, 0.26, 0); mesh(cyl(0.012, 0.012, 0.2, 6), toon(0x3f8f4f), { y: 0.1, parent: s }); mesh(new THREE.SphereGeometry(0.07, 10, 8), toon(0x5dbb63), { y: 0.22, parent: s }); return s; });
    const lampMat = glowMat(0xd9a7ff);
    block(0.8, 0.03, 0.08, lampMat, { y: 0.72, parent: g });
    for (const x of [-0.38, 0.38]) block(0.02, 0.46, 0.02, toon(c.metal), { x, y: 0.49, parent: g });
    sprouts.forEach(s => s.scale.setScalar(0.5));
    return { group: g, open(p) { const k = ease(p); lampMat.emissiveIntensity = 2 * k; sprouts.forEach((s, i) => s.scale.setScalar(0.5 + 0.5 * ease(p - i * 0.1))); } };
  },
  cart(c) {
    const g = new THREE.Group();
    block(0.5, 0.36, 0.36, toon(c.body), { y: 0.28, parent: g });
    block(0.46, 0.04, 0.32, toon(c.accent), { y: 0.47, parent: g });
    const wheels = [[-0.2, -0.15], [0.2, -0.15], [-0.2, 0.15], [0.2, 0.15]].map(([x, z]) => { const w = mesh(cyl(0.06, 0.06, 0.04, 12), toon(c.dark), { x, y: 0.06, z, parent: g }); w.rotation.x = Math.PI / 2; return w; });
    const arm = pivot(g, 0.15, 0.48, 0);
    block(0.03, 0.3, 0.03, toon(c.metal), { y: 0.15, parent: arm });
    return { group: g, open(p, t) { const k = ease(p); wheels.forEach(w => { w.rotation.y = t * 6 * k; }); arm.rotation.z = -0.6 * k; } };
  },
  parcel(c) {
    const g = new THREE.Group();
    block(0.4, 0.3, 0.3, toon(0xb99c6b), { y: 0.15, parent: g });
    const flap = pivot(g, 0, 0.3, -0.15);
    block(0.4, 0.01, 0.15, toon(0xc9ab79), { z: 0.075, parent: flap });
    return { group: g, open(p) { flap.rotation.x = -1.8 * ease(p); } };
  },
};

const ACCENT = { home: P.cyan, electronics: P.violet, lifestyle: P.magenta, future: P.gold, furniture: P.lime, outdoor: 0xff9f43 };

// Builds the model for a catalog product, normalised so its largest dimension equals `size` metres.
export function productModel(product, { size = 1 } = {}) {
  const kind = archetypeFor(product);
  const accent = ACCENT[product?.category] || P.cyan;
  const colors = { body: 0xe8edf2, dark: 0x2a3448, metal: 0x9eb5c3, accent, glow: accent };
  if (['sofa', 'bed', 'chair', 'canopy'].includes(kind)) colors.body = new THREE.Color(accent).lerp(new THREE.Color(0xe8edf2), 0.55).getHex();
  const built = (BUILDERS[kind] || BUILDERS.parcel)(colors);
  const wrap = new THREE.Group();
  wrap.add(built.group);
  const box = new THREE.Box3().setFromObject(built.group);
  const dims = box.getSize(new THREE.Vector3());
  const scale = size / Math.max(dims.x, dims.y, dims.z, 0.001);
  built.group.scale.setScalar(scale);
  built.group.position.y = -box.min.y * scale;
  wrap.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  built.open(0, 0, 0);
  return { group: wrap, kind, open: built.open, height: dims.y * scale };
}
