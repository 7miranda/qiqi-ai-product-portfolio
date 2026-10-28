import { rank as currentRank } from '../v2/release.js';
// Growth rewards use their own ledger. They never change operating cash or orders.
export function createGrowth({ tasks, facilities, createOps, commitOps, purchase, rank, snapshot, baseGrowth }) {
  rank = currentRank;
  const clone = n => structuredClone(n);
  const factor = round => round <= 3 ? 2 : 1;
  const reviewId = (run, round) => `reviews:${run}:${round}`;
  function reviewTask(company, ops) {
    const reports = [...company.history];
    if (company.stage >= 5 && company.report && !reports.some(r => r.round === company.report.round)) reports.push(company.report);
    const report = reports.find(r => r.badReviews >= 10 && !ops.completed.includes(reviewId(company.runSeed ?? 'legacy', r.round)));
    if (!report) return null;
    const primary = [...(report.refundReasons || [])].sort((a, b) => b.count - a.count)[0];
    return {
      id: reviewId(company.runSeed ?? 'legacy', report.round), type: 'review', stage: 0,
      title: '买家差评，需要回应', available: true, round: report.round,
      evidence: { run: company.runSeed ?? 'legacy', round: report.round, badReviews: report.badReviews, orders: report.orders, refunds: report.refunds },
      mission: `第${report.round}轮新增${report.badReviews}条差评。商品评分从${report.ratingBefore.toFixed(2)}降至${report.ratingAfter.toFixed(2)}，先找到买家不满意的原因。`,
      metrics: [{ label: '新增差评', value: `${report.badReviews}条`, detail: '来自这轮真实模拟结果' },
        { label: '退款最多的原因', value: primary?.label || '等待核对', detail: `${primary?.count || 0}单；结合商品页、售价和交付排查` },
        { label: '当前商品评分', value: `${report.ratingAfter.toFixed(2)} ★`, detail: '会继续影响下轮购买意愿' }],
      xp: 100 * factor(company.round), research: 20 * factor(company.round),
    };
  }
  function commit(ops, id, choiceId, round) {
    if (round != null && (!Number.isInteger(round) || round < 1 || round > 100)) return ops;
    const result = commitOps(ops, id, choiceId);
    if (result.history.length === ops.history.length || round == null) return result;
    result.history.at(-1).round = round;
    if (result.feedback?.status !== 'correct') return result;
    const task = tasks.find(t => t.id === id), multiplier = factor(round);
    const xp = task.reward.xp * (multiplier - 1), points = task.reward.research * (multiplier - 1);
    result.xp += xp; result.research += points;
    result.feedback.xpDelta += xp; result.feedback.researchDelta += points;
    const before = rank(ops), after = rank(result);
    result.feedback.levelUp = after.level > before.level ? after : null;
    result.feedback.unlocked = facilities.filter(f => ops.xp < f.minXp && result.xp >= f.minXp).map(f => ({ id: f.id, name: f.name }));
    return result;
  }
  function reviewAnswer(ops, evidence, choiceId, round) {
    const valid = evidence && (Number.isInteger(evidence.run) || evidence.run === 'legacy') &&
      Number.isInteger(evidence.round) && evidence.round > 0 && Number.isInteger(round) && round >= evidence.round && round <= 100 &&
      Number.isInteger(evidence.badReviews) && evidence.badReviews >= 10 &&
      Number.isInteger(evidence.orders) && Number.isInteger(evidence.refunds) &&
      evidence.orders >= evidence.refunds && evidence.refunds >= evidence.badReviews;
    if (!valid || !['investigate', 'erase', 'amplify'].includes(choiceId)) return ops;
    const id = reviewId(evidence.run, evidence.round);
    if (ops.completed.includes(id)) return ops;
    const out = clone(ops), before = rank(ops);
    out.history.push({ type: 'review', evidence: clone(evidence), choiceId, round });
    out.attempts[id] = (out.attempts[id] || 0) + 1;
    if (choiceId !== 'investigate') {
      out.streak = 0;
      out.feedback = { status: 'retry', title: '先处理买家遇到的问题', body: choiceId === 'erase' ? '隐藏评价不会解决退款原因。核对买家反馈与实际交付，再改进下一轮方案。' : '先放大流量，也会放大尚未解决的售后问题。先看退款原因，再决定预算。' };
      return out;
    }
    const bonus = Math.min(40, out.streak * 10), xp = 100 * factor(round) + bonus, points = 20 * factor(round);
    out.xp += xp; out.research += points; out.streak++;
    out.bestStreak = Math.max(out.bestStreak, out.streak); out.completed.push(id);
    const after = rank(out);
    out.feedback = { status: 'correct', title: '售后排查方案已记录', body: '先回复买家，再对照退款原因核查商品描述与交付。下轮调整售价、商品页或配送验证效果；已有差评和评分如实保留。',
      xpDelta: xp, researchDelta: points, bonusXp: bonus, streak: out.streak,
      levelUp: after.level > before.level ? after : null,
      unlocked: facilities.filter(f => ops.xp < f.minXp && out.xp >= f.minXp).map(f => ({ id: f.id, name: f.name })),
      metrics: [{ label: '排查记录', value: `第${evidence.round}轮 · ${evidence.badReviews}条差评` }] };
    return out;
  }
  function deserialize(raw) {
    try {
      const saved = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (saved?.version !== 1 || !Array.isArray(saved.history)) return null;
      let state = createOps();
      for (const event of saved.history) {
        const before = state.history.length;
        if (event.type === 'operation') state = commit(state, event.operationId, event.choiceId, event.round);
        else if (event.type === 'purchase') state = purchase(state, event.upgradeId);
        else if (event.type === 'review') state = reviewAnswer(state, event.evidence, event.choiceId, event.round);
        else if (event.type === 'exploration') state = claimExploration(state, event.award);
        else if (event.type === 'community') state = claimCommunity(state,event);
        else if (event.type === 'round-growth') state = claimRound(state,event);
        else if (event.type === 'tutorial') state = claimTutorial(state,event);
        else return null;
        if (state.history.length !== before + 1 || JSON.stringify(state.history.at(-1)) !== JSON.stringify(event)) return null;
      }
      return JSON.stringify(snapshot(state)) === JSON.stringify(snapshot(saved)) ? state : null;
    } catch { return null; }
  }
  function serialize(ops) {
    const saved = snapshot(ops);
    return deserialize(saved) ? JSON.stringify(saved) : null;
  }
  function growth(company, ops) {
    const out = baseGrowth(company, ops), multiplier = factor(company.round), review = reviewTask(company, ops);
    out.rank=rank(ops); out.gap=out.rank.nextXp==null?0:out.rank.nextXp-ops.xp;
    out.completed = tasks.filter(t => ops.completed.includes(t.id)).length;
    if (out.nextTask) { out.nextTask.xp *= multiplier; out.nextTask.research *= multiplier; }
    const candidates = tasks.filter(t => !ops.completed.includes(t.id)).map(t => ({
      id: t.id, title: t.title.replace(/\n/g, ''), stage: t.stage, stageName: ['选择市场', '选择商品', '定价备货', '上架推广', '发货收款', '安排下轮'][t.stage],
      xp: t.reward.xp * multiplier, research: t.reward.research * multiplier, available: t.stage <= company.stage,
    }));
    if (review) {
      out.nextTask = { ...review, possibleBonusXp: Math.min(40, ops.streak * 10), stageName: '售后复盘' };
      candidates.unshift(out.nextTask);
    }
    let xp = 0;
    out.upgradeTasks = candidates.filter(t => { if (xp >= out.gap) return false; xp += t.xp; return true; });
    out.baseXpToEarn = xp; out.reviewTask = review;
    return out;
  }
  function claimExploration(ops, award) {
    const points = { country: 5, region: 30, world: 100 }[award?.kind];
    if (!points || award.points !== points || typeof award.id !== 'string' || !award.id.startsWith('explore:') || typeof award.title !== 'string' || ops.completed.includes(award.id)) return ops;
    const result = clone(ops);
    result.research += points;
    result.completed.push(award.id);
    result.history.push({ type: 'exploration', award: clone(award) });
    return result;
  }
  function claimCommunity(ops,event) {
    if(!['first','deep'].includes(event.id)||!Number.isInteger(event.rounds)||event.rounds<(event.id==='deep'?3:1)||typeof event.run!=='string'||typeof event.substantive!=='boolean')return ops;
    const id=`community:${event.run}:${event.id}`;
    if(ops.completed.includes(id))return ops;
    const result=clone(ops);result.completed.push(id);result.research+=event.id==='deep'?(event.substantive?30:0):50+(event.substantive?20:0);
    result.history.push({type:'community',id:event.id,run:event.run,rounds:event.rounds,substantive:event.substantive});return result;
  }
  function claimRound(ops,event) {
    if(!Number.isInteger(event.round)||event.round<1||event.round>100||typeof event.run!=='string'||!/^\d{4}-\d{2}$/.test(event.month)||event.xp!==100||typeof event.season!=='boolean')return ops;
    const id=`round-growth:${event.run}:${event.round}`;if(ops.completed.includes(id))return ops;
    const result=clone(ops);result.completed.push(id);result.xp+=100;result.history.push({...event});return result;
  }
  function claimTutorial(ops,event){
    if(!['licensed','independent'].includes(event.id)||typeof event.run!=='string'||event.round!==(event.id==='licensed'?1:2))return ops;
    const id=`tutorial:${event.run}:${event.id}`;if(ops.completed.includes(id))return ops;
    const result=clone(ops);result.completed.push(id);result.research+=event.id==='licensed'?20:0;
    result.history.push({type:'tutorial',id:event.id,run:event.run,round:event.round});return result;
  }
  return { commit, reviewTask, reviewAnswer, deserialize, serialize, growth, claimExploration, claimCommunity, claimRound, claimTutorial };
}
