import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,FULL} from './crossbound-v11-fixture.mjs';
import {createCrossboundV2} from '../public/previews/crossbound/v2/model.js';
import {createStudioSession} from '../public/previews/crossbound/v3/studio/session.js';
const engine=createCrossboundV2(fixture().adapter);
function setup(patch={},refuse=''){
  let company={...engine.create(123),stage:3,productId:'fan',marketId:'singapore',cash:12640,quantity:600,price:39,...patch},draft={},publishes=0,next=null;
  const map=new Map(),storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)};
  const actions={setListing(v){if(refuse!=='draft')draft=v;},publishListing(){publishes++;if(refuse!=='publish')company=engine.publish(company,draft);},setCompany(c){company=c;}};
  const store={snapshot:()=>({company,engine,actions,draft:{listing:draft}}),waitFor:async fn=>fn(store.snapshot())?store.snapshot():null};
  const make=()=>createStudioSession({store,storage,onNext:id=>{next=id;}}),session=make();
  return{session,store,make,change:p=>{company={...company,...p};},get publishes(){return publishes;},get next(){return next;}};
}
function full(session){session.pick('title','specs');session.pick('image','annotated');session.pick('detail','complete');}
test('all product images, prices and option quotes use the live catalog and engine',()=>{
  for(const id of ['fan','earbuds','lamp','bottle','speaker','living']){
    const p=engine.products.find(p=>p.id===id),h=setup({productId:id,price:p.basePrice});full(h.session);
    const m=h.session.snapshot(),q=engine.listingQuote(h.store.snapshot().company,FULL);
    assert.equal(m.product.name,p.name);assert.equal(m.product.price,p.basePrice);assert.match(m.product.image,new RegExp(id+'\\.png$'));assert.equal(m.score,q.score);assert.equal(m.cost,q.cost);assert.equal(m.intent,q.conversionFactor);
  }
});
test('incomplete choices cannot publish; drafts survive leaving and reopening without spending',async()=>{
  const h=setup();assert.equal(h.session.snapshot().canConfirm,false);h.session.pick('title','use');
  await assert.rejects(h.session.confirm(),/还差/);assert.equal(h.publishes,0);assert.equal(h.store.snapshot().company.cash,12640);
  h.session.dispose();const reopened=h.make();assert.equal(reopened.snapshot().picks.title,'use');assert.equal(reopened.snapshot().picks.image,null);
});
test('publish charges exactly once, locks choices, and advances only on next action',async()=>{
  const h=setup();full(h.session);const cost=h.session.snapshot().cost;
  const first=h.session.confirm(),second=h.session.confirm();assert.equal(await second,false);await first;
  assert.equal(h.publishes,1);assert.equal(h.store.snapshot().company.cash,12640-cost);assert.equal(h.session.snapshot().published,true);assert.equal(h.next,null);
  assert.equal(h.session.pick('title','name'),false);await h.session.confirm();assert.equal(h.next,'w4');assert.equal(h.publishes,1);
});
test('insufficient cash, invalid options, stale round and disposed session never publish',async()=>{
  const poor=setup({cash:1});full(poor.session);assert.equal(poor.session.snapshot().canConfirm,false);await assert.rejects(poor.session.confirm(),/现金/);assert.equal(poor.publishes,0);
  const invalid=setup();assert.throws(()=>invalid.session.pick('title','fake'),/无效/);
  const stale=setup();full(stale.session);stale.change({round:2});await assert.rejects(stale.session.confirm(),/状态已变化/);assert.equal(stale.publishes,0);
  const closed=setup();full(closed.session);closed.session.dispose();await assert.rejects(closed.session.confirm(),/状态已变化/);
});
test('failed draft or publish acknowledgment recovers the busy state without advancing',async()=>{
  for(const refuse of ['draft','publish']){const h=setup({},refuse);full(h.session);await assert.rejects(h.session.confirm());assert.equal(h.session.state.busy,false);assert.equal(h.next,null);assert.equal(h.store.snapshot().company.cash,12640);}
});
test('cash is revalidated after asynchronous draft selection',async()=>{
  const h=setup();full(h.session);h.store.waitFor=async fn=>{h.change({cash:0});return fn(h.store.snapshot())?h.store.snapshot():null;};
  await assert.rejects(h.session.confirm(),/已变化/);assert.equal(h.publishes,0);
});
test('existing listings retain reuse, localization and once-per-round optimization',async()=>{
  const base=setup();full(base.session);await base.session.confirm();const c=base.store.snapshot().company;
  const h=setup({...c,round:2,currentListing:null});h.session.reuse(true);assert.equal(h.session.snapshot().cost,0);assert.equal(h.session.snapshot().score,95);
  await h.session.confirm();assert.equal(h.publishes,1);
  const overseas=setup({...c,round:2,marketId:'london',currentListing:null});overseas.session.reuse(true);assert.equal(overseas.session.snapshot().cost,100);
  const basic=engine.publish({...c,currentListing:null},{...FULL,titleId:'name',imageId:'product',detailId:'summary'});
  const opt=setup({...basic,round:3,currentListing:null});assert.equal(opt.session.snapshot().canOptimize,true);const cash=opt.store.snapshot().company.cash;
  assert.equal(opt.session.optimize(),true);assert.equal(opt.store.snapshot().company.cash,cash-300);assert.equal(opt.session.optimize(),false);
});
