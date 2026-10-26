// REQ-051 P0 walkable world (3D 世界需求文档 3D-xxx): pure rules, build hook points, deployment default.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import {
  WORLDS, BUILT, parseMode, variantFor, qualityFor, QUALITY, downgrade, createFpsMonitor,
  currentWorld, doorStates, taskFor, resolveCollisions, nearestInteractable, pickShowcase, fitStars,
  decideMode, recommend2D, comfortFrom, COMFORT_DEFAULTS, restoreSpot, archetypeFor,
} from '../public/previews/crossbound/v3/world/logic.js';

const folder = 'public/previews/crossbound';
const snap = (stage, extra = {}) => ({ company: { stage, ...extra } });

test('seven worlds in engine order; P0 builds only W1', () => {
  assert.deepEqual(WORLDS.map(w => w.name), ['选品展厅', '定价财务室', '商品页工作室', '推广室', '物流仓', '财报结算厅', '荣誉墙展厅']);
  assert.deepEqual([...BUILT], ['w1']);
});

test('stage -> current world (corrected 3D-079 mapping; stage 3 splits listing/promotion)', () => {
  assert.equal(currentWorld(snap(0)), 'hub');
  assert.equal(currentWorld(snap(1)), 'w1');
  assert.equal(currentWorld(snap(2)), 'w2');
  assert.equal(currentWorld(snap(3)), 'w3');
  assert.equal(currentWorld(snap(3, { currentListing: { id: 'x' } })), 'w4');
  assert.equal(currentWorld(snap(4)), 'w5', 'stage 4 is fulfillment, i.e. the logistics warehouse');
  assert.equal(currentWorld(snap(5)), 'w6', 'stage 5 (安排下轮) happens in the settlement hall');
});

test('door lights (3D-010): completed before, current, locked after; honour wall always open', () => {
  assert.deepEqual(doorStates(snap(0)), { w1: 'locked', w2: 'locked', w3: 'locked', w4: 'locked', w5: 'locked', w6: 'locked', w7: 'open' });
  assert.deepEqual(doorStates(snap(2)), { w1: 'completed', w2: 'current', w3: 'locked', w4: 'locked', w5: 'locked', w6: 'locked', w7: 'open' });
  assert.equal(doorStates(snap(3, { currentListing: {} })).w3, 'completed');
  assert.ok(Object.entries(doorStates(snap(6))).every(([id, s]) => s === (id === 'w7' ? 'open' : 'completed')));
});

test('one task sentence at a time (3D-055), following the W1 sub-steps', () => {
  assert.equal(taskFor(snap(0)), '去世界地图终端，选一个市场');
  assert.equal(taskFor(snap(1)), '去选品展厅挑 1 件商品');
  assert.equal(taskFor(snap(1), { inside: 'w1' }), '走到展位前，挑 1 件商品');
  assert.equal(taskFor(snap(1), { inside: 'w1', product: 'tech' }), '跟供应商谈谈，选一家');
  assert.equal(taskFor(snap(1), { inside: 'w1', product: 'tech', supplier: 'fast' }), '从出口离开展厅');
  assert.equal(taskFor(snap(2)), '去定价财务室定价与备货');
  assert.equal(taskFor(snap(6)), '本轮已结算，去荣誉墙展厅看看成就');
  assert.equal(taskFor(null), '');
});

test('collision (3D-014): no walking through walls, people or crates', () => {
  const wall = [{ minX: -5, maxX: 5, minZ: -2, maxZ: 0 }];
  const r = resolveCollisions({ x: 0, z: 0.2 }, 0.4, wall);
  assert.ok(Math.abs(r.z - 0.4) < 1e-6, `pushed to the wall face, got ${r.z}`);
  const inside = resolveCollisions({ x: 4.9, z: -1 }, 0.4, wall);
  assert.ok(inside.x >= 5.4 - 1e-6, 'a centre inside a box leaves by the nearest face');
  const person = resolveCollisions({ x: 0.3, z: 0 }, 0.4, [], [{ x: 0, z: 0, r: 0.45 }]);
  assert.ok(Math.hypot(person.x, person.z) >= 0.85 - 1e-6);
  assert.deepEqual(resolveCollisions({ x: 9, z: 9 }, 0.4, wall), { x: 9, z: 9 });
});

test('interaction reach is 2.5 m and picks the nearest enabled item (3D-016)', () => {
  const items = [{ id: 'a', x: 2, z: 0 }, { id: 'b', x: 1, z: 0 }, { id: 'c', x: 0.5, z: 0, enabled: false }, { id: 'd', x: 3, z: 0 }];
  assert.equal(nearestInteractable({ x: 0, z: 0 }, items).id, 'b');
  assert.equal(nearestInteractable({ x: 10, z: 0 }, items), null);
  assert.equal(nearestInteractable({ x: 5.4, z: 0 }, items).id, 'd');
});

test('showroom puts the recommended product first, keeps the current pick, spreads categories', () => {
  const options = ['home', 'tech', 'beauty'].flatMap(c => Array.from({ length: 8 }, (_, i) => ({ id: `${c}-${i}`, category: c })));
  options.push({ id: 'off', category: 'home', disabled: true });
  const shown = pickShowcase(options, { recommendedId: 'tech-5', currentId: 'beauty-7', limit: 15 });
  assert.equal(shown.length, 15);
  assert.equal(shown[0].id, 'tech-5');
  assert.equal(shown[1].id, 'beauty-7');
  assert.ok(!shown.some(o => o.id === 'off'), 'disabled products are not shown');
  assert.deepEqual(new Set(shown.map(o => o.category)), new Set(['home', 'tech', 'beauty']));
  assert.equal(fitStars({ fit: { singapore: 1.25 } }, 'singapore'), 5);
  assert.equal(fitStars({ fit: {} }, 'singapore'), 3);
});

test('rollout switch: off by default, URL override, stable 50/50 split', () => {
  assert.equal(parseMode(undefined, ''), 'off');
  assert.equal(parseMode('split', '?world=on'), 'on');
  assert.equal(parseMode('on', '?world=off'), 'off');
  assert.equal(variantFor('on', 'x'), 'world');
  assert.equal(variantFor('split', 'p', 'classic'), 'classic');
  const n = Array.from({ length: 2000 }, (_, i) => variantFor('split', `id-${i}`)).filter(v => v === 'world').length;
  assert.ok(n > 900 && n < 1100, `split ${n}/2000`);
});

test('quality tiers (3D-074): only missing WebGL forces classic; <45 fps for 5 s steps down', () => {
  assert.deepEqual(qualityFor({ webgl: false }), { quality: null, classic: true, reason: 'no_webgl' });
  assert.equal(qualityFor({ width: 1440 }).quality, 'high');
  assert.equal(qualityFor({ coarse: true, width: 390 }).quality, 'mid');
  assert.equal(qualityFor({ cores: 2 }).quality, 'low');
  assert.equal(qualityFor({ stored: 'low', width: 1440 }).quality, 'low', 'player choice wins');
  assert.deepEqual(QUALITY.low, { shadows: false, glow: 0, pixelRatio: 0.75 }, '3D-070/074: no weather; tiers scale neon glow');
  assert.ok(QUALITY.high.glow > QUALITY.mid.glow && QUALITY.mid.glow > QUALITY.low.glow);
  assert.equal(downgrade('high'), 'mid');
  const fps = createFpsMonitor();
  let fired = false;
  for (let t = 0; t <= 5100; t += 40) fired = fps(t, 40) || fired;
  assert.ok(fired);
  const ok = createFpsMonitor();
  let quiet = true;
  for (let t = 0; t <= 6000; t += 16) if (ok(t, 16)) quiet = false;
  assert.ok(quiet);
});

test('dual mode (M-001/M-007, B-002): first visit chooses, remembered choice skips the lobby only for 3D with a save', () => {
  assert.deepEqual(decideMode({ dual: true, stored: null }), { choose: true, mode: null, autoStart: false }, 'no preselection');
  assert.deepEqual(decideMode({ dual: true, stored: '3d', hasSave: true }), { choose: false, mode: '3d', autoStart: true });
  assert.deepEqual(decideMode({ dual: true, stored: '3d', hasSave: false }), { choose: false, mode: '3d', autoStart: false });
  assert.deepEqual(decideMode({ dual: true, stored: '2d', hasSave: true }), { choose: false, mode: '2d', autoStart: false });
  assert.equal(decideMode({ dual: true, stored: null, legacyClassic: true }).mode, '2d', 'P0 classic opt-out migrates to 2D');
  assert.equal(decideMode({ dual: false, stored: '3d', hasSave: true }).mode, '2d', 'flag off → 2D only');
  assert.equal(decideMode({ dual: true, stored: '3d', hasSave: true, webgl: false }).mode, '2d', 'no WebGL → 2D');
  assert.equal(recommend2D({ fps: 24, quality: 'high' }), true);
  assert.equal(recommend2D({ fps: 58, quality: 'low' }), true);
  assert.equal(recommend2D({ fps: 60, quality: 'mid' }), false);
  assert.equal(recommend2D({ fps: null, quality: 'high' }), false, 'unknown fps never forces a recommendation');
});

test('comfort settings (M-006): sensitivity 50%, head bob off, FOV clamped to 55–75', () => {
  assert.deepEqual(COMFORT_DEFAULTS, { sensitivity: 50, headBob: false, fov: 55 });
  assert.deepEqual(comfortFrom(null), COMFORT_DEFAULTS);
  assert.deepEqual(comfortFrom({ sensitivity: 400, headBob: 'yes', fov: 120 }), { sensitivity: 100, headBob: false, fov: 75 });
  assert.equal(comfortFrom({ fov: 40 }).fov, 55);
  assert.equal(comfortFrom({ headBob: true }).headBob, true);
});

test('refresh restore (B-003): same run + round only, interiors only while their stage is current', () => {
  const s = { company: { runSeed: 7, round: 2, stage: 1 } };
  assert.deepEqual(restoreSpot({ key: '7:2', scene: 'w1', x: 3, z: 4, yaw: 0.5 }, s), { scene: 'w1', x: 3, z: 4, yaw: 0.5 });
  assert.equal(restoreSpot({ key: '7:1', scene: 'hub', x: 1, z: 1 }, s), null, 'older round');
  assert.equal(restoreSpot({ key: '7:2', scene: 'w1', x: 3, z: 4 }, { company: { runSeed: 7, round: 2, stage: 2 } }), null, 'W1 already done');
  assert.equal(restoreSpot({ key: '7:2', scene: 'hub', x: NaN, z: 1 }, s), null);
  assert.equal(restoreSpot({ key: '7:2', scene: 'w9', x: 1, z: 1 }, s), null);
  assert.equal(restoreSpot({ key: '7:2', scene: 'hub', x: 1, z: 1 }, s).yaw, 0);
});

test('product models (F-001): every catalog product maps to a recognisable archetype, none fall back to a parcel', () => {
  const t = fs.readFileSync('src/baseline/index.html', 'utf8');
  const dec = s => s.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  const products = [];
  for (const m of t.matchAll(/\{id:"([\w-]+)",name:"([^"]+)",english:"([^"]+)",category:"(\w+)"/g)) products.push({ name: dec(m[2]), english: m[3] });
  for (const m of t.matchAll(/Ln\("([\w-]+)","([^"]+)","([^"]+)","(\w+)","([^"]*)"/g)) products.push({ name: dec(m[2]), english: m[3], baseCategory: dec(m[5]) });
  assert.equal(products.length, 100);
  const kinds = products.map(archetypeFor);
  assert.ok(!kinds.includes('parcel'), products.filter(p => archetypeFor(p) === 'parcel').map(p => p.name).join('、'));
  assert.ok(new Set(kinds).size >= 18, 'enough variety to tell products apart');
  assert.equal(archetypeFor({ name: '降噪无线耳机', english: 'NOISE CANCELLING EARBUDS' }), 'earbuds');
  assert.equal(archetypeFor({ name: '桌面循环风扇', english: 'DESK FAN' }), 'fan');
  assert.equal(archetypeFor({ name: '可调光桌灯', english: 'DIMMABLE DESK LIGHT' }), 'lamp', 'DESK LIGHT is a lamp, not a desk');
  const src = fs.readFileSync(`${folder}/v3/world/products.js`, 'utf8');
  for (const kind of new Set(kinds)) assert.match(src, new RegExp(`\\n  ${kind}\\(c\\) \\{`), `builder for ${kind}`);
});

test('build output: hooks applied once, world wired locally (no CDN), classic coach hidden in world', () => {
  for (const file of ['index.html', 'preview.html']) {
    const html = fs.readFileSync(`${folder}/${file}`, 'utf8');
    assert.equal(html.split('$=!L&&!C&&P&&!v3Paused,').length - 1, 1, `${file}: campus pause hook`);
    assert.equal(html.split('window.CrossboundView?.publish?.(').length - 1, 1, `${file}: snapshot hook`);
    assert.match(html, /actions:\{select:A,setSupplier:qe,commit:cr,/, 'world drives the engine through its own commit');
    assert.match(html, /<script type="module" src="\.\/v3\/world\/boot\.js\?v=[0-9a-f]{10}"><\/script>/);
    const map = html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1];
    assert.match(map, /"three":"\.\/vendor\/three\/three\.module\.min\.js\?v=[0-9a-f]{10}"/);
    assert.ok(!/https?:/.test(map), 'import map stays same-origin');
    // B-001/B-002: snapshot published before paint; mode decided in a blocking head script before the app module.
    assert.match(html, /\(0,li\.useLayoutEffect\)\(\(\)=>\{window\.CrossboundView\?\.publish\?\.\(/);
    const head = html.slice(0, html.indexOf('</head>'));
    assert.ok(head.includes('data-v3-gate') && head.includes('crossbound-view-mode-v1'), `${file}: pre-paint gate script`);
    assert.ok(head.indexOf('v3/world/boot.js') < html.indexOf('<script type="module">'), 'boot runs before the app module');
    assert.equal(html.split('className:"v3-mode-toggle"').length - 1, 1, `${file}: 2D header switch`);
  }
  const baseline = fs.readFileSync('src/baseline/index.html', 'utf8');
  for (const anchor of ['function Vse(', 'function R5(', '[Dt,qe]=(0,li.useState)("standard")', '[h,A]=(0,li.useState)("")']) assert.ok(baseline.includes(anchor), `baseline anchor ${anchor}`);
  const css = fs.readFileSync(`${folder}/v3/world/world.css`, 'utf8');
  assert.match(css, /html\[data-v3-world\] \.v5-walkthrough/);
  assert.ok(fs.existsSync(`${folder}/vendor/three/LICENSE`));
});

test('deployments keep the 3D world off unless CROSSBOUND_WORLD is set', () => {
  const run = env => {
    execFileSync(process.execPath, ['scripts/package-frontend.mjs'], { env: { ...process.env, ...env }, stdio: 'pipe' });
    return fs.readFileSync('dist/crossbound/runtime-config.js', 'utf8');
  };
  assert.match(run({ CROSSBOUND_WORLD: '' }), /CROSSBOUND_WORLD = "off"/);
  assert.match(run({ CROSSBOUND_WORLD: 'split' }), /CROSSBOUND_WORLD = "split"/);
  assert.throws(() => run({ CROSSBOUND_WORLD: 'yes' }));
  assert.match(fs.readFileSync('dist/crossbound/runtime-config.js', 'utf8'), /\/crossbound\/api/);
  fs.rmSync('dist', { recursive: true, force: true });
});
