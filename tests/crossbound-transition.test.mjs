import test from 'node:test';
import assert from 'node:assert/strict';
import {createSceneTransition,createSceneScope} from '../public/previews/crossbound/v3/world/transition.js';

const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
function fixture(extra={}){
  const events=[],handlers={},loads=new Map();
  const host=createSceneTransition({
    load:id=>loads.get(id)?.promise||Promise.resolve({}),
    mount(id,_,h){handlers[id]=h;events.push('mount:'+id);return {dispose:()=>events.push('dispose:'+id),focus:()=>events.push('focus:'+id)};},
    onPending:id=>events.push('loading:'+id),onReady:id=>events.push('ready:'+id),onError:id=>events.push('error:'+id),onClear:()=>events.push('clear'),...extra,
  });
  return {host,events,handlers,loads};
}
test('market stays mounted during showroom download, with one loading surface and no campus gap',async()=>{
  const {host,events,loads}=fixture();await host.open('w0');
  const download=deferred();loads.set('w1',download);const next=host.open('w1');
  assert.equal(host.id,'w0');assert.equal(host.opening,true);assert.equal(events.at(-1),'loading:w1');assert.ok(!events.includes('dispose:w0'));
  download.resolve({});assert.equal(await next,true);
  assert.deepEqual(events.slice(-5),['loading:w1','mount:w1','dispose:w0','ready:w1','focus:w1']);
});
test('the loading surface remains until the next frame is mounted and painted',async()=>{
  const ready=deferred(),paint=deferred();
  const {host,events}=fixture({mount:()=>({ready:ready.promise,dispose(){}}),paint:()=>paint.promise});
  const opening=host.open('w3');await Promise.resolve();await Promise.resolve();
  assert.deepEqual(events,['loading:w3']);ready.resolve();await Promise.resolve();assert.ok(!events.includes('ready:w3'));
  paint.resolve();await opening;assert.deepEqual(events,['loading:w3','ready:w3']);
});
test('duplicate next-step notifications share a transition and mount once',async()=>{
  const {host,events,loads}=fixture(),download=deferred();loads.set('w1',download);
  const first=host.open('w1'),second=host.open('w1');assert.equal(first,second);
  download.resolve({});await first;await host.open('w1');assert.equal(events.filter(x=>x==='mount:w1').length,1);
});
test('returning to the campus cancels a pending scene; delayed callbacks cannot reopen it',async()=>{
  const {host,events,loads,handlers}=fixture();await host.open('w0');
  const download=deferred();loads.set('w1',download);const opening=host.open('w1');host.close();
  download.resolve({});assert.equal(await opening,false);handlers.w0.onNext('w2');assert.equal(host.id,null);assert.equal(host.opening,false);
  assert.ok(!events.includes('mount:w1'));assert.ok(!events.includes('loading:w2'));
});
test('a newer destination wins even when an older module resolves last',async()=>{
  const {host,events,loads}=fixture(),download=deferred();loads.set('w1',download);
  const stale=host.open('w1');await host.open('w2');download.resolve({});assert.equal(await stale,false);
  assert.equal(host.id,'w2');assert.ok(!events.includes('mount:w1'));
});
test('failed loads show a retry state and never request a legacy page; retry succeeds',async()=>{
  let failed=true;const {host,events}=fixture({load:()=>failed?Promise.reject(Error('offline')):Promise.resolve({})});
  assert.equal(await host.open('w1'),false);assert.equal(host.opening,false);assert.deepEqual(events,['loading:w1','error:w1']);
  failed=false;assert.equal(await host.open('w1'),true);assert.equal(host.id,'w1');
});
test('a stalled iframe times out, disposes its scene and leaves an explicit retry state',async()=>{
  let disposed=false;const {host,events}=fixture({timeoutMs:10,mount:()=>({ready:new Promise(()=>{}),dispose(){disposed=true;}})});
  assert.equal(await host.open('w3'),false);assert.ok(disposed);assert.equal(host.id,null);assert.equal(events.at(-1),'error:w3');
});
test('all round steps and the next round use the same scene owner; old exits cannot close the new scene',async()=>{
  const {host,handlers}=fixture();
  for(const id of ['w0','w1','w2','w3','w4','w5','w6','w0']){assert.equal(await host.open(id),true);assert.equal(host.id,id);}
  handlers.w6.onExit();assert.equal(host.id,'w0');host.close();
});
test('a scene closed synchronously while mounting is disposed instead of being resurrected',async()=>{
  let disposed=false;const {host,events}=fixture({mount:(_,__,handlers)=>{handlers.onExit();return {dispose(){disposed=true;}};}});
  assert.equal(await host.open('w1'),false);assert.ok(disposed);assert.equal(host.id,null);assert.ok(!events.includes('ready:w1'));
});

test('the outgoing scene survives the incoming first frame and the entire visual handover',async()=>{
  const frame=deferred(),motion=deferred(),disposed=[];
  const {host}=fixture({mount:id=>({ready:id==='w1'?frame.promise:Promise.resolve(),dispose:()=>disposed.push(id)}),reveal:(_,previous)=>previous?motion.promise:Promise.resolve()});
  await host.open('w0');const next=host.open('w1');await new Promise(r=>setImmediate(r));
  assert.deepEqual(disposed,[]);assert.equal(host.id,'w0');
  frame.resolve();await new Promise(r=>setImmediate(r));assert.deepEqual(disposed,[]);
  motion.resolve();await next;assert.deepEqual(disposed,['w0']);assert.equal(host.id,'w1');
});

test('failed successor keeps the previous scene visible and disposes only the failed mount',async()=>{
  const disposed=[];let fail=true;
  const {host}=fixture({mount:id=>({ready:id==='w1'&&fail?Promise.reject(Error('models unavailable')):Promise.resolve(),dispose:()=>disposed.push(id)})});
  await host.open('w0');assert.equal(await host.open('w1'),false);assert.equal(host.id,'w0');assert.deepEqual(disposed,['w1']);
  fail=false;await host.open('w1');assert.deepEqual(disposed,['w1','w0']);
});

test('cancel during the blend disposes both layers and cannot publish the abandoned destination',async()=>{
  const motion=deferred(),disposed=[];let signal;
  const {host,events}=fixture({mount:id=>({dispose:()=>disposed.push(id)}),reveal:(_,previous,s)=>{if(!previous)return Promise.resolve();signal=s;return motion.promise;}});
  await host.open('w0');const next=host.open('w1');await new Promise(r=>setImmediate(r));host.close();
  assert.equal(signal.aborted,true);assert.equal(await next,false);assert.deepEqual(disposed,['w1','w0']);
  motion.resolve();assert.ok(!events.includes('ready:w1'));assert.equal(host.id,null);
});

test('a retained scene is frozen and its delayed actions cannot charge or change the next step',async()=>{
  let calls=0,updates=0,listener,s={company:{stage:0},actions:{commit(){calls++;}}};
  const scope=createSceneScope({snapshot:()=>s,subscribe:fn=>{listener=fn;return()=>{};},waitFor:async()=>s,send(){calls++;},dialogOpen:false});
  scope.store.subscribe(()=>updates++);const oldAction=scope.store.snapshot().actions.commit;
  oldAction();scope.suspend();s={company:{stage:1},actions:{commit(){calls++;}}};listener();oldAction();scope.store.send('old');
  assert.equal(calls,1);assert.equal(updates,0);assert.equal(scope.store.snapshot().company.stage,0);assert.equal(scope.store.dialogOpen,true);
  assert.equal(await scope.store.waitFor(()=>true),null);
});
