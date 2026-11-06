import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,prepare,finish,FULL} from './crossbound-v11-fixture.mjs';
import {createCrossboundV2} from '../public/previews/crossbound/v2/model.js';
import {cashFailure,saveRecovery,finishRecovery,recoveryJournal} from '../public/previews/crossbound/v2/recovery.js';
import {saveFeedback,feedbackState,feedbackDraft,saveFeedbackDraft} from '../public/previews/crossbound/v2/records.js';
import {createMarketSession} from '../public/previews/crossbound/v3/market/session.js';
import {createStudioSession} from '../public/previews/crossbound/v3/studio/session.js';
import {financialStatements} from '../public/previews/crossbound/v2/release.js';
import {explorationAwards} from '../public/previews/crossbound/v2/progress.js';
const f=fixture(),e=createCrossboundV2(f.adapter),g=f.growth;
const clone=v=>JSON.parse(JSON.stringify(v));
const claim=n=>({id:'first',run:n.v2.collectionIdentity||n.v2.identity,rounds:n.history.length,substantive:false,capital:10000});
const storage=()=>{const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};};

test('restart from every paid stage restores the complete opening business state, never the old rollback charges',()=>{
  let n=e.create(12345),opening=clone(n);
  const steps=[{id:'singapore'},{id:'tech'},{id:'pilot',quantity:1200,price:45,supplierId:'standard'},{id:'ads',budget:3600,promotionChoice:{id:'benefit'}},{id:'express'}];
  for(const input of steps){
    n=e.commit(n,input);if(n.stage===3)n=e.publish(n,FULL);
    assert.ok(n.stage>0,n.feedback?.body);
    const withLoan=e.act(n,{type:'loan',amount:2000}),restored=e.restartRound(withLoan);
    for(const key of ['cash','inventory','inventoryCosts','listingAssets','ledger','history','visitedMarkets','ratings','contentTail','previousMarket','carryEffect','listingInvestments','clearanceEvents','v2','decisions','currentListing','report'])assert.deepEqual(clone(restored[key]??null),clone(opening[key]??null),`stage ${n.stage}: ${key}`);
    assert.equal(restored.stage,0);assert.equal(restored.round,1);assert.equal(restored.runSeed,n.runSeed);
    assert.ok(e.deserialize(e.serialize(restored)));
  }
});

test('second-round restart preserves settled receipts/debts exactly once and drops this attempt optimization and loan',()=>{
  const prior=finish(e,prepare(e));assert.equal(prior.stage,6);
  let opening=e.next(prior),n=e.commit(e.commit(opening,{id:'singapore'}),{id:'tech'});
  n=e.commit(n,{id:'pilot',quantity:400,price:45,supplierId:'standard'});
  // A prior 95-point asset cannot optimize: use a real lower-quality asset for the regression.
  n.listingAssets.tech.baseScore=80;n.listingAssets.tech.score=80;
  const optimized=e.optimize(n);assert.ok(optimized.cash<n.cash);
  n=e.act(optimized,{type:'loan',amount:2000});
  const restored=e.restartRound(n);
  assert.equal(restored.cash,opening.cash);assert.deepEqual(restored.v2,opening.v2);
  assert.deepEqual(restored.listingAssets,opening.listingAssets);assert.deepEqual(restored.history,opening.history);assert.deepEqual(restored.ledger,opening.ledger);
  assert.ok(e.deserialize(e.serialize(restored)));
  assert.equal(e.restartRound(restored).cash,opening.cash);
});

test('first-round survey capital survives retries, reloads and ordinary rollback exactly once and never becomes profit',()=>{
  let n=prepare(e),base=e.restartRound(n),ev=claim(n);
  n=e.grantCommunity(n,ev);assert.equal(n.cash,prepareCash()+10000);
  function prepareCash(){return prepare(e).cash;}
  for(let i=0;i<4;i++){
    n=e.deserialize(e.serialize(e.restartRound(n)));assert.ok(n);
    assert.equal(n.cash,base.cash+10000);assert.equal(n.v2.capitalGrants.length,1);
    assert.equal(e.grantCommunity(n,ev),n);
    n=e.commit(n,{id:'singapore'});n=e.act(n,{type:'loan',amount:2000});
    n=e.rollback(n,0);assert.equal(n.v2.capitalGrants.length,1);
  }
  n=e.restartRound(n);n=e.commit(e.commit(n,{id:'singapore'}),{id:'tech'});n=e.commit(n,{id:'pilot',quantity:1200,price:45,supplierId:'standard'});n=e.publish(n,FULL);n=finish(e,n);
  assert.equal(n.stage,6);assert.equal(n.report.profit,finish(e,prepare(e)).report.profit);
  assert.equal(n.report.capitalContribution,10000);
  assert.deepEqual(financialStatements(n,n.report).checks,[true,true,true]);
  const next=e.next(n);assert.equal(e.grantCommunity(next,ev),next);assert.equal(e.restartRound(next).cash,next.cash);
});

test('growth checkpoint removes current-attempt tasks, purchases and exploration while retaining survey rewards',()=>{
  let n=e.create(12345),ops=f.legacy.IG();n.recoveryOps=g.serialize(ops);
  const task=f.legacy.U5[0];ops=g.commit(ops,task.id,task.choices.find(c=>c.correct).id,1);
  ops=f.legacy.Xse(ops,f.legacy.r2[0].id);assert.ok(ops.upgrades.length);
  n=e.commit(n,{id:'singapore'});for(const award of explorationAwards(n,e.markets))ops=g.claimExploration(ops,award);
  ops=g.claimCommunity(ops,claim(n));const result=g.restoreRoundOps(ops,n);
  assert.equal(result.xp,0);assert.equal(result.research,50);assert.equal(result.upgrades.length,0);
  assert.equal(result.history.length,1);assert.equal(result.history[0].type,'community');assert.ok(g.deserialize(g.serialize(result)));
  assert.equal(g.restoreRoundOps(result,n).research,50);
});

test('old in-progress saves infer growth boundary from round evidence without discarding prior rounds',()=>{
  let n=e.next(finish(e,prepare(e))),ops=f.legacy.IG();
  const a=f.legacy.U5[0],b=f.legacy.U5[1];ops=g.commit(ops,a.id,a.choices.find(c=>c.correct).id,1);const before=clone(ops);
  ops=g.commit(ops,b.id,b.choices.find(c=>c.correct).id,2);
  assert.deepEqual(clone(g.roundStartOps(ops,n)),before);
});

test('cash detection covers listing, reserves, actual settlement, expansion and overdue debt without false bankruptcy',()=>{
  for(const stage of [0,2,3,4,5])assert.equal(cashFailure({stage,cash:100},{cashNeed:200}).shortfall,100);
  assert.equal(cashFailure({stage:3,cash:100},{cost:630}).required,630);
  assert.equal(cashFailure({stage:2,cash:100},{cashNeed:20,cashBlocked:true,overdueAmount:1000,supplyBlockedReason:'到期债务'}).shortfall,900);
  for(const quote of [{cashNeed:100},{cashNeed:200,supplyBlockedReason:'起订量'},{cashNeed:200,marketBlocked:true},{},null])assert.equal(cashFailure({stage:2,cash:100},quote),null);
  assert.equal(cashFailure({stage:6,cash:0},{cashNeed:100}),null);
});

test('first survey claim is durable before payout; duplicate submissions, legacy receipts and refresh cannot increase rewards',()=>{
  const previous=globalThis.localStorage;globalThis.localStorage=storage();
  try{
    const n=e.create(17),input={first:true,answers:[0,1,2],comment:''};
    const saved=saveFeedback(n,input);assert.equal(saved.firstClaim.rounds,0);assert.equal(saved.firstClaim.capital,10000);
    assert.deepEqual(saveFeedback(n,{...input,comment:'这是一个重复提交且不能增加奖励的建议内容'}),saved);
    const paid=e.grantCommunity(n,feedbackState(n).firstClaim);assert.equal(paid.cash,n.cash+10000);assert.equal(e.grantCommunity(e.deserialize(e.serialize(paid)),saved.firstClaim).cash,paid.cash);
    const legacy=e.create(18);globalThis.localStorage.setItem(`crossbound-feedback:${legacy.v2.identity}`,JSON.stringify({first:true,firstClaim:{...claim(legacy),capital:undefined}}));
    assert.equal(saveFeedback(legacy,input).firstClaim.capital,undefined);assert.equal(e.grantCommunity(legacy,feedbackState(legacy).firstClaim),legacy);
    const invalid=e.create(19);assert.throws(()=>saveFeedback(invalid,{first:true,answers:[0],comment:''}));assert.equal(feedbackState(invalid).first,undefined);
  }finally{globalThis.localStorage=previous;}
});

test('a crash between company and growth writes resumes the same recovery transaction',()=>{
  const disk=storage();let fail=true;const flaky={...disk,setItem(k,v){if(fail&&k==='crossbound-operations-v1')throw Error('quota');disk.setItem(k,v);}};
  const n=e.create(1),company=e.serialize(n),ops=g.serialize(f.legacy.IG());
  assert.throws(()=>saveRecovery(flaky,company,ops));assert.ok(disk.getItem(recoveryJournal));
  fail=false;finishRecovery(flaky);assert.equal(disk.getItem('crossbound-company-v1'),company);assert.equal(disk.getItem('crossbound-operations-v1'),ops);assert.equal(disk.getItem(recoveryJournal),null);
});

test('market and studio shortage actions open recovery without spending, and stale attempt callbacks cannot commit',async()=>{
  let company=e.create(8),failure=null;company.cash=10;
  const actions={recover:quote=>{failure=cashFailure(company,quote);return !!failure;}};
  const store={snapshot:()=>({company,engine:e,actions,draft:{}})};
  const market=createMarketSession({store});assert.equal(market.snapshot().canRecover,true);
  const before=clone(company);assert.equal(await market.confirm(),false);assert.ok(failure);assert.deepEqual(clone(company),before);
  company={...company,attempt:1};await assert.rejects(market.confirm(),/状态已变化/);
  company={...prepare(e),cash:10,currentListing:null};const studio=createStudioSession({store});
  studio.pick('title','specs');studio.pick('image','annotated');studio.pick('detail','complete');
  assert.equal(studio.snapshot().canRecover,true);assert.equal(await studio.confirm(),false);assert.ok(failure.listing);assert.equal(company.cash,10);
  company={...company,attempt:1};await assert.rejects(studio.confirm(),/状态已变化/);
});

test('unfinished questionnaire answers survive close/reload without paying anything',()=>{
  const previous=globalThis.localStorage;globalThis.localStorage=storage();
  try{const n=e.create(24);saveFeedbackDraft(n,{answers:[1,2],comment:'建议草稿'});assert.deepEqual(feedbackDraft(n),{answers:[1,2],comment:'建议草稿'});assert.equal(feedbackState(n).first,undefined);const saved=saveFeedback(n,{first:true,answers:[1,2,3],comment:''});assert.equal(saved.firstClaim.capital,10000);assert.deepEqual(feedbackDraft(n),{answers:[],comment:''});}finally{globalThis.localStorage=previous;}
});

test('a stranded historical v1.1 save can void its attempt and migrate without losing prior history or identity',()=>{
  const old=f.engine.next(finish(f.engine,prepare(f.engine))),n=f.engine.commit(old,{id:'singapore'});
  const restored=e.restartRound(n);assert.equal(restored.engineVersion,'v2');assert.equal(restored.cash,old.cash);assert.equal(restored.round,old.round);assert.deepEqual(restored.history,old.history);assert.equal(restored.v2.collectionIdentity,`legacy-${n.runSeed}`);
  assert.ok(e.deserialize(e.serialize(restored)));
  const paid=e.grantCommunity(restored,{...claim(restored),capital:10000});assert.equal(paid.cash,old.cash+10000);assert.equal(e.restartRound(paid).cash,paid.cash);
});
