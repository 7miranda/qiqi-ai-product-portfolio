import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,prepare} from './crossbound-v11-fixture.mjs';
import {createCrossboundV2} from '../public/previews/crossbound/v2/model.js';
import {createLogisticsSession} from '../public/previews/crossbound/v3/logistics/session.js';
const engine=createCrossboundV2(fixture().adapter);
function setup(patch={},refuse=''){
  let company={...engine.commit(prepare(engine,{seed:123,product:'fan',quantity:600,price:39}),{id:'ads',budget:600,promotionChoice:{id:'benefit'}}),cash:50000,...patch},choice={id:'standard'},commits=0,recoveries=0;
  const map=new Map(),storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)};
  const actions={setCompany(c){if(refuse!=='route')company=c;},choose(id){if(refuse!=='choice')choice={id};},commit(){commits++;if(refuse!=='commit')company=engine.commit(company,choice);},recover(){recoveries++;},close(){}};
  const store={snapshot:()=>({company,choice,engine,actions}),waitFor:async fn=>fn(store.snapshot())?store.snapshot():null};
  const make=()=>createLogisticsSession({store,storage}),session=make();
  return{store,session,make,change:p=>company={...company,...p},get commits(){return commits;},get recoveries(){return recoveries;}};
}
test('all three routes quote the real engine, with changing arrival stock and current destination',()=>{
  for(const market of engine.markets){const h=setup({marketId:market.id}),m=h.session.snapshot();assert.equal(m.destination,market.name);for(let i=0;i<3;i++){h.session.pick('route',i);const x=h.session.snapshot(),q=engine.preview(engine.configure(h.store.snapshot().company,{firstMile:x.routes[i].id}),{id:'standard'});assert.equal(x.firstMileCost,q.firstMileCost);assert.equal(x.available,q.units);assert.equal(x.orders,q.orders);assert.equal(x.cashNeed,q.cashNeed);}assert.ok(m.routes[0].arrived<m.routes[2].arrived);}
});
test('confirming a route saves progress without charging; reopening resumes overseas warehouse',async()=>{
  const h=setup();h.session.pick('route',2);await h.session.confirmRoute();assert.equal(h.store.snapshot().company.cash,50000);assert.equal(h.commits,0);h.session.dispose();const reopened=h.make();assert.equal(reopened.snapshot().arrived,true);assert.equal(reopened.snapshot().route,2);
  h.change({round:2});assert.equal(h.make().snapshot().arrived,false);
});
test('dispatch uses original commit once and exposes actual report, stock return fee and receivables',async()=>{
  const h=setup();await h.session.confirmRoute();h.session.pick('line',2);const before=h.store.snapshot().company,expected=engine.commit(before,{id:'express'});
  const one=h.session.dispatch(),two=h.session.dispatch();assert.equal(await two,false);await one;
  assert.equal(h.commits,1);assert.equal(h.store.snapshot().company.cash,expected.cash);assert.deepEqual(h.session.snapshot().report,expected.report);assert.equal(h.session.snapshot().orders,expected.report.orders);assert.equal(h.store.snapshot().company.v2.receivables[0].amount,expected.report.netRevenue);await assert.rejects(h.session.dispatch(),/状态已变化/);assert.equal(h.commits,1);
});
test('insufficient cash and a cash change during acknowledgment never commit',async()=>{
  const h=setup({cash:1});await h.session.confirmRoute();await assert.rejects(h.session.dispatch(),/现金不足/);assert.equal(h.commits,0);assert.equal(h.recoveries,1);assert.equal(h.session.state.busy,false);
  const race=setup();await race.session.confirmRoute();race.store.waitFor=async fn=>{race.change({cash:0});return fn(race.store.snapshot())?race.store.snapshot():null;};await assert.rejects(race.session.dispatch(),/现金不足/);assert.equal(race.commits,0);
});
test('failed acknowledgment unlocks; stale and disposed sessions cannot write',async()=>{
  const h=setup({},'choice');await h.session.confirmRoute();h.session.pick('line',0);await assert.rejects(h.session.dispatch(),/尚未保存/);assert.equal(h.session.state.busy,false);assert.equal(h.commits,0);
  const r=setup({},'route');r.session.pick('route',0);await assert.rejects(r.session.confirmRoute(),/尚未保存/);assert.equal(r.session.snapshot().arrived,false);
  const stale=setup();stale.change({attempt:1});await assert.rejects(stale.session.confirmRoute(),/状态已变化/);
  const closed=setup();closed.session.dispose();await assert.rejects(closed.session.confirmRoute(),/状态已变化/);
});
