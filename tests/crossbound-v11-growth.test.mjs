import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fixture, prepare, finish } from './crossbound-v11-fixture.mjs';
import { assessment } from '../public/previews/crossbound/v2/progress.js';
const { engine: e, legacy, growth: g } = fixture();
const correct = task => task.choices.find(c => c.correct).id;

test('first three rounds double base rewards and unlock facilities at the resulting XP', () => {
  const task = legacy.U5[0], ops = g.commit(legacy.IG(), task.id, correct(task), 1);
  assert.equal(ops.xp, 200);
  assert.equal(ops.research, 40);
  assert.equal(ops.feedback.levelUp.level, legacy.Tg(ops).level);
  assert.deepEqual(ops.feedback.unlocked.map(f => f.id), legacy.r2.filter(f => f.minXp > 0 && f.minXp <= 200).map(f => f.id));
  const built = legacy.Xse(ops, legacy.r2[0].id);
  assert.equal(built.research, 40 - legacy.r2[0].cost);
  assert.ok(g.deserialize(g.serialize(built)));
  assert.equal(g.commit(ops, task.id, correct(task), 1).xp, ops.xp);
  const normal = g.commit(legacy.IG(), task.id, correct(task), 4);
  assert.equal(normal.xp, 100); assert.equal(normal.research, 20);
});
test('wrong answers, old saves, and mixed reward rules replay exactly', () => {
  const task = legacy.U5[0], wrong = task.choices.find(c => !c.correct).id;
  const old = legacy.jse(legacy.IG(), task.id, correct(task));
  assert.equal(g.deserialize(JSON.stringify(legacy.$se(old))).xp, 100);
  let ops = g.commit(legacy.IG(), task.id, wrong, 1);
  assert.equal(ops.xp, 0); assert.equal(ops.history[0].round, 1);
  ops = g.commit(ops, task.id, correct(task), 1);
  assert.equal(g.deserialize(g.serialize(ops)).xp, 200);
  const forged = JSON.parse(g.serialize(ops)); forged.xp += 200;
  assert.equal(g.deserialize(forged), null);
  assert.equal(g.commit(ops, legacy.U5[1].id, correct(legacy.U5[1]), -1), ops);
});
// What the old build stored after a correct 售后复盘 answer in round 1 (200 XP, 40 points, doubled).
function withOldReview(ops, evidence) {
  const out = structuredClone(ops), id = `reviews:${evidence.run}:${evidence.round}`;
  out.history.push({ type: 'review', evidence, choiceId: 'investigate', round: 1 });
  out.attempts[id] = 1; out.xp += 200; out.research += 40; out.streak = 1; out.bestStreak = 1; out.completed.push(id);
  return out;
}
test('售后复盘下线: ten or more bad reviews create no task and no new answer is paid; refunds and ratings still count', () => {
  const company = finish(e, prepare(e), 'ads', 3600, { id: 'benefit' }, 'economy');
  assert.ok(company.report.badReviews >= 10); assert.ok(company.report.refunds > 0);
  assert.ok(company.report.ratingAfter < 5, 'bad reviews still pull the rating down');
  assert.equal(g.reviewTask(company, legacy.IG()), null);
  assert.equal(g.reviewTask(e.next(company), legacy.IG()), null);
  const evidence = { run: company.runSeed, round: 1, badReviews: company.report.badReviews, orders: company.report.orders, refunds: company.report.refunds };
  const ops = legacy.IG();
  assert.equal(g.reviewAnswer(ops, evidence, 'investigate', 1), ops);
});
test('售后复盘下线: an old save with a review answer restores its XP, points and buildings exactly, never pays twice', () => {
  const evidence = { run: 7, round: 1, badReviews: 12, orders: 300, refunds: 20 };
  let ops = withOldReview(legacy.IG(), evidence);
  ops = legacy.Xse(ops, legacy.r2[0].id); // a facility bought with those points
  const saved = g.serialize(ops);
  assert.ok(saved, 'the old ledger still verifies');
  const restored = g.deserialize(saved);
  assert.equal(restored.xp, 200); assert.equal(restored.research, 40 - legacy.r2[0].cost); assert.ok(restored.upgrades.includes(legacy.r2[0].id));
  assert.equal(g.reviewAnswer(restored, evidence, 'investigate', 1), restored);
  const a = assessment({ history: [], v2: {} }, restored, e.markets, legacy.U5).scores.find(s => s.key === 'knowledge');
  assert.equal(a.detail, '总部来电 0/0次答对（包含重试）', '经营认知 counts only the HQ questions');
});
test('growth plan uses doubled XP; no 售后复盘 task takes the HQ slot after the regular tasks finish', () => {
  const company = finish(e, prepare(e), 'ads', 3600, { id: 'benefit' }, 'economy');
  let ops = legacy.IG();
  for (const task of legacy.U5) ops = g.commit(ops, task.id, correct(task), 1);
  const result = g.growth(company, ops);
  assert.equal(result.completed, legacy.U5.length);
  assert.equal(result.reviewTask, null); assert.ok(!result.nextTask || result.nextTask.type !== 'review');
  assert.ok(!result.upgradeTasks.some(t => t.type === 'review'));
  const initial = g.growth(e.create(123), legacy.IG());
  assert.equal(initial.upgradeTasks.length, 1);
  assert.equal(initial.upgradeTasks[0].xp, 200);
});
test('delivery milestone is attainable, excludes tiny samples, and keeps historical zero-refund badges', () => {
  const company = finish(e, prepare(e));
  assert.ok(e.milestones(company).find(m => m.id === 'steady-delivery').earned);
  assert.ok(!e.milestones(company).some(m => m.id === 'zero-refunds'));
  const tiny = { history: [{ orders: 20, refunds: 1, profit: 0, round: 1 }] };
  assert.equal(e.milestones(tiny).find(m => m.id === 'steady-delivery').earned, false);
  const old = { history: [{ orders: 20, refunds: 0, profit: 10, round: 1 }] };
  const retained = e.milestones(old).find(m => m.id === 'zero-refunds');
  assert.equal(retained.earned, true); assert.equal(retained.round, 1);
});
