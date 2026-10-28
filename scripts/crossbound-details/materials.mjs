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
  return source;
}
