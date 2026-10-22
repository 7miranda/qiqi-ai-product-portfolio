// Inserted in the original app component; uses its state setters and dialog.
const v4Guide=V2UI.useTutorial(t,o&&!n,l,ev=>s(cur=>V11Growth.claimTutorial(cur,ev)));
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
  const next=uG(t); if(next.round<=t.round){Ai('请先完成本轮安排，再开启下一轮。');return;}
  v11Flow.finish(); tn(null); i(next); d('market'); u('decision'); No();
}
function v11ContinueSettlement() { v11NextRound(); }
li.useEffect(()=>{
  capture(t,r,o&&!n,U5,V11);
  if(t.stage===6&&t.goalVersion===GOAL_VERSION){
    const date=new Date(),month=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;
    const run=String(t.v2?.identity||t.runSeed);
    if(!r.completed.includes(`round-growth:${run}:${t.round}`))s(cur=>V11Growth.claimRound(cur,{type:'round-growth',run,round:t.round,month,xp:100,season:releaseRank(cur).level===10}));
  }
  const feedback=feedbackState(t),claims=[feedback.firstClaim,feedback.deepClaim].filter(Boolean);
  if(claims.some(e=>!r.completed.includes(`community:${e.run}:${e.id}`)))s(cur=>claims.reduce((out,e)=>V11Growth.claimCommunity(out,e),cur));
},[t,r,o,n]);
li.useEffect(()=>{if(!o||n)return;const exit=()=>captureExit(t),retry=()=>flush();const timer=setInterval(retry,15000);addEventListener('online',retry);addEventListener('pagehide',exit);return()=>{clearInterval(timer);removeEventListener('online',retry);removeEventListener('pagehide',exit)}},[t,o,n]);
