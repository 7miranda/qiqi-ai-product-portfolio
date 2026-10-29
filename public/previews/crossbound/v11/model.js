import { GOAL_VERSION, goal, goalPasses } from '../v2/release.js?v=13cef6754e';
import { BALANCE_VERSION, friendly, balanceRules, balanceOptions, acquisitionRisk, STOCK_CARRYOVER, STOCK_RETURN_FEE, CREATOR_RANGE, CREATOR_MATCH, EVENT_FLOOR } from '../v11/balance.js?v=13cef6754e';
// Crossbound v1.1: pure operating rules. The bridge supplies the existing demo data.
export const money = value => Math.round((value + Number.EPSILON) * 100) / 100;
const copy = value => structuredClone(value);
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const sum = values => money(values.reduce((a, b) => a + b, 0));
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
    { id: 'vertical', name: '垂类达人 · 对口受众', detail: '建议预算 $1,800；选择对口领域，转化 +30%，分佣 8%', visitors: 1, commission: .08, suggestedBudget: 1800 },
  ],
  content: [
    { id: 'review', name: '测评', detail: '拆解性能与使用证据', categories: ['electronics', 'future'], visitors: 1, commission: 0 },
    { id: 'unboxing', name: '开箱', detail: '展示外观、配件与生活体验', categories: ['lifestyle', 'outdoor'], visitors: 1, commission: 0 },
    { id: 'tutorial', name: '教程', detail: '演示收纳、安装与实际用法', categories: ['home', 'furniture'], visitors: 1, commission: 0 },
  ],
};
export const HELP = {
  returns: ['退款为什么还有损失？', '退款会退还买家货款，但运费已经发生。小件退货中50%可重新出售、大件20%；不能再售的货值计为损失，另收每单$2／$6处理费。可售退件保留库存成本，不重复扣采购款。'],
  tariff: ['预估关税是什么？', '税费与平台费、运费分别记账，退货不自动退税。旧版战报保留当时的美国站8%规则；V2按各国配置分别计算关税和进口税，详细口径见本轮税费明细。所有税率都按游戏教学场景简化。'],
  conversion: ['访客为什么没有都下单？', '商品与市场匹配、售价、上架质量、配送速度、评分和推广内容共同影响购买意愿。售价越高通常越难成交；交期较长还会让部分新货错过本轮销售机会。'],
  cac: ['CAC 与 TACOS 怎么看？', '这里按各来源到访占比分配订单，是简化估算。CAC为渠道预算及佣金除以该来源未退款订单；TACOS为广告花费除以总销售额。没有订单时显示“暂无”，不把除零写成0。'],
  inventory: ['库存为什么不是亏掉的钱？', '本版暂行规则：每轮结算时，没卖完的货（含退货回库的）按进货成本退回现金，扣5%清仓手续费，库存清零，下一轮重新备货。退回的是本金，不算利润；那5%手续费算作本轮成本，是买多了的代价。'],
};

export function createCrossboundV11(a) {
  const { products, markets, stocks, channels, fulfillment, expansion, old } = a;
  const tables = [markets, products, stocks, channels, fulfillment, expansion];
  const options = (n, kind) => balanceOptions(n, kind, ({markets,channels,fulfillment})[kind]);
  const keys = ['marketId', 'productId', 'stockPlanId', 'trafficPlanId', 'fulfillmentPlanId', 'expansionPlanId'];
  const find = (rows, id) => rows.find(r => r.id === id);
  const valid = n => n?.engineVersion === 'v11';
  const value = (inv, costs) => sum(products.map(p => costs?.[p.id] ?? (inv[p.id] || 0) * p.cost));
  const feedback = (n, title, body, delta = {}) => ({ ...n, feedback: { title, body, delta } });
  const entry = (n, category, label, cashDelta) => {
    n.cash = money(n.cash + cashDelta);
    n.ledger.push({ id: n.ledger.length + 1, round: n.round, category, label, cashDelta: money(cashDelta) });
  };
  function snapshot(n) {
    return { ...old.snapshot(n), engineVersion: 'v11', balanceVersion:n.balanceVersion, goalVersion:n.goalVersion, runSeed: n.runSeed, round: n.round,
      visitedMarkets: copy(n.visitedMarkets || []), ratings: copy(n.ratings || {}),
      contentTail: n.contentTail || 0, previousMarket: n.previousMarket || null,
      listingInvestments: copy(n.listingInvestments || []), clearanceEvents: copy(n.clearanceEvents || []) };
  }
  function create(seed) {
    const n = old.create();
    Object.assign(n, { balanceVersion:BALANCE_VERSION, goalVersion:GOAL_VERSION, engineVersion: 'v11', runSeed: seed ?? globalThis.crypto.getRandomValues(new Uint32Array(1))[0],
      visitedMarkets: [], ratings: {}, contentTail: 0, previousMarket: null, listingInvestments: [], clearanceEvents: [] });
    n.roundStart = snapshot(n);
    return n;
  }
  function migrate(n) {
    if (valid(n)) return n;
    const out = copy(n);
    // A running historical round keeps its rules until next round. No history is recalculated.
    if (out.stage !== 0) return out;
    Object.assign(out, { balanceVersion:BALANCE_VERSION, goalVersion:GOAL_VERSION, engineVersion: 'v11', runSeed: globalThis.crypto.getRandomValues(new Uint32Array(1))[0],
      visitedMarkets: [...new Set(out.history.map(r => r.marketId))], ratings: {}, contentTail: 0,
      previousMarket: out.carryEffect.previousMarket, listingInvestments: [], clearanceEvents: [] });
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
    r.currentListing = { ...q, commerceRule: 'v23', modelVersion: 'v11', marketId: r.marketId, productId: r.productId, round: r.round };
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
      conversionFactor: channelId === 'ads' ? matched ? 1.1 : .95 : channelId === 'creator' && matched ? CREATOR_MATCH : 1 };
  }
  function normalize(n, input) {
    const raw = typeof input === 'string' ? { id: input } : input;
    const option = raw && find(tables[n.stage] || [], raw.id);
    if (!option) return null;
    const out = { id: raw.id };
    if (n.stage === 2) {
      const p = find(products, n.productId);
      out.quantity = raw.quantity ?? option.quantity; out.price = raw.price ?? Math.round(p.basePrice * option.priceFactor);
      out.supplierId = raw.supplierId ?? 'standard'; out.supplyRule = 'v1';
      if (!Number.isInteger(out.quantity) || out.quantity < 200 || out.quantity > 1600 || !Number.isFinite(out.price) || out.price < Math.round(p.basePrice * .7) || out.price > Math.round(p.basePrice * balanceRules(n).maxPrice) || money(out.price) !== out.price || !a.supplier(p, out.supplierId, out.supplyRule)) return null;
    }
    if (n.stage === 3) {
      out.budget = raw.budget ?? find(options(n, 'channels'), option.id).budget;
      if (!Number.isInteger(out.budget) || out.budget < 300 || out.budget > 8000) return null;
      if (n.currentListing) out.listing = copy(n.currentListing.selection);
      else if (raw.listing && listingQuote(n, raw.listing)) out.listing = copy(raw.listing);
      const c = choice(out.id, raw.promotionChoice, find(products, n.productId));
      out.promotionChoice = { id: c.id, category: c.category };
    }
    return out;
  }
  function simulate(n, mode = 'actual') {
    const p = find(products, n.productId), m = find(options(n, 'markets'), n.marketId);
    if (!p || !m) return null;
    const stock = find(stocks, n.stockPlanId) || stocks[0], channel = find(options(n, 'channels'), n.trafficPlanId) || options(n, 'channels')[0], f = find(options(n, 'fulfillment'), n.fulfillmentPlanId) || options(n, 'fulfillment')[1];
    const rules = balanceRules(n);
    const price = n.price ?? Math.round(p.basePrice * stock.priceFactor), quantity = n.quantity ?? stock.quantity;
    const budget = n.trafficBudget ?? channel.budget, supply = a.supplier(p, n.supplierId, n.supplyRule);
    if (!supply) return null;
    const openingQty = n.roundStart.inventory[p.id] || 0, unitsToBuy = Math.max(0, quantity - openingQty), totalUnits = openingQty + unitsToBuy;
    const purchaseCost = money(unitsToBuy * supply.unitCost);
    const availableCost = sum([n.roundStart.inventoryCosts[p.id] ?? openingQty * p.cost, purchaseCost]);
    // One round is a 30-day teaching window. Old stock is available immediately.
    const arrivedUnits = Math.floor(unitsToBuy * clamp((30 - supply.leadDays) / 30, rules.arrivalFloor, 1));
    const units = openingQty + arrivedUnits, delayedUnits = unitsToBuy - arrivedUnits;
    const regionFactor = ({ '亚洲': .8, '欧洲': 1, '北美洲': 1.2, '大洋洲': .85, '南美洲': .9 })[m.region] || 1;
    const draw = key => seededUnit(n.runSeed, n.round, key);
    const variation = key => mode === 'low' ? .9 : mode === 'high' ? 1.1 : mode === 'mean' ? 1 : .9 + draw(key) * .2;
    const creatorFactor = channel.id !== 'creator' ? 1 : mode === 'low' ? CREATOR_RANGE[0] : mode === 'high' ? CREATOR_RANGE[1] : mode === 'mean' ? (CREATOR_RANGE[0] + CREATOR_RANGE[1]) / 2 : CREATOR_RANGE[0] + draw('creator') * (CREATOR_RANGE[1] - CREATOR_RANGE[0]);
    const secondary = choice(channel.id, n.promotionChoice, p);
    const baseVisitors = channel.id === 'content' ? 16500 : channel.visitors;
    // Content wins economical tests and builds tail; production capacity limits rapid scaling.
    const contentScaling = channel.id === 'content' ? 1 / (1 + .035 * Math.max(0, budget / 900 - 1)) : 1;
    const currentRoundVisitors = Math.floor(baseVisitors * Math.sqrt(budget / channel.budget) * regionFactor * variation('traffic') * creatorFactor * secondary.trafficFactor * contentScaling);
    const carryVisitors = Math.floor((n.contentTail || 0) + (n.carryEffect.trafficBonus || 0));
    const listing = n.currentListing || { score: 80, conversionFactor: 1 };
    const organicBonus = listing.score >= 95 ? Math.floor((currentRoundVisitors + carryVisitors) * .2) : 0;
    const visitors = currentRoundVisitors + carryVisitors + organicBonus;
    const deliveryFactor = ({ economy: .92, standard: 1, express: 1.1 })[f.id];
    const rating = n.roundStart.ratings?.[p.id]?.rating ?? 5;
    const coldStartFactor = n.previousMarket && n.previousMarket !== m.id && !n.roundStart.visitedMarkets.includes(m.id) ? .9 : 1;
    const priceFactor = (p.basePrice / price) ** rules.elasticity;
    const baseConversion = rules.conversion * m.demandFactor * a.fit(p, m.id);
    const conversion = baseConversion * priceFactor * listing.conversionFactor * deliveryFactor * Math.sqrt(rating / 5) * coldStartFactor * secondary.conversionFactor * variation('demand');
    const capacity = CAPACITY[m.id], effectiveVisits = Math.min(visitors, capacity) + Math.max(0, visitors - capacity) * .5;
    const demand = Math.floor(effectiveVisits * conversion), orders = Math.min(units, demand);
    const qualityRate = (['furniture', 'future'].includes(p.category) ? .025 : p.category === 'electronics' ? .02 : .015) * (120 - listing.score) / 60;
    const priceRefundRate = Math.max(0, (price / p.basePrice - 1.3) / .1) * rules.priceRefundSlope;
    const rates = [{ id: 'timing', label: '配送时效', rate: f.refundRate }, { id: 'description', label: '质量与描述', rate: qualityRate }, { id: 'other', label: '其他退货原因', rate: .02 }, ...(priceRefundRate > 0 ? [{ id: 'expectation', label: '高价预期落差', rate: priceRefundRate }] : [])];
    const refunds = orders ? Math.min(orders, Math.max(1, Math.round(orders * rates.reduce((s, r) => s + r.rate, 0)))) : 0;
    const reasonCounts = allocate(refunds, rates.map(r => r.rate));
    const big = (p.shippingFactor || 1) > 1, returnRestocked = Math.floor(refunds * (big ? .2 : .5)), returnWriteoffs = refunds - returnRestocked;
    const keptOrders = orders - refunds, avgCost = totalUnits ? availableCost / totalUnits : 0;
    const cogs = money(keptOrders * avgCost), writeoffCost = money((keptOrders + returnWriteoffs) * avgCost) - cogs;
    const returnHandlingCost = refunds * (big ? 6 : 2), revenue = money(orders * price), refundAmount = money(refunds * price), netRevenue = money(revenue - refundAmount);
    const shippingCost = money(orders * f.costPerOrder * m.freightFactor * (p.shippingFactor || 1)), platformFees = money(netRevenue * .1);
    const sourceVisits = [carryVisitors + organicBonus + (channel.id === 'content' ? currentRoundVisitors : 0), channel.id === 'ads' ? currentRoundVisitors : 0, channel.id === 'creator' ? currentRoundVisitors : 0];
    const sourceOrders = allocate(orders, sourceVisits), sourceRefunds = allocate(refunds, sourceOrders);
    const commission = money((sourceOrders[2] - sourceRefunds[2]) * price * secondary.commission);
    const sourceNames = ['自然与内容', '广告', '达人'], sourceIds = ['organic', 'ads', 'creator'];
    const attribution = sourceVisits.map((v, i) => {
      const spend = (i === 0 && channel.id === 'content' || sourceIds[i] === channel.id) ? budget : 0;
      const kept = sourceOrders[i] - sourceRefunds[i], fee = i === 2 ? commission : 0;
      return { id: sourceIds[i], name: sourceNames[i], visitors: v, orders: sourceOrders[i], refunds: sourceRefunds[i], keptOrders: kept, spend, commission: fee, cac: kept ? money((spend + fee) / kept) : null };
    });
    const launchCost = n.roundStart.visitedMarkets.includes(m.id) ? 0 : money(m.launchCost);
    const listingCost = sum(n.ledger.filter(e => e.round === n.round && e.category === 'listing').map(e => -e.cashDelta));
    const tariff = m.id === 'los-angeles' ? money(orders * (friendly(n) ? avgCost : price) * .08) : 0;
    const totalCosts = sum([cogs, writeoffCost, returnHandlingCost, listingCost, shippingCost, platformFees, commission, budget, launchCost, tariff, STOCK_CARRYOVER ? 0 : money(money(availableCost - cogs - writeoffCost) * STOCK_RETURN_FEE)]);
    return { balanceVersion:n.balanceVersion, goalVersion:n.goalVersion, modelVersion: 'v11', commerceRule: 'v23', ...supply, units, totalUnits, quantity, unitsToBuy, arrivedUnits, delayedUnits, price, budget,
      visitors, currentRoundVisitors, carryVisitors, organicBonus, regionFactor, conversion, baseConversion, priceFactor, deliveryFactor, coldStartFactor, capacity, saturated: visitors > capacity,
      demand, orders, refunds, keptOrders, listingScore: listing.score, listingConversionFactor: listing.conversionFactor, listingCost,
      returnRestocked, returnWriteoffs, returnHandlingCost, refundReasons: rates.map((r, i) => ({ ...r, count: reasonCounts[i] })), priceRefundRate,
      revenue, refundAmount, netRevenue, cogs, writeoffCost: money(writeoffCost), shippingCost, platformFees, commission, marketingCost: budget, launchCost, tariff, purchaseCost, availableCost,
      totalCosts, profit: money(netRevenue - totalCosts), stockouts: Math.max(0, demand - orders), inventoryRemaining: totalUnits - orders + returnRestocked,
      inventoryCostRemaining: money(availableCost - cogs - writeoffCost), stockReturnFee: STOCK_CARRYOVER ? 0 : money(money(availableCost - cogs - writeoffCost) * STOCK_RETURN_FEE), days: f.days, attribution, tacos: revenue ? (channel.id === 'ads' ? budget : 0) / revenue : null,
      promotionChoice: { id: secondary.id, name: secondary.name, category: secondary.category, matched: secondary.matched },
      nextContentTail: channel.id === 'content' ? Math.floor(currentRoundVisitors * .1) : 0, ratingBefore: rating,
      badReviews: Math.round(refunds * .3), commissionRate: secondary.commission };
  }
  function candidate(n, d) {
    const r = copy(n); r[keys[n.stage]] = d.id;
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
    if (n.stage === 0) cashDelta = n.visitedMarkets.includes(d.id) ? 0 : -money(find(options(n, 'markets'), option.id).launchCost);
    if (n.stage === 2) { cashDelta = -mean.purchaseCost; inventoryDelta = mean.unitsToBuy; }
    if (n.stage === 3) cashDelta = -d.budget - (n.currentListing ? 0 : r.currentListing?.cost || 0);
    const settlement = p => sum([p.netRevenue, -p.shippingCost, -p.platformFees, -p.commission, -p.returnHandlingCost, -p.tariff]);
    if (n.stage === 4) { cashDelta = settlement(mean); inventoryDelta = STOCK_CARRYOVER ? -mean.orders + mean.returnRestocked : -Object.values(n.inventory).reduce((s, v) => s + v, 0); }
    if (n.stage === 5) cashDelta = -option.cost;
    const blocked = n.stage === 2 && mean.unitsToBuy > 0 && mean.unitsToBuy < mean.moq ? `${mean.supplierName}至少新增采购${mean.moq}件，当前补货${mean.unitsToBuy}件。请调整数量或供应商。` : null;
    const marketBlocked = n.stage === 0 && n.carryEffect.newMarket && d.id === n.carryEffect.previousMarket;
    const bounds = {};
    const acquisitionBounds = mean ? acquisitionRisk(mean).map(row => {
      const ends = [acquisitionRisk(low).find(x=>x.id===row.id)?.cac, acquisitionRisk(high).find(x=>x.id===row.id)?.cac].filter(Number.isFinite);
      return {...row, bounds:ends.length===2?[Math.min(...ends),Math.max(...ends)]:null};
    }) : [];
    if (mean) for (const k of ['visitors', 'demand', 'orders', 'refunds', 'keptOrders', 'profit', 'shippingCost', 'returnHandlingCost', 'writeoffCost', 'returnRestocked', 'returnWriteoffs', 'tariff']) bounds[k] = [Math.min(low[k], high[k]), Math.max(low[k], high[k])];
    const attributionBounds = mean ? Object.fromEntries(mean.attribution.map((s, i) => [s.id, [Math.min(low.attribution[i].orders, high.attribution[i].orders), Math.max(low.attribution[i].orders, high.attribution[i].orders)]])) : {};
    if (mean && n.stage === 4) bounds.cashDelta = [Math.min(settlement(low), settlement(high)), Math.max(settlement(low), settlement(high))];
    if (n.stage === 5) bounds.profit = [money(n.report.profit - option.cost), money(n.report.profit - option.cost)];
    return { ...mean, cashDelta: money(cashDelta), inventoryDelta, acquisitionBounds, bounds, attributionBounds, settled: n.stage >= 5, profit: n.stage === 5 ? money(n.report.profit - option.cost) : mean?.profit ?? null,
      affordable: n.cash + cashDelta >= 0 && !blocked && !marketBlocked, supplyBlockedReason: blocked,
      summary: option.summary, risks: [option.risk, ...(blocked ? [blocked] : [])],
      assumptions: '教学模拟；一轮按30天估算。预测含市场波动，达人效果波动更大。同轮同方案结果固定，跨轮重新波动。', nextTrafficBonus: option.trafficBonus || 0 };
  }
  function makeReport(n, p) {
    const r = old.report(n, p);
    const before = n.roundStart.ratings[n.productId] || { rating: 5, reviews: 0 };
    const reviews = before.reviews + p.orders;
    const stars = before.rating * before.reviews + p.keptOrders * 5 + (p.refunds - p.badReviews) * 5 + p.badReviews;
    const ratingAfter = p.orders > 0 && p.refunds === 0 ? Math.min(5, before.rating + .1) : reviews ? clamp(stars / reviews, 1, 5) : before.rating;
    n.ratings[n.productId] = { rating: money(ratingAfter), reviews };
    Object.assign(r, { balanceVersion:n.balanceVersion, goalVersion:n.goalVersion, goalPasses: goalPasses(n), totalCosts: p.totalCosts, ratingAfter: money(ratingAfter), roundStart: copy(n.roundStart), modelVersion: 'v11',
      formula: '本轮先按来源形成访问机会，再由市场匹配、售价、商品页、配送、评分与波动计算购买意愿；超出市场容量的机会减半，库存和交期限制实际订单。退款与全部费用分别记账。',
      nextRatingImpact: 1 - Math.sqrt(ratingAfter / 5) });
    r.conclusions.push(p.delayedUnits ? `${p.leadDays}天备货使${p.delayedUnits}件新货错过本轮销售窗口，${STOCK_CARRYOVER ? '余货计入下轮库存' : `结算时按成本退回（扣${Math.round(STOCK_RETURN_FEE * 100)}%手续费）`}。` : '现有库存及时衔接了本轮销售。');
    if (p.tariff) r.conclusions.push(`美国站预估关税 $${p.tariff.toFixed(2)} 已入账。`);
    if (p.badReviews >= 10) r.conclusions.push(`运营伙伴提醒：新增${p.badReviews}条差评。下轮注意商品描述和交付体验。`);
    return r;
  }
  function commit(n, input) {
    if (n.stage === 6) return n;
    const d = normalize(n, input), p = d && preview(n, d);
    if (!d || !p?.affordable) return feedback(n, '方案暂时不能执行', p?.supplyBlockedReason || '请检查方案参数和可用现金。');
    const r = candidate(n, d), option = find(tables[n.stage], d.id);
    r.decisions.push(copy(d));
    let delta = p.cashDelta;
    if (n.stage === 0) { entry(r, 'launch', `${option.name} · ${n.visitedMarkets.includes(d.id) ? '续留经营（免进入费）' : '市场进入'}`, delta); r.visitedMarkets = [...new Set([...r.visitedMarkets, d.id])]; }
    if (n.stage === 2) { r.inventory[r.productId] += p.unitsToBuy; r.inventoryCosts[r.productId] = p.availableCost; entry(r, 'procurement', `${p.supplierName} · 采购补货`, delta); }
    if (n.stage === 3) entry(r, 'marketing', `${option.name} · ${p.promotionChoice.name}`, -d.budget);
    if (n.stage === 4) {
      const actual = simulate(r);
      if (sum([n.cash, actual.netRevenue, -actual.shippingCost, -actual.platformFees, -actual.commission, -actual.returnHandlingCost, -actual.tariff]) < 0) return feedback(n, '回款不足以支付这条线路', '请比较配送方式，或回到上架与推广调整方案。');
      r.inventory[r.productId] = actual.inventoryRemaining; r.inventoryCosts[r.productId] = actual.inventoryCostRemaining;
      for (const [category, label, amount] of [['sales', '订单收入', actual.revenue], ['refunds', '买家退款', -actual.refundAmount], ['shipping', '跨境履约', -actual.shippingCost], ['platform', '模拟平台费', -actual.platformFees], ['commission', '达人分佣', -actual.commission], ['returnHandling', '退件检验与处理', -actual.returnHandlingCost], ...actual.tariff ? [['tariff', '美国站预估关税', -actual.tariff]] : []]) entry(r, category, label, amount);
      const returned = STOCK_CARRYOVER ? null : returnStock(r);
      r.report = makeReport(r, actual); if (returned) applyReturn(r.report, returned, actual.stockReturnFee); delta = money(r.cash - n.cash);
    }
    if (n.stage === 5) {
      entry(r, 'expansion', option.name, -option.cost);
      Object.assign(r.report, { expansionCost: option.cost, profit: money(r.report.profit - option.cost), contributionProfit: money(r.report.profit - option.cost), totalCosts: money(r.report.totalCosts + option.cost), cash: r.cash, cashChange: money(r.cash - r.roundStart.cash), assetChange: money(r.cash + r.report.inventoryValue - r.roundStart.cash - r.report.openingInventoryValue), decisions: copy(r.decisions) });
      r.history.push(copy(r.report)); r.contentTail = r.report.nextContentTail;
      r.previousMarket = r.marketId;
      r.carryEffect = { trafficBonus: option.trafficBonus, previousMarket: r.marketId, newMarket: !!option.newMarket };
    }
    r.stage++;
    const titles = ['销售市场已确认', '主打商品已选定', '定价与备货已执行', '推广方案已启动', '本轮订单已结算', '下一轮计划已保存'];
    const body = n.stage === 2 ? `采购${p.unitsToBuy}件，交期${p.leadDays}天；本轮预计到货${p.arrivedUnits}件，另${p.delayedUnits}件${STOCK_CARRYOVER ? '保留到下一轮' : '赶不上本轮，结算时按成本退回'}。` : n.stage === 4 ? `${r.report.orders}单下单、${r.report.refunds}单退款；本轮贡献利润 $${r.report.profit.toFixed(2)}，费用与库存已对账。${r.report.stockReturn ? `未售出${r.report.stockReturnUnits}件按成本退回 $${r.report.stockReturn.toFixed(2)}。` : ''}` : n.stage === 3 ? `${p.promotionChoice.name}已确认，推广预算 $${d.budget} 已入账。` : '选择已记录，继续下一步。';
    return feedback(r, titles[n.stage], body, { cash: delta, inventory: p.inventoryDelta, orders: n.stage === 4 ? r.report.orders : 0 });
  }
  // REQ-052: unsold stock, including restocked returns, goes back at cost. It is principal, not income.
  // REQ-053: minus the clearance fee, which is a cost of the round.
  function returnStock(n) {
    const units = products.reduce((s, p) => s + (n.inventory[p.id] || 0), 0), cost = value(n.inventory, n.inventoryCosts);
    const fee = money(cost * STOCK_RETURN_FEE), cash = money(cost - fee);
    for (const p of products) { n.inventory[p.id] = 0; n.inventoryCosts[p.id] = 0; }
    if (cash) entry(n, 'stockReturn', `未售出清仓返现 · ${units}件按成本退回${fee ? `（扣${Math.round(STOCK_RETURN_FEE * 100)}%手续费 $${fee.toFixed(2)}）` : ''}`, cash);
    return { stockReturnUnits: units, stockReturnCost: cost, stockReturn: cash, stockReturnFee: fee, inventoryRemaining: 0, inventoryCostRemaining: 0 };
  }
  // The forecast already counted the fee on this product's stock; settle any difference (other products' leftovers in old saves).
  function applyReturn(report, returned, forecastFee) {
    const extra = money(returned.stockReturnFee - (forecastFee || 0));
    Object.assign(report, returned, { profit: money(report.profit - extra), contributionProfit: money((report.contributionProfit ?? report.profit) - extra), totalCosts: money(report.totalCosts + extra) });
  }
  function restoreStart(n, snap) {
    const r = create(n.runSeed);
    Object.assign(r, copy(snap), { rulesLocked:true, balanceVersion:snap.balanceVersion, goalVersion:snap.goalVersion, cash: snap.cash, stage: 0, round: snap.round || n.round, inventory: copy(snap.inventory), inventoryCosts: copy(snap.inventoryCosts), listingAssets: copy(snap.listingAssets),
      ledger: copy(n.ledger.slice(0, snap.ledgerLength)), history: copy(n.history.slice(0, snap.historyLength)), roundStart: copy(snap) });
    return r;
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
    for (const d of n.decisions.slice(0, stage)) r = commit(r, d);
    return feedback(r, '已回到本轮选择', '本轮市场波动保持相同，相同方案得到相同结果；已购优化与对应费用保留。');
  }
  function next(n) {
    if (n.stage !== 6) return n;
    const r = create(n.runSeed);
    for (const k of ['cash', 'inventory', 'inventoryCosts', 'listingAssets', 'ledger', 'history', 'visitedMarkets', 'ratings', 'contentTail', 'previousMarket', 'carryEffect', 'listingInvestments', 'clearanceEvents']) r[k] = copy(n[k]);
    r.round = n.round + 1; r.roundStart = snapshot(r);
    return feedback(r, `第${r.round}轮经营已开始`, `${STOCK_CARRYOVER ? '现金、库存、商品页与评分已保留' : '现金、商品页与评分已保留，本轮重新备货'}。本轮市场波动已更新，同轮重试保持公平。`);
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
      if (r.stage === 6) r.history[r.history.length - 1] = copy(report);
    }
    return feedback(r, '余货已清仓', `${quantity}件回款 $${cash.toFixed(2)}，清仓损失 $${loss.toFixed(2)}，已写入账本。`, { cash });
  }
  function serialize(n) { return JSON.stringify({ format: 'crossbound.v11', state: n }); }
  function deserialize(raw) {
    try {
      const envelope = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (envelope?.format !== 'crossbound.v11') return null;
      const n = envelope.state;
      if (!valid(n) || !Number.isInteger(n.runSeed) || !Number.isInteger(n.round) || n.round < 1 || n.round > 100 || !Number.isInteger(n.stage) || n.stage < 0 || n.stage > 6 || !Array.isArray(n.decisions) || n.decisions.length !== n.stage || !Array.isArray(n.history) || !Array.isArray(n.ledger) || !Number.isFinite(n.cash) || n.cash < 0 || money(n.cash) !== n.cash || !n.roundStart || !Array.isArray(n.visitedMarkets) || !Array.isArray(n.listingInvestments) || !Array.isArray(n.clearanceEvents)) return null;
      if (products.some(p => !Number.isInteger(n.inventory[p.id]) || n.inventory[p.id] < 0 || !Number.isFinite(n.inventoryCosts[p.id] ?? 0) || (n.inventoryCosts[p.id] ?? 0) < 0)) return null;
      if (n.decisions.some((d, i) => !find(tables[i], d.id))) return null;
      if (n.ledger.some(e => !Number.isFinite(e.cashDelta))) return null;
      const roundDelta = sum(n.ledger.filter(e => e.round === n.round).map(e => e.cashDelta));
      if (money(n.roundStart.cash + roundDelta) !== n.cash) return null;
      const restored=copy(n);
      if(restored.stage===0&&!restored.rulesLocked&&!restored.decisions.length){restored.balanceVersion=BALANCE_VERSION;restored.goalVersion=GOAL_VERSION;restored.roundStart.balanceVersion=BALANCE_VERSION;restored.roundStart.goalVersion=GOAL_VERSION;}
      return restored;
    } catch { return null; }
  }
  function milestones(n) {
    const history = n.history;
    const defs = [
      ['first-profit', '第一桶金', '首次完成一轮并盈利', r => r.profit > 0],
      ['first-goal', '第一站，站稳了', '首次完成本轮经营目标', r => goal(r).passed],
      ['steady-delivery', '稳稳交付', '单轮至少300单，退款率不高于5%', r => r.orders >= 300 && r.refunds / r.orders <= .05],
      ['profit-5000', '生意起势', '单轮贡献利润超过$5,000', r => r.profit > 5000],
      ['listing-master', '好商品，被看懂', '用95分及以上商品页完成一轮', r => r.listingScore >= 95],
    ];
    const oldZero = history.find(r => r.orders > 0 && r.refunds === 0);
    if (oldZero) defs.push(['zero-refunds', '完美交付 · 历史纪念', '旧版已获得的零退款徽章，永久保留', r => r === oldZero]);
    return defs.map(([id, name, description, predicate]) => { const found = history.find(predicate); return { id, name, description, earned: !!found, round: found?.round }; });
  }
  return { valid, create, migrate, snapshot, listingProduct, listingQuote, publish, optimize, choice, normalize, simulate, preview, commit, rollback, next, previous, clearStock, serialize, deserialize, milestones, scale, options, products, markets, channels };
}
