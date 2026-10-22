import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,prepare,finish,FULL} from './crossbound-v11-fixture.mjs';
import {createCrossboundV2} from '../public/previews/crossbound/v2/model.js';
import {BALANCE_VERSION,acquisitionRisk} from '../public/previews/crossbound/v11/balance.js';
import {goal,GOAL_VERSION,financialStatements,recommend,recommendLowTicketPromotion} from '../public/previews/crossbound/v2/release.js';

const f=fixture(), engines=[f.engine,createCrossboundV2(f.adapter)];
function scenario(e,market,product,channel,factor=1) {
  const p=e.products.find(p=>p.id===product);
  let n=prepare(e,{market,product,quantity:800,price:Math.round(p.basePrice*factor)});
  assert.equal(n.stage,3);
  n=e.commit(n,{id:channel});
  assert.equal(n.stage,4);
  n.fulfillmentPlanId='express';
  return {n,result:e.simulate(n,'mean')};
}
test('REQ-049: 48 normal mean strategies profit in both engines; extreme-price controls lose',()=>{
  for(const e of engines) {
    for(const market of ['singapore','london','los-angeles','tokyo'])
      for(const product of ['tech','care'])for(const channel of ['content','ads','creator']) {
        const {result:r}=scenario(e,market,product,channel);
        assert.ok(r.profit>0,`${r.modelVersion}/${market}/${product}/${channel}: ${r.profit}`);
        assert.ok(r.arrivedUnits>=Math.floor(r.unitsToBuy*.75));
      }
    for(const factor of [.7,1.8])assert.ok(scenario(e,'los-angeles','care','ads',factor).result.profit<0);
    assert.ok(scenario(e,'los-angeles','care','ads',1.5).result.profit>0);
  }
});
test('new fees, default budgets, goals and first-mile choice are visible and charged consistently',()=>{
  for(const e of engines) {
    let n=e.create(12);
    assert.equal(n.balanceVersion,BALANCE_VERSION);
    assert.equal(goal(n).target,250);
    assert.equal(goal({...n,round:5}).target,450);
    assert.equal(goal({...n,round:3,balanceVersion:undefined}).target,400);
    assert.equal(e.options(n,'markets').find(m=>m.id==='los-angeles').launchCost,720);
    assert.equal(e.options(n,'fulfillment').find(m=>m.id==='express').costPerOrder,6.5);
    for(const [id,budget] of [['content',900],['ads',2200],['creator',1800]]) {
      const s=scenario(e,'singapore','tech',id);
      assert.equal(s.n.trafficBudget,budget);
      assert.equal(s.n.ledger.findLast(row=>row.category==='marketing').cashDelta,-budget);
    }
    if(n.v2)assert.equal(e.config(n).firstMile,'mixed');
    n=e.commit(n,{id:'los-angeles'});
    assert.equal(n.ledger.find(row=>row.category==='launch').cashDelta,-720);
  }
});
test('old active rounds retain economics, replay and history; next round adopts calibration',()=>{
  for(const e of engines) {
    let n=e.create(12345);
    delete n.balanceVersion;delete n.roundStart.balanceVersion;
    if(n.v2){n.v2.config.firstMile='air';n.roundStart.v2.config.firstMile='air';}
    for(const d of [{id:'los-angeles'},{id:'tech'},{id:'pilot',quantity:800,price:45,supplierId:'standard'}])n=e.commit(n,d);
    n=e.publish(n,FULL);n=e.commit(n,{id:'ads'});
    const before=e.simulate(n), restored=e.deserialize(e.serialize(n));
    assert.equal(restored.balanceVersion,undefined);
    assert.deepEqual(e.simulate(restored),before);
    assert.equal(before.launchCost,1200);assert.equal(before.budget,3600);
    assert.equal(before.baseConversion,.025*(e.markets.find(m=>m.id==='los-angeles').demandFactor)*(before.fit??f.adapter.fit(e.products.find(p=>p.id==='tech'),'los-angeles')));
    n=e.commit(n,{id:'express'});n=e.commit(n,{id:'retain'});
    const replay=e.commit(e.rollback(n,4),{id:'express'});
    assert.equal(replay.report.profit,n.report.profit);
    const next=e.next(n);
    assert.deepEqual(next.history,n.history);
    assert.equal(next.balanceVersion,BALANCE_VERSION);
    assert.equal(goal(next).target,300);
    assert.equal(e.previous(next).balanceVersion,undefined);
    const rewound=e.deserialize(e.serialize(e.rollback(n,0)));
    assert.equal(rewound.balanceVersion,undefined);
    assert.equal(e.previous(next).rulesLocked,true);
  }
});
test('calibrated replay and financial statements reconcile without duplicate income',()=>{
  const e=engines[1];let n=finish(e,prepare(e,{market:'london',quantity:800,price:45}),'ads',2200);
  assert.equal(n.stage,6);assert.deepEqual(financialStatements(n,n.report).checks,[true,true,true]);
  const report=n.report;
  n=e.rollback(n,3);n=e.publish(n,FULL);n=finish(e,n,'ads',2200);
  assert.equal(n.report.profit,report.profit);assert.equal(n.report.orders,report.orders);
  assert.equal(n.cash,report.cash);
  const prior=structuredClone(n.history);n=e.next(n);
  assert.deepEqual(n.history,prior);
  assert.equal(n.v2.config.firstMile,'mixed');
});
test('CAC warning catches low-margin paid traffic and never blocks an affordable plan',()=>{
  const e=engines[1];let n=prepare(e,{market:'london',product:'living',quantity:800,price:29});
  const preview=e.preview(n,{id:'creator'});
  assert.ok(preview.acquisitionBounds.find(r=>r.warning && r.id==='creator'));
  assert.equal(preview.affordable,true);
  assert.equal(e.commit(n,{id:'creator'}).stage,4);
  const r=scenario(e,'london','living','creator').result;
  assert.ok(r.profit<0);assert.ok(acquisitionRisk(r)[0].warning);
  assert.equal(goal({...r,round:1,goalVersion:GOAL_VERSION}).target,250);
});


test('low-ticket recommendations profit across 12 markets and 3 channels, without changing manual plans',()=>{
  for(const e of engines)for(const market of e.markets)for(const product of ['living','bottle'])for(const channel of ['ads','creator','content']) {
    let n=e.commit(e.commit(e.create(12345),{id:market.id}),{id:product});
    const stock=recommend(e,n);
    assert.match(stock.source,/预留运费/);
    n=e.commit(n,stock.choice);n=e.publish(n,recommend(e,n).listing);
    const p=e.products.find(p=>p.id===product),category=p.category;
    const promotionChoice=channel==='creator'?{id:'vertical',category}:channel==='ads'?{id:['electronics','home'].includes(category)?'benefit':'scene'}:{id:category==='electronics'?'review':category==='lifestyle'?'unboxing':'tutorial'};
    const input={id:channel,budget:1800,promotionChoice};
    const selected=recommendLowTicketPromotion(e,n,input);
    assert.equal(input.budget,1800);
    n=e.commit(n,selected);n.fulfillmentPlanId='standard';
    const mean=e.simulate(n,'mean');
    assert.ok(mean.profit>0,`${n.engineVersion}/${market.id}/${product}/${channel}: ${mean.profit}`);
    assert.ok(n.price<=p.basePrice*1.3);
    assert.equal(mean.marketingCost,selected.budget);
    n=e.commit(n,{id:'standard'});n=e.commit(n,{id:'retain'});
    assert.equal(n.stage,6);
    if(n.v2)assert.deepEqual(financialStatements(n,n.report).checks,[true,true,true]);
  }
});
test('low-ticket default path stays profitable under five fixed seeds and preserves player overrides',()=>{
  const e=engines[1];
  for(const seed of [1,2,3,42,12345])for(const market of e.markets)for(const id of ['living','bottle']) {
    let n=e.commit(e.commit(e.create(seed),{id:market.id}),{id});
    n=e.commit(n,recommend(e,n).choice);n=e.publish(n,recommend(e,n).listing);
    const manual=e.commit(n,{id:'ads',budget:7000});
    assert.equal(manual.trafficBudget,7000);
    n=e.commit(n,recommend(e,n).choice);n=e.commit(n,{id:'standard'});n=e.commit(n,{id:'retain'});
    assert.ok(n.report.profit>0,`${seed}/${market.id}/${id}: ${n.report.profit}`);
  }
});
