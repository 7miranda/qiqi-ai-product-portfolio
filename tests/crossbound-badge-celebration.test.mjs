import test from 'node:test';
import assert from 'node:assert/strict';
import { badgeCelebration, rememberBadgeCelebration, passport } from '../public/previews/crossbound/v2/progress.js';

const markets = [{ id: 'singapore', country: '新加坡', region: '亚洲' }, { id: 'toronto', country: '加拿大', region: '北美洲' }];
const report = (round, profit = 1200, overrides = {}) => ({ round, profit, marketId: 'singapore', keptOrders: round === 1 ? 300 : 500, refunds: 10, ...overrides });
const company = (...history) => ({ stage: 6, round: history.at(-1).round, report: history.at(-1), history, runSeed: 20261020 });
const award = (n, seen) => badgeCelebration(n, markets, seen);

test('first country award matches passport bronze, silver and gold rules including strict thresholds', () => {
  for (const [profit, tier] of [[1, 'bronze'], [5000, 'bronze'], [5000.01, 'silver'], [10000, 'silver'], [10000.01, 'gold']]) {
    const n = company(report(1, profit)), a = award(n);
    assert.equal(a.tier, tier);
    assert.equal(a.tier, passport(n, markets).countries[0].tier);
    assert.equal(a.previousTier, null);
    assert.equal(a.country, '新加坡');
  }
  assert.equal(award(company(report(1, 100, { refunds: 0 }))).tier, 'gold', 'preserves historical zero-refund qualification');
});

test('only completed and recorded rounds with positive profit and enough kept orders celebrate', () => {
  const n = company(report(1));
  for (const stage of [0, 1, 2, 3, 4, 5]) assert.equal(award({ ...n, stage }), null);
  assert.equal(award({ ...n, history: [] }), null);
  assert.equal(award({ ...n, round: 2 }), null);
  assert.equal(award({ ...n, report: { ...n.report, marketId: 'toronto' } }), null);
  assert.equal(award(company(report(1, 0))), null);
  assert.equal(award(company(report(1, -10))), null);
  assert.equal(award(company(report(1, 20000, { keptOrders: 299 }))), null);
  assert.equal(award(company(report(2, 20000, { keptOrders: 499 }))), null);
});

test('bronze to silver, silver to gold and direct bronze to gold show the previous best tier', () => {
  for (const [before, after, from, to] of [[1000, 6000, 'bronze', 'silver'], [6000, 11000, 'silver', 'gold'], [1000, 11000, 'bronze', 'gold']]) {
    const a = award(company(report(1, before), report(2, after)));
    assert.equal(a.previousTier, from);
    assert.equal(a.tier, to);
    assert.equal(a.profit, after);
  }
});

test('repeat wins and lower results do not award or downgrade an existing country badge', () => {
  assert.equal(award(company(report(1), report(2))), null);
  assert.equal(award(company(report(1, 11000), report(2, 1000), report(3, 7000))), null);
  assert.equal(award(company(report(1, 6000), report(2, 8000))), null);
});

test('each country earns independently, even when an earlier country already has gold', () => {
  const n = company(report(1, 11000), report(2, 1000, { marketId: 'toronto' }));
  assert.deepEqual(award(n), { marketId: 'toronto', country: '加拿大', tier: 'bronze', previousTier: null, round: 2, keptOrders: 500, profit: 1000 });
});

test('presentation receipts prevent replay after reopening, refresh and rollback but allow a later upgrade', () => {
  const n = company(report(1)), initial = award(n);
  const seen = JSON.parse(JSON.stringify(rememberBadgeCelebration({}, initial)));
  assert.equal(award(n, seen), null);
  assert.equal(award(company(report(1, 1500)), seen), null, 'replaying a changed plan cannot replay the same award');
  const upgraded = company(report(1), report(2, 6000)), silver = award(upgraded, seen);
  assert.equal(silver.tier, 'silver');
  const silverSeen = rememberBadgeCelebration(seen, silver);
  assert.equal(award(upgraded, silverSeen), null);
  assert.equal(award(n, silverSeen), null, 'rolling back below the celebrated best does not show an older award');
  assert.equal(award(company(report(1), report(2, 11000)), silverSeen).tier, 'gold');
});

test('receipts retain the highest celebrated tier and never change game state or badge ownership', () => {
  const n = company(report(1, 6000)), original = structuredClone(n);
  const first = award(n), seen = { singapore: 'gold', toronto: 'silver' };
  const next = rememberBadgeCelebration(seen, first);
  assert.deepEqual(next, seen);
  assert.notEqual(next, seen);
  assert.deepEqual(n, original);
  assert.equal(passport(n, markets).countries[0].tier, 'silver', 'receipt is not a gameplay reward');
});

test('invalid saved receipt values cannot suppress an actual new badge', () => {
  assert.equal(award(company(report(1)), { singapore: 'invalid' }).tier, 'bronze');
  assert.equal(award(company(report(1)), null).tier, 'bronze');
});
