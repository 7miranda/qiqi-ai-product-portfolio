// Inserted in the original app component; uses its state setters and dialog.
li.useEffect(() => {
  const awards = explorationAwards(t, ks);
  if (awards.length) s(current => awards.reduce((out, award) => V11Growth.claimExploration(out, award), current));
}, [t]);
function v11Award(result) {
  s(result);
  if (result.feedback?.status !== 'correct') { Ai(result.feedback?.body || '再核对一下线索。'); return; }
  const f = result.feedback;
  const receipt = { title: '任务已完成', body: f.body, xp: f.xpDelta, research: f.researchDelta, cash: 0,
    kind: 'challenge', streak: result.streak, bonusXp: f.bonusXp,
    promotion: f.levelUp ? `LV.${f.levelUp.level} · ${f.levelUp.name}` : undefined,
    unlocked: f.unlocked || [], metrics: f.metrics };
  if (ms) v11Flow.reward(receipt);
  tn(receipt); u('reward'); rn(true);
}
function v11ReviewAnswer(choice) {
  const task = _s.reviewTask;
  if (task) v11Award(V11Growth.reviewAnswer(r, task.evidence, choice, t.round));
}
function v11NextRound() {
  v11Flow.finish(); tn(null); i(uG(t)); d('market'); u(null);
}
function v11ContinueSettlement() {
  if (!v11Flow.done) {
    if (v11Flow.phase === 'reward' && v11Flow.receipt) { tn(v11Flow.receipt); u('reward'); return; }
    if (v11Flow.phase === 'build') {
      if (_s.facilities.some(f => f.ready)) { u('build'); return; }
      v11NextRound(); return;
    }
    if (_s.nextTask?.available) { v11Flow.start(); As(); return; }
    if (_s.facilities.some(f => f.ready)) { v11Flow.build(); u('build'); return; }
  }
  v11NextRound();
}
