import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { fixture } from './crossbound-v11-fixture.mjs';
import { createCrossboundV2 } from '../public/previews/crossbound/v2/model.js';
import { createShowroomSession } from '../public/previews/crossbound/v3/showroom/session.js';
import { PICKS_KEY } from '../public/previews/crossbound/v3/world/logic.js';

const f=fixture(), engine=createCrossboundV2(f.adapter);
function setup({saved,refuse=false}={}){
  let company=engine.commit(engine.create(20261102),{id:'singapore'}),choice=null,supplier='standard',commits=0,next=null;
  const memory=new Map(saved?[[PICKS_KEY,JSON.stringify(saved)]]:[]);
  const actions={select(id){choice=engine.products.find(p=>p.id===id)||null;},commit(){commits++;if(!refuse){company=engine.commit(company,{id:choice?.id});supplier='standard';}},setSupplier(id){supplier=id;}};
  const store={snapshot:()=>({company,choice,supplier,options:engine.products,engine,actions,quotes:id=>f.legacy.R5(engine.products.find(p=>p.id===id))}),waitFor:async check=>check(store.snapshot())?store.snapshot():null};
  const session=createShowroomSession({store,storage:{getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)},onNext:id=>{next=id;}});
  return {session,store,memory,get commits(){return commits;},get next(){return next;},changeRound(){company={...company,round:company.round+1};}};
}

test('product selection is a per-round draft: no purchase, no stage advance; supplier confirmation uses engine once',async()=>{
  const h=setup(),before=structuredClone(h.store.snapshot().company);
  await h.session.choose('tech');
  assert.equal(h.store.snapshot().company.stage,1);assert.equal(h.commits,0);
  assert.equal(h.store.snapshot().company.cash,before.cash);assert.deepEqual(h.store.snapshot().company.ledger,before.ledger);
  assert.equal(JSON.parse(h.memory.get(PICKS_KEY)).product,'tech');
  await h.session.confirmSupplier('fast');
  assert.equal(h.commits,1);assert.equal(h.store.snapshot().company.stage,2);assert.equal(h.store.snapshot().company.productId,'tech');
  assert.equal(h.store.snapshot().supplier,'fast');assert.equal(h.next,'w2');
  assert.equal(h.store.snapshot().company.cash,before.cash,'stock procurement still belongs to W2');
});

test('replacing and cancelling a draft keeps a single product and clears the supplier',async()=>{
  const h=setup();await h.session.choose('tech');await h.session.choose('lamp');
  assert.equal(h.session.state.product,'lamp');assert.equal(h.session.state.supplier,null);
  h.session.cancel();assert.equal(h.session.state.product,null);assert.equal(h.store.snapshot().choice,null);assert.equal(h.commits,0);
});

test('restores only an eligible product from this run and round; demo storage is never used',async()=>{
  const start=setup().store.snapshot().company;
  const same=setup({saved:{key:`${start.runSeed}:${start.round}`,product:'tech',supplier:'fast'}});
  assert.equal(same.session.state.product,'tech');assert.equal(same.session.state.supplier,'fast');
  const old=setup({saved:{key:'another:1',product:'tech',supplier:'fast'}});assert.equal(old.session.state.product,null);
  const invalid=setup({saved:{key:`${start.runSeed}:${start.round}`,product:'fake-placeholder',supplier:'fast'}});assert.equal(invalid.session.state.product,null);
});

test('rejects an invalid quote, prevents repeated confirmation and recovers from a rejected engine commit',async()=>{
  const h=setup();await h.session.choose('tech');await assert.rejects(h.session.confirmSupplier('fake'),/供货报价/);
  const first=h.session.confirmSupplier('factory'),second=h.session.confirmSupplier('factory');
  assert.equal(await second,false);await first;assert.equal(h.commits,1);
  const blocked=setup({refuse:true});await blocked.session.choose('tech');
  await assert.rejects(blocked.session.confirmSupplier('fast'),/无法确认/);
  assert.equal(blocked.session.state.busy,false);assert.equal(blocked.session.state.product,'tech');assert.equal(blocked.next,null);
});

test('a changed round or disposed room cannot commit a stale choice',async()=>{
  const h=setup();await h.session.choose('tech');h.changeRound();await assert.rejects(h.session.confirmSupplier('fast'),/状态已变化/);assert.equal(h.commits,0);
  const closed=setup();const pending=closed.session.choose('tech');closed.session.dispose();await assert.rejects(pending,/未能保存/);assert.equal(closed.commits,0);
});

test('all three reviewed supplier quotes reach pricing without purchasing stock',async()=>{
  for(const id of ['standard','fast','factory']){
    const h=setup();await h.session.choose('guide-cabinet');
    const before=structuredClone(h.store.snapshot().company);
    const quote=h.store.snapshot().quotes('guide-cabinet').find(q=>q.id===id);
    await h.session.confirmSupplier(id,quote);
    assert.equal(h.store.snapshot().supplier,id);
    assert.equal(h.store.snapshot().company.productId,'guide-cabinet');
    assert.equal(h.store.snapshot().company.stage,2);
    assert.equal(h.store.snapshot().company.cash,before.cash);
    assert.deepEqual(h.store.snapshot().company.inventory,before.inventory);
    assert.equal(h.commits,1);
  }
});

test('changed reviewed pricing is rejected, then the updated quote can be confirmed',async()=>{
  const h=setup();await h.session.choose('tech');
  const reviewed=structuredClone(h.store.snapshot().quotes('tech').find(q=>q.id==='fast'));
  const snapshot=h.store.snapshot;
  h.store.snapshot=()=>({...snapshot(),quotes:id=>snapshot().quotes(id).map(q=>q.id==='fast'?{...q,unitCost:q.unitCost+1}:q)});
  await assert.rejects(h.session.confirmSupplier('fast',reviewed),/报价已变化/);
  assert.equal(h.commits,0);assert.equal(h.store.snapshot().company.stage,1);
  await h.session.confirmSupplier('fast',h.store.snapshot().quotes('tech').find(q=>q.id==='fast'));
  assert.equal(h.commits,1);assert.equal(h.next,'w2');
});

test('quotes are revalidated after asynchronous product selection before committing',async()=>{
  const h=setup();await h.session.choose('lamp');
  const reviewed=structuredClone(h.store.snapshot().quotes('lamp').find(q=>q.id==='factory'));
  const snapshot=h.store.snapshot;let changed=false;
  h.store.snapshot=()=>({...snapshot(),quotes:id=>snapshot().quotes(id).map(q=>changed?{...q,moq:q.moq+100}:q)});
  h.store.waitFor=async check=>{changed=true;return check(h.store.snapshot())?h.store.snapshot():null;};
  await assert.rejects(h.session.confirmSupplier('factory',reviewed),/报价已变化/);
  assert.equal(h.commits,0);assert.equal(h.session.state.busy,false);
  assert.equal(h.store.snapshot().company.stage,1);
});

test('all 100 original product IDs have a render and a valid detailed model, with no substitute products',()=>{
  const dir='public/previews/crossbound/assets/showroom',manifest=JSON.parse(fs.readFileSync(`${dir}/manifest.json`));
  assert.equal(manifest.count,100);assert.deepEqual(new Set(manifest.products.map(p=>p.id)),new Set(engine.products.map(p=>p.id)));
  for(const p of manifest.products){
    const raw=JSON.parse(gunzipSync(fs.readFileSync(`${dir}/models/${p.id}.json.gz`)));
    const geometries=new Set(raw.geometries.map(g=>g.uuid));let count=0;
    function visit(o){if(o.geometry){assert.ok(geometries.has(o.geometry),p.id);count++;}for(const c of o.children||[])visit(c);}visit(raw.object);assert.ok(count>0,p.id);
    assert.equal(fs.readFileSync(`${dir}/images/${p.id}.png`).subarray(1,4).toString(),'PNG');
  }
});
