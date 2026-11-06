import {entrySource} from './entry-source.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture, prepare, finish, FULL } from './crossbound-v11-fixture.mjs';
import { createCrossboundV2 } from '../public/previews/crossbound/v2/model.js';
import { TAX, taxQuote, PLATFORMS, FIRST_MILE, FEATURE_SET, RETIRED_EVENTS } from '../public/previews/crossbound/v2/catalog.js';
import { financialStatements } from '../public/previews/crossbound/v2/release.js';
import { productFit } from '../public/previews/crossbound/v2/product-fit.js';
import { explorationAwards, assessment } from '../public/previews/crossbound/v2/progress.js';
import { profitRows } from '../public/previews/crossbound/v2/ui.js';
import { goal, goalChannelText, GOAL_VERSION } from '../public/previews/crossbound/v2/release.js';
import { BALANCE_VERSION } from '../public/previews/crossbound/v11/balance.js';
const f = fixture(), e = createCrossboundV2(f.adapter);
const money = n => Math.round(n * 100) / 100;
function staged(config = {}, seed = 12345, market = 'singapore') {
  let n = e.configure(e.create(seed), config);
  n = e.commit(n, { id: market });
  n = e.commit(n, { id: 'tech' });
  return n;
}
function stocked(config = {}, seed, market) {
  let n = staged(config, seed, market);
  n = e.commit(n, { id: 'pilot', quantity: 1200, price: 45, supplierId: 'standard' });
  return e.publish(n, FULL);
}

test('HTTP without crypto.randomUUID can start and continue a saved round without losing progress', () => {
  const completed = finish(e, stocked());
  const original = globalThis.crypto.randomUUID;
  globalThis.crypto.randomUUID = undefined;
  try {
    const fresh = e.create();
    assert.match(fresh.v2.identity, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    assert.notEqual(fresh.v2.identity, e.create().v2.identity);
    const restored = e.deserialize(e.serialize(completed));
    const next = e.next(restored);
    assert.equal(next.round, completed.round + 1);
    assert.equal(next.stage, 0);
    assert.equal(next.v2.identity, completed.v2.identity);
    assert.equal(next.runSeed, completed.runSeed);
    assert.deepEqual(next.inventory, completed.inventory);
    assert.deepEqual(next.history, completed.history);
    assert.deepEqual(next.listingAssets, completed.listingAssets);
    assert.ok(next.cash >= completed.cash);
    assert.ok(e.deserialize(e.serialize(next)));
    const legacy = finish(f.engine, prepare(f.engine));
    const upgraded = e.next(legacy);
    assert.equal(upgraded.engineVersion, 'v2');
    assert.equal(upgraded.round, legacy.round + 1);
    assert.deepEqual(upgraded.history, legacy.history);
    assert.ok(e.deserialize(e.serialize(upgraded)));
  } finally {
    globalThis.crypto.randomUUID = original;
  }
});
test('100 products have explicit fit in every market; 12 countries have distinct tax and currency profiles', () => {
  assert.equal(Object.keys(productFit).length, 100); assert.equal(Object.keys(TAX).length, 12);
  for (const p of e.products) for (const m of e.markets) {
    assert.ok(productFit[p.id][m.id] > 0);
    const t = taxQuote(m.id, p, 10, 14, 2);
    assert.equal(t.customsValue, 160); assert.ok(t.importTax >= 0 && t.tariff >= 0);
    if (m.id !== 'singapore') assert.ok(t.tariff > 0);
    if (m.id !== 'los-angeles') assert.ok(t.importTax > 0);
  }
  assert.throws(() => taxQuote('missing', {}));
});
test('cash + inventory + receivables - liabilities reconciles to profit in every market and payment term', () => {
  for (const m of e.markets) for (const terms of ['cash', 'credit']) {
    const n = finish(e, stocked({ terms }, 12345, m.id));
    assert.equal(n.stage, 6, `${m.id}/${terms}: ${n.feedback?.body}`);
    assert.equal(n.report.profit, n.report.assetChange, `${m.id}/${terms}`);
    assert.equal(money(profitRows(n.report).reduce((s, r) => s + r.amount, 0)), n.report.profit);
    assert.equal(n.report.paymentFee, money(n.report.netRevenue * .035));
    assert.ok(e.deserialize(e.serialize(n)));
    const next = e.next(n);
    assert.ok(e.deserialize(e.serialize(next)));
    assert.equal(next.v2.receivables.filter(r => !r.paid).length, 0);
    assert.equal(next.v2.payables.filter(r => !r.paid).length, 0);
  }
});
test('platform fees and traffic are real decisions, and direct-store setup is only charged once', () => {
  const reports = PLATFORMS.map(p => finish(e, stocked({ platform: p.id })).report);
  assert.equal(reports[0].platformFees, money(reports[0].netRevenue * .06));
  assert.equal(reports[1].platformFees, money(reports[1].netRevenue * .15));
  assert.equal(reports[2].platformFees, 0); assert.equal(reports[2].platformEntryCost, 500);
  let next = e.next(finish(e, stocked({ platform: 'direct' })));
  next = e.commit(next, { id: 'singapore' });
  assert.equal(next.ledger.filter(r => r.round === 2 && r.category === 'platformEntry')[0].cashDelta, 0);
});
test('quantity discounts, MOQ negotiation and first-mile timing affect purchase and available stock', () => {
  let n = staged();
  const q = quantity => e.preview(n, { id: 'pilot', quantity, price: 45, supplierId: 'standard' });
  assert.ok(q(1200).unitCost < q(800).unitCost && q(800).unitCost < q(400).unitCost);
  n = e.configure(n, { negotiation: 'volume' });
  assert.equal(q(400).affordable, false);
  const results = FIRST_MILE.map(p => e.simulate(stocked({ firstMile: p.id })));
  assert.ok(results.every(r=>r.arrivedUnits>=Math.floor(r.unitsToBuy*.75)));
  assert.ok(results[0].leadDays > results[1].leadDays && results[1].leadDays > results[2].leadDays);
  assert.ok(results[0].firstMileCost < results[2].firstMileCost);
});
test('creator commissions accrue gross, refund commission is an asset and is collected exactly once next round', () => {
  const n = finish(e, stocked(), 'creator', 2400, { id: 'vertical', category: 'electronics' });
  const r = n.report;
  assert.ok(r.commissionRecovery > 0);
  assert.equal(r.commission, money(r.commissionGross - r.commissionRecovery));
  assert.equal(r.profit, r.assetChange);
  const next = e.next(n), restored = e.deserialize(e.serialize(next));
  assert.equal(next.cash, restored.cash);
  assert.equal(next.ledger.filter(r => r.category === 'commissionRecovery').length, 1);
});
test('loan is explicit, accrues interest, cannot be duplicated, and repayment does not charge profit twice', () => {
  let n = e.act(staged({ terms: 'credit' }), { type: 'loan', amount: 5000 });
  assert.equal(e.act(n, { type: 'loan', amount: 5000 }), n);
  n = e.commit(n, { id: 'pilot', quantity: 1200, price: 45, supplierId: 'standard' });
  n = finish(e, e.publish(n, FULL));
  assert.equal(n.report.interestCost, 600); assert.equal(n.report.profit, n.report.assetChange);
  assert.equal(n.v2.loans[0].amount, 5600);
  const next = e.next(n);
  assert.equal(next.v2.loans[0].paid, true);
  assert.equal(next.ledger.filter(x => x.category === 'loanRepayment').length, 1);
});
test('站外推广下线: an old off-site choice gives no discount, visits or rating, and costs nothing new', () => {
  const normal = finish(e, stocked());
  for (const offsite of ['deal', 'review']) {
    const old = stocked(); old.v2.config = { ...old.v2.config, offsite }; old.roundStart.v2.config = { ...old.v2.config };
    const n = finish(e, old);
    assert.equal(n.report.price, normal.report.price); assert.equal(n.report.visitors, normal.report.visitors);
    assert.equal(n.report.ratingAfter, normal.report.ratingAfter); assert.equal(n.report.offsiteCost, 0);
    assert.ok(!n.ledger.some(x => x.category === 'offsite'));
  }
  assert.equal(e.config(e.configure(staged(), { offsite: 'deal' })).offsite, 'none', 'a direct configure cannot switch it on');
});
test('关键词出价／投放时段下线: old bid and time-slot settings change nothing; forecasts still contain actual outcomes', () => {
  const base = finish(e, stocked());
  for (const config of [{ bid: 'low', timeSlot: 'evening' }, { bid: 'high', timeSlot: 'offpeak' }]) {
    const n = finish(e, stocked(config));
    assert.equal(n.report.visitors, base.report.visitors); assert.equal(n.report.conversion, base.report.conversion);
    assert.equal(n.report.adVariation, 1, 'no keyword-auction swing');
  }
  for (let seed = 1; seed <= 30; seed++) {
    const n = e.commit(stocked({}, seed), { id: 'ads', budget: 3600, promotionChoice: { id: 'benefit' } });
    const predicted = e.preview(n, { id: 'express' }), actual = e.commit(n, { id: 'express' }).report;
    for (const key of ['orders', 'profit', 'tariff', 'importTax']) assert.ok(actual[key] >= predicted.bounds[key][0] - .01 && actual[key] <= predicted.bounds[key][1] + .01, `${key} seed ${seed}`);
  }
});
test('loans and business decisions replay without a new random draw or duplicated charges; a new 测款 is refused', () => {
  const start = staged();
  assert.equal(e.act(start, { type: 'test' }), start, '测款 is offline');
  let n = e.act(start, { type: 'loan', amount: 5000 });
  n = e.commit(n, { id: 'pilot', quantity: 1200, price: 45, supplierId: 'standard' });
  n = finish(e, e.publish(n, FULL));
  let replay = e.rollback(n, 2);
  assert.equal(replay.v2.tests.length, 0); assert.equal(replay.v2.loans.length, 1);
  replay = e.commit(replay, n.decisions[2]); replay = e.publish(replay, FULL);
  for (const d of n.decisions.slice(3)) replay = e.commit(replay, d);
  assert.equal(replay.report.profit, n.report.profit); assert.equal(replay.cash, n.cash);
});
test('经营事件下线: the economy line, high profit and the random pool schedule nothing; an old queued event has no effect or choice', () => {
  let n = e.next(finish(e, stocked(), 'ads', 3600, { id: 'benefit' }, 'economy'));
  assert.deepEqual(n.v2.events, []);
  const old = structuredClone(staged());
  for (const kind of RETIRED_EVENTS) { old.v2.events.push({ id: `${kind}:1`, kind, title: kind, dueRound: 1, stage: 0, choice: null, marketId: 'singapore', productId: 'tech', encounter: 1 }); }
  old.roundStart.v2.events = structuredClone(old.v2.events);
  assert.deepEqual({ ...e.eventEffect(old), active: [] }, { conversion: 1, traffic: 1, packaging: 0, delayDays: 0, active: [], priceFactor: 1 });
  for (const ev of old.v2.events) {
    assert.deepEqual(e.eventChoices(ev), []);
    for (const choice of ['repair', 'accept', 'prepare', 'wait', 'adapt', 'pricewar', 'complaint']) assert.equal(e.act(old, { type: 'event', id: ev.id, choice }), old);
  }
});
// 跟卖（老K）暂时下线：不再排出、不再生效、不再收费；旧存档已付的费用照旧记账。
const oldRival = (choice = null) => ({ id: 'rival:1', kind: 'rival', title: '影子卖家老 K 跟来了', marketId: 'singapore', productId: 'tech', encounter: 1, dueRound: 1, stage: 0, choice });
function withOldRival(n, choice) {
  const r = structuredClone(n);
  r.v2.events.push(oldRival(choice)); r.roundStart.v2.events.push(oldRival(choice));
  return r;
}
test('跟卖下线: profit over $6,000 and back-to-back big rounds no longer bring 老K', () => {
  let first = finish(e, stocked());
  assert.ok(first.report.profit > 6000);
  let n = e.next(first);
  assert.ok(!n.v2.events.some(x => x.kind === 'rival'));
  n = e.next(finish(e, e.publish(e.commit(e.commit(e.commit(n, { id: 'singapore' }), { id: 'tech' }), { id: 'pilot', quantity: 1200, price: 45, supplierId: 'standard' }), { mode: 'reuse' })));
  assert.ok(!n.v2.events.some(x => x.kind === 'rival'));
  assert.equal(n.v2.rivalEncounters, 0);
});
test('跟卖下线: an old save with an unanswered 老K changes nothing, takes no new fee and never blocks the round', () => {
  const clean = stocked(), n = withOldRival(clean, null);
  assert.deepEqual(e.eventEffect(n), { ...e.eventEffect(clean) });
  assert.deepEqual(e.simulate(n), e.simulate(clean), 'no conversion cut, no 九折, no $1.50 packaging');
  assert.deepEqual(e.eventChoices(n.v2.events.at(-1)), []);
  for (const choice of ['pricewar', 'complaint', 'differentiate', 'exit']) assert.equal(e.act(n, { type: 'event', id: 'rival:1', choice }), n);
  assert.equal(e.act(n, { type: 'trademark' }), n, 'no new trademark fee');
  const done = finish(e, n);
  assert.equal(done.stage, 6);
  assert.equal(done.report.profit, finish(e, clean).report.profit);
  assert.ok(!done.v2.eventHistory.some(x => x.kind === 'rival'), 'not archived as “未采取措施”');
  for (const s of [e.deserialize(e.serialize(done)), e.rollback(done, 0), e.next(done)]) {
    assert.ok(s, 'save, rollback and next still work');
    assert.ok(!e.eventEffect(s).active.some(x => x.kind === 'rival'));
    assert.equal(e.eventEffect(s).priceFactor, 1);
  }
});
test('跟卖下线: replaying a round keeps a trademark and complaint already paid before it went offline', () => {
  const base = stocked(), legacy = withOldRival(base, null);
  // What the old build recorded this round: 商标登记 $600, then 商标投诉 $200.
  legacy.v2.actions = [{ type: 'trademark', stage: 2 }, { type: 'event', id: 'rival:1', choice: 'complaint', stage: 2 }];
  const a = e.rollback(base, 3), b = e.rollback(legacy, 3);
  assert.equal(b.cash, money(a.cash - 800));
  assert.ok(b.ledger.some(x => x.category === 'trademark' && x.cashDelta === -600));
  assert.ok(b.ledger.some(x => x.category === 'events' && x.cashDelta === -200));
  assert.equal(e.hasTrademark(b, 'tech'), true);
  assert.deepEqual(e.simulate(b).conversion, e.simulate(a).conversion, 'the replayed choice has no effect any more');
  assert.ok(profitRows({ trademarkCost: 600, eventCost: 200, packagingCost: 15 }).some(r => r.label === '模拟商标' && r.amount === -600), 'old reports keep their labels');
});
test('collection awards are deduplicated and replay in the separate growth ledger', () => {
  const n = e.commit(e.create(12), { id: 'singapore' }), awards = explorationAwards(n, e.markets);
  let ops = f.legacy.IG(); ops = f.growth.claimExploration(ops, awards[0]);
  assert.equal(ops.research, 5); assert.equal(f.growth.claimExploration(ops, awards[0]), ops);
  assert.ok(f.growth.deserialize(f.growth.serialize(ops)));
  const full = { ...n, history: e.markets.map((m, i) => ({ round: i + 1, marketId: m.id, profit: 12000, keptOrders: 700, orders: 710, refunds: 10 })) };
  const all = explorationAwards(full, e.markets);
  assert.equal(all.filter(a => a.kind === 'region').length, 5);
  assert.ok(all.some(a => a.title === '环球经营者'));
  const evaluation = assessment(full, ops, e.markets, f.legacy.U5);
  assert.notEqual(evaluation.title, '全球经营合伙人', 'cannot bypass knowledge dimension');
});
test('v1.1 saves keep current-round outcomes and promote only at a boundary', () => {
  const old = finish(f.engine, prepare(f.engine));
  assert.equal(e.deserialize(f.engine.serialize(old)).engineVersion, 'v11');
  const next = e.next(old); assert.equal(next.engineVersion, 'v2');
  assert.equal(next.history[0].profit, old.report.profit);
  assert.equal(e.previous(next).engineVersion, 'v11');
});
test('旺季循环下线: no $300 prep, no harvest multiplier (not even ×1.1); heat still grows and storage is free under REQ-052', () => {
  let n = finish(e, stocked({ seasonPrep: true }));
  assert.equal(n.report.seasonPrepCost, 0); assert.ok(!n.ledger.some(x => x.category === 'season'));
  assert.equal(n.report.warehouseCost, n.report.inventoryRemaining * .5);
  n = e.next(n);
  assert.equal(n.v2.heat.tech, 1.05); assert.equal(n.v2.seasonPrepared, 0);
  for (const d of [{ id: 'singapore' }, { id: 'tech' }, { id: 'pilot', quantity: 1200, price: 45, supplierId: 'standard' }]) n = e.commit(n, d);
  n = finish(e, e.publish(n, { mode: 'reuse' }));
  assert.equal(n.stage, 6); assert.equal(n.report.profit, n.report.assetChange);
  n = e.next(n);
  assert.equal(n.round, 3); assert.equal(n.v2.heat.tech, 1.1);
  for (const d of [{ id: 'singapore' }, { id: 'tech' }]) n = e.commit(n, d);
  const prepared = e.simulate({ ...n, v2: { ...n.v2, seasonPrepared: 1, config: { ...n.v2.config, seasonPrep: true } } }, 'mean'), plain = e.simulate(n, 'mean');
  assert.equal(prepared.seasonFactor, 1); assert.equal(plain.seasonFactor, 1);
  assert.equal(prepared.visitors, plain.visitors);
});
test('REQ-052 settlement returns unsold stock at cost without touching profit or receivables', () => {
  const ready = stocked({ terms: 'credit' }), promoted = e.commit(ready, { id: 'ads', budget: 3600, promotionChoice: { id: 'benefit' } });
  const actual = e.simulate({ ...promoted, fulfillmentPlanId: 'express' }), n = finish(e, ready);
  assert.ok(actual.inventoryRemaining > 0, 'fixture should leave unsold stock');
  assert.equal(n.report.stockReturnUnits, actual.inventoryRemaining);
  assert.equal(n.report.stockReturnCost, actual.inventoryCostRemaining);
  assert.equal(n.report.stockReturnFee, money(actual.inventoryCostRemaining * .05));
  assert.equal(n.report.stockReturn, money(actual.inventoryCostRemaining - n.report.stockReturnFee));
  assert.ok(Math.abs(n.report.stockReturnCost - actual.inventoryRemaining * actual.availableCost / actual.totalUnits) < .02, 'units × unit cost');
  assert.ok(Object.values(n.inventory).every(q => q === 0));
  assert.equal(n.report.inventoryRemaining, 0); assert.equal(n.report.warehouseCost, 0);
  assert.equal(n.ledger.filter(row => row.category === 'stockReturn').reduce((s, row) => s + row.cashDelta, 0), n.report.stockReturn);
  assert.equal(n.report.profit, n.report.assetChange);
  assert.equal(n.report.receivables, money(actual.netRevenue + actual.commissionRecovery));
  // Nothing is left for the manual half-price clearance.
  assert.equal(e.clearStock(n, 'tech'), n);
  assert.ok(e.deserialize(e.serialize(n)));
});
test('REQ-052 three rounds in a row: every round ends empty and restocks the full quantity', () => {
  let n = stocked();
  for (let round = 1; round <= 3; round++) {
    n = finish(e, n);
    assert.equal(n.stage, 6, `round ${round} settles`);
    assert.ok(Object.values(n.inventory).every(q => q === 0), `round ${round} ends with no stock`);
    assert.equal(n.report.unitsToBuy, n.report.quantity, `round ${round} buys the full quantity`);
    if (round === 3) break;
    n = e.next(n);
    for (const d of [{ id: 'singapore' }, { id: 'tech' }, { id: 'pilot', quantity: 1200, price: 45, supplierId: 'standard' }]) n = e.commit(n, d);
    assert.equal(n.stage, 3, `round ${round + 1} can afford to restock`);
    n = e.publish(n, { mode: 'reuse' });
  }
});
test('税务事件下线: an old customs check adds no delay and cannot be answered; real duty and import tax still apply', () => {
  let n = e.configure(staged(), { firstMile: 'air' });
  n = e.commit(n, { id: 'pilot', quantity: 1200, price: 45, supplierId: 'fast' }); n = e.publish(n, FULL);
  const clean = e.simulate(n);
  n.v2.events.push({ id: 'vat-review:1', kind: 'vat-review', title: '核对进口税', dueRound: 1, stage: 0, choice: null });
  assert.deepEqual(e.simulate(n), clean);
  assert.equal(e.act(n, { type: 'event', id: 'vat-review:1', choice: 'prepare' }), n);
  assert.ok(clean.importTax > 0, 'tax is still calculated');
});

test('REQ-053: a failed round keeps the target; a pass raises it by 50', () => {
  const g = (passes, extra = {}) => goal({ goalVersion: GOAL_VERSION, balanceVersion: BALANCE_VERSION, round: 4, goalPasses: passes, ...extra });
  assert.equal(g(0).target, 250);
  assert.equal(g(2).target, 350);
  // Old saves without the field recount passes from history: two passes and one failure → 350.
  const pass = { goalVersion: GOAL_VERSION, balanceVersion: BALANCE_VERSION, round: 1, keptOrders: 300, profit: 6000 };
  const fail = { goalVersion: GOAL_VERSION, balanceVersion: BALANCE_VERSION, round: 2, keptOrders: 10, profit: -100 };
  assert.equal(goal({ goalVersion: GOAL_VERSION, balanceVersion: BALANCE_VERSION, round: 4, history: [pass, fail, { ...pass, round: 3 }] }).target, 350);
  // After settlement the history already holds this round's report; it must not raise this round's own target.
  assert.equal(goal({ goalVersion: GOAL_VERSION, balanceVersion: BALANCE_VERSION, round: 1, history: [pass] }).target, 250);
  const settled = finish(e, stocked());
  assert.equal(goal(settled).target, goal(settled.report).target, 'result page and report agree');
  assert.equal(goalChannelText(goal({ ...pass, goalPasses: 0 })), '双过：订单和利润都达标，金章');
  assert.match(goalChannelText(goal({ ...fail, goalPasses: 1 })), /目标不变/);
});
test('REQ-053: creator luck stays within 0.8–1.3 and a matched creator is worth +30%', () => {
  const ready = staged();
  let n = e.commit(ready, { id: 'pilot', quantity: 1200, price: 45, supplierId: 'standard' });
  n = e.publish(n, FULL);
  const pick = id => ({ ...n, trafficPlanId: 'creator', trafficBudget: 1800, promotionChoice: { id, category: 'electronics' } });
  const low = e.simulate(pick('vertical'), 'low'), high = e.simulate(pick('vertical'), 'high');
  // low/high also apply the general ±10% traffic variation, so the creator share of the swing is 1.3/0.8 (was 2/0.5).
  assert.ok(high.visitors / low.visitors <= (1.3 / .8) * (1.1 / .9) + .01, 'creator swing narrowed');
  assert.equal(e.choice('creator', { id: 'vertical', category: 'electronics' }, { category: 'electronics' }).conversionFactor, 1.3);
  assert.equal(e.choice('creator', { id: 'vertical', category: 'home' }, { category: 'electronics' }).conversionFactor, 1);
});
test('REQ-053: heat rewards staying with a product and resets on a switch', () => {
  let n = finish(e, stocked());
  n = e.next(n);
  assert.deepEqual(n.v2.heat, { tech: 1.05 });
  n.v2.heat = { tech: 1.15 }; n.productId = 'tech'; n.stage = 6;
  assert.equal(e.next(n).v2.heat.tech, 1.15, 'capped at 1.15');
  assert.ok(e.deserialize(e.serialize(e.next(n))), 'saves with heat above 1 stay valid');
});
test('REQ-053 §4.6: first mile is chosen at fulfilment and paid at shipping, once', () => {
  let n = stocked();
  assert.ok(!n.ledger.some(row => row.round === n.round && row.category === 'firstMile'), 'nothing charged at stocking');
  n = e.commit(n, { id: 'ads', budget: 3600, promotionChoice: { id: 'benefit' } });
  assert.equal(n.stage, 4);
  const slow = e.simulate(e.configure(n, { firstMile: 'sea' }), 'mean'), fast = e.simulate(e.configure(n, { firstMile: 'air' }), 'mean');
  assert.ok(fast.leadDays < slow.leadDays && fast.arrivedUnits >= slow.arrivedUnits, 'choice at stage 4 changes arrival');
  n = e.configure(n, { firstMile: 'air' });
  const expected = e.simulate(n).firstMileCost;
  n = e.commit(n, { id: 'standard' });
  const rows = n.ledger.filter(row => row.round === n.round && row.category === 'firstMile');
  assert.equal(rows.length, 1); assert.equal(rows[0].cashDelta, -expected);
  assert.equal(n.report.profit, money(profitRows(n.report).reduce((s, r) => s + r.amount, 0)));
  // An old save that already paid at stocking is not charged again at shipping.
  let old = e.commit(stocked(), { id: 'ads', budget: 3600, promotionChoice: { id: 'benefit' } });
  old.ledger.push({ id: old.ledger.length + 1, round: old.round, category: 'firstMile', label: 'old rule', cashDelta: -100 });
  old.cash = money(old.cash - 100);
  old = e.commit(old, { id: 'standard' });
  assert.equal(old.ledger.filter(row => row.round === old.round && row.category === 'firstMile').length, 1);
});

test('REQ-057: pricing and promotion count settlement cash up front; a plan that passes them always ships', () => {
  // A plan that leaves too little cash for promotion plus shipping is flagged at pricing, with the exact gap.
  const n = staged();
  const tight = { id: 'pilot', quantity: 1200, price: 45, supplierId: 'standard' };
  const full = e.preview(n, tight);
  assert.ok(full.settlementCash > 0 && full.laterSpend > 0);
  assert.equal(full.cashNeed, Math.round((-full.cashDelta + full.laterSpend + full.settlementCash) * 100) / 100);
  const poor = { ...n, cash: Math.round(full.cashNeed - 500) };
  const p = e.preview(poor, tight);
  assert.equal(p.affordable, false);
  assert.equal(p.cashShortfall, Math.round((full.cashNeed - poor.cash) * 100) / 100);
  assert.equal(e.commit(poor, tight).stage, 2, 'pricing refuses the plan instead of settlement');
  // A bridge loan covers the gap and the plan goes through.
  const lent = e.act(poor, { type: 'loan', amount: Math.max(2000, Math.ceil(p.cashShortfall / 1000) * 1000) });
  assert.equal(e.preview(lent, tight).affordable, true);
  // Whatever passes pricing and promotion is never stopped at shipping (no 交付前现金不足 hard stop).
  for (const seed of [1, 7, 12345, 99]) for (const fm of ['sea', 'mixed', 'air']) {
    let m = e.configure(staged({}, seed), {});
    const pr = e.preview(m, tight);
    m = { ...m, cash: Math.ceil(pr.cashNeed) };
    m = e.publish(e.commit(m, tight), FULL);
    assert.equal(m.stage, 3);
    // Pricing assumed the default content budget; a bigger ads budget re-opens the gap at the promotion step.
    const promo = e.preview(m, { id: 'ads' }), budget = promo.budget;
    if (!promo.affordable) {
      assert.ok(promo.cashShortfall > 0);
      assert.equal(e.commit(m, { id: 'ads' }).stage, 3);
      m = { ...m, cash: Math.ceil(promo.cashNeed) };
    }
    m = e.commit(m, { id: 'ads' });
    assert.equal(m.stage, 4, `seed ${seed}`);
    m = e.configure(m, { firstMile: fm });
    // The estimates assumed the default fulfilment; a dearer line or first mile chosen here is warned before the click.
    const line = e.options(m, 'fulfillment')[1].id, ship = e.preview(m, { id: line });
    if (fm !== 'air') assert.equal(ship.affordable, true, `seed ${seed} ${fm}`);
    if (ship.affordable) assert.equal(e.commit(m, { id: line }).stage, 5, `seed ${seed} ${fm} budget ${budget}`);
    else assert.ok(ship.cashShortfall > 0);
  }
});

test('测款下线: a new sample test is refused; one already paid in an old save replays on rollback with its fee', () => {
  const n = staged(), cash = n.cash;
  assert.equal(e.act(n, { type: 'test' }), n);
  const legacy = structuredClone(stocked());
  legacy.v2.actions = [{ type: 'test', stage: 2 }];
  const replay = e.rollback(legacy, 3), plain = e.rollback(stocked(), 3);
  assert.equal(replay.v2.tests.length, 1, 'history replays');
  assert.equal(replay.cash, plain.cash, 'the first test was free in the old build, so the replay charges nothing extra');
  assert.equal(cash, n.cash);
});
test('五项支线下线: no control, panel or reminder is left in the UI, the 2.5D rooms, the tutorial or the built pages', async () => {
  const fs = await import('node:fs'), read = p => fs.readFileSync(new URL(`../public/previews/crossbound/${p}`, import.meta.url), 'utf8');
  const ui = read('v2/ui.js'), scenes = read('v3/world/scenes.js');
  for (const gone of ['登记模拟商标', '老 K', '发现跟卖', "type: 'trademark'", "type: 'test'", '小预算测款', '提前备战', '关键词出价', '投放时段', '站外补充', '总部来电 · 经营事件', '本季'])
    assert.ok(!ui.includes(gone), gone);
  for (const gone of ['关键词出价', '投放时段', '站外补充', 'offsite']) assert.ok(!scenes.includes(gone), gone);
  for (const gone of ['ReviewTask', '售后提醒', '新经营事件']) assert.ok(!read('v11/ui.js').includes(gone), gone);
  assert.ok(!read('v2/tutorial.js').includes('2:event') && !read('v2/walkthrough.js').includes('2:event'));
  for (const page of ['index.html', 'preview.html']) {
    const html = entrySource(read(page));
    for (const gone of ['v2-events', 'review-task', 'v11ReviewAnswer', '售后复盘', '差评待处理', '经营事件']) assert.ok(!html.includes(gone), `${page}: ${gone}`);
  }
});
test('主线三轮: economy delivery, a big profit and the round-3 harvest bring back none of the five retired features', () => {
  let n = e.create(4242);
  const retired = ['testing', 'trademark', 'season', 'offsite', 'events'];
  for (let round = 1; round <= 3; round++) {
    for (const d of [{ id: 'singapore' }, { id: 'tech' }, { id: 'pilot', quantity: 1200, price: 45, supplierId: 'standard' }]) n = e.commit(n, d);
    n = e.publish(n, round === 1 ? FULL : { mode: 'reuse' });
    n = finish(e, n, 'ads', 3600, { id: 'benefit' }, round === 2 ? 'economy' : 'express');
    assert.equal(n.stage, 6, `round ${round} completes`);
    assert.equal(n.report.featureSet, FEATURE_SET);
    assert.equal(n.report.seasonFactor, 1); assert.equal(n.report.adVariation, 1);
    for (const key of ['testingCost', 'trademarkCost', 'seasonPrepCost', 'offsiteCost', 'eventCost', 'packagingCost']) assert.equal(n.report[key], 0, `${key} round ${round}`);
    assert.ok(!n.ledger.some(x => retired.includes(x.category)));
    assert.deepEqual(n.v2.events, []); assert.deepEqual(n.v2.eventHistory, []);
    assert.equal(money(profitRows(n.report).reduce((s, r) => s + r.amount, 0)), n.report.profit);
    assert.deepEqual(financialStatements(n, n.report).checks, [true, true, true]);
    assert.equal(n.report.orders - n.report.refunds, n.report.keptOrders);
    const reloaded = e.deserialize(e.serialize(n)); assert.ok(reloaded);
    n = e.next(reloaded);
  }
  assert.ok(n.history.some(r => r.profit > 6000), 'a big round happened and still scheduled nothing');
});
test('旧存档: queued events, old strategy settings and paid fees stay inert through reload, rollback, next and previous; history is unchanged', () => {
  let done = finish(e, stocked());
  const settled = structuredClone(done.history[0]);
  let n = e.next(done);
  for (const d of [{ id: 'singapore' }, { id: 'tech' }]) n = e.commit(n, d);
  const clean = structuredClone(n), old = structuredClone(n);
  for (const kind of RETIRED_EVENTS) old.v2.events.push({ id: `${kind}:2`, kind, title: kind, dueRound: 2, stage: 0, choice: null, marketId: 'singapore', productId: 'tech', encounter: 1 });
  old.v2.config = { ...old.v2.config, bid: 'high', timeSlot: 'evening', offsite: 'deal', seasonPrep: true };
  old.roundStart.v2 = { ...old.roundStart.v2, events: structuredClone(old.v2.events), config: { ...old.v2.config } };
  delete old.featureSet; delete old.roundStart.featureSet;
  assert.deepEqual(e.simulate(old, 'mean'), e.simulate(clean, 'mean'));
  const states = [e.deserialize(e.serialize(old)), e.rollback(old, 0), e.rollback(old, 2)];
  for (const s of states) {
    assert.ok(s); assert.equal(e.config(s).offsite, 'none'); assert.equal(e.config(s).bid, 'balanced');
    assert.ok(!e.eventEffect(s).active.length); assert.deepEqual(s.history[0], settled);
  }
  assert.equal(states[1].featureSet, undefined, 'a rolled-back old round keeps its legacy label');
  let finished = old;
  for (const d of [{ id: 'pilot', quantity: 1200, price: 45, supplierId: 'standard' }]) finished = e.commit(finished, d);
  finished = finish(e, e.publish(finished, { mode: 'reuse' }));
  assert.equal(finished.stage, 6); assert.deepEqual(finished.history[0], settled);
  assert.ok(!finished.v2.eventHistory.length, 'retired events are not archived as 未采取措施');
  assert.equal(e.next(finished).featureSet, FEATURE_SET);
  assert.equal(e.previous(e.next(finished)).featureSet, FEATURE_SET, '重开上一轮 runs under the current rules');
});
test('上报: no 售后复盘 answer is sent again; HQ answers and mainline rounds are, tagged with the feature set', async () => {
  const store = new Map();
  globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };
  try {
    const { capture } = await import('../public/previews/crossbound/v2/records.js');
    const task = f.legacy.U5[0], right = task.choices.find(c => c.correct).id;
    let ops = f.growth.commit(f.legacy.IG(), task.id, right, 1);
    ops = { ...ops, history: [...ops.history, { type: 'review', evidence: { run: 1, round: 1, badReviews: 12, orders: 300, refunds: 20 }, choiceId: 'investigate', round: 1 }] };
    const n = finish(e, stocked());
    capture(n, ops, true, f.legacy.U5, e);
    const queue = JSON.parse(store.get('crossbound-outbox-20261021'));
    const quiz = queue.filter(r => r.type === 'quiz_answers');
    assert.equal(quiz.length, 1); assert.equal(quiz[0].data.task_type, 'hq'); assert.equal(quiz[0].data.task_id, task.id);
    assert.equal(queue.find(r => r.type === 'round_reports').data.feature_set, FEATURE_SET);
    assert.ok(queue.every(r => r.data.schema_version === '2026-11-01'));
  } finally { delete globalThis.localStorage; }
});
