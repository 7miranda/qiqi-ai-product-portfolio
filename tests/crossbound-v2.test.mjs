import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture, prepare, finish, FULL } from './crossbound-v11-fixture.mjs';
import { createCrossboundV2 } from '../public/previews/crossbound/v2/model.js';
import { TAX, taxQuote, PLATFORMS, FIRST_MILE } from '../public/previews/crossbound/v2/catalog.js';
import { productFit } from '../public/previews/crossbound/v2/product-fit.js';
import { explorationAwards, assessment } from '../public/previews/crossbound/v2/progress.js';
import { profitRows } from '../public/previews/crossbound/v2/ui.js';
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
  assert.ok(results[0].units < results[1].units && results[1].units < results[2].units);
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
  const rivalId = n.v2.events.find(e => e.kind === 'rival').id;
  assert.equal(e.act(n, { type: 'event', id: rivalId, choice: 'complaint' }), n, 'the encounter is not actionable before promotion');
  for (const d of [{ id: 'singapore' }, { id: 'tech' }]) n = e.commit(n, d);
  n = e.commit(n, { id: 'pilot', quantity: 1200, price: 45, supplierId: 'standard' });
  n = e.publish(n, { mode: 'reuse' });
  const unregistered = e.commit(n, { id: 'ads', budget: 3600 });
  assert.equal(e.act(unregistered, { type: 'event', id: rivalId, choice: 'complaint' }), unregistered, 'an active encounter still needs this product trademark');
  const beforeTrademark = n.cash;
  n = e.act(n, { type: 'trademark' });
  assert.equal(n.cash, money(beforeTrademark - 600));assert.equal(e.act(n, { type: 'trademark' }), n);
  n = e.commit(n, { id: 'ads', budget: 3600 });
  const rival = n.v2.events.find(e => e.kind === 'rival');
  for (const encounter of [1, 2, 10]) {
    const repeated = { ...n, v2: { ...n.v2, events: [{ ...rival, encounter }] } };
    assert.equal(e.eventEffect(repeated).conversion, .8, 'one unresolved rival never removes more than 20%');
  }
  const beforeComplaint = n.cash;
  n = e.act(n, { type: 'event', id: rival.id, choice: 'complaint' });
  assert.equal(n.cash, money(beforeComplaint - 200));
  assert.equal(n.v2.eventHistory.find(x => x.kind === 'rival').success, true);
  assert.equal(e.eventEffect(n).conversion, 1);
  assert.equal(e.act(n, { type: 'event', id: rival.id, choice: 'complaint' }), n, 'complaint costs and outcomes cannot be duplicated');
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
test('season preparation persists while product heat grows to 1.15 and returned stock incurs no warehouse carry', () => {
  let n = finish(e, stocked({ seasonPrep: true }));
  assert.equal(n.report.seasonPrepCost, 300);
  assert.equal(n.report.warehouseCost, 0);assert.equal(n.report.inventoryRemaining, 0);
  for (const [round, heat] of [[2, 1.05], [3, 1.1], [4, 1.15], [5, 1.15]]) {
    n = e.next(n);
    assert.equal(n.round, round);assert.deepEqual(n.v2.heat, { tech: heat });
    assert.equal(n.v2.seasonPrepared, 1);assert.equal(n.v2.config.seasonPrep, false);
    assert.equal(e.next(n), n, 'reopening an unfinished round cannot apply another heat increment');
    for (const d of [{ id: 'singapore' }, { id: 'tech' }]) n = e.commit(n, d);
    if (round === 3) {
      const prepared = e.simulate(n, 'mean'), unprepared = e.simulate({ ...n, v2: { ...n.v2, seasonPrepared: 0 } }, 'mean');
      assert.equal(prepared.seasonFactor, 1.3);assert.equal(unprepared.seasonFactor, 1.1);
      assert.ok(prepared.visitors > unprepared.visitors);
    }
    n = e.commit(n, { id: 'pilot', quantity: 1200, price: 45, supplierId: 'standard' });
    n = finish(e, e.publish(n, { mode: 'reuse' }));
    assert.equal(n.stage, 6);assert.equal(n.report.profit, n.report.assetChange);
    assert.equal(n.report.seasonPrepCost, 0);assert.equal(n.report.warehouseCost, 0);
    assert.equal(n.inventory.tech, 0);
  }
  assert.equal(n.ledger.filter(row => row.category === 'season').length, 1);
});
test('V2 settlement returns unsold principal less 5%, preserves receivables and prevents repeat clearance', () => {
  const n = finish(e, stocked({ terms: 'credit' }));
  assert.deepEqual([n.report.stockReturnUnits, n.report.stockReturnCost, n.report.stockReturnFee, n.report.stockReturn], [194, 2308.6, 115.43, 2193.17]);
  assert.equal(n.report.stockReturnFee, money(n.report.stockReturnCost * .05));
  assert.equal(money(n.report.stockReturn + n.report.stockReturnFee), n.report.stockReturnCost, 'principal returned plus its fee equals the removed stock cost');
  assert.equal(n.report.receivables, 44595);assert.equal(n.report.profit, 13533.47);
  assert.equal(n.report.profit, n.report.assetChange);
  assert.ok(Object.values(n.inventory).every(quantity => quantity === 0));
  assert.ok(Object.values(n.inventoryCosts).every(cost => cost === 0));
  assert.equal(n.ledger.filter(row => row.category === 'stockReturn').length, 1);
  assert.equal(n.ledger.find(row => row.category === 'stockReturn').cashDelta, 2193.17);
  const sold = e.clearStock(n, 'tech');
  assert.equal(sold, n, 'settlement has already emptied inventory; no second 50% sale is available');
  assert.equal(sold.report.clearanceLoss, undefined);assert.equal(sold.clearanceEvents.length, 0);
  assert.equal(e.clearStock(sold, 'tech'), sold);
  assert.ok(e.deserialize(e.serialize(sold)));
  const next = e.next(n);
  assert.equal(next.cash, money(n.cash + n.report.receivables - n.report.liabilities));
  assert.equal(next.ledger.filter(row => row.category === 'stockReturn').length, 1, 'the next round does not return the same principal or charge its fee again');
});
test('customs preparation removes three days without bypassing arrival floors, and rivals only affect their target', () => {
  let n = stocked();
  n.v2.events.push({ id: 'vat-review:1', kind: 'vat-review', title: '核对进口税', dueRound: 1, stage: 0, choice: null });
  const prepared = e.act(n, { type: 'event', id: 'vat-review:1', choice: 'prepare' });
  const before = e.simulate(n), after = e.simulate(prepared);
  assert.deepEqual([before.leadDays, after.leadDays, before.units, after.units], [17, 14, 1020, 1020]);
  assert.equal(after.units, 1200 * .85, 'the default mixed route protects 75% + 10% of new stock');
  assert.equal(prepared.cash, money(n.cash - 180));assert.equal(e.eventEffect(prepared).delayDays, 0);
  assert.equal(e.act(prepared, { type: 'event', id: 'vat-review:1', choice: 'prepare' }), prepared);
  const waiting = e.act(n, { type: 'event', id: 'vat-review:1', choice: 'wait' });
  assert.equal(waiting.cash, n.cash);assert.equal(e.eventEffect(waiting).delayDays, 3);
  const insufficient = { ...n, cash: 179 };
  assert.equal(e.act(insufficient, { type: 'event', id: 'vat-review:1', choice: 'prepare' }), insufficient);
  assert.equal(insufficient.v2.events.find(event => event.id === 'vat-review:1').choice, null);
  const frozen = { ...n, balanceVersion: undefined, roundStart: { ...n.roundStart, balanceVersion: undefined } };
  const frozenBefore = e.simulate(frozen), frozenAfter = e.simulate(e.act(frozen, { type: 'event', id: 'vat-review:1', choice: 'prepare' }));
  assert.deepEqual([frozenBefore.leadDays, frozenAfter.leadDays, frozenBefore.units, frozenAfter.units], [17, 14, 520, 640], 'saved pre-calibration rounds have no arrival floor');
  n.v2.events = [{ id: 'rival:1', kind: 'rival', marketId: 'london', productId: 'tech', encounter: 1, dueRound: 1, stage: 0, choice: 'pricewar' }];
  assert.equal(e.eventEffect(n).conversion, 1);
  assert.equal(e.eventEffect(n).priceFactor, 1);
  const targeted = { ...n, marketId: 'london' };
  assert.equal(e.eventEffect(targeted).conversion, .95);assert.equal(e.eventEffect(targeted).priceFactor, .9);
  assert.equal(e.eventEffect({ ...targeted, productId: 'living' }).conversion, 1);
  assert.equal(e.eventEffect({ ...targeted, productId: 'living' }).priceFactor, 1);
});
