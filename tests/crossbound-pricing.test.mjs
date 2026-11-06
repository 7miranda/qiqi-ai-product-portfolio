import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fixture,FULL} from './crossbound-v11-fixture.mjs';
import {createCrossboundV2} from '../public/previews/crossbound/v2/model.js';
import {createPricingSession,DRAFT_KEY} from '../public/previews/crossbound/v3/pricing/session.js';
const {adapter,legacy}=fixture(),engine=createCrossboundV2(adapter);
function setup({product='fan',supplier='standard',patch={},refuse=''}={}){
  let company=engine.commit(engine.commit(engine.create(123),{id:'singapore'}),{id:product});company={...company,...patch};
  let choice=adapter.stocks[0],draft={price:engine.products.find(p=>p.id===product).basePrice,quantity:400},commits=0,next=null,recoveries=0;
  const map=new Map(),storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
  const input=()=>({id:choice.id,...draft,supplierId:supplier,supplyRule:'v1'});
  const actions={choose(id){if(refuse==='choose')return;choice=adapter.stocks.find(o=>o.id===id);draft={quantity:choice.quantity,price:Math.round(engine.products.find(p=>p.id===product).basePrice*choice.priceFactor)};},setPrice(v){if(refuse!=='draft')draft.price=v;},setQuantity(v){if(refuse!=='draft')draft.quantity=v;},setSupplier(v){supplier=v;},commit(){commits++;if(refuse!=='commit')company=engine.commit(company,input());},recover(){recoveries++;return true;}};
  const store={snapshot:()=>({company,engine,actions,draft,choice,supplier,options:adapter.stocks,quotes:id=>legacy.R5(engine.products.find(p=>p.id===id)),preview:engine.preview(company,input())}),waitFor:async fn=>fn(store.snapshot())?store.snapshot():null,send(){}};
  const make=()=>createPricingSession({store,storage,onNext:id=>{next=id;}}),session=make();
  return {session,store,make,map,storage,change:p=>{company={...company,...p};},resetSupplier:()=>{supplier='standard';},get commits(){return commits;},get next(){return next;},get recoveries(){return recoveries;}};
}
test('all catalog products use negotiated suppliers and authoritative engine quotes',()=>{
  for(const product of engine.products){const h=setup({product:product.id});const m=h.session.snapshot();assert.equal(m.product.name,product.name);assert.deepEqual(m.quote,engine.preview(h.store.snapshot().company,m.draft));assert.equal(m.plans.length,adapter.stocks.length);assert.equal(m.bounds.base,product.basePrice);}
});
test('cards and sliders only change a draft; leaving and refresh restore price, quantity and negotiated supplier',()=>{
  const h=setup({supplier:'fast'}),cash=h.store.snapshot().company.cash;
  h.session.edit('plan','scale');h.session.edit('price',42);h.session.edit('quantity',700);
  assert.equal(h.store.snapshot().company.cash,cash);assert.equal(h.commits,0);
  h.session.dispose();h.resetSupplier();const restored=h.make().snapshot();assert.equal(restored.draft.price,42);assert.equal(restored.draft.quantity,700);assert.equal(restored.draft.supplierId,'fast');
});
test('upstream negotiated quote survives refresh before the first pricing-room visit',()=>{
  const h=setup();h.session.dispose();h.map.delete(DRAFT_KEY);
  h.map.set('crossbound-world-w1-v1',JSON.stringify({key:'123:1',product:'fan',supplier:'fast'}));
  assert.equal(h.make().snapshot().draft.supplierId,'fast');
});
test('double confirmation writes exactly one purchase, preserves upstream decisions, and opens studio',async()=>{
  const h=setup({supplier:'fast'});h.session.edit('quantity',600);h.session.edit('price',42);
  const before=structuredClone(h.store.snapshot().company),q=h.session.snapshot().quote;
  const first=h.session.confirm();assert.equal(await h.session.confirm(),false);assert.equal(await first,true);
  const after=h.store.snapshot().company;
  assert.equal(h.commits,1);assert.equal(after.stage,3);assert.equal(h.next,'w3');assert.equal(after.cash,Math.round((before.cash+q.cashDelta)*100)/100);
  assert.equal(after.inventory.fan,q.unitsToBuy);assert.equal(after.price,42);assert.equal(after.quantity,600);assert.equal(after.supplierId,'fast');assert.equal(after.marketId,before.marketId);
  assert.equal(h.map.has(DRAFT_KEY),false);
  const listing=engine.publish(after,FULL);assert.ok(listing.currentListing);assert.equal(listing.quantity,600);
  const promotion=engine.commit(listing,{id:'content',budget:900,promotionChoice:{id:'tutorial'}});assert.equal(promotion.stage,4);
  const shipped=engine.commit(promotion,{id:'express'});assert.equal(shipped.stage,5);assert.ok(shipped.report);assert.equal(shipped.report.price,42);
});
test('insufficient downstream reserves use recovery and never debit money',async()=>{
  const h=setup(),q=h.session.snapshot().quote;h.change({cash:-q.cashDelta+1});assert.equal(h.session.snapshot().canConfirm,false);assert.equal(h.session.snapshot().canRecover,true);
  assert.equal(await h.session.confirm(),false);assert.equal(h.commits,0);assert.equal(h.recoveries,1);assert.equal(h.next,null);
});
test('MOQ failure is not bankruptcy and cannot commit',async()=>{
  const h=setup({supplier:'factory'});h.session.edit('quantity',200);assert.equal(h.session.snapshot().canConfirm,false);assert.equal(h.session.snapshot().canRecover,false);
  await assert.rejects(h.session.confirm(),/至少|起订|现金/);assert.equal(h.commits,0);assert.equal(h.recoveries,0);
});
test('invalid numeric inputs and unknown plans never reach the engine action',()=>{
  const h=setup();for(const [field,value] of [['price',NaN],['price',1],['quantity',1601],['quantity',200.5],['plan','fake'],['supplier','factory']])assert.throws(()=>h.session.edit(field,value));assert.equal(h.commits,0);
});
test('round retries and different company identities cannot reuse stale drafts or commit',async()=>{
  for(const patch of [{round:2},{attempt:1},{v2:{...setup().store.snapshot().company.v2,identity:'different-company'}}]){
    const h=setup();h.session.edit('price',42);h.change(patch);await assert.rejects(h.session.confirm(),/状态已变化/);assert.equal(h.make().snapshot().draft.price,39);assert.equal(h.commits,0);
  }
});
test('missing draft/commit acknowledgments recover the busy state without advancing',async()=>{
  for(const refuse of ['choose','draft','commit']){const h=setup({refuse});h.session.edit('plan','scale');h.session.edit('price',43);await assert.rejects(h.session.confirm());assert.equal(h.session.state.busy,false);assert.equal(h.next,null);assert.equal(h.store.snapshot().company.stage,2);}
});
test('a changed review, intervening funding change and disposed async session cannot spend',async()=>{
  const h=setup(),review=JSON.stringify(h.session.snapshot().quote);h.session.edit('price',43);await assert.rejects(h.session.confirm(review),/报价已变化/);assert.equal(h.commits,0);
  const funding=setup();funding.store.waitFor=async fn=>{funding.change({cash:0});return fn(funding.store.snapshot())?funding.store.snapshot():null;};await assert.rejects(funding.session.confirm(),/报价或资金/);assert.equal(funding.commits,0);
  const closed=setup();closed.store.waitFor=async fn=>{closed.session.dispose();return fn(closed.store.snapshot())?closed.store.snapshot():null;};await assert.rejects(closed.session.confirm(),/状态已变化/);assert.equal(closed.commits,0);
});
test('W2 has a dedicated route, guarded legacy mount, and bundled release assets',()=>{
  const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
  const boot=read('public/previews/crossbound/v3/world/boot.js');assert.match(boot,/id==='w2'\?loadPricing/);assert.match(boot,/id==='w2'\?module.mountPricing/);
  const old=read('public/previews/crossbound/v3/world/world.js');assert.doesNotMatch(old,/buildFinance/);assert.match(old,/if\(id==='w2'\)\{onNext/);
  assert.match(read('scripts/crossbound-v11/build.mjs'),/v3\/pricing/);
  const frame=read('public/previews/crossbound/v3/pricing/frame.js');assert.doesNotMatch(frame,/188783|Math\.exp|预演|state\.cash/);
});

test('high-ticket stock plans fit opening cash; an oversized draft offers reduction before recovery',()=>{
  const h=setup({product:'luma-bed',patch:{cash:49361,marketId:'london'}});
  const initial=h.session.snapshot();assert.equal(initial.canConfirm,true);assert.ok(initial.draft.quantity<400);
  for(const p of initial.plans){h.session.edit('plan',p.id);assert.equal(h.session.snapshot().canConfirm,true);}
  h.session.edit('plan','pilot');h.session.edit('quantity',500);h.session.edit('price',307);
  const over=h.session.snapshot();assert.equal(over.canConfirm,false);assert.equal(over.canRecover,false);assert.ok(over.adjustQuantity>=200);
  assert.equal(h.session.recover(),false);assert.equal(h.recoveries,0);assert.equal(h.commits,0);
  h.session.edit('quantity',over.adjustQuantity);assert.equal(h.session.snapshot().canConfirm,true);assert.equal(h.store.snapshot().company.cash,49361);
});

test('unchanged quotes are reused but cash and draft changes invalidate the pricing cache',()=>{
  const h=setup({product:'luma-bed'});let state=h.store.snapshot(),calls=0;
  state={...state,engine:{...engine,preview(...args){calls++;return engine.preview(...args);}}};
  const s=createPricingSession({store:{snapshot:()=>state}});s.snapshot();const warmed=calls;
  for(let i=0;i<100;i++)s.snapshot();assert.equal(calls,warmed);
  s.edit('price',310);s.snapshot();assert.ok(calls>warmed);const edited=calls;
  state={...state,company:{...state.company,cash:1}};assert.equal(s.snapshot().canConfirm,false);assert.ok(calls>edited);
});
