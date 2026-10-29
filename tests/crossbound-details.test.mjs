import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
import { createHash } from 'node:crypto';
import { versionImports } from '../scripts/crossbound-details/imports.mjs';
import { roomMaterials } from '../scripts/crossbound-details/materials.mjs';
import { industrialColor } from '../public/previews/crossbound/details/room-materials.js';
import { catalogPreview } from '../public/previews/crossbound/details/catalog-preview.js';
import { productModel } from '../public/previews/crossbound/v3/world/products.js';

const baseline = '367b11104922d1dbcb7126d2f7fdfa0b3369ea4f';
const folder = 'public/previews/crossbound/';
const upstream = file => execFileSync('git', ['show', `${baseline}:${folder}${file}`], { encoding: 'utf8', maxBuffer: 30e6 });
const current = file => fs.readFileSync(folder + file, 'utf8');
const app = html => [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].find(m => m[1].includes('function Roe('))[1];
const canonical = source => versionImports(source, 'same-release');

test('versioning follows static and dynamic module edges, without rewriting data or external imports', () => {
  const source = `import a from './v2/model.js?v=old';export { b } from '../v11/balance.js';
import('three');import('./world.js');import('https://example.com/a.js');
const image='./assets/model.js';const api='/api/records';`;
  const result = versionImports(source, 'new');
  assert.match(result, /model\.js\?v=new/);
  assert.match(result, /balance\.js\?v=new/);
  assert.match(result, /import\('\.\/world\.js\?v=new'\)/);
  assert.match(result, /import\('three'\)/);
  assert.match(result, /import\('https:\/\/example.com\/a.js'\)/);
  assert.match(result, /const image='\.\/assets\/model.js';const api='\/api\/records'/);
  assert.equal(versionImports(result, 'new'), result);
});

test('every operating module preserves the integrated release code and uses one dependency version', () => {
  const files = execFileSync('git', ['ls-tree', '-r', '--name-only', baseline, folder], { encoding: 'utf8' })
    .split('\n').filter(file => /^public\/previews\/crossbound\/(v11|v2|v3)\/.*\.js$/.test(file));
  const versions = new Set();
  for (const file of files) {
    const relative = file.slice(folder.length), source = current(relative);
    assert.equal(canonical(source), canonical(roomMaterials(upstream(relative), relative)), `${relative}: operating code changed`);
    for (const match of source.matchAll(/(?:from\s*|import\s*\()(["'])(\.{1,2}\/[^"']+\.js)(\?v=[^"']+)?\1/g)) {
      assert.ok(match[3], `${relative}: unversioned dependency ${match[2]}`);
      versions.add(match[3]);
    }
  }
  assert.equal(versions.size, 1, 'nested modules must not retain old release keys');
  for (const file of ['index.html', 'preview.html']) {
    const html = current(file), imports = JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
    for (const [key, url] of Object.entries(imports)) {
      if (/^\.\/(v11|v2|v3)\//.test(key)) assert.equal(url, key + [...versions][0]);
    }
    assert.ok(html.includes(`src="./v3/world/boot.js${[...versions][0]}"`));
  }
});

test('room finish changes only known display colors and preserves product and warning colors', () => {
  assert.equal(industrialColor(0x8a7dff), 0x6e9ca9);
  assert.equal(industrialColor('#FF4FB3'), '#829fae');
  for (const color of [0xffffff, '#ffffff', '#ff5a5a', 0x000000, null]) assert.equal(industrialColor(color), color);
});

test('both entry pages load the complete visual system with one current stylesheet version', () => {
  const styles = ['styles', 'home', 'workspaces', 'operations'];
  const hash = createHash('sha256').update(styles.map(name => current(`details/${name}.css`)).join('')).digest('hex').slice(0, 10);
  for (const file of ['index.html', 'preview.html']) {
    const html = current(file);
    const links = [...html.matchAll(/<link rel="stylesheet" href="\.\/details\/([^"?]+)\?v=([^"?]+)">/g)];
    assert.deepEqual(links.map(m => m[1]), styles.map(name => `${name}.css`));
    assert.ok(links.every(m => m[2] === hash), `${file}: a visual section retained stale resources`);
  }
});

for (const file of ['index.html', 'preview.html']) {
  test(`${file}: UI integration preserves every unrelated application byte`, () => {
    const before = app(upstream(file));
    let after = app(current(file))
      .replace(/^import \{ createCoursesUI \} from "\.\/courses\/ui\.js\?v=[^"]+";\n/, '')
      .replace(/^import \{ createServicesUI \} from "\.\/services\/ui\.js\?v=[^"]+";\n/, '')
      .replace('Object.defineProperty(window,"CrossboundProductPreview",{configurable:true,value:s1t});\n', '')
      .replace('studio:!0,active:!1,onTouch:', 'active:!1,onTouch:')
      .replace('onTouch:r,subject:s,studio}', 'onTouch:r,subject:s}')
      .replace('Xpt,{product:n,active:i,reduced:e,studio}', 'Xpt,{product:n,active:i,reduced:e}')
      .replace('function Xpt({product:n,active:e,reduced:t,studio})', 'function Xpt({product:n,active:e,reduced:t})')
      .replace('(studio?[]:[-1,1]).map(l=>(0,X.jsxs)(Cd,{position:[l*1.68,.58,-.65]', '[-1,1].map(l=>(0,X.jsxs)(Cd,{position:[l*1.68,.58,-.65]')
      .replace('const ServicesUI = createServicesUI({ React: li, Button: Ge });\n', '')
      .replace('const CoursesUI = createCoursesUI({ React: li, Button: Ge });\n', '');
    const names = new Set(['Roe', 'Rse', 'Cse', 'Ese']);
    function functions(source) {
      const sf = ts.createSourceFile('app.js', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
      const found = new Map();
      function visit(node) {
        if (ts.isFunctionDeclaration(node) && names.has(node.name?.text)) found.set(node.name.text, { start: node.getStart(sf), end: node.end, text: node.getText(sf) });
        ts.forEachChild(node, visit);
      }
      visit(sf);
      assert.equal(found.size, names.size);
      return found;
    }
    const original = functions(before);
    for (const [name, node] of [...functions(after)].sort((a, b) => b[1].start - a[1].start)) {
      after = after.slice(0, node.start) + original.get(name).text + after.slice(node.end);
    }
    assert.equal(canonical(after), canonical(before));
  });
}

test('studio preview reuses cached and queued catalog images and releases each subscription', async () => {
  let stopped = 0, requested, deliver;
  const cached = await catalogPreview((id, callback) => {
    requested = id; callback({ image: 'data:cached' }); return () => stopped++;
  }, 'patio-set');
  assert.equal(requested, 'patio-set');
  assert.equal(cached, 'data:cached');
  const queued = catalogPreview((id, callback) => { deliver = callback; return () => stopped++; }, 'chair');
  deliver({ image: 'data:queued' });
  assert.equal(await queued, 'data:queued');
  assert.equal(stopped, 2);
});

test('unavailable or failed catalog renders allow the existing procedural preview', async t => {
  assert.equal(await catalogPreview(null, 'chair'), null);
  assert.equal(await catalogPreview(() => { throw Error('WebGL unavailable'); }, 'chair'), null);
  assert.equal(await catalogPreview((id, callback) => { callback({ failed: true }); return () => {}; }, 'chair'), null);
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let stopped = false;
  const pending = catalogPreview(() => () => { stopped = true; }, 'chair');
  t.mock.timers.tick(4001);
  assert.equal(await pending, null);
  assert.equal(stopped, true);
});

test('procedural product fallback has neutral furniture and stays below the geometry budget through opening', () => {
  for (const name of ['耳机', '音箱', '风扇', '移动电源', '茶几', '收纳套装', '个护', '杯', '快充', '镜', '床', '工位', '长凳', '灯', '阳台休闲桌椅', '沙发', '遮阳', '种植', '推车', '柜', 'parcel']) {
    const model = productModel({ name, category: 'outdoor' });
    let triangles = 0;
    model.group.traverse(o => { if (o.isMesh) triangles += (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3; });
    assert.ok(triangles < 5000, `${name}: ${triangles} triangles`);
    model.open(1, 1, .016);
    model.group.traverse(o => {
      assert.ok(o.position.toArray().every(Number.isFinite), `${name}: invalid opening transform`);
      o.geometry?.dispose(); o.material?.dispose();
    });
  }
  const chair = productModel({ name: '阳台休闲桌椅', category: 'outdoor' });
  const colors = new Set();
  chair.group.traverse(o => { if (o.isMesh) { colors.add(o.material.color.getHex()); o.geometry.dispose(); o.material.dispose(); } });
  assert.ok(colors.has(0xe8edf2));
  assert.ok(!colors.has(0xff9f43));
  assert.ok(!colors.has(0xffd3b1));
});
