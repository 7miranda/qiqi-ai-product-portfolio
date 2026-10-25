// REQ-051 P0 world: hub street + third-person walking + W1 选品展厅 round trip (3D-081).
// Player actions are translated into the engine's own select / commit calls; no rule is re-implemented.
import * as THREE from 'three';
import { HELP } from '../../v11/model.js';
import { WORLDS, BUILT, QUALITY, downgrade, createFpsMonitor, currentWorld, doorStates, taskFor, resolveCollisions, nearestInteractable, pickShowcase, money } from './logic.js';
import { createUI, createSounds } from './ui.js';
import { buildHub } from './hub.js';
import { buildShowroom, SUPPLIERS } from './showroom.js';
import { character, lightPillar, PALETTE, disposeTree } from './kit.js';

const WALK = 4.5, RUN = 7;          // 3D-014 m/s
const PITCH = THREE.MathUtils.degToRad(18), FOV = 55;   // 3D-015
const PICKS_KEY = 'crossbound-world-w1-v1';
const nextFrame = () => new Promise(r => requestAnimationFrame(() => r()));

export function mountWorld({ store, quality: initialQuality }) {
  const touch = matchMedia('(pointer: coarse)').matches;
  const root = document.createElement('div');
  root.id = 'v3-world';
  document.body.append(root);
  const canvas = document.createElement('canvas');
  canvas.className = 'v3-canvas';
  canvas.tabIndex = 0;
  canvas.setAttribute('aria-label', '可走动的 3D 经营世界：WASD 或摇杆移动，E 或点一下交互');
  root.append(canvas);
  const ui = createUI(root, { touch });
  const sound = createSounds();

  let quality = initialQuality || 'high';
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: quality === 'high', powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 200);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.night);

  // Lights: dim neon night. Only the key light casts shadows (性能红线).
  const hemi = new THREE.HemisphereLight(0x9aa8ff, 0x2a2238, 2.6);
  const ambient = new THREE.AmbientLight(0xffffff, 0.7);
  const key = new THREE.DirectionalLight(0xd2e0ff, 2.6);
  key.position.set(-14, 22, 12);
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -32, right: 32, top: 24, bottom: -24, far: 80 });
  key.shadow.bias = -0.0005;
  const neonA = new THREE.PointLight(PALETTE.magenta, 60, 22, 2);
  const neonB = new THREE.PointLight(PALETTE.cyan, 60, 22, 2);
  scene.add(hemi, ambient, key, neonA, neonB);

  // Player.
  const player = character();
  scene.add(player.root);
  const pos = { x: 0, z: 0 };
  let facing = 0, yaw = 0, pitch = PITCH, zoom = 0, speedNow = 0;
  const pillar = lightPillar(PALETTE.gold);
  scene.add(pillar);

  // Scenes: the hub persists; interiors are rebuilt on entry from the current snapshot.
  let hub = buildHub({ quality: QUALITY[quality] });
  let active = null;
  let inside = null;          // null = hub, 'w1' = showroom
  let transitioning = false;
  const picks = loadPicks();

  function loadPicks() {
    try {
      const saved = JSON.parse(localStorage.getItem(PICKS_KEY) || 'null');
      const c = store.snapshot()?.company;
      if (saved && c && saved.key === `${c.runSeed}:${c.round}`) return { product: saved.product, supplier: saved.supplier };
    } catch { /* ignore */ }
    return { product: null, supplier: null };
  }
  function savePicks() {
    const c = store.snapshot()?.company;
    if (!c) return;
    try { localStorage.setItem(PICKS_KEY, JSON.stringify({ key: `${c.runSeed}:${c.round}`, ...picks })); } catch { /* ignore */ }
  }

  function applyQuality(next) {
    quality = next;
    const q = QUALITY[quality];
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2) * q.pixelRatio);
    renderer.shadowMap.enabled = q.shadows;
    key.castShadow = q.shadows;
    scene.traverse(o => { if (o.material) o.material.needsUpdate = true; });
    resize();
  }

  function setScene(next, spawn) {
    if (active && active !== hub) { scene.remove(active.group); disposeTree(active.group); }
    if (active === hub) scene.remove(hub.group);
    active = next;
    scene.add(active.group);
    inside = active.id === 'hub' ? null : active.id;
    scene.fog = inside ? new THREE.Fog(0x0b1020, 18, 40) : new THREE.FogExp2(0x0a1020, 0.02);
    neonA.position.set(inside ? -6 : -18, 5, inside ? -4 : 6);
    neonB.position.set(inside ? 6 : 14, 5, inside ? 2 : -6);
    // Model front is +z; yaw 0 puts the camera at +z looking toward -z, so face away from it.
    pos.x = spawn.x; pos.z = spawn.z; facing = spawn.yaw + Math.PI; yaw = spawn.yaw;
    zoom = 0;
    refresh();
  }

  async function travel(next, spawn) {
    if (transitioning) return;
    transitioning = true;
    sound.door();
    await ui.fade(true);
    setScene(next, spawn);
    await nextFrame();
    await ui.fade(false);
    transitioning = false;
  }

  function spawnPoint() {
    const s = store.snapshot();
    const world = currentWorld(s);
    if (world === 'hub' || (s?.company?.stage ?? 0) >= 6) return hub.spawn;  // 3D-011
    return hub.doorFront(world);
  }

  function buildW1() {
    const s = store.snapshot();
    const products = pickShowcase(s?.options || [], { recommendedId: s?.recommendedId, currentId: picks.product, limit: 15 });
    return buildShowroom({ products, recommendedId: s?.recommendedId, marketId: s?.company?.marketId, marketLabel: s?.market?.name });
  }

  // ---------- Engine bridge ----------
  const engine = {
    act: () => store.snapshot()?.actions,
    async select(id) {
      engine.act()?.select(id);
      return store.waitFor(s => s.choice?.id === id, 1500);
    },
    // Commits the current stage with the engine's own validation; closes the classic panel it opens.
    async commit() {
      const before = store.snapshot()?.company?.stage;
      engine.act()?.commit();
      const after = await store.waitFor(s => s.company?.stage !== before, 2500);
      await nextFrame();
      if (after) store.snapshot()?.actions?.close();
      return after;
    },
    // The engine resets the supplier when stage 2 starts, so re-apply until it sticks.
    async supplier(id) {
      for (let i = 0; i < 5; i++) {
        await nextFrame();
        store.snapshot()?.actions?.setSupplier(id);
        if (await store.waitFor(s => s.supplier === id, 400)) return true;
      }
      return false;
    },
    openPanel(view) { const a = engine.act(); if (!a) return; if (view) a.panel(view); else a.open(); },
  };

  // ---------- Interactions ----------
  let lastActivity = performance.now(), idleHints = 0;
  function mark() { lastActivity = performance.now(); }
  function bubbleAt(text, x, z, y = 2.6) {
    const p = project(x, y, z);
    ui.bubble(text, p?.x, p?.y);
  }

  async function interact(item) {
    if (!item || ui.busy || transitioning) return;
    mark();
    player.reach();
    const s = store.snapshot();
    const stage = s?.company?.stage ?? 0;
    const states = doorStates(s);
    switch (item.kind) {
      case 'map': return marketTerminal(stage);
      case 'help': return helpTerminal();
      case 'settings': return settingsTerminal();
      case 'npc': return receptionistTalk();
      case 'door': return door(item, states[item.world], stage);
      case 'product': return productStand(item.productId);
      case 'supplier': return supplierTalk(item.supplierId);
      case 'exit': return leaveShowroom();
      default: return undefined;
    }
  }

  async function marketTerminal(stage) {
    const s = store.snapshot();
    if (stage !== 0) {
      await ui.screen({ kicker: 'WORLD MAP · 世界地图终端', title: `本轮市场：${s?.market?.name || '已选定'}`, body: '本轮的销售国家已经确定。下一轮开始时可以回来换市场。', actions: [{ label: '好的', value: 'ok', primary: true }] });
      return;
    }
    const options = s?.options || [];
    const list = options.map(o => ({ id: o.id, title: o.countryLabel || o.name, badge: o.launchCost != null ? `进入费 ${money(o.preview?.cashDelta != null ? -o.preview.cashDelta : o.launchCost)}` : '', detail: o.summary || o.name, disabled: o.disabled }));
    const result = await ui.screen({ kicker: 'WORLD MAP · 世界地图终端', title: '选一个销售国家', body: '确认后扣除市场进入费，然后去选品展厅挑商品。', list, selected: s?.choice?.id || s?.recommendedId, actions: [{ label: '确认进入这个市场', value: 'confirm', primary: true, needsSelection: true }] });
    if (result?.action !== 'confirm' || !result.id) return;
    await engine.select(result.id);
    const after = await engine.commit();
    if (!after) { sound.error(); bubbleAt('这个市场暂时进不去，换一个试试', -6, -4); return; }
    complete(`市场已选定：${after.market?.name || ''}`);
  }

  async function helpTerminal() {
    const entries = Object.entries(HELP || {});
    for (;;) {
      const r = await ui.screen({ kicker: 'HELP · 帮助终端', title: '经营逻辑卡', body: '选一张卡，看看背后的道理。', list: entries.map(([id, [title]]) => ({ id, title })), actions: [{ label: '查看这张卡', value: 'read', primary: true, needsSelection: true }] });
      if (r?.action !== 'read') return;
      const [title, text] = HELP[r.id];
      await ui.talk({ speaker: '帮助终端', mark: '?', lines: splitLines(`${title}：${text}`) });
    }
  }

  async function settingsTerminal() {
    const list = [
      { id: 'q-high', title: '画质：高', badge: quality === 'high' ? '当前' : '' },
      { id: 'q-mid', title: '画质：中', badge: quality === 'mid' ? '当前' : '' },
      { id: 'q-low', title: '画质：低', badge: quality === 'low' ? '当前' : '' },
      { id: 'classic', title: '经典平面模式', detail: '给低端机或晕 3D 的玩家用，进度与 3D 世界互通' },
      { id: 'home', title: '返回首页' },
    ];
    const r = await ui.screen({ kicker: 'SETTINGS · 设置终端', title: '设置', list, actions: [{ label: '应用', value: 'apply', primary: true, needsSelection: true }] });
    if (r?.action !== 'apply') return;
    if (r.id.startsWith('q-')) { const q = r.id.slice(2); store.setQuality(q); applyQuality(q); ui.notice(`画质已切换为「${{ high: '高', mid: '中', low: '低' }[q]}」`); return; }
    if (r.id === 'classic') { store.goClassic(); return; }
    if (r.id === 'home') { [...document.querySelectorAll('button')].find(b => b.textContent.includes('返回首页'))?.click(); }
  }

  async function receptionistTalk() {
    const s = store.snapshot();
    const first = !hub.talked;
    hub.markTalked();
    const task = taskFor(s, { inside, ...picks });
    await ui.talk({ speaker: '接待员 · 小澜', lines: [first ? '欢迎来到总部街区！' : '有需要随时找我。', `现在要做的是：${task}。`, '地上的金色光柱会带你过去。'] });
  }

  async function door(item, state, stage) {
    const w = WORLDS.find(x => x.id === item.world);
    if (w.id === 'w7') { engine.openPanel('achievements'); return; }
    if (state === 'locked') {
      sound.error();
      const cur = currentWorld(store.snapshot());
      bubbleAt(cur === 'hub' ? '先去世界地图终端选好市场' : `先去${WORLDS.find(x => x.id === cur)?.name}`, item.x, item.z, 4.6);
      return;
    }
    if (state === 'completed') { bubbleAt(`${w.name}本轮已完成`, item.x, item.z, 4.6); return; }
    if (w.id === 'w1' && stage === 1) {
      store.send('world_door_enter', { world: 'w1' });
      enteredAt = performance.now();
      await travel(buildW1(), { x: 0, z: 6.8, yaw: 0 });
      return;
    }
    if (!BUILT.has(w.id)) {
      // P0 scope: unbuilt worlds use the existing classic panel for this step (P1 builds them).
      store.send('world_classic_step', { world: w.id, stage });
      ui.notice(`${w.name}还在建设中，先用经典面板完成「${w.step}」`, 3600);
      engine.openPanel();
    }
  }

  let enteredAt = 0;
  async function productStand(productId) {
    const s = store.snapshot();
    const p = (s?.options || []).find(o => o.id === productId);
    if (!p) return;
    const stand = active.stand?.(productId);
    const r = await ui.screen({
      kicker: `${p.categoryLabel || '商品'} · ${p.english || ''}`,
      title: p.name,
      body: p.sellingPoint || '',
      rows: [['参考价', `$${p.basePrice ?? '-'}`], ['进货成本', `$${p.cost ?? '-'}`], ['供货交期', p.supplierDays ? `${p.supplierDays} 天` : '-'], ...(stand?.recommended ? [['总部推荐', '★ 推荐']] : [])],
      actions: [{ label: '放回去', value: 'back' }, { label: '就它了', value: 'pick', primary: true }],
    });
    if (r?.action === 'pick') {
      if (picks.product !== productId) picks.supplier = null;   // quotes depend on the product
      picks.product = productId;
      savePicks();
      engine.act()?.select(productId);
      sound.confirm();
      refresh();
    } else if (r?.action === 'back' && picks.product === productId) {
      picks.product = null; picks.supplier = null; savePicks(); refresh();
    }
  }

  async function supplierTalk(supplierId) {
    const meta = SUPPLIERS.find(x => x.id === supplierId);
    if (!picks.product) {
      await ui.talk({ speaker: `供应商 · ${meta.name}`, lines: ['先挑一件商品吧，', '我再按那件商品给你报价。'] });
      return;
    }
    const quote = (store.snapshot()?.quotes?.(picks.product) || []).find(q => q.id === supplierId);
    const lines = quote
      ? [`我是${quote.name}。`, `单价 $${quote.unitCost}，起订 ${quote.moq} 件，交期 ${quote.leadDays} 天。`, quote.benefit]
      : [`我是${meta.name}，报价稍后给你。`];
    const choice = await ui.talk({ speaker: `供应商 · ${meta.name}`, lines, choices: [{ label: '再看看', value: 'later' }, { label: '选他', value: 'pick', primary: true }] });
    if (choice === 'pick') { picks.supplier = supplierId; savePicks(); sound.confirm(); refresh(); }
  }

  async function leaveShowroom() {
    const stage = store.snapshot()?.company?.stage;
    if (stage === 1 && !(picks.product && picks.supplier)) {
      const c = await ui.talk({ speaker: '展厅广播', mark: '!', lines: [picks.product ? '还没选供应商。' : '还没挑商品。', '现在离开，选择会保留。'], choices: [{ label: '留下继续', value: 'stay', primary: true }, { label: '先离开', value: 'leave' }] });
      if (c === 'leave') await travel(hub, hub.doorFront('w1'));
      return;
    }
    if (stage !== 1) { await travel(hub, hub.doorFront(currentWorld(store.snapshot()))); return; }
    transitioning = true;
    await engine.select(picks.product);
    const after = await engine.commit();
    if (!after) {
      transitioning = false;
      sound.error();
      ui.notice('这件商品现在不能选（现金或库存条件不满足），换一件试试', 3600);
      return;
    }
    await engine.supplier(picks.supplier);
    store.send('world_complete', { world: 'w1', dwell_ms: Math.round(performance.now() - enteredAt) });
    transitioning = false;
    // 3D-067: completion teleports straight to the next world's door.
    await travel(hub, hub.doorFront('w2'));
    complete('选品展厅完成！下一站：定价财务室');
  }

  function complete(message) {   // 3D-057: gold flash + chime + task update
    ui.flash(); sound.complete(); ui.notice(message, 3200); refresh();
  }

  function splitLines(text) {
    const out = []; let rest = String(text);
    while (rest.length > 30) { out.push(rest.slice(0, 30)); rest = rest.slice(30); }
    if (rest) out.push(rest);
    return out;
  }

  // ---------- HUD / task / pillar ----------
  let states = {};
  function refresh() {
    const s = store.snapshot();
    if (!s?.company) return;
    states = doorStates(s);
    hub.update(states);
    if (active && active !== hub) active.update(picks);
    ui.setMoney(money(s.company.cash), s.profitText ? `本轮利润 ${s.profitText}` : '本轮利润 待结算');
    ui.setTask(taskFor(s, { inside, ...picks }));
    const target = currentTarget();
    pillar.visible = !!target;
    if (target) pillar.position.set(target.x, 0, target.z);
  }
  function currentTarget() {
    const s = store.snapshot();
    if (!s?.company) return null;
    if (inside === 'w1') return active.targetFor(picks);
    if ((s.company.stage ?? 0) >= 6) return hub.targetFor('door:w7');
    const world = currentWorld(s);
    return hub.targetFor(world === 'hub' ? 'map' : `door:${world}`);
  }
  const unsubscribe = store.subscribe(() => refresh());

  // ---------- Input ----------
  const keys = new Set();
  const onKey = e => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    const k = e.key.toLowerCase();
    if (e.type === 'keydown') {
      if (k === 'escape') { ui.closeActive(); return; }
      if (ui.busy && (k === 'enter' || k === 'e' || k === ' ')) { ui.advance(); return; }
      if ((k === 'e' || k === 'enter') && !ui.busy && !store.dialogOpen) { interact(focus); e.preventDefault(); return; }
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'].includes(k)) { keys.add(k); mark(); }
    } else keys.delete(k);
  };
  addEventListener('keydown', onKey);
  addEventListener('keyup', onKey);
  const clearKeys = () => keys.clear();
  addEventListener('blur', clearKeys);
  let drag = null;
  canvas.addEventListener('pointerdown', e => { drag = { id: e.pointerId, x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); canvas.focus(); });
  canvas.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    yaw -= (e.clientX - drag.x) * 0.006;
    pitch = THREE.MathUtils.clamp(pitch + (e.clientY - drag.y) * 0.004, 0.12, 0.75);
    drag.x = e.clientX; drag.y = e.clientY; mark();
  });
  const endDrag = e => { if (drag && e.pointerId === drag.id) drag = null; };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('wheel', e => { zoom = THREE.MathUtils.clamp(zoom + Math.sign(e.deltaY) * 0.5, -2, 2); e.preventDefault(); }, { passive: false });

  // ---------- Camera / projection ----------
  const raycaster = new THREE.Raycaster();
  const head = new THREE.Vector3(), want = new THREE.Vector3(), dir = new THREE.Vector3(), tmp = new THREE.Vector3();
  function resize() {
    const w = root.clientWidth || innerWidth, h = root.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = camera.aspect < 0.8 ? 66 : FOV;   // wider vertical FOV in portrait keeps the street readable
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);
  function project(x, y, z) {
    tmp.set(x, y, z).project(camera);
    if (tmp.z > 1) return null;
    return { x: (tmp.x + 1) / 2 * root.clientWidth, y: (1 - tmp.y) / 2 * root.clientHeight };
  }
  function placeCamera(dt) {
    const base = active?.camera?.distance ?? 6;
    // 3D-015: 4–8 m outside, closer inside; portrait phones get extra distance so the character doesn't fill the screen.
    const portrait = camera.aspect < 0.8 ? 1.8 : 0;
    const dist = THREE.MathUtils.clamp(base + zoom + portrait, inside ? 3 : 4, 8 + portrait);
    head.set(pos.x, 1.45, pos.z);
    dir.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
    want.copy(head).addScaledVector(dir, dist);
    raycaster.set(head, dir);
    raycaster.far = dist;
    const hit = raycaster.intersectObjects(active?.occluders || [], false)[0];
    if (hit) want.copy(head).addScaledVector(dir, Math.max(1.2, hit.distance - 0.35));   // no clipping through walls
    camera.position.lerp(want, Math.min(1, dt * 10));
    camera.lookAt(head.x, head.y + 0.45, head.z);   // aim slightly above the head so signage stays in view
  }

  // ---------- Loop ----------
  const clock = new THREE.Clock();
  const fps = createFpsMonitor();
  let focus = null, raf = 0, mapTimer = 0, last = performance.now();
  const mapCtx = ui.minimap.getContext('2d');
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (document.hidden) { last = now; return; }
    const dt = Math.min(0.05, (now - last) / 1000);
    const frameMs = now - last; last = now;
    if (fps(now, frameMs) && quality !== 'low') {
      const q = downgrade(quality); applyQuality(q); store.setQuality(q);
      ui.notice('已自动降画质');   // 3D-074
      store.send('world_quality_down', { quality: q });
    }
    const t = clock.getElapsedTime();
    const paused = ui.busy || store.dialogOpen || transitioning;

    // Movement relative to the camera (3D-014).
    let f = 0, r = 0;
    if (!paused) {
      if (keys.has('w') || keys.has('arrowup')) f += 1;
      if (keys.has('s') || keys.has('arrowdown')) f -= 1;
      if (keys.has('d') || keys.has('arrowright')) r += 1;
      if (keys.has('a') || keys.has('arrowleft')) r -= 1;
      if (ui.stick.active) { r += ui.stick.x; f -= ui.stick.y; mark(); }
    }
    const mag = Math.min(1, Math.hypot(f, r));
    let moving = 0;
    if (mag > 0.05) {
      const run = keys.has('shift') || (ui.stick.active && mag > 0.95);
      const speed = (run ? RUN : WALK) * mag;
      const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
      let mx = fx * f + rx * r, mz = fz * f + rz * r;
      const ml = Math.hypot(mx, mz) || 1; mx /= ml; mz /= ml;
      const next = resolveCollisions({ x: pos.x + mx * speed * dt, z: pos.z + mz * speed * dt }, 0.4, active.boxes, active.circles);
      moving = Math.hypot(next.x - pos.x, next.z - pos.z) / dt;
      pos.x = next.x; pos.z = next.z;
      const targetFacing = Math.atan2(mx, mz);   // rotation.y that turns the model's +z toward (mx, mz)
      let d = targetFacing - facing; d = Math.atan2(Math.sin(d), Math.cos(d));
      facing += d * Math.min(1, dt * 12);
    }
    speedNow += (moving - speedNow) * Math.min(1, dt * 10);
    player.root.position.set(pos.x, 0, pos.z);
    player.root.rotation.y = facing;
    player.animate(dt, speedNow);
    active.tick(t, dt);
    pillar.userData.tick(t);
    placeCamera(dt);

    // Nearest interactable + prompt (3D-016).
    const near = paused ? null : nearestInteractable(pos, active.interactables);
    if (near !== focus) { focus?.setHighlight?.(false); near?.setHighlight?.(true); focus = near; }
    if (focus) { const p = project(focus.x, focus.y ?? 2.4, focus.z); ui.showPrompt(p ? focus.label : null, p?.x, p?.y, () => interact(focus)); }
    else ui.showPrompt(null);

    // 3D-058: 60 s without activity → receptionist pages a hint, at most twice per round.
    if (!paused && now - lastActivity > 60000 && idleHints < 2) {
      idleHints++; lastActivity = now;
      ui.bubble(`接待员：${taskFor(store.snapshot(), { inside, ...picks })}，跟着金色光柱走`);
    }

    // Minimap at ~10 Hz.
    if (now - mapTimer > 100) {
      mapTimer = now;
      const target = currentTarget();
      const { project: P2 } = active.drawMap(mapCtx, pos, target, states);
      const s = mapCtx.canvas.width, c = s / 2;
      if (target) {
        let [tx, ty] = P2(target.x, target.z);
        const dx = tx - c, dy = ty - c, d = Math.hypot(dx, dy), max = c - 16;
        if (d > max) { tx = c + dx / d * max; ty = c + dy / d * max; }
        mapCtx.fillStyle = '#ffd34d'; mapCtx.font = 'bold 30px Inter, sans-serif'; mapCtx.textAlign = 'center'; mapCtx.textBaseline = 'middle';
        mapCtx.fillText('!', tx, ty);
      }
      mapCtx.save(); mapCtx.translate(c, c); mapCtx.rotate(Math.PI - facing);   // north-up map, arrow drawn pointing up
      mapCtx.fillStyle = '#c9ff9f'; mapCtx.beginPath(); mapCtx.moveTo(0, -12); mapCtx.lineTo(8, 9); mapCtx.lineTo(-8, 9); mapCtx.closePath(); mapCtx.fill();
      mapCtx.restore();
    }
    renderer.render(scene, camera);
  }

  // Start: hub, spawn by engine stage (3D-011 / 3D-079).
  applyQuality(quality);
  setScene(hub, spawnPoint());
  camera.position.set(pos.x, 4, pos.z + 6);
  raf = requestAnimationFrame(frame);
  canvas.focus();

  // Test / QA hooks (read-only state + teleport); harmless in production.
  window.CrossboundWorld = {
    get state() { return { scene: active?.id, pos: { ...pos }, picks: { ...picks }, quality, focus: focus?.id || null, task: taskFor(store.snapshot(), { inside, ...picks }), states }; },
    teleport(x, z) { pos.x = x; pos.z = z; },
    interact: () => interact(focus),
    interactWith: id => interact(active.interactables.find(i => i.id === id)),
  };

  return {
    dispose() {
      cancelAnimationFrame(raf);
      unsubscribe();
      removeEventListener('keydown', onKey); removeEventListener('keyup', onKey); removeEventListener('blur', clearKeys); removeEventListener('resize', resize);
      if (active && active !== hub) disposeTree(active.group);
      disposeTree(hub.group); disposeTree(scene);
      renderer.dispose();
      renderer.forceContextLoss();
      ui.destroy();
      root.remove();
      delete window.CrossboundWorld;
    },
  };
}
