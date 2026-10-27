// REQ-053 single-mode 2.5D view (map + full-screen scenes): pure rules, build hook points, deployment default.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import {
  WORLDS, ROOMS_3D, parseMode, variantFor, qualityFor, QUALITY, downgrade, createFpsMonitor,
  currentWorld, roomStates, zoneStates, taskFor, nearestInteractable, pickShowcase, fitStars, fitTier, capacityBar,
  archetypeFor, crateLayout, settlementSplit, budgetCurve, cashPlan, loanFor,
} from '../public/previews/crossbound/v3/world/logic.js';

const folder = 'public/previews/crossbound';
const snap = (stage, extra = {}) => ({ company: { stage, ...extra } });

test('seven step scenes in engine order: W1/W2/W5 are 3D rooms, W0/W3/W4/W6 are 2D scenes', () => {
  assert.deepEqual(WORLDS.map(w => w.name), ['市场研究所', '选品展厅', '定价财务室', '商品页工作室', '推广室', '物流仓', '财报结算厅']);
  assert.deepEqual([...ROOMS_3D], ['w1', 'w2', 'w5']);
  assert.deepEqual(WORLDS.map(w => w.zone), ['market', 'product', 'supply', 'growth', 'growth', 'fulfillment', 'headquarters'], 'each scene opens from a campus building');
});

test('stage -> scene (REQ-056: stage 0 is the W0 market scene; stage 3 splits listing W3 / promotion W4)', () => {
  assert.equal(currentWorld(snap(0)), 'w0');
  assert.equal(currentWorld(snap(1)), 'w1');
  assert.equal(currentWorld(snap(2)), 'w2');
  assert.equal(currentWorld(snap(3)), 'w3');
  assert.equal(currentWorld(snap(3, { currentListing: { id: 'x' } })), 'w4');
  assert.equal(currentWorld(snap(4)), 'w5');
  assert.equal(currentWorld(snap(5)), 'w6');
  assert.equal(currentWorld(snap(6)), 'w6', 'a settled round shows its result in the settlement hall');
});

test('map progress (REQ-053 §3): rooms and campus buildings are done / current / upcoming', () => {
  assert.deepEqual(roomStates(snap(2)), { w0: 'done', w1: 'done', w2: 'current', w3: 'upcoming', w4: 'upcoming', w5: 'upcoming', w6: 'upcoming' });
  assert.equal(roomStates(snap(3, { currentListing: {} })).w3, 'done');
  assert.deepEqual(zoneStates(snap(0)), { market: 'current', product: 'upcoming', supply: 'upcoming', growth: 'upcoming', fulfillment: 'upcoming', headquarters: 'upcoming' });
  assert.equal(zoneStates(snap(3)).growth, 'current', 'listing in progress');
  assert.equal(zoneStates(snap(3, { currentListing: {} })).growth, 'current', 'promotion still in the same building');
  assert.deepEqual(zoneStates(snap(6)), { market: 'done', product: 'done', supply: 'done', growth: 'done', fulfillment: 'done', headquarters: 'current' });
});

test('one task sentence at a time (3D-055), click wording, following room sub-steps', () => {
  assert.equal(taskFor(snap(0)), '点市场研究，选一个销售市场');
  assert.equal(taskFor(snap(1)), '点一件商品拿起来看看，挑 1 件');
  assert.equal(taskFor(snap(1), { product: 'tech' }), '点左边的供应商，谈一家');
  assert.equal(taskFor(snap(1), { product: 'tech', supplier: 'fast' }), '都选好了，正在前往定价财务室');
  assert.equal(taskFor(snap(2)), '点备货拉杆，选一档备货');
  assert.equal(taskFor(snap(2), { planned: true }), '点中央控制台，调好售价和数量后确认');
  assert.equal(taskFor(snap(4)), '点一条出货传送带，选履约方式发货');
  assert.equal(taskFor(snap(6)), '本轮已结算，看完结果就能开启下一轮');
  assert.equal(taskFor(null), '');
});

test('pointer picks the nearest enabled item within reach', () => {
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
  // REQ-056: no data is not a middle rating.
  assert.equal(fitStars({ fit: {} }, 'singapore'), null);
  assert.equal(fitTier({ fit: {} }, 'singapore'), null);
  assert.deepEqual(fitTier({ fit: { singapore: 1.25 } }, 'singapore'), { stars: 5, label: '高' });
  assert.equal(fitTier({ fit: { singapore: 1.05 } }, 'singapore').label, '中');
  assert.equal(fitTier({ fit: { singapore: 0.85 } }, 'singapore').label, '低');
});

test('budget curve (REQ-053 §4.5 ③): visits grow with √budget; the next $1,000 is spelled out', () => {
  const c = budgetCurve(10000, 900);
  assert.equal(c.extra, Math.round(10000 * Math.sqrt(1900 / 900)) - 10000);
  assert.equal(c.points[0][0], 300); assert.equal(c.points.at(-1)[0], 8000);
  assert.ok(budgetCurve(10000, 4000).extra < c.extra, 'diminishing returns');
  assert.deepEqual(budgetCurve(0, 900), { extra: 0, points: [] });
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

test('quality tiers (3D-074): missing WebGL has no room quality; <45 fps for 5 s steps down', () => {
  assert.deepEqual(qualityFor({ webgl: false }), { quality: null, classic: true, reason: 'no_webgl' });
  assert.equal(qualityFor({ width: 1440 }).quality, 'high');
  assert.equal(qualityFor({ coarse: true, width: 390 }).quality, 'mid');
  assert.equal(qualityFor({ cores: 2 }).quality, 'low');
  assert.equal(qualityFor({ stored: 'low', width: 1440 }).quality, 'low', 'player choice wins');
  assert.deepEqual(QUALITY.low, { shadows: false, glow: 0, pixelRatio: 0.75 });
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

test('W2 / W5 crates: 100 units per stack, 12 stacks max then taller; REQ-052 split', () => {
  assert.deepEqual(crateLayout(0), { stacks: 0, height: 0 });
  assert.deepEqual(crateLayout(400), { stacks: 4, height: 3 });
  assert.deepEqual(crateLayout(1200), { stacks: 12, height: 3 });
  assert.deepEqual(crateLayout(1600), { stacks: 12, height: 4 });
  assert.deepEqual(settlementSplit(4, 400, 110), { shipped: 3, returned: 1 });
  assert.deepEqual(settlementSplit(4, 400, 0), { shipped: 4, returned: 0 }, 'sold out: everything ships');
  assert.deepEqual(settlementSplit(4, 400, 3), { shipped: 3, returned: 1 }, 'any return keeps one stack to show it');
  assert.deepEqual(settlementSplit(0, 0, 0), { shipped: 0, returned: 0 });
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
  assert.equal(archetypeFor({ name: '可调光桌灯', english: 'DIMMABLE DESK LIGHT' }), 'lamp', 'DESK LIGHT is a lamp, not a desk');
  const src = fs.readFileSync(`${folder}/v3/world/products.js`, 'utf8');
  for (const kind of new Set(kinds)) assert.match(src, new RegExp(`\\n  ${kind}\\(c\\) \\{`), `builder for ${kind}`);
});

test('build output: scenes take the step entry, bridge exposes the draft, no dual-mode leftovers', () => {
  for (const file of ['index.html', 'preview.html']) {
    const html = fs.readFileSync(`${folder}/${file}`, 'utf8');
    assert.equal(html.split('$=!L&&!C&&P&&!v3Paused,').length - 1, 1, `${file}: campus pause hook`);
    assert.equal(html.split('window.CrossboundView?.publish?.(').length - 1, 1, `${file}: snapshot hook`);
    assert.match(html, /\(0,li\.useLayoutEffect\)\(\(\)=>\{window\.CrossboundView\?\.publish\?\.\(/, 'published before paint');
    assert.match(html, /actions:\{select:A,choose:id=>\{const o=La\.find\(x=>x\.id===id\);o&&ur\(o\)\},setSupplier:qe,commit:cr,/, 'scenes use the card handler and the same commit');
    assert.match(html, /setPrice:w,setQuantity:M,setBudget:N,setPromotion:/, 'W2 fine pricing and W4 budget drive the game draft');
    assert.match(html, /setListing:oi,publishListing:Un,/, 'W3 publishes with the game listing action');
    assert.match(html, /draft:\{price:T,quantity:v,budget:C,listing:On,listingQuote:Dd,promotion:v11Promotion\},engine:V11/);
    assert.equal(html.split('function nr(){if(window.CrossboundScenes?.enter?.())return;').length - 1, 1, `${file}: step entry opens the scene`);
    assert.match(html, /if\(Te==="headquarters"\)\{if\(Et>=5&&window\.CrossboundScenes\?\.enter\?\.\(\)\)return;/, 'HQ is the settlement hall from 安排下轮 on');
    assert.ok(!html.includes('v3-campus-3d') && !html.includes('crossbound-view-mode-v1') && !html.includes('data-v3-gate'), `${file}: dual mode removed`);
    assert.match(html, /<script type="module" src="\.\/v3\/world\/boot\.js\?v=[0-9a-f]{10}"><\/script>/);
    const map = html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1];
    assert.match(map, /"\.\/v3\/world\/scenes\.js":"\.\/v3\/world\/scenes\.js\?v=[0-9a-f]{10}"/);
    assert.match(map, /"three":"\.\/vendor\/three\/three\.module\.min\.js\?v=[0-9a-f]{10}"/);
    assert.ok(!/https?:/.test(map), 'import map stays same-origin');
  }
  const baseline = fs.readFileSync('src/baseline/index.html', 'utf8');
  for (const anchor of ['function Vse(', 'function nr(){dt!==null&&Bs(null),', 'function Un(){', '[On,oi]=(0,li.useState)(']) assert.ok(baseline.includes(anchor), `baseline anchor ${anchor}`);
  assert.ok(!fs.existsSync(`${folder}/v3/world/hub.js`), 'the walkable street is gone');
  const css = fs.readFileSync(`${folder}/v3/world/world.css`, 'utf8');
  assert.match(css, /html\[data-v3-mode="scenes"\] \.campaign-missions \{ display: none !important; \}/, 'map progress replaces the step bar');
  assert.ok(fs.existsSync(`${folder}/vendor/three/LICENSE`));
});

test('deployments turn the scenes on unless CROSSBOUND_WORLD overrides it', () => {
  const run = env => {
    execFileSync(process.execPath, ['scripts/package-frontend.mjs'], { env: { ...process.env, ...env }, stdio: 'pipe' });
    return fs.readFileSync('dist/crossbound/runtime-config.js', 'utf8');
  };
  assert.match(run({ CROSSBOUND_WORLD: '' }), /CROSSBOUND_WORLD = "on"/);
  assert.match(run({ CROSSBOUND_WORLD: 'off' }), /CROSSBOUND_WORLD = "off"/);
  assert.match(run({ CROSSBOUND_WORLD: 'split' }), /CROSSBOUND_WORLD = "split"/);
  assert.throws(() => run({ CROSSBOUND_WORLD: 'yes' }));
  assert.match(fs.readFileSync('dist/crossbound/runtime-config.js', 'utf8'), /\/crossbound\/api/);
  fs.rmSync('dist', { recursive: true, force: true });
});

test('REQ-057: the cash plan names the remaining spend and the smallest bridge loan that covers a gap', () => {
  assert.equal(cashPlan(null), null);
  assert.equal(cashPlan({ cashNeed: 0 }), null);
  const ok = cashPlan({ cashNeed: 12000, settlementCash: 8000, laterSpend: 900, cashShortfall: 0 });
  assert.match(ok.text, /\$12,000.*发货结算约 \$8,000.*推广约 \$900.*下轮开局才到账/);
  assert.equal(ok.loan, 0);
  assert.equal(cashPlan({ cashNeed: 9000, settlementCash: 9000, cashShortfall: 3400 }).loan, 4000);
  assert.equal(loanFor(10), 2000);
  assert.equal(loanFor(450000), 200000);
});

test('v1.2: W3 optimize, W6 statements and cash cards are wired into the scenes', () => {
  const scenes = fs.readFileSync(`${folder}/v3/world/scenes.js`, 'utf8');
  assert.match(scenes, /engine\.optimize\(c\)/);
  assert.match(scenes, /'优化 \+5 分 · \$300'/);
  assert.match(scenes, /financialStatements\(s\.company, r\)/);
  for (const t of ['利润表', '资产负债表', '现金流量表', '利润 ≠ 现金']) assert.ok(scenes.includes(t), t);
  assert.match(scenes, /type: 'loan', amount: plan\.loan/);
  const world = fs.readFileSync(`${folder}/v3/world/world.js`, 'utf8');
  assert.match(world, /async function offerLoan/);
});

test('REQ-056: the capacity bar shows expected visits against capacity and warns past it', () => {
  assert.equal(capacityBar(1000, 0), null);
  const fine = capacityBar(12000, 20000);
  assert.equal(fine.over, false); assert.equal(fine.fill, 0.6);
  assert.ok(fine.text.includes('12,000 / 容量 20,000'), fine.text);
  const over = capacityBar(26000, 20000);
  assert.equal(over.over, true); assert.equal(over.fill, 1);
  assert.match(over.text, /再多流量也只能算一半/);
});
test('REQ-056: the market step is a scene with platform cards and market cards, no classic panel', () => {
  const scenes = fs.readFileSync(`${folder}/v3/world/scenes.js`, 'utf8'), boot = fs.readFileSync(`${folder}/v3/world/boot.js`, 'utf8');
  for (const piece of ['const RENDER = { w0: renderW0,', 'engine.configure(c, { platform: p.id })', 'capacityBar(v, cap)']) assert.ok(scenes.includes(piece), piece);
  assert.doesNotMatch(boot, /'hub'/);
});
