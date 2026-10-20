import { seededUnit } from '../v11/model.js';
export function passport(company, markets) {
  const countries = markets.map(m => {
    const wins = company.history.filter(r => r.marketId === m.id && r.profit > 0 && r.keptOrders >= (r.round === 1 ? 300 : 500));
    const tier = wins.some(r => r.profit > 10000 || r.refunds === 0) ? 'gold' : wins.some(r => r.profit > 5000) ? 'silver' : wins.length ? 'bronze' : null;
    return { ...m, tier, wins: wins.length };
  });
  const regions = [...new Set(markets.map(m => m.region))].map(name => {
    const members = countries.filter(c => c.region === name);
    return { name, members, complete: members.every(c => c.tier) };
  });
  return { countries, regions, earned: countries.filter(c => c.tier).length, gold: countries.filter(c => c.tier === 'gold').length };
}
const badgeRank = tier => ({ bronze: 1, silver: 2, gold: 3 })[tier] || 0;
// Only the completed round can introduce an award. Compare against the country's
// best earlier result, so a repeat win or a lower result never looks like an upgrade.
export function badgeCelebration(company, markets, seen = {}) {
  if (company.stage !== 6 || company.report?.round !== company.round) return null;
  const current = company.history.find(r => r.round === company.round);
  if (!current || current.marketId !== company.report.marketId) return null;
  const prior = { ...company, history: company.history.filter(r => r.round < company.round) };
  const before = passport(prior, markets).countries.find(c => c.id === current.marketId);
  const after = passport({ ...prior, history: [...prior.history, current] }, markets).countries.find(c => c.id === current.marketId);
  if (!after?.tier || badgeRank(after.tier) <= Math.max(badgeRank(before?.tier), badgeRank(seen?.[after.id]))) return null;
  return { marketId: after.id, country: after.country, tier: after.tier, previousTier: before?.tier || null,
    round: current.round, keptOrders: current.keptOrders, profit: current.profit };
}
export function rememberBadgeCelebration(seen, award) {
  return { ...seen, [award.marketId]: badgeRank(seen?.[award.marketId]) > badgeRank(award.tier) ? seen[award.marketId] : award.tier };
}
export function explorationAwards(company, markets) {
  const p = passport(company, markets), run = company.runSeed ?? 'legacy';
  const first = (company.v2?.entryRewards || []).map(id => ({ id: `explore:${run}:country:${id}`, kind: 'country', key: id, title: `初访${markets.find(m => m.id === id)?.country || id}`, points: 5 }));
  const regions = p.regions.filter(r => r.complete).map(r => ({ id: `explore:${run}:region:${r.name}`, kind: 'region', key: r.name, title: `${r.name}经营者`, points: 30 }));
  if (p.gold === 12) regions.push({ id: `explore:${run}:world:gold`, kind: 'world', key: 'gold', title: '环球经营者', points: 100 });
  return [...first, ...regions];
}
const clamp = n => Math.max(0, Math.min(100, Math.round(n)));
export function assessment(company, ops, markets, tasks) {
  const history = company.history, last = history.slice(-5), p = passport(company, markets);
  const best = Math.max(0, ...history.map(r => r.profit)), average = last.length ? last.reduce((s, r) => s + r.profit, 0) / last.length : 0;
  const orders = history.reduce((s, r) => s + r.orders, 0), refunds = history.reduce((s, r) => s + r.refunds, 0);
  const lossRounds = history.filter(r => r.profit < 0).length;
  const attempts = (ops?.history || []).filter(e => e.type === 'operation' || e.type === 'review');
  const correct = attempts.filter(e => e.type === 'review' ? e.choiceId === 'investigate' : tasks.find(t => t.id === e.operationId)?.choices.find(c => c.id === e.choiceId)?.correct).length;
  const scores = [
    { key: 'profit', name: '盈利力', value: clamp(best / 20000 * 50 + Math.max(0, average) / 10000 * 50), detail: `最佳单轮 $${best.toFixed(0)} · 近${last.length}轮平均 $${average.toFixed(0)}` },
    { key: 'stability', name: '稳定性', value: history.length ? clamp(100 - (orders ? refunds / orders * 250 : 100) - lossRounds / history.length * 50) : 0, detail: `退款率 ${orders ? (refunds / orders * 100).toFixed(1) : '—'}% · 亏损${lossRounds}/${history.length}轮` },
    { key: 'breadth', name: '市场广度', value: clamp(p.earned / 12 * 100), detail: `${p.earned}/12个国家达标` },
    { key: 'knowledge', name: '经营认知', value: attempts.length ? clamp(correct / attempts.length * 100) : 0, detail: `总部来电 ${correct}/${attempts.length}次答对（包含重试）` },
  ];
  const averageScore = scores.reduce((s, d) => s + d.value, 0) / 4;
  const levels = ['出海新手', '探索者', '达人', '区域卖家之星', '全球经营合伙人'];
  const level = averageScore >= 85 && p.earned >= 10 && scores.every(s => s.value >= 60) ? 4 : averageScore >= 65 && p.earned >= 5 ? 3 : averageScore >= 45 && p.earned >= 2 ? 2 : history.length && averageScore >= 20 ? 1 : 0;
  const weakest = [...scores].sort((a, b) => a.value - b.value)[0];
  return { title: levels[level], level, levels, scores, averageScore: clamp(averageScore), best, average, rounds: history.length,
    number: `CB-${company.v2?.identity || `${company.runSeed ?? 'legacy'}`}`, passport: p,
    suggestion: { profit: '比较售价、商品成本和推广投入；用小预算验证后再扩大备货。', stability: '先看退款归因，核对商品页和交付，再增加流量。', breadth: '带上已有商品页，尝试一个尚未达标的市场。', knowledge: '到公司总部完成来电任务，把经营结果和判断依据连起来。' }[weakest.key] };
}
export function benchmark(company) {
  const report = company.report || company.history.at(-1);
  const rows = ['北岸商行', '青柠工作室', '远航小店', '拾光贸易'].map((name, i) => ({ name, profit: Math.round((seededUnit(company.runSeed, company.round, `benchmark:${i}`) * 16000 - 2000)), simulated: true }));
  if (report) rows.push({ name: '我的公司', profit: report.profit, simulated: false });
  return rows.sort((a, b) => b.profit - a.profit);
}
