import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './crossbound-v11-fixture.mjs';
import {createCrossboundV2} from '../public/previews/crossbound/v2/model.js';
import {createMarketSession} from '../public/previews/crossbound/v3/market/session.js';

const engine=createCrossboundV2(fixture().adapter);
function setup(patch={},refuse=''){
  let company={...engine.create(20261103),...patch},choice=null,commits=0,next=null;
  const actions={setCompany(c){if(refuse!=='platform')company=c;},select(id){if(refuse!=='selection')choice={id};},commit(){commits++;if(refuse!=='commit')company=engine.commit(company,{id:choice.id});}};
  const store={snapshot:()=>({company,choice,engine,actions}),waitFor:async check=>check(store.snapshot())?store.snapshot():null};
  const session=createMarketSession({store,onNext:id=>{next=id;}});
  return {session,store,change(p){company={...company,...p};},get commits(){return commits;},get next(){return next;}};
}
test('market model uses live company, engine forecasts and all twelve markets',()=>{
  const h=setup(),s=h.session.snapshot(),c=h.store.snapshot().company;
  assert.equal(s.cash,c.cash);assert.equal(s.round,c.round);assert.equal(s.markets.length,12);
  const row=s.markets.find(m=>m.id==='singapore');assert.equal(row.fee,360);assert.equal(row.entered,false);
  const forecast=engine.simulate({...c,marketId:row.id,productId:engine.products[0].id},'mean');
  assert.equal(row.visits,forecast.visitors);assert.equal(row.cap,forecast.capacity);
});
test('draft changes do not mutate the game; every platform charges the real quote once',async()=>{
  for(const platform of ['tiktok','amazon','direct']){
    const h=setup(),before=structuredClone(h.store.snapshot().company);
    h.session.pickMarket('london');h.session.pickPlatform(platform);
    assert.deepEqual(structuredClone(h.store.snapshot().company),before);assert.equal(h.commits,0);
    const cost=h.session.snapshot().cost;
    const first=h.session.confirm(),duplicate=h.session.confirm();assert.equal(await duplicate,false);assert.equal(await first,true);
    const after=h.store.snapshot().company;assert.equal(after.cash,before.cash-cost);assert.equal(after.stage,1);assert.equal(after.marketId,'london');assert.equal(engine.config(after).platform,platform);assert.equal(h.commits,1);assert.equal(h.next,'w1');
    await assert.rejects(h.session.confirm(),/状态已变化/);assert.equal(h.commits,1);
  }
});
test('revisited market is free; built direct shop is free; Amazon fee recurs',()=>{
  const initial=engine.create(1),h=setup({visitedMarkets:['singapore'],v2:{...initial.v2,openedPlatforms:['direct','amazon']}});
  h.session.pickMarket('singapore');h.session.pickPlatform('direct');assert.equal(h.session.snapshot().cost,0);
  assert.equal(h.session.snapshot().markets[0].entered,true);
  h.session.pickPlatform('amazon');assert.equal(h.session.snapshot().cost,39);
});
test('insufficient cash and carry-effect market restriction cannot commit',async()=>{
  const poor=setup({cash:10});assert.equal(poor.session.snapshot().canConfirm,false);await assert.rejects(poor.session.confirm(),/现金不足/);assert.equal(poor.commits,0);
  const h=setup({carryEffect:{newMarket:true,previousMarket:'singapore'}});assert.throws(()=>h.session.pickMarket('singapore'),/另一个/);
  assert.equal(h.session.snapshot().markets.find(m=>m.id==='singapore').disabled,true);assert.notEqual(h.session.state.market,'singapore');
});
test('rejected configuration, selection and commit recover without advancing',async()=>{
  for(const refuse of ['platform','selection','commit']){
    const h=setup({},refuse);h.session.pickPlatform('amazon');await assert.rejects(h.session.confirm());
    assert.equal(h.store.snapshot().company.stage,0);assert.equal(h.session.state.busy,false);assert.equal(h.next,null);
  }
});
test('changed round and disposed scene reject stale confirmations',async()=>{
  const h=setup();h.change({round:2});await assert.rejects(h.session.confirm(),/状态已变化/);assert.equal(h.commits,0);
  const closed=setup();const pending=closed.session.confirm();closed.session.dispose();await assert.rejects(pending,/状态已变化/);assert.equal(closed.commits,0);
});
test('cash and fee changes during asynchronous selection are rechecked before commitment',async()=>{
  for(const patch of [{cash:0},{visitedMarkets:['singapore']}]){
    const h=setup();h.session.pickMarket('singapore');
    h.store.waitFor=async check=>{h.change(patch);return check(h.store.snapshot())?h.store.snapshot():null;};
    await assert.rejects(h.session.confirm(),/已变化/);assert.equal(h.commits,0);assert.equal(h.next,null);
  }
});
