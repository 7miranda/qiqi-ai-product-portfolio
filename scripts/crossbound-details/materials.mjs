// These substitutions are exclusively rendering material, light and canvas-ink parameters.
export function roomMaterials(source, file) {
  const once = (from, to) => {
    if (source.split(from).length !== 2) throw new Error(`Missing room material anchor: ${file}`);
    source = source.replace(from, to);
  };
  if (file === 'v3/world/kit.js') {
    once("import * as THREE from 'three';", "import * as THREE from 'three';\nimport { industrialColor } from '../../details/room-materials.js';");
    once('export const PALETTE = {', 'export const PALETTE = Object.fromEntries(Object.entries({');
    once('};\nconst FONT', '}).map(([name, color]) => [name, industrialColor(color)]));\nconst FONT');
    const start = source.indexOf('let gradient;');
    const end = source.indexOf('export function toon(');
    if (start < 0 || end < start) throw new Error('Missing legacy material helper');
    source = source.slice(0, start) + source.slice(end);
    once('new THREE.MeshToonMaterial({ color, gradientMap: gradientMap(), ...extra })', 'new THREE.MeshStandardMaterial({ color: industrialColor(color), roughness: 0.48, metalness: 0.18, ...extra })');
    once('new THREE.MeshBasicMaterial({ color, toneMapped: false, transparent: opacity < 1, opacity })', 'new THREE.MeshBasicMaterial({ color: industrialColor(color), toneMapped: false, transparent: opacity < 1, opacity })');
    once("ctx.fillStyle = bg;", "ctx.fillStyle = industrialColor(bg);");
    once('ctx.strokeStyle = border;', 'ctx.strokeStyle = industrialColor(border);');
    once("ctx.fillStyle = l.color || '#f2f6f8';", "ctx.fillStyle = industrialColor(l.color || '#f2f6f8');");
    once("ctx.shadowColor = l.color || '#fff';", "ctx.shadowColor = industrialColor(l.color || '#fff');");
  }
  if (file === 'v3/world/world.js') {
    once('new THREE.Fog(0x0b1020, 26, 48)', 'new THREE.Fog(0x071218, 26, 48)');
    once('new THREE.HemisphereLight(0x9aa8ff, 0x2a2238, 2.6)', 'new THREE.HemisphereLight(0xd6edf4, 0x152a31, 2.6)');
  }
  if (file === 'v3/world/products.js') {
    once("import { toon, neon, block, mesh, PALETTE as P } from './kit.js';", "import { toon, neon, mesh, PALETTE as P } from './kit.js';\nimport { RoundedBoxGeometry } from '../../vendor/three/RoundedBoxGeometry.js';\nconst block = (w, h, d, material, opts) => mesh(new RoundedBoxGeometry(w, h, d, 1, Math.min(w, h, d) * 0.2), material, opts);");
    once('const accent = ACCENT[product?.category] || P.cyan;', 'const accent = 0x799fae;');
    once("const ACCENT = { home: P.cyan, electronics: P.violet, lifestyle: P.magenta, future: P.gold, furniture: P.lime, outdoor: 0xff9f43 };\n", '');
    once("  if (['sofa', 'bed', 'chair', 'canopy'].includes(kind)) colors.body = new THREE.Color(accent).lerp(new THREE.Color(0xe8edf2), 0.55).getHex();\n", '');
  }
  if (file === 'v3/world/scenes.js') {
    once("import { PROMOTIONS }", "import { catalogPreview } from '../../details/catalog-preview.js';\nimport { PROMOTIONS }");
    once('  try {\n    shotKit ||=', '  try {\n    const studio = await catalogPreview(window.CrossboundProductPreview, p.id);\n    if (studio) { shots.set(p.id, studio); return studio; }\n    shotKit ||=');
    once('renderer.setSize(360, 360, false); renderer.outputColorSpace = THREE.SRGBColorSpace;', 'renderer.setSize(512, 512, false); renderer.outputColorSpace = THREE.SRGBColorSpace;\n      renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;');
    once('new THREE.HemisphereLight(0xffffff, 0x8899aa, 2.4)', 'new THREE.HemisphereLight(0xd6edf4, 0x243944, 1.6)');
  }
  return source;
}
