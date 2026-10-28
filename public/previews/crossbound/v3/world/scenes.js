// REQ-053 §3 2.5D scenes opened full-screen from the campus map: W3 商品页工作室, W4 推广室, W6 财报结算厅.
// Each has its own layout and interaction (no shared panel template); all choices go into the game's own draft
// state and are committed with the same calls as the classic panel, so the engine stays authoritative.
import { PROMOTIONS } from '../../v11/model.js?v=01295b5f6d';
import { BIDS, TIME_SLOTS, OFFSITE, PLATFORMS } from '../../v2/catalog.js?v=01295b5f6d';
import { goal, goalChannelText, financialStatements } from '../../v2/release.js?v=01295b5f6d';
import { profitRows } from '../../v2/ui.js?v=01295b5f6d';
import { countryBadgeAsset } from '../../v11/badges.js?v=01295b5f6d';
import { WORLDS, roomStates, budgetCurve, money, cashPlan, capacityBar } from './logic.js?v=01295b5f6d';

// The three listing benches mirror the original editor (same ids, same points); costs come from the engine quote.
const BENCHES = [
  { key: 'titleId', name: '标题台', hint: '标题写什么', options: [['name', '只写商品名', '先让买家知道卖的是什么'], ['use', '补充使用场景', '把用途说明放进标题'], ['specs', '写清关键规格', '标题里看到两项规格']] },
  { key: 'imageId', name: '主图台', hint: '主图怎么拍', options: [['product', '完整商品', '3D 棚拍图展示整体外观'], ['focus', '放大主体', '放大同一张图，商品更清楚'], ['annotated', '主图配规格', '把规格标在商品旁边']] },
  { key: 'detailId', name: '详情台', hint: '详情讲什么', options: [['summary', '说明用途', '告诉买家可以用来做什么'], ['specs', '补齐规格', '用途之外再列出规格'], ['complete', '说明包装内容', '规格与包装内容一起讲清']] },
];
const CHANNEL_LOOK = { content: ['内容号直播间', '◉'], ads: ['广告投流室', '▤'], creator: ['达人会客室', '✦'] };

function h(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else if (k === 'style') node.style.cssText = v;
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c != null && c !== false) node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return node;
}
const pct = n => `${Math.round((n || 0) * 100)}%`;

// 商品实物 (REQ-053 §3): the W1 low-poly model rendered once to an image for the 2D page preview; glyph if no WebGL.
const shots = new Map();
let shotKit = null;
async function productShot(p) {
  if (!p || shots.has(p.id)) return shots.get(p?.id);
  shots.set(p.id, null);
  try {
    shotKit ||= (async () => {
      const [THREE, { productModel }] = await Promise.all([import('three'), import('./products.js?v=01295b5f6d')]);
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      renderer.setSize(360, 360, false); renderer.outputColorSpace = THREE.SRGBColorSpace;
      const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
      camera.position.set(1.9, 1.5, 2.4); camera.lookAt(0, 0.5, 0);
      return { THREE, productModel, renderer, camera };
    })();
    const { THREE, productModel, renderer, camera } = await shotKit;
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 2.4));
    const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(3, 5, 4); scene.add(key);
    const model = productModel(p, { size: 1.15 });
    model.group.position.y = 0; scene.add(model.group);
    renderer.render(scene, camera);
    shots.set(p.id, renderer.domElement.toDataURL('image/png'));
    scene.traverse(o => { o.geometry?.dispose?.(); (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m?.dispose?.()); });
  } catch { shots.set(p.id, null); }
  return shots.get(p.id);
}

export function openScene({ store, id: firstId, onExit, onNext }) {
  const root = h('div', { class: 'v3s', role: 'dialog', 'aria-modal': 'true' });
  document.body.append(root);
  requestAnimationFrame(() => root.classList.add('is-in'));
  let id = firstId, signature = '', closed = false, busy = false, finTab = 'income';

  const act = () => store.snapshot()?.actions;
  const product = s => s.engine?.products?.find(p => p.id === s.company.productId);

  // ---------- Shell: room title, map progress, cash, back to map; one primary action in the footer ----------
  function shell(s, { accent, kicker, title, lead }, body, footer) {
    const rooms = roomStates(s);
    root.dataset.scene = id;
    root.style.setProperty('--v3s-accent', accent);
    root.replaceChildren(...[
      h('header', { class: 'v3s-head' },
        h('button', { type: 'button', class: 'v3s-back', onclick: () => leave() }, '← 返回总部地图'),
        h('div', { class: 'v3s-title' }, h('small', {}, kicker), h('h2', {}, title)),
        h('ol', { class: 'v3s-rooms', 'aria-label': '本轮进度' }, WORLDS.map(w => h('li', { class: `is-${rooms[w.id]}`, title: w.step }, rooms[w.id] === 'done' ? '✓ ' : rooms[w.id] === 'current' ? '⚑ ' : '', w.name))),
        h('div', { class: 'v3s-cash' }, h('small', {}, '经营现金'), h('strong', {}, money(s.company.cash)))),
      lead ? h('p', { class: 'v3s-lead' }, lead) : null,
      h('main', { class: 'v3s-body' }, body),
      h('footer', { class: 'v3s-foot' }, footer)].filter(Boolean));
  }
  function primary(label, onclick, { disabled, note } = {}) {
    return [note ? h('span', { class: 'v3s-foot-note' }, note) : null, h('button', { type: 'button', class: 'v3s-primary', disabled: disabled || busy, onclick }, label)];
  }

  // REQ-006 regression (v1.2): pay $300 once a round to lift an existing page by 5 points (max 95).
  // Expected return is read off last round: orders scale with score / 80, so +5 points ≈ orders × 5 / score.
  function optimizeCard(s, asset) {
    const c = s.company, engine = s.engine;
    if (!asset || c.currentListing) return null;
    const base = asset.baseScore ?? asset.score;
    if (base >= 95) return h('p', { class: 'v3s-note' }, '已有商品页已到 95 分上限，不用再优化。');
    const done = (c.listingInvestments || []).some(e => e.round === c.round && e.productId === c.productId);
    const last = (c.history || []).filter(r => r.productId === c.productId && r.listingScore).at(-1);
    const gain = last ? Math.max(1, Math.round(last.orders * Math.min(5, 95 - base) / last.listingScore)) : null;
    return h('div', { class: 'v3s-optimize' },
      h('p', {}, done ? `本轮已优化过：已有商品页现在 ${base} 分。` : `已有商品页 ${base} 分，本轮可优化一次（+5 分，最高 95）。`),
      h('small', {}, gain ? `按上轮 ${last.orders.toLocaleString()} 单算，多 5 分约多 ${gain.toLocaleString()} 单（沿用这张商品页时生效）。` : '沿用这张商品页时生效。'),
      done ? null : h('button', { type: 'button', class: 'v3s-ghost', disabled: c.cash < 300 || busy, onclick: () => act()?.setCompany?.(engine.optimize(c)) }, '优化 +5 分 · $300'));
  }

  // ---------- W3 商品页工作室：货架 + 编辑台 + 商品页大屏 ----------
  function listingSelection(s) { return { ...(s.draft?.listing || {}), rule: 'listing-v1', mode: s.draft?.listing?.mode || 'build' }; }
  function renderW3(s) {
    const p = product(s), sel = listingSelection(s), engine = s.engine;
    const asset = s.company.listingAssets?.[s.company.productId];
    const quote = engine.listingQuote(s.company, sel) || {};
    const set = patch => act()?.setListing?.({ ...sel, ...patch });
    const title = p ? p.name + (sel.titleId === 'use' && p.sellingPoint ? `｜${p.sellingPoint}` : sel.titleId === 'specs' ? `｜${(p.specs || []).slice(0, 2).join(' · ')}` : '') : '';
    const bullets = p ? [...new Set([p.sellingPoint, ...(sel.detailId === 'summary' ? [] : p.specs || []), ...(sel.detailId === 'complete' && p.packing ? [`包装内容：${p.packing}`] : [])].filter(Boolean))] : [];
    const score = quote.score ?? 60, factor = quote.conversionFactor ?? score / 80;
    const reuse = sel.mode === 'reuse';
    const benches = BENCHES.map(b => h('section', { class: 'v3s-bench' },
      h('header', {}, h('strong', {}, b.name), h('small', {}, b.hint)),
      h('div', { class: 'v3s-chips' }, b.options.map(([oid, label, detail]) => {
        const alt = engine.listingQuote(s.company, { ...sel, mode: 'build', [b.key]: oid });
        const on = !reuse && sel[b.key] === oid;
        return h('button', { type: 'button', class: `v3s-chip${on ? ' is-on' : ''}`, 'aria-pressed': String(on), disabled: reuse, onclick: () => set({ mode: 'build', [b.key]: oid }) },
          h('strong', {}, label), h('small', {}, detail), h('b', {}, alt ? `${alt.score} 分 · $${Math.round(alt.cost)}` : ''));
      }))));
    const shot = p && shots.get(p.id);
    if (p && !shots.has(p.id)) productShot(p).then(src => { if (src) update(true); });
    const picture = cls => shot ? h('img', { class: cls, src: shot, alt: p?.name || '', width: 360, height: 360 }) : h('span', { class: 'v3s-glyph' }, p?.glyph || '◆');
    const image = h('div', { class: `v3s-shot is-${sel.imageId || 'product'}` },
      picture('v3s-glyph'),
      sel.imageId === 'annotated' ? h('ul', { class: 'v3s-tags' }, (p?.specs || []).slice(0, 2).map(t => h('li', {}, t))) : null);
    const screen = h('section', { class: 'v3s-phone', 'aria-label': '商品页预览' },
      h('div', { class: 'v3s-phone-bar' }, h('span', {}, s.market?.name || ''), h('b', {}, `上架分 ${score}`)),
      image,
      h('h3', {}, title),
      h('p', { class: 'v3s-price' }, `$${s.company.price ?? s.draft?.price ?? p?.basePrice ?? '-'}`, h('span', {}, '★★★★★')),
      h('ul', { class: 'v3s-bullets' }, bullets.map(b => h('li', {}, b))));
    const shelf = h('aside', { class: 'v3s-shelf' },
      h('small', {}, '货架 · 本轮商品'),
      h('div', { class: 'v3s-crate' }, picture('v3s-crate-img'), h('strong', {}, p?.name || ''), h('small', {}, p?.categoryLabel || '')),
      asset ? h('label', { class: 'v3s-toggle' }, h('input', { type: 'checkbox', checked: reuse, onchange: e => set({ mode: e.target.checked ? 'reuse' : 'build' }) }), '沿用这件商品已有的商品页') : null,
      optimizeCard(s, asset),
      asset ? h('p', { class: 'v3s-note' }, reuse ? `沿用 ${asset.baseScore ?? asset.score} 分的商品页；${quote.cost ? '跨市场本地化费 $100（同市场以后免）' : '这个市场已本地化，免费'}` : '重新制作会按下面的选择收费。') : null);
    const costs = h('dl', { class: 'v3s-ledger' },
      h('dt', {}, reuse ? '本地化费' : '制作费'), h('dd', {}, `$${Math.round(quote.cost || 0)}`),
      h('dt', {}, '上架分 → 转化'), h('dd', {}, `${score} 分 ≈ 购买意愿 ×${factor.toFixed(2)}`),
      h('dt', {}, '满分奖励'), h('dd', {}, score >= 95 ? '已达 95 分：自然流量 +20%' : `95 分才有自然流量 +20%（还差 ${95 - score} 分）`));
    shell(s, { accent: '#8a7dff', kicker: `第 ${s.company.round} 轮 · 商品页工作室`, title: '先把商品页做好，再去推广', lead: '每张台子选一项，大屏实时变化。分数换算成购买意愿，费用按商品价位计算。' },
      h('div', { class: 'v3s-w3' }, shelf, screen, h('div', { class: 'v3s-benches' }, benches, costs)),
      primary(`发布上架 · $${Math.round(quote.cost || 0)}`, () => { busy = true; act()?.publishListing?.(); setTimeout(() => { busy = false; update(true); }, 1500); },
        { disabled: !quote || quote.cost > s.company.cash, note: quote.cost > s.company.cash ? `现金不够，还差 ${money(quote.cost - s.company.cash)}` : '发布后锁定本轮商品页，直接进入推广室' }));
  }

  // REQ-057: the gap is shown before the spend, with the bridge loan in the same place.
  function cashCard(s, pv) {
    const plan = cashPlan(pv), c = s.company;
    if (!plan) return null;
    const used = (c.v2?.loans || []).some(l => l.round === c.round);
    return h('section', { class: `v3s-cash-plan${plan.short ? ' is-short' : ''}` },
      h('p', {}, plan.text + '。'),
      plan.short ? h('p', { class: 'is-warn' }, `现金还差 ${money(plan.short)}。${used ? '本轮已借过一次过桥贷，请减少预算或数量。' : ''}`) : null,
      plan.short && !used ? h('button', { type: 'button', class: 'v3s-ghost', disabled: busy, onclick: () => act()?.setCompany?.(s.engine.act(c, { type: 'loan', amount: plan.loan })) },
        `借过桥贷 ${money(plan.loan)} · 下轮还 ${money(plan.loan * 1.12)}`) : null);
  }

  // ---------- W4 推广室：三块屏幕选渠道 + 打法 + 预算曲线 ----------
  function renderW4(s) {
    const engine = s.engine, p = product(s), channel = s.choice?.id || s.recommendedId || 'content';
    const c = engine.config(s.company), selection = s.draft?.promotion?.[channel], choice = engine.choice(channel, selection, p);
    const pv = s.preview || {}, budget = s.draft?.budget ?? pv.budget ?? 900;
    const configure = patch => act()?.setCompany?.(engine.configure(s.company, patch));
    const screens = (s.options || []).map(o => {
      const [room, mark] = CHANNEL_LOOK[o.id] || [o.name, '◆'], on = o.id === channel;
      return h('button', { type: 'button', class: `v3s-screen${on ? ' is-on' : ''}`, 'aria-pressed': String(on), disabled: o.disabled, onclick: () => act()?.choose?.(o.id) },
        h('span', { class: 'v3s-screen-mark' }, mark), h('small', {}, room), h('strong', {}, o.name), h('b', {}, `建议预算 ${money(o.budget)}`), h('p', {}, o.summary || ''));
    });
    const plays = h('div', { class: 'v3s-chips' }, (PROMOTIONS[channel] || []).map(opt => h('button', { type: 'button', class: `v3s-chip${choice.id === opt.id ? ' is-on' : ''}`, 'aria-pressed': String(choice.id === opt.id),
      onclick: () => { act()?.setPromotion?.(channel, { id: opt.id, category: choice.category }); if (opt.suggestedBudget) act()?.setBudget?.(opt.suggestedBudget); } },
      h('strong', {}, opt.name), h('small', {}, opt.detail))));
    const categories = [...new Map(engine.products.map(x => [x.category, x.categoryLabel])).entries()];
    const curve = budgetCurve(pv.visitors, budget);
    const out = h('output', {}, money(budget));
    const slider = h('input', { type: 'range', min: 300, max: 8000, step: 100, value: budget, 'aria-label': '推广预算',
      oninput: e => { out.textContent = money(Number(e.target.value)); }, onchange: e => act()?.setBudget?.(Number(e.target.value)) });
    const pts = curve.points, maxV = Math.max(1, ...pts.map(x => x[1]));
    const path = pts.map(([b, v], i) => `${i ? 'L' : 'M'}${((b - 300) / 7700 * 300).toFixed(1)},${(90 - v / maxV * 80).toFixed(1)}`).join(' ');
    const dotX = ((budget - 300) / 7700 * 300).toFixed(1), dotY = (90 - (pv.visitors || 0) / maxV * 80).toFixed(1);
    const graph = h('div', { class: 'v3s-curve' });
    graph.innerHTML = `<svg viewBox="0 0 300 96" role="img" aria-label="预算与到访的关系"><path d="${path}" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="${dotX}" cy="${dotY}" r="5" fill="#adff2f"/></svg>`;
    const risk = (pv.acquisitionBounds || []).find(r => r.warning);
    shell(s, { accent: '#ff4fb3', kicker: `第 ${s.company.round} 轮 · 推广室`, title: '三块屏幕，选一个渠道开推', lead: '一步三个决定：渠道、打法、预算。达人对口加 30% 购买意愿，运气波动收窄到 0.8–1.3。' },
      h('div', { class: 'v3s-w4' },
        h('div', { class: 'v3s-screens' }, screens),
        h('section', { class: 'v3s-card' }, h('header', {}, h('strong', {}, '打法'), h('small', {}, channel === 'creator' ? '找谁合作' : channel === 'ads' ? '广告先讲什么' : '内容先拍什么')), plays,
          channel === 'creator' && choice.id === 'vertical' ? h('label', { class: 'v3s-select' }, '达人擅长的领域 ',
            h('select', { onchange: e => act()?.setPromotion?.(channel, { id: 'vertical', category: e.target.value }) }, categories.map(([cid, name]) => h('option', { value: cid, selected: cid === choice.category }, name)))) : null,
          h('p', { class: 'v3s-note' }, channel === 'creator' ? `${choice.matched ? '领域对口：购买意愿 +30%' : '不对口：没有加成'} · 成交分佣 ${pct(choice.commission)}` : choice.matched ? '与品类匹配，有加成' : '与品类不匹配，可以换个讲法'),
          channel === 'ads' ? h('div', { class: 'v3s-inline' }, h('span', {}, '出价 · 时段'),
            h('select', { 'aria-label': '关键词出价', onchange: e => configure({ bid: e.target.value }) }, BIDS.map(b => h('option', { value: b.id, selected: b.id === c.bid }, b.name))),
            h('select', { 'aria-label': '投放时段', onchange: e => configure({ timeSlot: e.target.value }) }, TIME_SLOTS.map(t => h('option', { value: t.id, selected: t.id === c.timeSlot }, t.name)))) : null),
        h('section', { class: 'v3s-card' }, h('header', {}, h('strong', {}, '预算'), out), slider, graph,
          h('p', { class: 'v3s-note' }, `本轮预计到访 ${(pv.visitors || 0).toLocaleString()} 次；再加 $1,000 只多约 ${curve.extra.toLocaleString()} 次（到访按预算的平方根增长）。`),
          h('div', { class: 'v3s-inline' }, h('span', {}, '站外补充'), h('select', { 'aria-label': '站外补充', onchange: e => configure({ offsite: e.target.value }) }, OFFSITE.map(o => h('option', { value: o.id, selected: o.id === c.offsite }, `${o.name} · ${o.detail}`))))),
        h('dl', { class: 'v3s-ledger' },
          h('dt', {}, '预计订单'), h('dd', {}, `${pv.orders ?? '-'} 单`),
          h('dt', {}, '预计利润'), h('dd', {}, money(pv.profit)),
          h('dt', {}, '获客成本'), h('dd', { class: risk ? 'is-warn' : '' }, risk ? `${risk.name} CAC 超过单件毛利一半，小心赚不回来` : '在安全线内')),
        cashCard(s, pv)),
      primary(`启动推广 · 花 ${money(budget + (pv.offsiteCost || 0))}`, () => commit(3),
        { disabled: pv.affordable === false, note: pv.affordable === false ? `现金不够，还差 ${money(pv.cashShortfall)}（发货结算也算在内）` : '启动后进入物流仓发货' }));
  }

  // ---------- W6 财报结算厅：一张结算桌 ----------
  function renderW6(s) {
    const r = s.company.report || {};
    if (s.company.stage >= 6) return renderResult(s, r);
    const tail = r.nextContentTail ? `内容渠道的到访有 10% 会留到下轮（约 ${r.nextContentTail.toLocaleString()} 次）。` : '';
    const options = (s.options || []).map(o => {
      const on = s.choice?.id === o.id;
      const effects = [o.cost ? `花 ${money(o.cost)}` : '不花钱', o.trafficBonus ? `下轮到访 +${o.trafficBonus.toLocaleString()} 次` : null, o.newMarket ? '下轮必须换市场，不能再选本市场' : null].filter(Boolean);
      return h('button', { type: 'button', class: `v3s-plan${on ? ' is-on' : ''}`, 'aria-pressed': String(on), disabled: o.disabled, onclick: () => act()?.choose?.(o.id) },
        h('strong', {}, o.name), h('span', {}, effects.join(' · ')), h('small', {}, o.summary || ''));
    });
    shell(s, { accent: '#ffd34d', kicker: `第 ${s.company.round} 轮 · 财报结算厅`, title: '安排下一轮，然后结算', lead: '只有一个决定：把这轮赚的钱怎么用。每个选项写清花多少、换来什么、锁住什么。' },
      h('div', { class: 'v3s-w6' },
        h('section', { class: 'v3s-desk' }, h('small', {}, '这一轮到目前为止'),
          h('dl', { class: 'v3s-ledger' },
            h('dt', {}, '未退款订单'), h('dd', {}, `${r.keptOrders ?? '-'} 单`),
            h('dt', {}, '贡献利润'), h('dd', {}, money(r.profit)),
            r.stockReturn ? [h('dt', {}, '未售出返现'), h('dd', {}, `${money(r.stockReturn)}（${r.stockReturnUnits} 件，扣 5% 手续费）`)] : null),
          tail ? h('p', { class: 'v3s-note' }, tail) : null),
        h('div', { class: 'v3s-plans' }, options)),
      primary('确认，结算本轮', () => commit(5), { disabled: !s.choice?.id, note: s.choice?.id ? '结算后直接看本轮结果' : '先选一项' }));
  }
  // REQ-048: 利润表 / 资产负债表 / 现金流量表, the same numbers and reconciliation as the report dialog's 财报 tab.
  function statements(s, r) {
    const f = financialStatements(s.company, r);
    if (!f) return null;
    const tabs = [['income', '利润表'], ['balance', '资产负债表'], ['cash', '现金流量表']].filter(([t]) => !f.legacy || t === 'income');
    const tab = tabs.some(([t]) => t === finTab) ? finTab : 'income';
    const arrow = d => d == null ? '' : d > 0 ? `↑ ${money(d)}` : d < 0 ? `↓ ${money(-d)}` : '—';
    const table = rows => h('table', { class: 'v3s-fin' }, h('tbody', {}, rows.map(([label, amount, delta, note, strong]) =>
      h('tr', { class: strong ? 'is-total' : '' }, h('th', { scope: 'row' }, label, note ? h('small', {}, note) : null), h('td', {}, money(amount)), h('td', { class: 'v3s-fin-delta' }, arrow(delta))))));
    const net = r.netRevenue || 0, gross = r.grossRevenue ?? net + (r.refundAmount || 0);
    let body, line;
    if (tab === 'income') {
      body = table([['销售收入', gross], ['退款', -(gross - net)], ['净销售收入', net, null, null, true], ['已售货品成本', -(r.cogs || 0)], ['毛利', net - (r.cogs || 0), null, null, true],
        ...profitRows(r).filter(x => !['netRevenue', 'cogs'].includes(x.id) && Math.abs(x.amount) >= .005).map(x => [x.label, x.amount]), ['净利润', r.profit, null, null, true]]);
      line = `本轮赚了 ${money(r.profit)}。`;
    } else if (tab === 'balance') {
      const c = f.closing, o = f.opening;
      body = table([['现金', c.cash, c.cash - o.cash, '现在能用的钱'], ['存货', c.inventory, c.inventory - o.inventory, '余货按采购成本计'], ['应收账款', c.receivables, c.receivables - o.receivables, '货卖了、钱还没到账的部分'], ['资产合计', c.assets, c.assets - o.assets, null, true],
        ['应付采购款', c.payables, c.payables - o.payables, '货已采购、钱还没付'], ['过桥贷未还本金', c.principal, c.principal - o.principal], ['应付利息', c.interest, c.interest - o.interest], ['负债合计', c.liabilities, c.liabilities - o.liabilities, null, true], ['净资产', c.equity, c.equity - o.equity, '资产减负债', true]]);
      line = f.cashRisk ? '现金可能接不上应付：先核对待到账货款和到期债务。' : `净资产 ${money(c.equity)}，比本轮开始 ${arrow(f.equityChange)}，正好等于本轮净利润。`;
    } else {
      body = table([['期初现金', f.opening.cash, null, null, true], ...f.flow.filter(x => Math.abs(x.amount) >= .005).map(x => [x.label, x.amount]), ['现金净变动', f.movement, null, null, true], ['期末现金', f.cashEnd, null, null, true]]);
      line = '贷款本金和应收到账是现金流，不重复计入利润。';
    }
    const gap = f.legacy ? null : (() => {
      const unpaid = f.closing.receivables - f.opening.receivables, stock = f.closing.inventory - f.opening.inventory;
      return `利润 ≠ 现金：利润 ${money(r.profit)}，现金变化 ${money(f.movement)}。差额里 ${money(unpaid)} 还没到账，${money(stock)} 压在货上${Math.abs(f.closing.liabilities - f.opening.liabilities) > .01 ? `，负债变化 ${money(f.closing.liabilities - f.opening.liabilities)}` : ''}。`;
    })();
    return h('section', { class: 'v3s-statements', 'aria-label': '本轮财报' },
      h('div', { class: 'v3s-tabs', role: 'tablist' }, tabs.map(([t, label]) => h('button', { type: 'button', role: 'tab', class: `v3s-tab${t === tab ? ' is-on' : ''}`, 'aria-selected': String(t === tab), onclick: () => { finTab = t; update(true); } }, label))),
      body,
      h('p', { class: f.cashRisk && tab === 'balance' ? 'v3s-note is-warn' : 'v3s-note' }, line),
      gap ? h('p', { class: 'v3s-note' }, gap) : null,
      f.legacy ? (f.reason ? h('p', { class: 'v3s-note' }, f.reason) : null)
        : h('p', { class: 'v3s-checks' }, ['资产 = 负债 + 净资产', '净资产变动 = 净利润', '期末现金三处一致'].map((label, i) => h('span', { class: f.checks[i] ? 'is-ok' : 'is-warn' }, `${f.checks[i] ? '✓' : '✗'} ${label}`))));
  }
  function renderResult(s, r) {
    const g = goal(r), badge = g.passed ? countryBadgeAsset(r.marketId, g.tier)?.src : null;
    const story = (r.conclusions || [])[0] || '';
    shell(s, { accent: '#ffd34d', kicker: `第 ${s.company.round} 轮 · 结算完成`, title: g.passed ? '本轮目标达成' : '本轮未达标，目标不变' },
      h('div', { class: 'v3s-result' },
        badge ? h('img', { class: 'v3s-badge', src: badge, alt: `${r.marketId} 国家印章`, width: 160, height: 160 }) : null,
        h('section', { class: 'v3s-desk' },
          h('small', {}, `本轮目标：${g.target} 单未退款，或贡献利润 $5,000`),
          h('h3', { class: g.passed ? 'is-pass' : '' }, goalChannelText(g)),
          h('p', { class: 'v3s-money' }, `收入 ${money(r.netRevenue)} · 成本 ${money(r.totalCosts)} · 利润 ${money(r.profit)}`),
          h('p', { class: 'v3s-note' }, `现金变化 ${money(r.cashChange)}${r.receivables > 0 ? `（货款 ${money(r.receivables)} 下一轮开局到账）` : ''}`),
          story ? h('p', { class: 'v3s-story' }, story) : null,
          statements(s, r),
          h('div', { class: 'v3s-links' },
            h('button', { type: 'button', class: 'v3s-ghost', onclick: () => act()?.report?.() }, '查看完整战报'),
            h('button', { type: 'button', class: 'v3s-ghost', onclick: () => act()?.panel?.('progress') }, '成长、成就与四维评估在总部'))),
        // The one action sits right under the result, centred with it (not in the footer corner).
        h('div', { class: 'v3s-result-actions' }, primary('开启下一轮', () => { busy = true; act()?.nextRound?.(); setTimeout(() => { busy = false; update(true); }, 1500); }))),
      []);
  }

  // The engine opens its next panel after a commit; the scene shows the next step instead.
  async function commit(stage) {
    if (busy) return;
    busy = true; update(true);
    act()?.commit();
    const after = await store.waitFor(x => x.company?.stage !== stage, 2500);
    busy = false;
    const s = store.snapshot();
    if (s?.view) s.actions?.close();
    if (!after) update(true);
  }

  // ---------- W0 市场研究所（REQ-056）：平台三选一 + 市场卡 + 容量条 ----------
  // Platform trade-offs in one line each (catalog numbers, so they follow the rules).
  const PLATFORM_LINES = {
    tiktok: p => `佣金 ${Math.round(p.fee * 100)}% · 零入驻 · 内容和达人触达更好`,
    amazon: p => `佣金 ${Math.round(p.fee * 100)}% + 每轮 $${p.entry} · 购买意愿 ×${p.conversion}`,
    direct: p => `一次建站 $${p.entry} · 无佣金 · 初期流量 ×${p.traffic}`,
  };
  function renderW0(s) {
    const engine = s.engine, c = s.company, cfg = engine.config(c);
    const markets = engine.options(c, 'markets');
    // Expected visits use the default promotion with last round's product (or the first product): an estimate of
    // how much of the market one round fills, not a promise.
    const pid = c.productId || c.history?.at(-1)?.productId || engine.products[0]?.id;
    const visits = id => { try { const p = engine.simulate({ ...c, marketId: id, productId: pid }, 'mean'); return p ? [p.visitors, p.capacity] : null; } catch { return null; } };
    const opened = c.v2?.openedPlatforms || [];
    const platforms = PLATFORMS.map(p => {
      const on = cfg.platform === p.id, entry = p.id === 'direct' && opened.includes('direct') ? 0 : p.entry;
      return h('button', { type: 'button', class: `v3s-plan v3s-platform${on ? ' is-on' : ''}`, 'aria-pressed': String(on),
        onclick: () => act()?.setCompany?.(engine.configure(c, { platform: p.id })) },
        h('strong', {}, p.name), h('span', {}, PLATFORM_LINES[p.id]?.(p) || p.detail),
        h('small', {}, p.id === 'direct' && entry === 0 ? '已建站，不再收建站费' : p.id === 'amazon' ? '店铺费每轮都收' : entry ? `本轮先付 $${entry}` : '不用先付钱'));
    });
    const locked = c.carryEffect?.newMarket ? c.carryEffect.previousMarket : null;
    const cards = markets.map(m => {
      const on = s.choice?.id === m.id, visited = c.roundStart?.visitedMarkets?.includes(m.id);
      const [v, cap] = visits(m.id) || [];
      const bar = capacityBar(v, cap), badge = countryBadgeAsset(m.id, 'bronze')?.src;
      const disabled = m.id === locked;
      return h('button', { type: 'button', class: `v3s-market${on ? ' is-on' : ''}`, 'aria-pressed': String(on), disabled,
        onclick: () => act()?.choose?.(m.id) },
        h('header', {}, badge ? h('img', { src: badge, alt: '', width: 40, height: 40 }) : null,
          h('div', {}, h('strong', {}, m.name), h('small', {}, m.region))),
        h('b', {}, disabled ? '跨区试销：本轮必须换市场' : visited ? '进过了 · 不再收进入费' : `首次进入 · 进入费 ${money(m.launchCost)}`),
        bar ? h('div', { class: `v3s-capacity${bar.over ? ' is-over' : ''}`, role: 'img', 'aria-label': bar.text },
          h('i', { style: `width:${Math.round(bar.fill * 100)}%` })) : null,
        bar ? h('small', { class: bar.over ? 'is-warn' : '' }, bar.text) : null,
        h('p', {}, m.summary || ''));
    });
    const pv = s.preview || {}, chosen = markets.find(m => m.id === s.choice?.id);
    const spend = -(pv.cashDelta || 0);
    shell(s, { accent: '#52cadd', kicker: `第 ${c.round} 轮 · 市场研究所`, title: '先选在哪个平台、哪个市场卖', lead: '一步两个决定：平台和市场。容量条是按默认推广估的本轮到访，超过容量的部分只算一半。' },
      h('div', { class: 'v3s-w0' },
        h('section', { class: 'v3s-card' }, h('header', {}, h('strong', {}, '开店平台'), h('small', {}, '三家各有代价')), h('div', { class: 'v3s-platforms' }, platforms)),
        h('div', { class: 'v3s-markets' }, cards)),
      primary(chosen ? `确认${chosen.name}${spend > 0 ? ` · 先付 ${money(spend)}` : ''}` : '先选一个市场', () => commit(0),
        { disabled: !chosen || pv.affordable === false, note: chosen ? (pv.affordable === false ? `现金不够，还差 ${money(pv.cashShortfall)}` : '确认后进入选品展厅') : '点一张市场卡' }));
  }

  const RENDER = { w0: renderW0, w3: renderW3, w4: renderW4, w6: renderW6 };
  function update(force = false) {
    if (closed) return;
    const s = store.snapshot();
    if (!s?.company) return;
    // Leave or hand over when the engine has moved on (published, committed, next round started).
    if (id === 'w0' && s.company.stage === 1) return hand('w1');
    if (id === 'w3' && s.company.currentListing) return hand('w4');
    if (id === 'w4' && s.company.stage === 4) return hand('w5');
    if (id === 'w6' && s.company.stage === 0) return leave();
    if (id === 'w4' && s.company.stage === 3 && !s.company.currentListing) return hand('w3');
    const sig = JSON.stringify([id, busy, s.company.stage, s.company.cash, s.choice?.id, s.draft, s.preview?.profit, s.preview?.visitors, s.company.v2?.config, s.company.report?.round]);
    if (!force && sig === signature) return;
    signature = sig;
    const focusKey = document.activeElement?.closest?.('.v3s') ? document.activeElement.getAttribute('aria-label') : null;
    RENDER[id](s);
    if (focusKey) root.querySelector(`[aria-label="${focusKey}"]`)?.focus({ preventScroll: true });
  }
  function hand(next) { if (closed) return; onNext ? onNext(next) : leave(); }
  function leave() { if (!closed) onExit?.(); }
  const off = store.subscribe(() => update());
  const onKey = e => { if (e.key === 'Escape' && !store.dialogOpen) leave(); };
  addEventListener('keydown', onKey);
  update(true);

  return {
    get id() { return id; },
    dispose() {
      closed = true; off(); removeEventListener('keydown', onKey);
      root.classList.remove('is-in'); root.classList.add('is-out');
      setTimeout(() => root.remove(), 300);
    },
  };
}
