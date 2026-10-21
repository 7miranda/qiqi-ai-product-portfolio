import { TAX, taxQuote, PLATFORMS, FIRST_MILE, BIDS, TIME_SLOTS, OFFSITE, CONFIG_DEFAULTS, season } from './catalog.js';
import { productFit } from './product-fit.js';
// Crossbound v1.1: pure operating rules. The bridge supplies the existing demo data.
export const money = value => Math.round((value + Number.EPSILON) * 100) / 100;
const copy = value => structuredClone(value);
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const sum = values => money(values.reduce((a, b) => a + b, 0));
function companyIdentity() {
  if (typeof globalThis.crypto.randomUUID === 'function') return globalThis.crypto.randomUUID();
  // getRandomValues remains available on the existing HTTP deployment.
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
export function seededUnit(seed, round, key) {
  let h = 2166136261;
  for (const char of `${seed}:${round}:${key}`) h = Math.imul(h ^ char.charCodeAt(0), 16777619);
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d); h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}
export function allocate(total, weights) {
  const all = weights.reduce((a, b) => a + b, 0);
  if (!all) return weights.map(() => 0);
  const rows = weights.map((w, i) => ({ i, n: Math.floor(total * w / all), rest: total * w / all % 1 }));
  const left = total - rows.reduce((a, b) => a + b.n, 0);
  [...rows].sort((a, b) => b.rest - a.rest || a.i - b.i).slice(0, left).forEach(r => r.n++);
  return rows.map(r => r.n);
}
export const CAPACITY = { singapore: 20000, london: 35000, 'los-angeles': 60000, berlin: 35000, paris: 35000, tokyo: 40000, sydney: 28000, toronto: 35000, dubai: 25000, 'mexico-city': 30000, 'sao-paulo': 25000, amsterdam: 25000 };
export const PROMOTIONS = {
  ads: [
    { id: 'benefit', name: '卖点直给型', detail: '用性能与功能证据说服买家', categories: ['electronics', 'home'], visitors: 1, commission: 0 },
    { id: 'scene', name: '场景种草型', detail: '展示使用场景与生活变化', categories: ['lifestyle', 'future', 'furniture', 'outdoor'], visitors: 1, commission: 0 },
  ],
  creator: [
    { id: 'large', name: '大达人 · 广泛触达', detail: '建议预算 $3,600，触达更广，成交分佣 10%', visitors: 1.4, commission: .10, suggestedBudget: 3600 },
    { id: 'small', name: '小达人 · 轻量试销', detail: '建议预算 $900，触达较少，成交分佣 5%', visitors: .78, commission: .05, suggestedBudget: 900 },
    { id: 'vertical', name: '垂类达人 · 对口受众', detail: '建议预算 $2,400；选择对口领域，转化 +15%，分佣 8%', visitors: 1, commission: .08, suggestedBudget: 2400 },
  ],
  content: [
    { id: 'review', name: '测评', detail: '拆解性能与使用证据', categories: ['electronics', 'future'], visitors: 1, commission: 0 },
    { id: 'unboxing', name: '开箱', detail: '展示外观、配件与生活体验', categories: ['lifestyle', 'outdoor'], visitors: 1, commission: 0 },
    { id: 'tutorial', name: '教程', detail: '演示收纳、安装与实际用法', categories: ['home', 'furniture'], visitors: 1, commission: 0 },
  ],
};
export const HELP = {
  returns: ['退款为什么还有损失？', '退款会退还买家货款，但运费已经发生。小件退货中50%可重新出售、大件20%；不能再售的货值计为损失，另收每单$2／$6处理费。可售退件保留库存成本，不重复扣采购款。'],
  tariff: ['预估关税是什么？', '12个国家均配置关税与进口税。关税按品类与国家的教学参数计算，进口税另列；零关税不代表零税费，退货不自动退税。'],
  conversion: ['访客为什么没有都下单？', '商品与市场匹配、售价、上架质量、配送速度、评分和推广内容共同影响购买意愿。售价越高通常越难成交；交期较长还会让部分新货错过本轮销售机会。'],
  cac: ['CAC 与 TACOS 怎么看？', '这里按各来源到访占比分配订单，是简化估算。CAC为渠道预算及佣金除以该来源未退款订单；TACOS为广告花费除以总销售额。没有订单时显示“暂无”，不把除零写成0。'],
  inventory: ['库存为什么不是亏掉的钱？', '采购先占用现金，未售商品仍是按成本计量的库存资产。利润扣已售成本和报损，不能再扣一遍整批采购款；清仓按成本五折回款，差额才是清仓损失。'],
};

export function createV2Core(a) {
  const { products, markets, stocks, channels, fulfillment, expansion, old } = a;
  const tables = [markets, products, stocks, channels, fulfillment, expansion];
  const keys = ['marketId', 'productId', 'stockPlanId', 'trafficPlanId', 'fulfillmentPlanId', 'expansionPlanId'];
  const find = (rows, id) => rows.find(r => r.id === id);
  const valid = n => n?.engineVersion === 'v2';
  const initialV2 = () => ({ identity: companyIdentity(), config: { ...CONFIG_DEFAULTS }, receivables: [], payables: [], loans: [],
    events: [], eventHistory: [], actions: [], heat: {}, tests: [], openedPlatforms: [], entered: [], entryRewards: [],
    trademark: false, seasonPrepared: 0, rivalEncounters: 0 });
  const config = n => ({ ...CONFIG_DEFAULTS, ...n.v2?.config });
  const selected = (rows, id) => rows.find(r => r.id === id) || rows[0];
  const dueTotal = rows => sum(rows.filter(r => !r.paid).map(r => r.amount));
  const expenses = (n, category) => sum(n.ledger.filter(e => e.round === n.round && e.category === category).map(e => -e.cashDelta));
  const value = (inv, costs) => sum(products.map(p => costs?.[p.id] ?? (inv[p.id] || 0) * p.cost));
  const feedback = (n, title, body, delta = {}) => ({ ...n, feedback: { title, body, delta } });
  const entry = (n, category, label, cashDelta) => {
    n.cash = money(n.cash + cashDelta);
    n.ledger.push({ id: n.ledger.length + 1, round: n.round, category, label, cashDelta: money(cashDelta) });
  };
  function snapshot(n) {
    return { ...old.snapshot(n), engineVersion: 'v2', runSeed: n.runSeed, round: n.round, v2: copy(n.v2),
      visitedMarkets: copy(n.visitedMarkets || []), ratings: copy(n.ratings || {}),
      contentTail: n.contentTail || 0, previousMarket: n.previousMarket || null,
      listingInvestments: copy(n.listingInvestments || []), clearanceEvents: copy(n.clearanceEvents || []) };
  }
  function create(seed) {
    const n = old.create();
    Object.assign(n, { engineVersion: 'v2', runSeed: seed ?? globalThis.crypto.getRandomValues(new Uint32Array(1))[0],
      visitedMarkets: [], ratings: {}, contentTail: 0, previousMarket: null, listingInvestments: [], clearanceEvents: [], v2: initialV2() });
    n.roundStart = snapshot(n);
    return n;
  }
  function migrate(n) {
    if (valid(n)) return n;
    const out = copy(n);
    // A running historical round keeps its rules until next round. No history is recalculated.
    if (out.stage !== 0) return out;
    Object.assign(out, { engineVersion: 'v2', runSeed: globalThis.crypto.getRandomValues(new Uint32Array(1))[0],
      visitedMarkets: [...new Set(out.history.map(r => r.marketId))], ratings: {}, contentTail: 0,
      previousMarket: out.carryEffect.previousMarket, listingInvestments: [], clearanceEvents: [], v2: initialV2() });
    const assets = {};
    for (const [key, asset] of Object.entries(out.listingAssets || {})) {
      const [marketId, productId] = key.split(':');
      if (!productId) continue;
      const prev = assets[productId];
      const localizedMarkets = [...new Set([...(prev?.localizedMarkets || []), marketId])];
      assets[productId] = { ...(prev?.score > asset.score ? prev : asset), baseScore: Math.min(95, Math.max(prev?.score || 0, asset.score || 60)), localizedMarkets };
    }
    out.listingAssets = assets; out.roundStart = snapshot(out);
    return out;
  }
  function upgrade(n) {
    if (valid(n) || n.stage !== 0) return n;
    const r = copy(n);
    r.engineVersion = 'v2';
    r.v2 = initialV2();
    // Already explored countries are not first-entry rewards a second time.
    r.v2.entered = [...(r.visitedMarkets || [])];
    r.roundStart = snapshot(r);
    return r;
  }
  function configure(n, patch) {
    if (!valid(n) || n.stage > 4) return n;
    const r = copy(n), c = config(n);
    const rules = {
      platform: [0, PLATFORMS.map(x => x.id)], firstMile: [2, FIRST_MILE.map(x => x.id)],
      terms: [2, ['cash', 'credit']], negotiation: [2, ['none', 'volume', 'credit']],
      bid: [3, BIDS.map(x => x.id)], timeSlot: [3, TIME_SLOTS.map(x => x.id)], offsite: [3, OFFSITE.map(x => x.id)],
      seasonPrep: [2, [true, false]],
    };
    for (const [key, v] of Object.entries(patch || {})) {
      const rule = rules[key];
      if (rule && n.stage <= rule[0] && rule[1].includes(v)) c[key] = v;
    }
    if (c.negotiation === 'credit') c.terms = 'credit';
    r.v2.config = c;
    return r;
  }
  function supplyQuote(n, quantity) {
    const p = find(products, n.productId), base = p && a.supplier(p, n.supplierId, n.supplyRule);
    if (!base) return null;
    const units = Math.max(0, quantity - (n.roundStart.inventory[p.id] || 0)), c = config(n);
    const discount = units >= 1200 ? .85 : units >= 800 ? .9 : units >= 400 ? .95 : 1;
    return { ...base, unitCost: money(base.unitCost * discount * (c.negotiation === 'volume' ? .97 : 1)),
      moq: c.negotiation === 'volume' ? Math.max(800, base.moq) : base.moq,
      volumeDiscount: 1 - discount, originalUnitCost: base.unitCost };
  }
  function eventEffect(n) {
    const active = n.v2.events.filter(e => e.dueRound === n.round && n.stage >= e.stage);
    let conversion = 1, traffic = 1, packaging = 0, delayDays = 0;
    for (const e of active) {
      if (e.kind === 'slow-delivery' && e.choice !== 'repair') conversion *= .9;
      if (e.kind === 'demand-shift' && e.choice !== 'adapt') traffic *= .9;
      if (['vat-review', 'classification-review', 'packaging-review'].includes(e.kind) && e.choice !== 'prepare') delayDays += 3;
      if (e.kind === 'rival') {
        if (n.productId !== e.productId || n.marketId !== e.marketId) continue;
        const avoided = e.choice === 'exit' && n.marketId !== e.marketId;
        if (avoided || e.choice === 'complaint' && e.success) continue;
        if (e.choice === 'differentiate') { conversion *= 1; packaging += 1.5; }
        else if (e.choice === 'pricewar') conversion *= .95;
        else conversion *= Math.max(.55, .7 - .03 * (e.encounter - 1));
      }
    }
    return { conversion, traffic, packaging, delayDays, active, priceFactor: active.some(e => e.kind === 'rival' && e.marketId === n.marketId && e.productId === n.productId && e.choice === 'pricewar') ? .9 : 1 };
  }
  function act(n, input) {
    if (!valid(n) || !input) return n;
    const r = copy(n);
    if (input.type === 'loan') {
      const amount = Number(input.amount);
      if (n.stage > 4 || !Number.isInteger(amount) || amount < 2000 || amount > 200000 || amount % 1000 || r.v2.loans.some(l => l.round === n.round)) return n;
      r.v2.loans.push({ round: n.round, dueRound: n.round + 1, principal: amount, interest: money(amount * .12), amount: money(amount * 1.12), paid: false });
      entry(r, 'loan', '过桥贷款本金（下轮偿还，利息12%）', amount);
      settleDue(r);
    } else if (input.type === 'test') {
      if (n.stage !== 2 || n.cash < 150 || r.v2.tests.some(t => t.round === n.round && t.productId === n.productId)) return n;
      const fit = productFit[n.productId][n.marketId], score = money(fit * (.9 + seededUnit(n.runSeed, n.round, `test:${n.productId}:${n.marketId}`) * .2));
      r.v2.tests.push({ round: n.round, productId: n.productId, marketId: n.marketId, score, cost: 150 });
      entry(r, 'testing', '小预算测款（仅抽样信号，不保证订单）', -150);
    } else if (input.type === 'trademark') {
      if (n.cash < 600 || r.v2.trademark || n.stage > 3) return n;
      r.v2.trademark = true; entry(r, 'trademark', '模拟商标登记', -600);
    } else if (input.type === 'event') {
      const e = r.v2.events.find(e => e.id === input.id && e.dueRound === n.round && n.stage >= e.stage);
      if (!e || e.choice || !eventChoices(e).some(x => x.id === input.choice)) return n;
      const choice = eventChoices(e).find(x => x.id === input.choice);
      if (choice.cost > n.cash || input.choice === 'complaint' && !n.v2.trademark) return n;
      e.choice = input.choice;
      if (choice.cost) entry(r, 'events', `${e.title} · ${choice.name}`, -choice.cost);
      e.success = input.choice === 'complaint' && seededUnit(n.runSeed, n.round, e.id) < (n.currentListing?.score || 60) / 100;
      if (input.choice === 'exit') r.v2.exitMarket = e.marketId;
      r.v2.eventHistory.push({ ...copy(e), resolvedRound: n.round, outcome: input.choice === 'complaint' ? e.success ? '投诉成功，转化惩罚解除' : '证据不足，跟卖影响继续' : choice.detail });
    } else return n;
    r.v2.actions.push({ ...copy(input), stage: n.stage });
    return feedback(r, '经营选择已记录', '费用和后续影响已记入本轮档案。');
  }
  function eventChoices(e) {
    if (e.kind === 'rival') return [
      { id: 'pricewar', name: '降价迎战', cost: 0, detail: '成交价九折，转化系数恢复至95%' },
      { id: 'complaint', name: '提交商标与商品证据', cost: 200, detail: '需已登记商标；成功率等于上架分%，失败保留原影响' },
      { id: 'differentiate', name: '差异化包装', cost: 0, detail: '转化恢复，每笔发货增加$1.50包装成本' },
      { id: 'exit', name: '下轮换市场避让', cost: 0, detail: '本轮保留影响，下轮提示避开当前市场' },
    ];
    if (e.kind === 'slow-delivery') return [{ id: 'repair', name: '补做售后沟通', cost: 150, detail: '本轮解除10%的购买意愿惩罚，历史差评仍保留' }, { id: 'accept', name: '先观察本轮', cost: 0, detail: '本轮购买意愿减少10%' }];
    if (['vat-review', 'classification-review', 'packaging-review'].includes(e.kind)) return [
      { id: 'prepare', name: '提前整理核验资料', cost: 180, detail: '支付模拟整理费用$180，解除本轮补件延误' },
      { id: 'wait', name: '安排到货后补件', cost: 0, detail: '本轮新增采购到货延后3天；实际税种与税率仍按国家配置' },
    ];
    return [{ id: 'adapt', name: '调整本地内容', cost: 200, detail: '解除本轮10%的到访下降' }, { id: 'accept', name: '沿用原计划', cost: 0, detail: '本轮到访下降10%' }];
  }
  function schedule(n) {
    const report = n.report, dueRound = n.round + 1;
    const add = (kind, title, stage, extra = {}) => {
      const id = `${kind}:${dueRound}`;
      if (!n.v2.events.some(e => e.id === id)) n.v2.events.push({ id, kind, title, dueRound, stage, choice: null, ...extra });
    };
    if (n.fulfillmentPlanId === 'economy') add('slow-delivery', '上一轮买家反馈：到货太慢', 0);
    const last = n.history.filter(r => r.round < n.round).at(-1);
    if (report.profit > 6000 || report.orders >= 800 && last?.productId === n.productId && last.orders >= 800) {
      n.v2.rivalEncounters++;
      add('rival', '影子卖家老 K 跟来了', 4, { marketId: n.marketId, productId: n.productId, encounter: n.v2.rivalEncounters });
    }
    if (seededUnit(n.runSeed, dueRound, 'event-pool') < .45) {
      const pool = [['demand-shift', '当地买家关注点变了'], ['vat-review', '进口税台账，需要核对'], ['classification-review', '归类与原产地复核：是否涉及附加税'], ['packaging-review', '包装资料核验：了解 EPR']];
      const chosen = pool[Math.floor(seededUnit(n.runSeed, dueRound, 'event-kind') * pool.length)];
      add(chosen[0], chosen[1], 0);
    }
  }
  const scale = p => p.basePrice < 25 ? 1 : p.basePrice <= 60 ? 1.8 : 3;
  function listingProduct(p, input) {
    const q = old.listingProduct(p, input);
    if (!q) return null;
    // Keep the original three choices as the only listing editor. Removed style
    // fields in older saves must not grant a hidden bonus on future publishing.
    const baseScore = Math.min(95, q.score + (input.optimizationPoints || 0));
    const score = baseScore;
    return { ...q, baseScore, score, conversionFactor: score / 80, cost: money(q.cost * scale(p)),
      matchedStyle: false, selection: { ...q.selection,
        optimizationPoints: input.optimizationPoints || 0 } };
  }
  function listingQuote(n, input) {
    if (n.stage !== 3 || !input) return null;
    const p = find(products, n.productId), asset = n.listingAssets?.[n.productId];
    if (!p) return null;
    if (input.mode === 'reuse') {
      if (!asset) return null;
      const q = listingProduct(p, asset.selection);
      if (!q) return null;
      const baseScore = asset.baseScore ?? Math.min(95, asset.score);
      const score = baseScore;
      const cost = asset.localizedMarkets?.includes(n.marketId) ? 0 : 100;
      return { ...q, baseScore, score, conversionFactor: score / 80, cost, localizationCost: cost,
        selection: { ...q.selection, mode: 'reuse' }, reused: true };
    }
    const q = listingProduct(p, input);
    return q ? { ...q, reused: false } : null;
  }
  function publish(n, input) {
    if (n.stage !== 3 || n.currentListing) return n;
    const q = listingQuote(n, input);
    if (!q || q.cost > n.cash) return feedback(n, '暂时不能上架', '请核对商品页选择与可用现金。');
    const r = copy(n), asset = r.listingAssets[r.productId];
    r.currentListing = { ...q, commerceRule: 'v23', modelVersion: 'v2', marketId: r.marketId, productId: r.productId, round: r.round };
    r.listingAssets[r.productId] = { ...q, selection: { ...q.selection, mode: 'build' }, localizedMarkets: [...new Set([...(asset?.localizedMarkets || []), r.marketId])] };
    entry(r, 'listing', q.localizationCost ? '已有商品页 · 跨市场本地化' : q.reused ? '沿用已有商品页' : '商品页制作与上架', -q.cost);
    return feedback(r, '商品已上架', `本次费用 $${q.cost.toFixed(2)}，上架 ${q.score} 分。接下来选择推广方式。`, { cash: -q.cost });
  }
  function optimize(n) {
    const asset = n.listingAssets?.[n.productId];
    if (n.stage !== 3 || n.currentListing || !asset || asset.baseScore >= 95 || n.cash < 300 || n.listingInvestments.some(e => e.round === n.round && e.productId === n.productId)) return n;
    const r = copy(n); r.listingAssets[r.productId].baseScore = Math.min(95, (asset.baseScore ?? Math.min(95, asset.score)) + 5);
    r.listingAssets[r.productId].score = r.listingAssets[r.productId].baseScore;
    r.listingAssets[r.productId].matchedStyle = false;
    r.listingInvestments.push({ round: n.round, productId: n.productId, score: r.listingAssets[r.productId].baseScore, cost: 300 });
    entry(r, 'listing', '商品页持续优化 +5分', -300);
    return feedback(r, '商品页已优化', '上架基础分提升5分（上限95），本轮回滚会保留这次优化与费用。', { cash: -300 });
  }
  function choice(channelId, input, p) {
    const options = PROMOTIONS[channelId] || PROMOTIONS.content;
    const selected = find(options, input?.id) || options.at(-1);
    const category = products.some(x => x.category === input?.category) ? input.category : p?.category;
    const matched = channelId === 'creator' ? selected.id === 'vertical' && category === p?.category : !!selected.categories?.includes(p?.category);
    return { ...selected, category, matched, trafficFactor: selected.visitors * (channelId === 'content' && matched ? 1.1 : 1),
      conversionFactor: channelId === 'ads' ? matched ? 1.1 : .95 : channelId === 'creator' && matched ? 1.15 : 1 };
  }
  function normalize(n, input) {
    const raw = typeof input === 'string' ? { id: input } : input;
    const option = raw && find(tables[n.stage] || [], raw.id);
    if (!option) return null;
    const out = { id: raw.id, config: copy(configure(n, raw.config || {}).v2.config) };
    if (n.stage === 2) {
      const p = find(products, n.productId);
      out.quantity = raw.quantity ?? option.quantity; out.price = raw.price ?? Math.round(p.basePrice * option.priceFactor);
      out.supplierId = raw.supplierId ?? 'standard'; out.supplyRule = 'v1';
      if (!Number.isInteger(out.quantity) || out.quantity < 200 || out.quantity > 1600 || !Number.isFinite(out.price) || out.price < Math.round(p.basePrice * .7) || out.price > Math.round(p.basePrice * 1.5) || money(out.price) !== out.price || !a.supplier(p, out.supplierId, out.supplyRule)) return null;
    }
    if (n.stage === 3) {
      out.budget = raw.budget ?? option.budget;
      if (!Number.isInteger(out.budget) || out.budget < 300 || out.budget > 8000) return null;
      if (n.currentListing) out.listing = copy(n.currentListing.selection);
      else if (raw.listing && listingQuote(n, raw.listing)) out.listing = copy(raw.listing);
      const c = choice(out.id, raw.promotionChoice, find(products, n.productId));
      out.promotionChoice = { id: c.id, category: c.category };
    }
    return out;
  }
  function simulate(n, mode = 'actual') {
    const p = find(products, n.productId), m = find(markets, n.marketId);
    if (!p || !m) return null;
    const stock = find(stocks, n.stockPlanId) || stocks[0], channel = find(channels, n.trafficPlanId) || channels[0], f = find(fulfillment, n.fulfillmentPlanId) || fulfillment[1];
    const c = config(n), platform = selected(PLATFORMS, c.platform), firstMile = selected(FIRST_MILE, c.firstMile);
    const offsite = selected(OFFSITE, c.offsite), bid = selected(BIDS, c.bid), timeSlot = selected(TIME_SLOTS, c.timeSlot), effects = eventEffect(n);
    const advertisedPrice = n.price ?? Math.round(p.basePrice * stock.priceFactor), quantity = n.quantity ?? stock.quantity;
    const price = money(advertisedPrice * offsite.price * effects.priceFactor);
    const budget = n.trafficBudget ?? channel.budget, supply = supplyQuote(n, quantity);
    if (!supply) return null;
    const openingQty = n.roundStart.inventory[p.id] || 0, unitsToBuy = Math.max(0, quantity - openingQty), totalUnits = openingQty + unitsToBuy;
    const purchaseCost = money(unitsToBuy * supply.unitCost);
    const availableCost = sum([n.roundStart.inventoryCosts[p.id] ?? openingQty * p.cost, purchaseCost]);
    // One round is a 30-day teaching window. Old stock is available immediately.
    const leadDays = supply.leadDays + firstMile.days + effects.delayDays, firstMileUnit = money(firstMile.unit * (p.shippingFactor || 1));
    const firstMileCost = money(unitsToBuy * firstMileUnit);
    const arrivedUnits = Math.floor(unitsToBuy * clamp((30 - leadDays) / 30, 0, 1));
    const units = openingQty + arrivedUnits, delayedUnits = unitsToBuy - arrivedUnits;
    const regionFactor = ({ '亚洲': .8, '欧洲': 1, '北美洲': 1.2, '大洋洲': .85, '南美洲': .9 })[m.region] || 1;
    const draw = key => seededUnit(n.runSeed, n.round, key);
    const variation = key => mode === 'low' ? .9 : mode === 'high' ? 1.1 : mode === 'mean' ? 1 : .9 + draw(key) * .2;
    const creatorFactor = channel.id !== 'creator' ? 1 : mode === 'low' ? .5 : mode === 'high' ? 2 : mode === 'mean' ? 1.25 : .5 + draw('creator') * 1.5;
    const secondary = choice(channel.id, n.promotionChoice, p);
    const baseVisitors = channel.id === 'content' ? 16500 : channel.visitors;
    // Content wins economical tests and builds tail; production capacity limits rapid scaling.
    const contentScaling = channel.id === 'content' ? 1 / (1 + .035 * Math.max(0, budget / 900 - 1)) : 1;
    const heat = n.v2.heat[p.id] ?? 1, seasonInfo = season(n.round);
    const seasonFactor = seasonInfo.index === 2 ? n.v2.seasonPrepared === Math.ceil(n.round / 3) ? 1.3 : 1.1 : 1;
    const adVariation = channel.id !== 'ads' ? 1 : mode === 'low' ? bid.range[0] : mode === 'high' ? bid.range[1] : mode === 'mean' ? 1 : bid.range[0] + draw('auction') * (bid.range[1] - bid.range[0]);
    const platformTraffic = platform.traffic * (platform.id === 'tiktok' && channel.id !== 'ads' ? 1.2 : 1);
    const primaryVisitors = Math.floor(baseVisitors * Math.sqrt(budget / channel.budget) * regionFactor * variation('traffic') * creatorFactor * secondary.trafficFactor * contentScaling * platformTraffic * effects.traffic * heat * seasonFactor * (channel.id === 'ads' ? bid.clicks * timeSlot.traffic * adVariation : 1));
    const offsiteVisitors = Math.floor(primaryVisitors * (offsite.visitors - 1));
    const currentRoundVisitors = primaryVisitors + offsiteVisitors;
    const carryVisitors = Math.floor((n.contentTail || 0) + (n.carryEffect.trafficBonus || 0));
    const listing = n.currentListing || { score: 80, conversionFactor: 1 };
    const organicBonus = listing.score >= 95 ? Math.floor((currentRoundVisitors + carryVisitors) * .2) : 0;
    const visitors = currentRoundVisitors + carryVisitors + organicBonus;
    const deliveryFactor = ({ economy: .92, standard: 1, express: 1.1 })[f.id];
    const rating = n.roundStart.ratings?.[p.id]?.rating ?? 5;
    const coldStartFactor = n.previousMarket && n.previousMarket !== m.id && !n.roundStart.visitedMarkets.includes(m.id) ? .9 : 1;
    const priceFactor = (p.basePrice / price) ** 1.4;
    const fit = productFit[p.id]?.[m.id];
    if (!Number.isFinite(fit)) throw new Error(`Missing product/market fit: ${p.id}/${m.id}`);
    const baseConversion = .025 * m.demandFactor * fit;
    const conversion = baseConversion * priceFactor * listing.conversionFactor * deliveryFactor * Math.sqrt(rating / 5) * coldStartFactor * secondary.conversionFactor * variation('demand') * platform.conversion * effects.conversion * (channel.id === 'ads' ? bid.conversion * timeSlot.conversion : 1);
    const capacity = CAPACITY[m.id], effectiveVisits = Math.min(visitors, capacity) + Math.max(0, visitors - capacity) * .5;
    const demand = Math.floor(effectiveVisits * conversion), orders = Math.min(units, demand);
    const qualityRate = (['furniture', 'future'].includes(p.category) ? .025 : p.category === 'electronics' ? .02 : .015) * (120 - listing.score) / 60;
    const priceRefundRate = Math.max(0, (price / p.basePrice - 1.3) / .1) * .02;
    const rates = [{ id: 'timing', label: '配送时效', rate: f.refundRate }, { id: 'description', label: '质量与描述', rate: qualityRate }, { id: 'other', label: '其他退货原因', rate: .02 }, ...(priceRefundRate > 0 ? [{ id: 'expectation', label: '高价预期落差', rate: priceRefundRate }] : [])];
    const refunds = orders ? Math.min(orders, Math.max(1, Math.round(orders * rates.reduce((s, r) => s + r.rate, 0)))) : 0;
    const reasonCounts = allocate(refunds, rates.map(r => r.rate));
    const big = (p.shippingFactor || 1) > 1, returnRestocked = Math.floor(refunds * (big ? .2 : .5)), returnWriteoffs = refunds - returnRestocked;
    const keptOrders = orders - refunds, avgCost = totalUnits ? availableCost / totalUnits : 0;
    const cogs = money(keptOrders * avgCost), writeoffCost = money((keptOrders + returnWriteoffs) * avgCost) - cogs;
    const returnHandlingCost = refunds * (big ? 6 : 2), revenue = money(orders * price), refundAmount = money(refunds * price), netRevenue = money(revenue - refundAmount);
    const shippingCost = money(orders * f.costPerOrder * m.freightFactor * (p.shippingFactor || 1)), platformFees = money(netRevenue * platform.fee);
    const sourceVisits = [carryVisitors + organicBonus + (channel.id === 'content' ? primaryVisitors : 0), channel.id === 'ads' ? primaryVisitors : 0, channel.id === 'creator' ? primaryVisitors : 0, offsiteVisitors];
    const sourceOrders = allocate(orders, sourceVisits), sourceRefunds = allocate(refunds, sourceOrders);
    const commissionGross = money(sourceOrders[2] * price * secondary.commission), commissionRecovery = money(sourceRefunds[2] * price * secondary.commission);
    const commission = money(commissionGross - commissionRecovery);
    const sourceNames = ['自然与内容', '广告', '达人', offsite.name], sourceIds = ['organic', 'ads', 'creator', 'offsite'];
    const attribution = sourceVisits.map((v, i) => {
      const spend = i === 3 ? offsite.cost : (i === 0 && channel.id === 'content' || sourceIds[i] === channel.id) ? budget : 0;
      const kept = sourceOrders[i] - sourceRefunds[i], fee = i === 2 ? commission : 0;
      return { id: sourceIds[i], name: sourceNames[i], visitors: v, orders: sourceOrders[i], refunds: sourceRefunds[i], keptOrders: kept, spend, commission: fee, cac: kept ? money((spend + fee) / kept) : null };
    });
    const platformEntry = platform.id === 'direct' && n.v2.openedPlatforms.includes('direct') ? 0 : platform.entry;
    const launchCost = money(m.launchCost * (n.previousMarket === m.id ? .5 : 1));
    const listingCost = sum(n.ledger.filter(e => e.round === n.round && e.category === 'listing').map(e => -e.cashDelta));
    const tax = taxQuote(m.id, p, orders, avgCost, firstMileUnit), { tariff, importTax } = tax;
    const paymentFee = money(netRevenue * .035), fxFee = money(netRevenue * tax.fxFee), packagingCost = money(orders * effects.packaging);
    const warehouseCost = money(Object.values(n.inventory).reduce((s, v) => s + v, 0) - (n.inventory[p.id] || 0) + totalUnits - orders + returnRestocked) * .5;
    const testingCost = expenses(n, 'testing'), eventCost = expenses(n, 'events'), trademarkCost = expenses(n, 'trademark');
    const seasonPrepCost = expenses(n, 'season') || (c.seasonPrep && seasonInfo.index !== 2 ? 300 : 0);
    const interestCost = sum(n.v2.loans.filter(l => l.round === n.round).map(l => l.interest));
    const platformEntryCost = expenses(n, 'platformEntry') || platformEntry;
    const totalCosts = sum([cogs, writeoffCost, returnHandlingCost, listingCost, shippingCost, platformFees, commission, budget, launchCost, tariff,
      importTax, paymentFee, fxFee, packagingCost, warehouseCost, firstMileCost, offsite.cost, testingCost, eventCost, trademarkCost, seasonPrepCost, interestCost, platformEntryCost]);
    return { modelVersion: 'v2', commerceRule: 'v23', ...supply, leadDays, units, totalUnits, quantity, unitsToBuy, arrivedUnits, delayedUnits, price, advertisedPrice, budget,
      tax, importTax, paymentFee, fxFee, packagingCost, warehouseCost, firstMileCost, firstMileUnit, firstMile, platform, platformEntryCost,
      commissionGross, commissionRecovery, offsiteCost: offsite.cost, offsite, testingCost, eventCost, trademarkCost, seasonPrepCost, interestCost,
      localRevenue: money(netRevenue * tax.fx), heat, season: seasonInfo, seasonFactor, bid, timeSlot, adVariation,
      acos: sourceOrders[1] > sourceRefunds[1] ? budget / ((sourceOrders[1] - sourceRefunds[1]) * price) : null, fit,
      visitors, currentRoundVisitors, carryVisitors, organicBonus, regionFactor, conversion, baseConversion, priceFactor, deliveryFactor, coldStartFactor, capacity, saturated: visitors > capacity,
      demand, orders, refunds, keptOrders, listingScore: listing.score, listingConversionFactor: listing.conversionFactor, listingCost,
      returnRestocked, returnWriteoffs, returnHandlingCost, refundReasons: rates.map((r, i) => ({ ...r, count: reasonCounts[i] })), priceRefundRate,
      revenue, refundAmount, netRevenue, cogs, writeoffCost: money(writeoffCost), shippingCost, platformFees, commission, marketingCost: budget, launchCost, tariff, purchaseCost, availableCost,
      totalCosts, profit: money(netRevenue - totalCosts), stockouts: Math.max(0, demand - orders), inventoryRemaining: totalUnits - orders + returnRestocked,
      inventoryCostRemaining: money(availableCost - cogs - writeoffCost), days: f.days, attribution, tacos: revenue ? (channel.id === 'ads' ? budget : 0) / revenue : null,
      promotionChoice: { id: secondary.id, name: secondary.name, category: secondary.category, matched: secondary.matched },
      nextContentTail: channel.id === 'content' ? Math.floor(currentRoundVisitors * .1) : 0, ratingBefore: rating,
      badReviews: Math.round(refunds * .3), commissionRate: secondary.commission, events: copy(effects.active) };
  }
  function candidate(n, d) {
    const r = copy(n); r.v2.config = copy(d.config || config(n)); r[keys[n.stage]] = d.id;
    if (n.stage === 2) Object.assign(r, { quantity: d.quantity, price: d.price, supplierId: d.supplierId, supplyRule: d.supplyRule });
    if (n.stage === 3) {
      if (!r.currentListing && d.listing) Object.assign(r, publish(r, d.listing));
      r.trafficBudget = d.budget; r.promotionChoice = d.promotionChoice;
    }
    return r;
  }
  function preview(n, input) {
    const d = normalize(n, input); if (!d) return null;
    const r = candidate(n, d), option = find(tables[n.stage], d.id);
    if (n.stage === 3 && !r.currentListing) return null;
    const mean = simulate(r, 'mean'), low = simulate(r, 'low'), high = simulate(r, 'high');
    let cashDelta = 0, inventoryDelta = 0;
    const c = config(r), platform = selected(PLATFORMS, c.platform);
    const entryFee = platform.id === 'direct' && n.v2.openedPlatforms.includes('direct') ? 0 : platform.entry;
    if (n.stage === 0) cashDelta = -money(option.launchCost * (n.previousMarket === d.id ? .5 : 1) + entryFee);
    if (n.stage === 2) { cashDelta = -(c.terms === 'credit' ? 0 : mean.purchaseCost) - mean.firstMileCost - mean.seasonPrepCost; inventoryDelta = mean.unitsToBuy; }
    if (n.stage === 3) cashDelta = -d.budget - mean.offsiteCost - (n.currentListing ? 0 : r.currentListing?.cost || 0);
    const settlement = p => -sum([p.shippingCost, p.platformFees, p.commissionGross, p.returnHandlingCost, p.tariff, p.importTax, p.paymentFee, p.fxFee, p.packagingCost, p.warehouseCost]);
    if (n.stage === 4) { cashDelta = settlement(mean); inventoryDelta = -mean.orders + mean.returnRestocked; }
    if (n.stage === 5) cashDelta = -option.cost;
    const overdue = [...n.v2.payables, ...n.v2.loans].some(b => !b.paid && b.dueRound <= n.round);
    const blocked = n.stage === 2 && overdue ? '有到期款项尚未偿还，先核对资金时间线或使用过桥方案。' : n.stage === 2 && mean.unitsToBuy > 0 && mean.unitsToBuy < mean.moq ? `${mean.supplierName}至少新增采购${mean.moq}件，当前补货${mean.unitsToBuy}件。请调整数量或供应商。` : null;
    const marketBlocked = n.stage === 0 && n.carryEffect.newMarket && d.id === n.carryEffect.previousMarket;
    const bounds = {};
    if (mean) for (const k of ['visitors', 'demand', 'orders', 'refunds', 'keptOrders', 'profit', 'shippingCost', 'returnHandlingCost', 'writeoffCost', 'returnRestocked', 'returnWriteoffs', 'tariff', 'importTax', 'acos']) bounds[k] = low[k] == null || high[k] == null ? [null, null] : [Math.min(low[k], high[k]), Math.max(low[k], high[k])];
    const attributionBounds = mean ? Object.fromEntries(mean.attribution.map((s, i) => [s.id, [Math.min(low.attribution[i].orders, high.attribution[i].orders), Math.max(low.attribution[i].orders, high.attribution[i].orders)]])) : {};
    if (mean && n.stage === 4) bounds.cashDelta = [Math.min(settlement(low), settlement(high)), Math.max(settlement(low), settlement(high))];
    if (n.stage === 5) bounds.profit = [money(n.report.profit - option.cost), money(n.report.profit - option.cost)];
    return { ...mean, cashDelta: money(cashDelta), inventoryDelta, bounds, attributionBounds, settled: n.stage >= 5, profit: n.stage === 5 ? money(n.report.profit - option.cost) : mean?.profit ?? null,
      affordable: n.cash + cashDelta >= 0 && !blocked && !marketBlocked, supplyBlockedReason: blocked,
      summary: option.summary, risks: [option.risk, ...(blocked ? [blocked] : [])],
      cashShortfall: Math.max(0, money(-n.cash - cashDelta)), assumptions: '教学模拟；销售窗口30天，交付后的平台款14天结算，下轮开局到账。同轮同方案固定，跨轮重新波动。', nextTrafficBonus: option.trafficBonus || 0 };
  }
  function makeReport(n, p) {
    const r = old.report(n, p);
    const before = n.roundStart.ratings[n.productId] || { rating: 5, reviews: 0 };
    const reviews = before.reviews + p.orders;
    const stars = before.rating * before.reviews + p.keptOrders * 5 + (p.refunds - p.badReviews) * 5 + p.badReviews;
    const ratingAfter = Math.min(5, (p.orders > 0 && p.refunds === 0 ? Math.min(5, before.rating + .1) : reviews ? clamp(stars / reviews, 1, 5) : before.rating) + p.offsite.rating);
    n.ratings[n.productId] = { rating: money(ratingAfter), reviews };
    Object.assign(r, { totalCosts: p.totalCosts, ratingAfter: money(ratingAfter), roundStart: copy(n.roundStart), modelVersion: 'v2',
      formula: '本轮先按来源形成访问机会，再由市场匹配、售价、商品页、配送、评分与波动计算购买意愿；超出市场容量的机会减半，库存和交期限制实际订单。退款与全部费用分别记账。',
      nextRatingImpact: 1 - Math.sqrt(ratingAfter / 5) });
    r.conclusions.push(p.delayedUnits ? `${p.leadDays}天备货使${p.delayedUnits}件新货错过本轮销售窗口，余货计入下轮库存。` : '现有库存及时衔接了本轮销售。');
    r.conclusions.push(`${p.tax.country}预估关税 $${p.tariff.toFixed(2)}、${p.tax.taxName} $${p.importTax.toFixed(2)} 已分别入账。`);
    if (p.badReviews >= 10) r.conclusions.push(`运营伙伴提醒：新增${p.badReviews}条差评。下轮注意商品描述和交付体验。`);
    Object.assign(r, balance(n), { lesson: '经营利润按已发生的收入与费用计算；现金还会受到采购账期、14天回款及贷款本金的影响。未售库存仍是资产。' });
    return r;
  }
  function balance(n) {
    const receivables = dueTotal(n.v2.receivables), liabilities = money(dueTotal(n.v2.payables) + dueTotal(n.v2.loans));
    const start = n.roundStart, openingReceivables = dueTotal(start.v2?.receivables || []), openingLiabilities = money(dueTotal(start.v2?.payables || []) + dueTotal(start.v2?.loans || []));
    return { receivables, liabilities, openingReceivables, openingLiabilities,
      assetChange: money(n.cash + value(n.inventory, n.inventoryCosts) + receivables - liabilities - start.cash - value(start.inventory, start.inventoryCosts) - openingReceivables + openingLiabilities) };
  }
  function settleDue(n) {
    for (const row of n.v2.receivables.filter(r => !r.paid && r.dueRound <= n.round)) {
      entry(n, row.kind === 'commission' ? 'commissionRecovery' : 'receipts', row.kind === 'commission' ? '追回上一轮退款佣金' : '平台14天应收款到账', row.amount); row.paid = true;
    }
    for (const row of n.v2.payables.filter(r => !r.paid && r.dueRound <= n.round)) if (n.cash >= row.amount) {
      entry(n, 'payables', '到期采购款支付（不重复计利润费用）', -row.amount); row.paid = true;
    }
    for (const row of n.v2.loans.filter(r => !r.paid && r.dueRound <= n.round)) if (n.cash >= row.amount) {
      entry(n, 'loanRepayment', '到期过桥贷款本金与利息', -row.amount); row.paid = true;
    }
    return n;
  }
  function commit(n, input) {
    if (n.stage === 6) return n;
    const d = normalize(n, input), p = d && preview(n, d);
    if (!d || !p?.affordable) return feedback(n, '方案暂时不能执行', p?.supplyBlockedReason || '请检查方案参数和可用现金。');
    const r = candidate(n, d), option = find(tables[n.stage], d.id);
    r.decisions.push(copy(d));
    let delta = p.cashDelta;
    if (n.stage === 0) {
      const platform = selected(PLATFORMS, config(r).platform), fee = platform.id === 'direct' && r.v2.openedPlatforms.includes('direct') ? 0 : platform.entry;
      entry(r, 'launch', `${option.name} · ${n.previousMarket === d.id ? '续留半价运营' : '市场进入'}`, -money(option.launchCost * (n.previousMarket === d.id ? .5 : 1)));
      entry(r, 'platformEntry', `${platform.name} · 模拟店铺费用`, -fee);
      r.v2.openedPlatforms = [...new Set([...r.v2.openedPlatforms, platform.id])];
      r.visitedMarkets = [...new Set([...r.visitedMarkets, d.id])];
      if (!r.v2.entered.includes(d.id)) { r.v2.entered.push(d.id); r.v2.entryRewards.push(d.id); r.v2.firstEntry = { marketId: d.id, round: r.round }; }
    }
    if (n.stage === 2) {
      r.inventory[r.productId] += p.unitsToBuy; r.inventoryCosts[r.productId] = p.availableCost;
      if (config(r).terms === 'credit' && p.purchaseCost) r.v2.payables.push({ round: r.round, dueRound: r.round + 1, amount: p.purchaseCost, paid: false });
      else entry(r, 'procurement', `${p.supplierName} · 采购补货`, -p.purchaseCost);
      entry(r, 'firstMile', `${p.firstMile.name} · 头程运输`, -p.firstMileCost);
      if (p.seasonPrepCost) { entry(r, 'season', '大卖季提前备战', -p.seasonPrepCost); r.v2.seasonPrepared = Math.ceil(r.round / 3); }
    }
    if (n.stage === 3) { entry(r, 'marketing', `${option.name} · ${p.promotionChoice.name}`, -d.budget); if (p.offsiteCost) entry(r, 'offsite', p.offsite.name, -p.offsiteCost); }
    if (n.stage === 4) {
      const actual = simulate(r);
      const settlementCosts = [['shipping', '跨境履约', actual.shippingCost], ['platform', '模拟平台佣金', actual.platformFees], ['commission', '达人佣金（毛收入计提）', actual.commissionGross], ['returnHandling', '退件检验与处理', actual.returnHandlingCost],
        ['tariff', `${actual.tax.country}预估关税`, actual.tariff], ['importTax', actual.tax.taxName, actual.importTax],
        ['payment', '收款手续费3.5%', actual.paymentFee], ['fx', '换汇成本', actual.fxFee], ['packaging', '差异化包装', actual.packagingCost], ['warehouse', '余货仓储费 $0.5/件/轮', actual.warehouseCost]];
      if (money(n.cash - sum(settlementCosts.map(row => row[2]))) < 0) return feedback(n, '交付前现金不足', '平台货款将在交付后14天回款。可先使用资金时间线中的过桥方案，或调整履约和备货。');
      r.inventory[r.productId] = actual.inventoryRemaining; r.inventoryCosts[r.productId] = actual.inventoryCostRemaining;
      r.v2.receivables.push({ round: r.round, dueRound: r.round + 1, days: 14, amount: actual.netRevenue, kind: 'sales', paid: false });
      if (actual.commissionRecovery) r.v2.receivables.push({ round: r.round, dueRound: r.round + 1, amount: actual.commissionRecovery, kind: 'commission', paid: false });
      for (const [category, label, amount] of settlementCosts) if (amount) entry(r, category, label, -amount);
      r.report = makeReport(r, actual); delta = money(r.cash - n.cash);
      for (const event of r.v2.events.filter(e => e.dueRound === r.round && !e.choice)) {
        event.choice = 'no-action';
        r.v2.eventHistory.push({ ...copy(event), resolvedRound: r.round, outcome: '本轮未采取额外措施，结果已计入战报。' });
      }
    }
    if (n.stage === 5) {
      entry(r, 'expansion', option.name, -option.cost);
      Object.assign(r.report, { expansionCost: option.cost, profit: money(r.report.profit - option.cost), contributionProfit: money(r.report.profit - option.cost), totalCosts: money(r.report.totalCosts + option.cost), cash: r.cash, cashChange: money(r.cash - r.roundStart.cash), assetChange: money(r.cash + r.report.inventoryValue - r.roundStart.cash - r.report.openingInventoryValue), decisions: copy(r.decisions) });
      Object.assign(r.report, balance(r));
      schedule(r);
      r.history.push(copy(r.report)); r.contentTail = r.report.nextContentTail;
      r.previousMarket = r.marketId;
      r.carryEffect = { trafficBonus: option.trafficBonus, previousMarket: r.marketId, newMarket: !!option.newMarket };
    }
    r.stage++;
    const titles = ['销售市场已确认', '主打商品已选定', '定价与备货已执行', '推广方案已启动', '本轮订单已结算', '下一轮计划已保存'];
    const body = n.stage === 2 ? `采购${p.unitsToBuy}件，交期${p.leadDays}天；本轮预计到货${p.arrivedUnits}件，另${p.delayedUnits}件保留到下一轮。` : n.stage === 4 ? `${r.report.orders}单下单、${r.report.refunds}单退款；本轮贡献利润 $${r.report.profit.toFixed(2)}，费用与库存已对账。` : n.stage === 3 ? `${p.promotionChoice.name}已确认，推广预算 $${d.budget} 已入账。` : '选择已记录，继续下一步。';
    return feedback(r, titles[n.stage], body, { cash: delta, inventory: p.inventoryDelta, orders: n.stage === 4 ? r.report.orders : 0 });
  }
  function restoreStart(n, snap) {
    const r = create(n.runSeed);
    Object.assign(r, copy(snap), { cash: snap.cash, stage: 0, round: snap.round || n.round, inventory: copy(snap.inventory), inventoryCosts: copy(snap.inventoryCosts), listingAssets: copy(snap.listingAssets),
      ledger: copy(n.ledger.slice(0, snap.ledgerLength)), history: copy(n.history.slice(0, snap.historyLength)), roundStart: copy(snap) });
    return settleDue(r);
  }
  function rollback(n, stage = 0) {
    if (!Number.isInteger(stage) || stage < 0 || stage > Math.min(5, n.stage)) return n;
    let r = restoreStart(n, n.roundStart);
    // Preserve paid optimizations, with the matching charge, even when replaying this round.
    for (const event of n.listingInvestments.filter(e => e.round === n.round)) {
      if (!r.listingAssets[event.productId]) continue;
      r.listingAssets[event.productId].baseScore = event.score;
      r.listingAssets[event.productId].score = event.score;
      r.listingAssets[event.productId].matchedStyle = false;
      r.listingInvestments.push(copy(event)); entry(r, 'listing', '商品页持续优化 +5分', -event.cost);
    }
    for (let i = 0; i <= stage; i++) {
      for (const action of n.v2.actions.filter(e => e.stage === i)) r = act(r, action);
      if (i < stage) r = commit(r, n.decisions[i]);
    }
    return feedback(r, '已回到本轮选择', '本轮市场波动保持相同，相同方案得到相同结果；已购优化与对应费用保留。');
  }
  function next(n) {
    if (n.stage !== 6) return n;
    const r = create(n.runSeed);
    for (const k of ['cash', 'inventory', 'inventoryCosts', 'listingAssets', 'ledger', 'history', 'visitedMarkets', 'ratings', 'contentTail', 'previousMarket', 'carryEffect', 'listingInvestments', 'clearanceEvents', 'v2']) r[k] = copy(n[k]);
    r.v2.heat[n.productId] ??= 1;
    for (const id of Object.keys(r.v2.heat)) r.v2.heat[id] *= .95;
    r.v2.actions = []; r.v2.firstEntry = null;
    r.v2.config = { ...CONFIG_DEFAULTS, platform: config(n).platform };
    r.round = n.round + 1; r.roundStart = snapshot(r);
    settleDue(r);
    return feedback(r, `第${r.round}轮经营已开始`, '现金、库存、商品页与评分已保留。本轮市场波动已更新，同轮重试保持公平。');
  }
  function previous(n) {
    const report = n.history.find(r => r.round === n.round - 1);
    if (!report?.roundStart?.engineVersion) return n;
    return restoreStart(n, report.roundStart);
  }
  function clearStock(n, productId) {
    if (![5, 6].includes(n.stage) || !(n.inventory[productId] > 0) || !find(products, productId)) return n;
    const r = copy(n), quantity = r.inventory[productId], cost = r.inventoryCosts[productId] ?? quantity * find(products, productId).cost, cash = money(cost * .5), loss = money(cost - cash);
    r.inventory[productId] = 0; r.inventoryCosts[productId] = 0;
    entry(r, 'clearance', `${find(products, productId).name} · ${quantity}件五折清仓`, cash);
    r.clearanceEvents.push({ round: r.round, productId, quantity, cost, cash });
    if (r.report) {
      const report = r.report;
      Object.assign(report, { clearanceRevenue: money((report.clearanceRevenue || 0) + cash), clearanceLoss: money((report.clearanceLoss || 0) + loss), profit: money(report.profit - loss), contributionProfit: money(report.profit - loss), totalCosts: money(report.totalCosts + loss), cash: r.cash, cashChange: money(r.cash - r.roundStart.cash), inventory: copy(r.inventory), inventoryCosts: copy(r.inventoryCosts), inventoryValue: value(r.inventory, r.inventoryCosts) });
      report.assetChange = money(r.cash + report.inventoryValue - r.roundStart.cash - report.openingInventoryValue);
      if (productId === r.productId) { report.inventoryRemaining = 0; report.inventoryCostRemaining = 0; }
      Object.assign(report, balance(r));
      if (r.stage === 6) r.history[r.history.length - 1] = copy(report);
    }
    return feedback(r, '余货已清仓', `${quantity}件回款 $${cash.toFixed(2)}，清仓损失 $${loss.toFixed(2)}，已写入账本。`, { cash });
  }
  function serialize(n) { return JSON.stringify({ format: 'crossbound.v2', state: n }); }
  function deserialize(raw) {
    try {
      const envelope = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (envelope?.format !== 'crossbound.v2') return null;
      const n = envelope.state;
      if (!valid(n) || !Number.isInteger(n.runSeed) || !Number.isInteger(n.round) || n.round < 1 || n.round > 100 || !Number.isInteger(n.stage) || n.stage < 0 || n.stage > 6 || !Array.isArray(n.decisions) || n.decisions.length !== n.stage || !Array.isArray(n.history) || !Array.isArray(n.ledger) || !Number.isFinite(n.cash) || n.cash < 0 || money(n.cash) !== n.cash || !n.roundStart || !Array.isArray(n.visitedMarkets) || !Array.isArray(n.listingInvestments) || !Array.isArray(n.clearanceEvents)) return null;
      if (products.some(p => !Number.isInteger(n.inventory[p.id]) || n.inventory[p.id] < 0 || !Number.isFinite(n.inventoryCosts[p.id] ?? 0) || (n.inventoryCosts[p.id] ?? 0) < 0)) return null;
      if (n.decisions.some((d, i) => !find(tables[i], d.id))) return null;
      if (n.ledger.some(e => !Number.isFinite(e.cashDelta))) return null;
      if (!n.v2 || !n.roundStart.v2 || !['receivables', 'payables', 'loans', 'events', 'eventHistory', 'actions', 'tests', 'entered', 'openedPlatforms', 'entryRewards'].every(k => Array.isArray(n.v2[k]))) return null;
      if ([...n.v2.receivables, ...n.v2.payables, ...n.v2.loans].some(r => !Number.isFinite(r.amount) || r.amount < 0 || !Number.isInteger(r.dueRound))) return null;
      if (typeof n.v2.identity !== 'string' || !n.v2.heat || Object.values(n.v2.heat).some(v => !Number.isFinite(v) || v < 0 || v > 1) || n.v2.tests.some(t => !Number.isFinite(t.score))) return null;
      const roundDelta = sum(n.ledger.filter(e => e.round === n.round).map(e => e.cashDelta));
      if (money(n.roundStart.cash + roundDelta) !== n.cash) return null;
      return copy(n);
    } catch { return null; }
  }
  function milestones(n) {
    const history = n.history;
    const defs = [
      ['first-profit', '第一桶金', '首次完成一轮并盈利', r => r.profit > 0],
      ['first-goal', '第一站，站稳了', '首次完成订单目标且盈利', r => r.profit > 0 && r.keptOrders >= (r.round === 1 ? 300 : 500)],
      ['steady-delivery', '稳稳交付', '单轮至少300单，退款率不高于5%', r => r.orders >= 300 && r.refunds / r.orders <= .05],
      ['profit-5000', '生意起势', '单轮贡献利润超过$5,000', r => r.profit > 5000],
      ['listing-master', '好商品，被看懂', '用95分及以上商品页完成一轮', r => r.listingScore >= 95],
    ];
    const oldZero = history.find(r => r.orders > 0 && r.refunds === 0);
    if (oldZero) defs.push(['zero-refunds', '完美交付 · 历史纪念', '旧版已获得的零退款徽章，永久保留', r => r === oldZero]);
    return defs.map(([id, name, description, predicate]) => { const found = history.find(predicate); return { id, name, description, earned: !!found, round: found?.round }; });
  }
  return { valid, create, migrate, upgrade, snapshot, listingProduct, listingQuote, publish, optimize, choice, normalize, simulate, preview, commit, rollback, next, previous, clearStock, serialize, deserialize, milestones, scale, products, markets, channels,
    configure, config, supplyQuote, act, eventChoices, eventEffect, balance };
}
