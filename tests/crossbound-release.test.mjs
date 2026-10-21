import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,prepare,finish} from './crossbound-v11-fixture.mjs';
import {createCrossboundV2} from '../public/previews/crossbound/v2/model.js';
import {GOAL_VERSION,goal,orderTarget,rank,seasonRank,financialStatements,recommend} from '../public/previews/crossbound/v2/release.js';
import {assessment,passport} from '../public/previews/crossbound/v2/progress.js';
import {validComment,csv} from '../public/previews/crossbound/v2/records.js';

const f=fixture(),engine=createCrossboundV2(f.adapter);
test('new goals accept either channel and preserve historical badge rules',()=>{
  assert.deepEqual([1,2,3,4,5,9].map(orderTarget),[300,350,400,450,500,500]);
  const base={goalVersion:GOAL_VERSION,round:3,keptOrders:188,profit:12980,refunds:8};
  assert.equal(goal(base).tier,'silver');
  assert.equal(goal({...base,keptOrders:400}).tier,'gold');
  assert.equal(goal({...base,keptOrders:400,profit:-1}).tier,'bronze');
  assert.equal(goal({...base,goalVersion:undefined}).passed,false);
  assert.equal(goal({...base,profit:4999.99}).passed,false);
});
test('financial statements reconcile all countries, terms, debt, collection and clearance',()=>{
  for(const market of engine.markets)for(const terms of ['cash','credit']){
    let n=engine.create(12345);n=engine.configure(n,{terms});
    for(const d of [{id:market.id},{id:'tech'},{id:'pilot',quantity:1200,price:45,supplierId:'standard'}])n=engine.commit(n,d);
    n=engine.publish(n,{rule:'listing-v1',titleId:'specs',imageId:'annotated',detailId:'complete',mode:'build'});
    n=finish(engine,n);const a=financialStatements(n,n.report);
    assert.deepEqual(a.checks,[true,true,true],`${market.id}/${terms}`);
    const old=structuredClone(a.closing);let next=engine.next(n);
    assert.deepEqual(financialStatements(next,next.history[0]).closing,old);
    n=engine.clearStock(n,'tech');assert.deepEqual(financialStatements(n,n.report).checks,[true,true,true]);
  }
  let n=engine.act(engine.create(12345),{type:'loan',amount:5000});
  for(const d of [{id:'singapore'},{id:'tech'},{id:'pilot',quantity:600,price:45,supplierId:'standard'}])n=engine.commit(n,d);
  n=engine.publish(n,recommend(engine,n).listing);n=finish(engine,n);
  assert.deepEqual(financialStatements(n,n.report).checks,[true,true,true]);
});
test('recommended six-step path is affordable, persisted as assisted, and can continue',()=>{
  let n=engine.create(12345);
  for(let round=1;round<=3;round++){
    for(let stage=0;stage<6;stage++){
      const rec=recommend(engine,n);
      if(stage===3)n=engine.publish(n,rec.listing);
      const before=n.stage;n=engine.commit(n,{...rec.choice,used_default:true});
      assert.equal(n.stage,before+1,`round ${round}, step ${stage}: ${n.feedback?.body}`);
    }
    assert.equal(n.report.decisions.every(d=>d.used_default===true),true);
    assert.ok(engine.deserialize(engine.serialize(n)));
    if(round<3)n=engine.next(n);
  }
  const score=assessment(n,f.legacy.IG(),engine.markets,f.legacy.U5);
  assert.equal(score.assistedRounds,3);assert.equal(score.evidenceRounds,0);
  assert.ok(passport(n,engine.markets).countries.length===12);
});
test('round XP, community awards and monthly points survive reload without duplicate rewards',()=>{
  let ops=f.legacy.IG();const round={type:'round-growth',run:'test',round:1,month:'2026-10',xp:100,season:false};
  ops=f.growth.claimRound(ops,round);ops=f.growth.claimRound(ops,round);assert.equal(ops.xp,100);
  const event={type:'community',id:'first',run:'test',rounds:1,substantive:true};
  ops=f.growth.claimCommunity(ops,event);ops=f.growth.claimCommunity(ops,event);assert.equal(ops.research,70);
  const restored=f.growth.deserialize(f.growth.serialize(ops));assert.ok(restored);assert.equal(restored.xp,100);assert.equal(restored.research,70);
  assert.equal(rank({xp:14100}).level,10);assert.equal(rank({xp:8700}).level,9);
  assert.equal(seasonRank({...ops,history:[{...round,season:true}]},new Date(2026,9,21)).points,100);
  assert.equal(seasonRank({...ops,history:[{...round,season:true}]},new Date(2026,10,1)).points,0);
});
test('feedback limits and CSV export reject short comments and neutralize formula cells',()=>{
  assert.equal(validComment(''),true);assert.equal(validComment('太短'),false);assert.equal(validComment('建议把本轮的现金和利润差别讲得更清楚'),true);
  assert.equal(validComment('字'.repeat(101)),false);
  assert.ok(csv([{email:'=cmd()'}],['email']).includes("'=cmd()"));
});
test('untouched old rounds adopt new goals without rewriting historical reports',()=>{
  const n=engine.next(finish(engine,prepare(engine)));
  delete n.goalVersion;delete n.roundStart.goalVersion;
  const restored=engine.deserialize(engine.serialize(n));
  assert.equal(restored.goalVersion,GOAL_VERSION);assert.deepEqual(restored.history,n.history);
  const inProgress=engine.commit(n,{id:'singapore'});
  assert.equal(engine.deserialize(engine.serialize(inProgress)).goalVersion,undefined);
});
test('new trademark registrations protect their product and do not protect a different product',()=>{
  let n=engine.commit(engine.commit(engine.create(12345),{id:'singapore'}),{id:'tech'});
  n=engine.act(n,{type:'trademark'});
  assert.equal(engine.hasTrademark(n,'tech'),true);assert.equal(engine.hasTrademark(n,'fan'),false);
  const cash=n.cash;n=engine.act(n,{type:'trademark'});assert.equal(n.cash,cash);
  assert.equal(engine.hasTrademark(engine.deserialize(engine.serialize(n)),'tech'),true);
});
test('operating facilities can branch from the team and still replay their purchase ledger',()=>{
  f.legacy.r2.find(x=>x.id==='factory').requires='team';
  let ops=f.legacy.IG();
  for(let round=1;round<=5;round++)ops=f.growth.claimRound(ops,{type:'round-growth',run:'branch',round,month:'2026-10',xp:100,season:false});
  ops=f.growth.claimExploration(ops,{id:'explore:branch:world:gold',kind:'world',title:'测试收藏奖励',points:100});
  ops=f.legacy.Xse(ops,'team');ops=f.legacy.Xse(ops,'factory');
  assert.ok(ops.upgrades.includes('factory'));assert.equal(ops.upgrades.includes('lab'),false);
  assert.ok(f.growth.deserialize(f.growth.serialize(ops)));
});
