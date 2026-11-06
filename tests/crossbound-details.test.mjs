import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { versionImports } from '../scripts/crossbound-details/imports.mjs';
import { industrialColor } from '../public/previews/crossbound/details/room-materials.js';
import { catalogPreview } from '../public/previews/crossbound/details/catalog-preview.js';
import { productModel } from '../public/previews/crossbound/v3/world/products.js';

const folder = 'public/previews/crossbound/';
const current = file => fs.readFileSync(folder + file, 'utf8');

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

test('every import-map target resolves to a shipped asset', () => {
  for (const file of ['index.html', 'preview.html']) {
    const html = current(file);
    const imports = JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
    for (const url of Object.values(imports)) assert.ok(fs.existsSync(folder + url.split('?')[0]), url);
  }
});

test('room finish changes only known display colors and preserves product and warning colors', () => {
  assert.equal(industrialColor(0x8a7dff), 0x6e9ca9);
  assert.equal(industrialColor('#FF4FB3'), '#829fae');
  for (const color of [0xffffff, '#ffffff', '#ff5a5a', 0x000000, null]) assert.equal(industrialColor(color), color);
});

test('both entry pages load the complete visual system with one current stylesheet version', () => {
  const styles = ['styles', 'home', 'workspaces', 'atmosphere', 'material-depth', 'depth-home'];
  const hash = createHash('sha256').update(styles.map(name => current(`details/${name}.css`)).join('')).digest('hex').slice(0, 10);
  for (const file of ['index.html', 'preview.html']) {
    const html = current(file);
    const links = [...html.matchAll(/<link rel="stylesheet" href="\.\/details\/([^"?]+)\?v=([^"?]+)">/g)];
    assert.deepEqual(links.map(m => m[1]), styles.map(name => `${name}.css`));
    assert.ok(links.every(m => m[2] === hash), `${file}: a visual section retained stale resources`);
  }
});

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
