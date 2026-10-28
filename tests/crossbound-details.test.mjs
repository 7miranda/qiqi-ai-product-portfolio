import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
import { createHash } from 'node:crypto';
import { versionImports } from '../scripts/crossbound-details/imports.mjs';
import { roomMaterials } from '../scripts/crossbound-details/materials.mjs';
import { industrialColor } from '../public/previews/crossbound/details/room-materials.js';

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
      .replace(/^import \{ createServicesUI \} from "\.\/services\/ui\.js\?v=[^"]+";\n/, '')
      .replace('const ServicesUI = createServicesUI({ React: li, Button: Ge });\n', '');
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
