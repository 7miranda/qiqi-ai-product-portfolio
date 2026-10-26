import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture, prepare, finish, FULL } from './crossbound-v11-fixture.mjs';
import { createCrossboundV2 } from '../public/previews/crossbound/v2/model.js';
import { TAX, taxQuote, PLATFORMS, FIRST_MILE } from '../public/previews/crossbound/v2/catalog.js';
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
test('offsite discount and review seeding affect sale price, visits, rating and independent attribution', () => {
  const normal = finish(e, stocked()), deal = finish(e, stocked({ offsite: 'deal' })), review = finish(e, stocked({ offsite: 'review' }));
  assert.equal(deal.report.price, money(normal.report.price * .85));
  assert.ok(deal.report.visitors > normal.report.visitors);
  assert.ok(deal.report.attribution.find(s => s.id === 'offsite').orders > 0);
  assert.ok(review.report.ratingAfter > normal.report.ratingAfter);
  for (const n of [deal, review]) assert.equal(n.report.profit, n.report.assetChange);
});
test('ads bidding and local time slots change outcomes; forecasts contain actual outcomes', () => {
  const low = finish(e, stocked({ bid: 'low', timeSlot: 'evening' })), high = finish(e, stocked({ bid: 'high', timeSlot: 'offpeak' }));
  assert.notEqual(low.report.visitors, high.report.visitors);
  assert.notEqual(low.report.conversion, high.report.conversion);
  for (let seed = 1; seed <= 30; seed++) {
    const n = e.commit(stocked({}, seed), { id: 'ads', budget: 3600, promotionChoice: { id: 'benefit' } });
    const predicted = e.preview(n, { id: 'express' }), actual = e.commit(n, { id: 'express' }).report;
    for (const key of ['orders', 'profit', 'tariff', 'importTax']) assert.ok(actual[key] >= predicted.bounds[key][0] - .01 && actual[key] <= predicted.bounds[key][1] + .01, `${key} seed ${seed}`);
  }
});
test('tests, loans and business decisions replay without a new random draw or duplicated charges', () => {
  let n = e.act(staged(), { type: 'test' });
  n = e.act(n, { type: 'loan', amount: 5000 });
  n = e.commit(n, { id: 'pilot', quantity: 1200, price: 45, supplierId: 'standard' });
  n = finish(e, e.publish(n, FULL));
  let replay = e.rollback(n, 2);
  assert.equal(replay.v2.tests.length, 1); assert.equal(replay.v2.loans.length, 1);
  replay = e.commit(replay, n.decisions[2]); replay = e.publish(replay, FULL);
  for (const d of n.decisions.slice(3)) replay = e.commit(replay, d);
  assert.equal(replay.report.profit, n.report.profit); assert.equal(replay.cash, n.cash);
});
test('slow delivery crosses rounds, event choice costs are charged once and become report evidence', () => {
  let n = e.next(finish(e, stocked(), 'ads', 3600, { id: 'benefit' }, 'economy'));
  const event = n.v2.events.find(r => r.kind === 'slow-delivery');
  assert.ok(event && event.dueRound === 2);
  n = e.act(n, { type: 'event', id: event.id, choice: 'repair' });
  assert.equal(e.act(n, { type: 'event', id: event.id, choice: 'repair' }), n);
  assert.equal(n.v2.eventHistory.length, 1); assert.equal(e.eventEffect(n).conversion, 1);
});
test('rival story appears after promotion, complaint needs trademark, outcome and costs persist on reload', () => {
  let first = finish(e, stocked());
  assert.ok(first.report.profit > 6000);
  let n = e.next(first);
  assert.equal(n.v2.events.find(e => e.kind === 'rival').stage, 4);
  for (const d of [{ id: 'singapore' }, { id: 'tech' }]) n = e.commit(n, d);
  n = e.act(n, { type: 'trademark' });
  n = e.commit(n, { id: 'pilot', quantity: 1200, price: 45, supplierId: 'standard' });
  n = e.publish(n, { mode: 'reuse' }); n = e.commit(n, { id: 'ads', budget: 3600 });
  const rival = n.v2.events.find(e => e.kind === 'rival');
  assert.equal(e.eventEffect(n).conversion, .8, 'REQ-053: one event cuts at most 20%');
  n = e.act(n, { type: 'event', id: rival.id, choice: 'complaint' });
  assert.ok(n.v2.eventHistory.some(x => x.kind === 'rival'));
  assert.deepEqual(e.deserialize(e.serialize(n)).v2.eventHistory, n.v2.eventHistory);
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
test('season preparation survives rounds, heat grows while the product stays, and storage is free under REQ-052', () => {
  let n = finish(e, stocked({ seasonPrep: true }));
  assert.equal(n.report.seasonPrepCost, 300);
  assert.equal(n.report.warehouseCost, n.report.inventoryRemaining * .5);
  n = e.next(n);
  assert.equal(n.v2.heat.tech, 1.05); assert.equal(n.v2.seasonPrepared, 1);
  for (const d of [{ id: 'singapore' }, { id: 'tech' }, { id: 'pilot', quantity: 1200, price: 45, supplierId: 'standard' }]) n = e.commit(n, d);
  n = finish(e, e.publish(n, { mode: 'reuse' }));
  assert.equal(n.stage, 6); assert.equal(n.report.profit, n.report.assetChange);
  n = e.next(n);
  assert.equal(n.round, 3); assert.equal(n.v2.heat.tech, 1.1);
  for (const d of [{ id: 'singapore' }, { id: 'tech' }]) n = e.commit(n, d);
  const prepared = e.simulate(n, 'mean'), unprepared = e.simulate({ ...n, v2: { ...n.v2, seasonPrepared: 0 } }, 'mean');
  assert.equal(prepared.seasonFactor, 1.3); assert.equal(unprepared.seasonFactor, 1.1);
  assert.ok(prepared.visitors > unprepared.visitors);
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
test('customs preparation is a real lead-time event, and switching away escapes the targeted rival', () => {
  let n = e.configure(staged(),{firstMile:'air'});
  n=e.commit(n,{id:'pilot',quantity:1200,price:45,supplierId:'fast'}); n=e.publish(n,FULL);
  n.v2.events.push({ id: 'vat-review:1', kind: 'vat-review', title: '核对进口税', dueRound: 1, stage: 0, choice: null });
  const before = e.simulate(n), after = e.simulate(e.act(n, { type: 'event', id: 'vat-review:1', choice: 'prepare' }));
  assert.equal(before.leadDays, after.leadDays + 3); assert.ok(after.units > before.units);
  n.v2.events = [{ id: 'rival:1', kind: 'rival', marketId: 'london', productId: 'tech', encounter: 1, dueRound: 1, stage: 0, choice: 'pricewar' }];
  assert.equal(e.eventEffect(n).conversion, 1);
  assert.equal(e.eventEffect(n).priceFactor, 1);
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
